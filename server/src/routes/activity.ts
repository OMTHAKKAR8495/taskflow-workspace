import { Router, type Response } from "express";
import { query } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../auth.js";

const router = Router();

// GET /api/activity
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

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
