import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

if (!process.env["JWT_SECRET"] && process.env.NODE_ENV === "production") {
  throw new Error("FATAL: JWT_SECRET environment variable must be configured in production");
}
const JWT_SECRET = process.env["JWT_SECRET"] || "taskflow-super-secret-key-2026";

export interface AuthenticatedUser {
  userId: string;
  username: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  userId?: string;
}

export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function getUserId(req: AuthenticatedRequest): string | null {
  return req.user?.userId || req.userId || null;
}

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
  } catch {
    return null;
  }
}

export function extractToken(req: {
  cookies?: Record<string, string | undefined>;
  headers?: Record<string, string | string[] | undefined>;
}): string | null {
  if (req.cookies && req.cookies["taskflow_token"]) {
    return req.cookies["taskflow_token"] ?? null;
  }
  const authHeader = req.headers ? req.headers["authorization"] : undefined;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  return null;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.userId) {
      req.user = decoded;
      req.userId = decoded.userId;
      return next();
    }
  }

  return res.status(401).json({ error: "Authentication required" });
}

export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.userId) {
      req.user = decoded;
      req.userId = decoded.userId;
    }
  }
  next();
}

// In-memory rate limiter for sensitive authentication endpoints
const authAttempts = new Map<string, { count: number; firstAttempt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_AUTH_ATTEMPTS = 50; // max 50 attempts per window per IP

export function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
  const now = Date.now();
  const record = authAttempts.get(ip);

  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    authAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }

  if (record.count >= MAX_AUTH_ATTEMPTS) {
    return res.status(429).json({
      error: "Too many authentication requests. Please try again later.",
      retryAfterSeconds: Math.ceil((record.firstAttempt + RATE_LIMIT_WINDOW_MS - now) / 1000),
    });
  }

  record.count++;
  next();
}

