import { Router, type Request, type Response } from "express";
import { query } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../auth.js";

const router = Router();

// GET /api/team - Team directory with workload metrics & active projects
router.get("/", async (req: Request, res: Response) => {
  try {
    // 1. Fetch team members
    const membersRes = await query("SELECT * FROM team_members ORDER BY name ASC");

    // 2. Fetch tasks grouped by assignee
    const tasksRes = await query(
      `SELECT assignee_id, status, priority, due_date, estimated_hours
       FROM tasks
       WHERE is_trash = FALSE AND assignee_id IS NOT NULL`,
    );

    const now = new Date();
    const workloadByAssignee: Record<
      string,
      { active: number; inProgress: number; inReview: number; blocked: number; completed: number; overdue: number; totalHours: number }
    > = {};

    for (const t of tasksRes.rows) {
      const aid = t.assignee_id;
      if (!workloadByAssignee[aid]) {
        workloadByAssignee[aid] = {
          active: 0,
          inProgress: 0,
          inReview: 0,
          blocked: 0,
          completed: 0,
          overdue: 0,
          totalHours: 0,
        };
      }
      const w = workloadByAssignee[aid];
      if (t.status === "completed") {
        w.completed++;
      } else {
        w.active++;
        if (t.status === "in_progress") w.inProgress++;
        if (t.status === "in_review") w.inReview++;
        if (t.status === "blocked") w.blocked++;
        if (t.due_date && new Date(t.due_date) < now) w.overdue++;
        w.totalHours += parseFloat(t.estimated_hours || "0") || 0;
      }
    }

    // 3. Fetch project memberships
    const projectMembersRes = await query(
      `SELECT pm.user_id, p.id as project_id, p.name as project_name, p.color as project_color, pm.role as project_role
       FROM project_members pm
       JOIN projects p ON pm.project_id = p.id
       WHERE p.status != 'archived'`,
    );

    const projectsByUser: Record<string, any[]> = {};
    for (const pm of projectMembersRes.rows) {
      if (!projectsByUser[pm.user_id]) projectsByUser[pm.user_id] = [];
      projectsByUser[pm.user_id].push({
        id: pm.project_id,
        name: pm.project_name,
        color: pm.project_color,
        role: pm.project_role,
      });
    }

    const members = membersRes.rows.map((m) => {
      const workload = workloadByAssignee[m.id] || {
        active: 0,
        inProgress: 0,
        inReview: 0,
        blocked: 0,
        completed: 0,
        overdue: 0,
        totalHours: 0,
      };

      return {
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        avatarUrl: m.avatar_url || "",
        initials: m.initials,
        workload: {
          activeTasks: workload.active,
          inProgressTasks: workload.inProgress,
          inReviewTasks: workload.inReview,
          blockedTasks: workload.blocked,
          completedTasks: workload.completed,
          overdueTasks: workload.overdue,
          capacityPercent: Math.min(Math.round((workload.active / 10) * 100), 120), // 10 tasks = 100% capacity
          totalEstimatedHours: Math.round(workload.totalHours),
        },
        projects: projectsByUser[m.id] || [],
      };
    });

    res.json(members);
  } catch (err: any) {
    console.error("Error fetching team members:", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
});

// POST /api/team - Add new team member
router.post("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, role, initials, avatarUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const cleanInitials = initials && initials.trim() ? initials.trim().toUpperCase().slice(0, 3) : name.slice(0, 2).toUpperCase();
    const memberId = `team-${Date.now()}`;

    const insertRes = await query(
      `INSERT INTO team_members (id, name, email, role, avatar_url, initials)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [memberId, name.trim(), email.trim(), role && role.trim() ? role.trim() : "Team Member", avatarUrl || "", cleanInitials],
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err: any) {
    console.error("Error adding team member:", err);
    res.status(500).json({ error: "Failed to add team member" });
  }
});

export default router;
