import { Router, type Request, type Response } from "express";
import { query } from "../db.js";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  requireAuth,
  authRateLimiter,
  generateId,
  type AuthenticatedRequest,
} from "../auth.js";
import { clearRoleCache } from "../permissions.js";

const router = Router();

// POST /api/auth/register
router.post("/register", authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { fullName, email, username, password } = req.body;

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return res.status(400).json({ error: "Full name is required" });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim();
    // Default all public self-registrations to standard "member" role (no self-service privilege escalation)
    const cleanRole = "member";

    // Check if user exists
    const existing = await query(
      "SELECT id FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $2",
      [cleanUsername, cleanEmail],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(409).json({ error: "Username or email is already in use" });
    }

    const hashedPassword = await hashPassword(password);
    const userId = generateId("user");
    const now = new Date().toISOString();

    const insertRes = await query(
      `INSERT INTO users (id, username, full_name, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, username, full_name, email, avatar_url, role, created_at`,
      [userId, cleanUsername, cleanFullName, cleanEmail, hashedPassword, cleanRole, now, now],
    );

    const user = insertRes.rows[0];
    const token = generateToken({ userId: user.id, username: user.username, role: user.role });

    // Set cookie
    res.cookie("taskflow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role || "member",
        avatarUrl: user.avatar_url || "",
      },
      token,
    });
  } catch (err: unknown) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const cleanUsername = String(username).trim().toLowerCase();

    const result = await query(
      `SELECT id, username, full_name, email, avatar_url, role, password_hash
       FROM users
       WHERE LOWER(username) = $1 OR LOWER(email) = $1`,
      [cleanUsername],
    );

    if (!result.rowCount || result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    let isValid = false;

    if (user.password_hash) {
      isValid = await verifyPassword(password, user.password_hash);
    }

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const effectiveRole = user.role || "member";
    const token = generateToken({ userId: user.id, username: user.username, role: effectiveRole });

    res.cookie("taskflow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: effectiveRole,
        avatarUrl: user.avatar_url || "",
      },
      token,
    });
  } catch (err: unknown) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/auth/logout
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("taskflow_token");
  res.json({ success: true, message: "Logged out successfully" });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const result = await query(
      `SELECT id, username, full_name, email, avatar_url, role, created_at
       FROM users WHERE id = $1`,
      [userId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const u = result.rows[0];
    const effectiveRole = u.role || "member";

    // Generate fresh token containing current effective role from database
    const freshToken = generateToken({
      userId: u.id,
      username: u.username,
      role: effectiveRole,
    });

    res.cookie("taskflow_token", freshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      email: u.email,
      role: effectiveRole,
      avatarUrl: u.avatar_url || "",
      createdAt: u.created_at,
      token: freshToken,
    });
  } catch (err: unknown) {
    console.error("Auth me error:", err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// PATCH /api/auth/role - Switch active role between leader and member
router.patch("/role", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const { role } = req.body;
    const targetRole = String(role).toLowerCase() === "leader" ? "leader" : "member";

    const updateRes = await query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, username, full_name, email, avatar_url, role`,
      [targetRole, userId],
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    clearRoleCache(userId);

    const u = updateRes.rows[0];
    const token = generateToken({ userId: u.id, username: u.username, role: targetRole });

    res.cookie("taskflow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: u.id,
        username: u.username,
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        avatarUrl: u.avatar_url || "",
      },
      token,
    });
  } catch (err: unknown) {
    console.error("Role update error:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

// GET /api/auth/google/config - Expose public Google client ID to frontend
router.get("/google/config", (_req: Request, res: Response) => {
  res.json({
    clientId: GOOGLE_CLIENT_ID,
  });
});

// GET /api/auth/google/url - Generate OAuth 2.0 authorization redirect URL
router.get("/google/url", (req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_ID.trim()) {
    return res.status(400).json({
      error: "Google OAuth is not configured on this deployment. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your Vercel Environment Variables.",
    });
  }
  const host = req.get("x-forwarded-host") || req.get("host") || "localhost:4000";
  const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
  const appBase = process.env.APP_BASE_URL ? process.env.APP_BASE_URL.replace(/\/$/, "") : `${protocol}://${host}`;
  const defaultRedirectUri = `${appBase}/api/auth/google/callback`;
  const redirectUri = (req.query.redirect_uri as string) || defaultRedirectUri;

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  res.json({
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  });
});

// Helper to provision or update user from Google profile
async function processGoogleUser(googleProfile: {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}) {
  const googleId = String(googleProfile.sub);
  const cleanEmail = String(googleProfile.email).trim().toLowerCase();
  const fullName = String(googleProfile.name || cleanEmail.split("@")[0]).trim();
  const avatarUrl = String(googleProfile.picture || "").trim();

  // 1. Check if user already exists by google_id or email
  const existingUserRes = await query(
    `SELECT id, username, full_name, email, avatar_url, role, google_id
     FROM users
     WHERE google_id = $1 OR LOWER(email) = $2`,
    [googleId, cleanEmail],
  );

  let user: any;
  const isLeadCandidate = Boolean(
    process.env.ADMIN_EMAIL && cleanEmail === process.env.ADMIN_EMAIL.trim().toLowerCase(),
  );

  if (existingUserRes.rowCount && existingUserRes.rowCount > 0) {
    user = existingUserRes.rows[0];
    if (user.google_id && user.google_id !== googleId) {
      throw new Error("This email is already associated with a different Google account");
    }
    // Update google_id and avatar_url if missing or changed
    const updatedRes = await query(
      `UPDATE users
       SET google_id = COALESCE(google_id, $1),
           avatar_url = CASE WHEN avatar_url = '' OR avatar_url IS NULL THEN $2 ELSE avatar_url END,
           auth_provider = 'google',
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, username, full_name, email, avatar_url, role`,
      [googleId, avatarUrl, user.id],
    );
    user = updatedRes.rows[0];
  } else {
    // Generate unique username
    const baseUsername = cleanEmail
      .split("@")[0]
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toLowerCase()
      .slice(0, 20) || "user";
    let username = baseUsername;
    const checkUsername = await query(
      "SELECT id FROM users WHERE LOWER(username) = $1",
      [username],
    );
    if (checkUsername.rowCount && checkUsername.rowCount > 0) {
      username = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;
    }

    const userId = generateId("user-g");
    const initialRole = isLeadCandidate ? "leader" : "member";

    const insertRes = await query(
      `INSERT INTO users (id, username, full_name, email, avatar_url, role, google_id, auth_provider, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'google', NOW(), NOW())
       RETURNING id, username, full_name, email, avatar_url, role`,
      [userId, username, fullName, cleanEmail, avatarUrl, initialRole, googleId],
    );
    user = insertRes.rows[0];
  }

  const effectiveRole = user.role || (isLeadCandidate ? "leader" : "member");
  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: effectiveRole,
  });

  return { user, effectiveRole, token };
}

