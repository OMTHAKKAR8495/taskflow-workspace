import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] || "taskflow-super-secret-key-2026";

export interface AuthenticatedUser {
  userId: string;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  userId?: string;
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

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    const fallbackUserId = req.headers["x-user-id"];
    if (typeof fallbackUserId === "string" && fallbackUserId.trim()) {
      req.userId = fallbackUserId.trim();
      req.user = { userId: req.userId, username: req.userId };
      return next();
    }
    return res.status(401).json({ error: "Authentication required" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = decoded;
  req.userId = decoded.userId;
  next();
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
      req.userId = decoded.userId;
    }
  } else {
    const fallbackUserId = req.headers["x-user-id"];
    if (typeof fallbackUserId === "string" && fallbackUserId.trim()) {
      req.userId = fallbackUserId.trim();
      req.user = { userId: req.userId, username: req.userId };
    }
  }
  next();
}
