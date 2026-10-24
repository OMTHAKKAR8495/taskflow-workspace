import { Router, type Response } from "express";
import { query } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../auth.js";

const router = Router();

// GET /api/profile
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await query("SELECT * FROM users WHERE id = $1", [userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      avatarUrl: row.avatar_url || "",
      role: row.role || "member",
      createdAt: new Date(row.created_at).toISOString(),
    });
  } catch (err: any) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT /api/profile
router.put("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { fullName, email, avatarUrl = "" } = req.body;
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return res.status(400).json({ error: "Full name is required" });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim();

    // Ensure email is not already taken by another user
    const emailCheck = await query("SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2", [cleanEmail, userId]);
    if (emailCheck.rowCount && emailCheck.rowCount > 0) {
      return res.status(409).json({ error: "Email is already in use by another account" });
    }

    const result = await query(
      `UPDATE users
       SET full_name = $1, email = $2, avatar_url = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [cleanFullName, cleanEmail, String(avatarUrl || "").trim(), userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      avatarUrl: row.avatar_url || "",
      role: row.role || "member",
      createdAt: new Date(row.created_at).toISOString(),
    });
  } catch (err: any) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
