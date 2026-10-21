import { Router, Request, Response } from "express";
import { query } from "../db.js";

const router = Router();

function getUserId(req: Request): string {
  const custom = req.headers["x-user-id"] as string;
  return custom && custom.trim() ? custom.trim() : "user-om";
}

// GET /api/projects
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    // Fetch projects
    const projectsRes = await query("SELECT * FROM projects ORDER BY created_at ASC");
    // Fetch task counts per project
    const tasksRes = await query("SELECT project_id, status FROM tasks WHERE user_id = $1", [
      userId,
    ]);

    const counts: Record<string, { total: number; completed: number }> = {};
    for (const t of tasksRes.rows) {
      if (!t.project_id) continue;
      if (!counts[t.project_id]) counts[t.project_id] = { total: 0, completed: 0 };
      counts[t.project_id].total++;
      if (t.status === "completed") counts[t.project_id].completed++;
    }

    const projects = projectsRes.rows.map((p) => ({
      id: p.id,
      name: p.name,
      key: p.key,
      description: p.description,
      color: p.color,
      status: p.status,
      lead: p.lead,
      taskCount: counts[p.id]?.total || 0,
      completedCount: counts[p.id]?.completed || 0,
    }));

    res.json(projects);
  } catch (err: any) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

export default router;
