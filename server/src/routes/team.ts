import { Router, Request, Response } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/team
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await query("SELECT * FROM team_members ORDER BY name ASC");
    const members = result.rows.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      avatarUrl: m.avatar_url || "",
      initials: m.initials,
    }));
    res.json(members);
  } catch (err: any) {
    console.error("Error fetching team members:", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
});

export default router;
