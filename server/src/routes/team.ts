import { Router, type Response } from "express";
import { query } from "../db.js";
import { requireAuth, generateId, type AuthenticatedRequest } from "../auth.js";
import { isWorkspaceAdminOrLead, clearRoleCache } from "../permissions.js";

const router = Router();

// GET /api/team - Team directory with workload metrics & active projects
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    // Fetch role permissions, members, task workloads, and project memberships in parallel
    const [isLead, membersRes, tasksRes, projectMembersRes] = await Promise.all([
      isWorkspaceAdminOrLead(userId),
      query("SELECT * FROM team_members ORDER BY name ASC"),
      query(
        `SELECT assignee_id, status, priority, due_date, estimated_hours
         FROM tasks
         WHERE is_trash = FALSE AND assignee_id IS NOT NULL`,
      ),
      query(
        `SELECT pm.user_id, p.id as project_id, p.name as project_name, p.color as project_color, pm.role as project_role
         FROM project_members pm
         JOIN projects p ON pm.project_id = p.id
         WHERE p.status != 'archived'`,
      ),
    ]);

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
      // Members must not see other members' workload breakdown
      const canSeeWorkload = isLead || m.id === userId;
      const workload = canSeeWorkload ? (workloadByAssignee[m.id] || {
        active: 0,
        inProgress: 0,
        inReview: 0,
        blocked: 0,
        completed: 0,
        overdue: 0,
        totalHours: 0,
      }) : {
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
          capacityPercent: canSeeWorkload ? Math.min(Math.round((workload.active / 10) * 100), 120) : 0,
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
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const isLead = await isWorkspaceAdminOrLead(userId);
    if (!isLead) {
      return res.status(403).json({ error: "Unauthorized: Only team leaders can add team members" });
    }

    const { name, email, role, initials, avatarUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const cleanInitials = initials && initials.trim() ? initials.trim().toUpperCase().slice(0, 3) : name.slice(0, 2).toUpperCase();
    const memberId = generateId("team");

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

// PATCH /api/team/:id - Update team member role or details
router.patch("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const isLead = await isWorkspaceAdminOrLead(userId, req.user);
    if (!isLead) {
      return res.status(403).json({ error: "Unauthorized: Only team leaders can update team members" });
    }

    const { id } = req.params;
    const { role, name, email } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (role !== undefined) {
      values.push(role);
      updates.push(`role = $${values.length}`);
    }
    if (name !== undefined) {
      values.push(name.trim());
      updates.push(`name = $${values.length}`);
    }
    if (email !== undefined) {
      values.push(email.trim());
      updates.push(`email = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(id);
    const updateRes = await query(
      `UPDATE team_members SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: "Team member not found" });
    }

    const updatedMember = updateRes.rows[0];
    if (role !== undefined) {
      const lower = role.toLowerCase();
      const normalizedUserRole =
        lower.includes("lead") || lower.includes("admin") || lower.includes("owner")
          ? "leader"
          : "member";
      await query(
        `UPDATE users SET role = $1 WHERE id = $2 OR LOWER(email) = LOWER($3)`,
        [normalizedUserRole, id, updatedMember.email],
      );
      clearRoleCache(String(id));
    }

    res.json(updatedMember);
  } catch (err: any) {
    console.error("Error updating team member:", err);
    res.status(500).json({ error: "Failed to update team member" });
  }
});

export default router;
