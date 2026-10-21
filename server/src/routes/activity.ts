import { Router, Request, Response } from "express";
import { query } from "../db.js";

const router = Router();

function getUserId(req: Request): string {
  const custom = req.headers["x-user-id"] as string;
  return custom && custom.trim() ? custom.trim() : "user-om";
}

// GET /api/activity
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await query(
      "SELECT * FROM activities WHERE user_id = $1 ORDER BY at DESC LIMIT 30",
      [userId]
    );

    const activities = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      taskId: row.task_id,
      taskTitle: row.task_title,
      at: new Date(row.at).toISOString(),
    }));

    res.json(activities);
  } catch (err: any) {
    console.error("Error fetching activities:", err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

export default router;