// POST /api/auth/google - Authenticate via Google ID Token or Auth Code
router.post("/google", async (req: Request, res: Response) => {
  try {
    const { credential, code, redirectUri } = req.body;

    let googleProfile: { sub: string; email: string; name?: string; picture?: string };

    if (credential) {
      // 1. Verify Google ID token via Google Tokeninfo
      const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
      const tokenResp = await fetch(verifyUrl);
      if (!tokenResp.ok) {
        return res.status(401).json({ error: "Failed to verify Google identity credential" });
      }

      const payload = (await tokenResp.json()) as any;
      if (!payload.email) {
        return res.status(400).json({ error: "Google account does not contain a verified email" });
      }
      if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
        return res.status(401).json({ error: "Invalid Google token audience" });
      }
      if (!GOOGLE_CLIENT_ID && process.env.NODE_ENV === "production") {
        return res.status(500).json({ error: "Google authentication is not properly configured on server" });
      }
      if (payload.email_verified !== true && payload.email_verified !== "true") {
        return res.status(401).json({ error: "Google account email is not verified" });
      }

      googleProfile = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name || payload.given_name,
        picture: payload.picture,
      };
    } else if (code) {
      // 2. Exchange authorization code for tokens
      const tokenUrl = "https://oauth2.googleapis.com/token";
      const params = new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri || `${req.protocol}://${req.get("host")}/api/auth/google/callback`,
        grant_type: "authorization_code",
      });

      const exchangeResp = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!exchangeResp.ok) {
        const errText = await exchangeResp.text();
        console.error("Google token exchange error:", errText);
        return res.status(400).json({ error: "Google authorization code exchange failed" });
      }

      const tokenData = (await exchangeResp.json()) as any;
      const userinfoResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userinfoResp.ok) {
        return res.status(400).json({ error: "Failed to fetch user profile from Google" });
      }

      const userInfo = (await userinfoResp.json()) as any;
      googleProfile = {
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      };
    } else {
      return res.status(400).json({ error: "Missing Google credential or authorization code" });
    }

    const { user, effectiveRole, token } = await processGoogleUser(googleProfile);

    res.cookie("taskflow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: effectiveRole,
        avatarUrl: user.avatar_url || googleProfile.picture || "",
      },
      token,
    });
  } catch (err: unknown) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Google authentication failed" });
  }
});

// GET /api/auth/google/callback - Handle OAuth 2.0 browser redirect flow
router.get("/google/callback", async (req: Request, res: Response) => {
  try {
    const { code, error } = req.query;

    const host = req.get("x-forwarded-host") || req.get("host") || "localhost:4000";
    const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    const appBase = process.env.APP_BASE_URL ? process.env.APP_BASE_URL.replace(/\/$/, "") : `${protocol}://${host}`;

    if (error || !code) {
      console.warn("Google OAuth callback error:", error);
      return res.redirect(`${appBase}/?error=google_cancelled`);
    }

    const redirectUri = `${appBase}/api/auth/google/callback`;
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const params = new URLSearchParams({
      code: String(code),
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const exchangeResp = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!exchangeResp.ok) {
      console.error("Google token exchange error:", await exchangeResp.text());
      return res.redirect(`${appBase}/?error=google_exchange_failed`);
    }

    const tokenData = (await exchangeResp.json()) as any;
    const userinfoResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userinfoResp.ok) {
      return res.redirect(`${appBase}/?error=google_profile_failed`);
    }

    const userInfo = (await userinfoResp.json()) as any;
    const { token } = await processGoogleUser({
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    });

    res.cookie("taskflow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.redirect(`${appBase}/dashboard?login=google_success#token=${token}`);
  } catch (err: unknown) {
    console.error("Google callback exception:", err);
    const host = req.get("x-forwarded-host") || req.get("host") || "localhost:4000";
    const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    const appBase = process.env.APP_BASE_URL ? process.env.APP_BASE_URL.replace(/\/$/, "") : `${protocol}://${host}`;
    return res.redirect(`${appBase}/?error=google_auth_error`);
  }
});

export default router;
