import { Router, Request, Response } from "express";
import { query } from "../db.js";

const router = Router();

function getUserId(req: Request): string {
  const custom = req.headers["x-user-id"] as string;
  return custom && custom.trim() ? custom.trim() : "user-om";
}

// GET /api/profile
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await query("SELECT * FROM users WHERE id = $1", [userId]);

    if (result.rowCount === 0) {
      // Auto-create profile if missing
      const isDefault = userId === "user-om";
      const insert = await query(
        `INSERT INTO users (id, username, full_name, email, avatar_url, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [
          userId,
          isDefault ? "omthakkar" : userId,
          isDefault ? "Om Thakkar" : "TaskFlow User",
          isDefault ? "omthakkar@example.com" : `${userId}@example.com`,
          "",
        ],
      );
      const row = insert.rows[0];
      return res.json({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        avatarUrl: row.avatar_url || "",
        createdAt: new Date(row.created_at).toISOString(),
      });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      avatarUrl: row.avatar_url || "",
      createdAt: new Date(row.created_at).toISOString(),
    });
  } catch (err: any) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT /api/profile
router.put("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { fullName, email, avatarUrl = "" } = req.body;

    const result = await query(
      `INSERT INTO users (id, username, full_name, email, avatar_url, updated_at)
       VALUES ($1, $1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         avatar_url = EXCLUDED.avatar_url,
         updated_at = NOW()
       RETURNING *`,
      [userId, fullName?.trim() || "User", email?.trim() || "user@example.com", avatarUrl || ""],
    );

    const row = result.rows[0];
    res.json({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      avatarUrl: row.avatar_url || "",
      createdAt: new Date(row.created_at).toISOString(),
    });
  } catch (err: any) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
