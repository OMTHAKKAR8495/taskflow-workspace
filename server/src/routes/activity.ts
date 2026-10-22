import { Router, Request, Response } from "express";
import { query } from "../db.js";

const router = Router();

function getUserId(req: any): string {
  if (req.userId) return req.userId;
  const custom = req.headers["x-user-id"] as string;
  return custom && custom.trim() ? custom.trim() : "user-om";
}

// GET /api/activity
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await query(
      `SELECT DISTINCT a.* FROM activities a
       LEFT JOIN project_members pm ON a.project_id = pm.project_id AND pm.user_id = $1
       WHERE a.user_id = $1 OR pm.user_id = $1
       ORDER BY a.at DESC LIMIT 50`,
      [userId],
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
