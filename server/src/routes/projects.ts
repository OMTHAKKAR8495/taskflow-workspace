import { Router, type Response } from "express";
import { query } from "../db.js";
import { requireAuth, optionalAuth, extractToken, verifyToken, type AuthenticatedRequest } from "../auth.js";
import { isWorkspaceAdminOrLead, isProjectLeader, isProjectMember } from "../permissions.js";

const router = Router();

function getUserId(req: AuthenticatedRequest): string {
  if (req.user?.userId) return req.user.userId;
  if (req.userId) return req.userId;
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded?.userId) return decoded.userId;
  }
  const custom = req.headers["x-user-id"] as string;
  return custom && custom.trim() ? custom.trim() : "user-om";
}

// 1. GET /api/projects - List all projects with aggregated statistics
router.get("/", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { status, search } = req.query;

    const isLead = await isWorkspaceAdminOrLead(userId);

    let sql = "SELECT * FROM projects WHERE 1=1";
    const params: any[] = [];

    // Data isolation: non-leaders only see projects they own or are assigned members of
    if (!isLead) {
      params.push(userId);
      sql += ` AND (owner_id = $${params.length} OR id IN (SELECT project_id FROM project_members WHERE user_id = $${params.length}))`;
    }

    if (status && status !== "all") {
      if (status === "archived") {
        params.push("archived");
        sql += ` AND status = $${params.length}`;
      } else {
        params.push(status);
        sql += ` AND status = $${params.length} AND (archived_at IS NULL OR status != 'archived')`;
      }
    } else {
      // Default: don't show archived unless specifically requested
      sql += " AND (status != 'archived' AND archived_at IS NULL)";
    }

    if (search && typeof search === "string" && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(key) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`;
    }

    sql += " ORDER BY created_at ASC";

    const projectsRes = await query(sql, params);

    // Fetch task counts per project
    const tasksRes = await query(
      `SELECT project_id, status, priority, due_date
       FROM tasks
       WHERE is_trash = FALSE AND project_id IS NOT NULL`,
    );

    // Fetch members count per project
    const membersRes = await query(
      `SELECT project_id, COUNT(*) as count
       FROM project_members
       GROUP BY project_id`,
    );
    const memberCounts: Record<string, number> = {};
    for (const m of membersRes.rows) {
      memberCounts[m.project_id] = parseInt(m.count, 10);
    }

    // Fetch milestones count
    const milestonesRes = await query(
      `SELECT project_id, status, COUNT(*) as count
       FROM milestones
       GROUP BY project_id, status`,
    );
    const milestoneStats: Record<string, { total: number; completed: number }> = {};
    for (const row of milestonesRes.rows) {
      if (!milestoneStats[row.project_id]) {
        milestoneStats[row.project_id] = { total: 0, completed: 0 };
      }
      const c = parseInt(row.count, 10);
      milestoneStats[row.project_id].total += c;
      if (row.status === "completed") {
        milestoneStats[row.project_id].completed += c;
      }
    }

    const taskStats: Record<
      string,
      { total: number; completed: number; inProgress: number; blocked: number; overdue: number }
    > = {};

    const now = new Date();
    for (const t of tasksRes.rows) {
      if (!t.project_id) continue;
      if (!taskStats[t.project_id]) {
        taskStats[t.project_id] = { total: 0, completed: 0, inProgress: 0, blocked: 0, overdue: 0 };
      }
      taskStats[t.project_id].total++;
      if (t.status === "completed") taskStats[t.project_id].completed++;
      if (t.status === "in_progress") taskStats[t.project_id].inProgress++;
      if (t.status === "blocked") taskStats[t.project_id].blocked++;
      if (t.status !== "completed" && t.due_date && new Date(t.due_date) < now) {
        taskStats[t.project_id].overdue++;
      }
    }

    const projects = projectsRes.rows.map((p) => {
      const stats = taskStats[p.id] || { total: 0, completed: 0, inProgress: 0, blocked: 0, overdue: 0 };
      const calculatedProgress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : p.progress || 0;
      
      // Compute honest health status:
      // If overdue > 0 or blocked > 0, project is at_risk
      let health = p.health || "on_track";
      if (stats.blocked > 0 || stats.overdue >= 2) {
        health = "at_risk";
      } else if (p.deadline && new Date(p.deadline) < now && stats.completed < stats.total) {
        health = "delayed";
      }

      return {
        id: p.id,
        name: p.name,
        key: p.key,
        description: p.description || "",
        color: p.color || "#4f46e5",
        status: p.status || "active",
        priority: p.priority || "medium",
        health,
        lead: p.lead || "Om Thakkar",
        ownerId: p.owner_id,
        startDate: p.start_date ? new Date(p.start_date).toISOString() : null,
        deadline: p.deadline ? new Date(p.deadline).toISOString() : null,
        progress: calculatedProgress,
        archivedAt: p.archived_at ? new Date(p.archived_at).toISOString() : null,
        taskCount: stats.total,
        completedCount: stats.completed,
        inProgressCount: stats.inProgress,
        blockedCount: stats.blocked,
        overdueCount: stats.overdue,
        memberCount: memberCounts[p.id] || 1,
        milestones: milestoneStats[p.id] || { total: 0, completed: 0 },
        createdAt: new Date(p.created_at).toISOString(),
        updatedAt: p.updated_at ? new Date(p.updated_at).toISOString() : new Date(p.created_at).toISOString(),
      };
    });

    res.json(projects);
  } catch (err: any) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// 2. POST /api/projects - Create a new project
router.post("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const isLead = await isWorkspaceAdminOrLead(userId);
    if (!isLead) {
      return res.status(403).json({ error: "Unauthorized: Only team leaders and administrators can create projects" });
    }

    const {
      name,
      key,
      description = "",
      color = "#4f46e5",
      status = "active",
      priority = "medium",
      health = "on_track",
      lead,
      startDate,
      deadline,
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Project name is required" });
    }

    if (!key || typeof key !== "string" || !key.trim()) {
      return res.status(400).json({ error: "Project key is required" });
    }

    const cleanKey = key.trim().toUpperCase().slice(0, 10);
    const cleanName = name.trim();

    // Check unique key
    const existingKey = await query("SELECT id FROM projects WHERE UPPER(key) = $1", [cleanKey]);
    if (existingKey.rowCount && existingKey.rowCount > 0) {
      return res.status(409).json({ error: `Project key '${cleanKey}' is already taken. Please choose another.` });
    }

    const projectId = `proj-${Date.now()}`;
    const now = new Date().toISOString();

    const insertRes = await query(
      `INSERT INTO projects (
        id, name, key, description, color, status, priority, health, lead, owner_id,
        start_date, deadline, progress, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, $13, $13)
      RETURNING *`,
      [
        projectId,
        cleanName,
        cleanKey,
        description.trim(),
        color,
        status,
        priority,
        health,
        lead && lead.trim() ? lead.trim() : req.user?.username || "Lead",
        userId,
        startDate ? new Date(startDate).toISOString() : null,
        deadline ? new Date(deadline).toISOString() : null,
        now,
      ],
    );

    // Add creator to project_members as owner
    await query(
      `INSERT INTO project_members (id, project_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, 'owner', $4)
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [`pm-${Date.now()}`, projectId, userId, now],
    );

    // Record activity
    await query(
      `INSERT INTO activities (id, user_id, project_id, task_id, task_title, type, details, at)
       VALUES ($1, $2, $3, '', $4, 'project_created', $5, $6)`,
      [`act-${Date.now()}`, userId, projectId, cleanName, JSON.stringify({ key: cleanKey }), now],
    );

    const p = insertRes.rows[0];
    res.status(201).json({
      id: p.id,
      name: p.name,
      key: p.key,
      description: p.description,
      color: p.color,
      status: p.status,
      priority: p.priority,
      health: p.health,
      lead: p.lead,
      ownerId: p.owner_id,
      startDate: p.start_date,
      deadline: p.deadline,
      progress: 0,
      taskCount: 0,
      completedCount: 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    });
  } catch (err: any) {
    console.error("Error creating project:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// 3. GET /api/projects/:id - Single project workspace detail
router.get("/:id", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const projectRes = await query("SELECT * FROM projects WHERE id = $1", [id]);

    if (!projectRes.rowCount || projectRes.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const p = projectRes.rows[0];

    const isGlobalLead = await isWorkspaceAdminOrLead(userId);
    const isProjLead = isGlobalLead || (await isProjectLeader(userId, String(id)));
    const isMember = isProjLead || (await isProjectMember(userId, String(id)));

    if (!isMember) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this project" });
    }

    // Fetch members
    const membersRes = await query(
      `SELECT pm.id as membership_id, pm.role as project_role, pm.joined_at,
              COALESCE(u.id, tm.id) as user_id,
              COALESCE(u.full_name, tm.name, 'Team Member') as name,
              COALESCE(u.email, tm.email, '') as email,
              COALESCE(u.avatar_url, tm.avatar_url, '') as avatar_url,
              COALESCE(tm.initials, 'TM') as initials
       FROM project_members pm
       LEFT JOIN users u ON pm.user_id = u.id
       LEFT JOIN team_members tm ON pm.user_id = tm.id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at ASC`,
      [id],
    );

    // Fetch milestones
    const milestonesRes = await query(
      `SELECT * FROM milestones WHERE project_id = $1 ORDER BY target_date ASC`,
      [id],
    );

    // Fetch tasks summary (leaders see all project tasks, members see only their assigned/reviewed tasks)
    const tasksRes = isProjLead
      ? await query(
          `SELECT id, identifier, title, status, priority, due_date, assignee_id, assignee_name
           FROM tasks
           WHERE project_id = $1 AND is_trash = FALSE
           ORDER BY created_at DESC`,
          [id],
        )
      : await query(
          `SELECT id, identifier, title, status, priority, due_date, assignee_id, assignee_name
           FROM tasks
           WHERE project_id = $1 AND is_trash = FALSE AND (assignee_id = $2 OR user_id = $2 OR reviewer_id = $2)
           ORDER BY created_at DESC`,
          [id, userId],
        );

    // Fetch recent activities
    const activitiesRes = await query(
      `SELECT a.*, u.full_name as user_name
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.project_id = $1
       ORDER BY a.at DESC
       LIMIT 20`,
      [id],
    );

    const now = new Date();
    const tasks = tasksRes.rows;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const total = tasks.length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const overdue = tasks.filter((t) => t.status !== "completed" && t.due_date && new Date(t.due_date) < now).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : p.progress || 0;

    let health = p.health || "on_track";
    if (blocked > 0 || overdue >= 2) health = "at_risk";
    else if (p.deadline && new Date(p.deadline) < now && completed < total) health = "delayed";

    res.json({
      id: p.id,
      name: p.name,
      key: p.key,
      description: p.description || "",
      color: p.color || "#4f46e5",
      status: p.status || "active",
      priority: p.priority || "medium",
      health,
      lead: p.lead,
      ownerId: p.owner_id,
      startDate: p.start_date ? new Date(p.start_date).toISOString() : null,
      deadline: p.deadline ? new Date(p.deadline).toISOString() : null,
      progress,
      archivedAt: p.archived_at ? new Date(p.archived_at).toISOString() : null,
      taskCount: total,
      completedCount: completed,
      blockedCount: blocked,
      overdueCount: overdue,
      members: membersRes.rows.map((m) => ({
        id: m.user_id,
        membershipId: m.membership_id,
        name: m.name,
        email: m.email,
        role: m.project_role,
        avatarUrl: m.avatar_url,
        initials: m.initials,
        joinedAt: new Date(m.joined_at).toISOString(),
      })),
      milestones: milestonesRes.rows.map((m) => ({
        id: m.id,
        projectId: m.project_id,
        title: m.title,
        description: m.description || "",
        targetDate: new Date(m.target_date).toISOString(),
        status: m.status,
        createdAt: new Date(m.created_at).toISOString(),
      })),
      recentActivity: activitiesRes.rows.map((a) => ({
        id: a.id,
        type: a.type,
        taskTitle: a.task_title,
        userName: a.user_name || "Team Member",
        details: typeof a.details === "string" ? JSON.parse(a.details) : a.details || {},
        at: new Date(a.at).toISOString(),
      })),
      createdAt: new Date(p.created_at).toISOString(),
      updatedAt: p.updated_at ? new Date(p.updated_at).toISOString() : new Date(p.created_at).toISOString(),
    });
  } catch (err: any) {
    console.error("Error fetching project detail:", err);
    res.status(500).json({ error: "Failed to fetch project detail" });
  }
});

// 4. PATCH /api/projects/:id - Update project
router.patch("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const updates = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    const allowedKeys: Record<string, string> = {
      name: "name",
      description: "description",
      color: "color",
      status: "status",
      priority: "priority",
      health: "health",
      lead: "lead",
      progress: "progress",
      startDate: "start_date",
      deadline: "deadline",
    };

    for (const [key, col] of Object.entries(allowedKeys)) {
      if (updates[key] !== undefined) {
        values.push(updates[key]);
        fields.push(`${col} = $${values.length}`);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update" });
    }

    values.push(new Date().toISOString());
    fields.push(`updated_at = $${values.length}`);

    values.push(id);
    const sql = `UPDATE projects SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *`;

    const result = await query(sql, values);
    if (!result.rowCount || result.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const updated = result.rows[0];

    // Log activity
    await query(
      `INSERT INTO activities (id, user_id, project_id, task_id, task_title, type, details, at)
       VALUES ($1, $2, $3, '', $4, 'project_updated', $5, NOW())`,
      [`act-${Date.now()}`, userId, id, updated.name, JSON.stringify(updates)],
    );

    res.json(updated);
  } catch (err: any) {
    console.error("Error updating project:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// 5. POST /api/projects/:id/archive - Archive / Unarchive project
router.post("/:id/archive", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectRes = await query("SELECT status, archived_at FROM projects WHERE id = $1", [id]);
    if (!projectRes.rowCount || projectRes.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const isArchived = Boolean(projectRes.rows[0].archived_at);
    const newArchivedAt = isArchived ? null : new Date().toISOString();
    const newStatus = isArchived ? "active" : "archived";

    const updated = await query(
      `UPDATE projects SET status = $1, archived_at = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [newStatus, newArchivedAt, id],
    );

    res.json(updated.rows[0]);
  } catch (err: any) {
    console.error("Error toggling project archive:", err);
    res.status(500).json({ error: "Failed to archive project" });
  }
});

// 6. DELETE /api/projects/:id - Delete project
router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const del = await query("DELETE FROM projects WHERE id = $1 RETURNING name", [id]);
    if (!del.rowCount || del.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json({ success: true, message: `Project ${del.rows[0].name} deleted` });
  } catch (err: any) {
    console.error("Error deleting project:", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// 7. Project Members management
router.get("/:id/members", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT pm.id, pm.role, pm.joined_at,
              COALESCE(u.id, tm.id) as user_id,
              COALESCE(u.full_name, tm.name, 'Member') as name,
              COALESCE(u.email, tm.email, '') as email,
              COALESCE(u.avatar_url, tm.avatar_url, '') as avatar_url,
              COALESCE(tm.initials, 'TM') as initials
       FROM project_members pm
       LEFT JOIN users u ON pm.user_id = u.id
       LEFT JOIN team_members tm ON pm.user_id = tm.id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at ASC`,
      [id],
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("Error fetching project members:", err);
    res.status(500).json({ error: "Failed to fetch project members" });
  }
});

router.post("/:id/members", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = getUserId(req);

    const isLead = await isProjectLeader(currentUserId, String(id));
    if (!isLead) {
      return res.status(403).json({ error: "Unauthorized: Only project leaders can add members to a project" });
    }

    const { userId, role = "member" } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const memberId = `pm-${Date.now()}`;
    await query(
      `INSERT INTO project_members (id, project_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [memberId, id, userId, role],
    );

    res.status(201).json({ success: true, memberId, role });
  } catch (err: any) {
    console.error("Error adding project member:", err);
    res.status(500).json({ error: "Failed to add member to project" });
  }
});

router.delete("/:id/members/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, userId } = req.params;
    const currentUserId = getUserId(req);

    const isLead = await isProjectLeader(currentUserId, String(id));
    if (!isLead) {
      return res.status(403).json({ error: "Unauthorized: Only project leaders can remove project members" });
    }

    await query("DELETE FROM project_members WHERE project_id = $1 AND user_id = $2", [id, userId]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error removing project member:", err);
    res.status(500).json({ error: "Failed to remove member" });
  }
});

// 8. Project Milestones
router.get("/:id/milestones", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      "SELECT * FROM milestones WHERE project_id = $1 ORDER BY target_date ASC",
      [id],
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("Error fetching milestones:", err);
    res.status(500).json({ error: "Failed to fetch milestones" });
  }
});

router.post("/:id/milestones", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description = "", targetDate, status = "pending" } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Milestone title is required" });
    }
    if (!targetDate) {
      return res.status(400).json({ error: "Milestone target date is required" });
    }

    const milestoneId = `ms-${Date.now()}`;
    const result = await query(
      `INSERT INTO milestones (id, project_id, title, description, target_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [milestoneId, id, title.trim(), description.trim(), new Date(targetDate).toISOString(), status],
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("Error creating milestone:", err);
    res.status(500).json({ error: "Failed to create milestone" });
  }
});

router.patch("/:id/milestones/:milestoneId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { milestoneId } = req.params;
    const { title, description, targetDate, status } = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      values.push(title);
      fields.push(`title = $${values.length}`);
    }
    if (description !== undefined) {
      values.push(description);
      fields.push(`description = $${values.length}`);
    }
    if (targetDate !== undefined) {
      values.push(new Date(targetDate).toISOString());
      fields.push(`target_date = $${values.length}`);
    }
    if (status !== undefined) {
      values.push(status);
      fields.push(`status = $${values.length}`);
    }

    fields.push("updated_at = NOW()");
    values.push(milestoneId);

    const result = await query(
      `UPDATE milestones SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );

    if (!result.rowCount || result.rowCount === 0) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("Error updating milestone:", err);
    res.status(500).json({ error: "Failed to update milestone" });
  }
});

router.delete("/:id/milestones/:milestoneId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { milestoneId } = req.params;
    await query("DELETE FROM milestones WHERE id = $1", [milestoneId]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting milestone:", err);
    res.status(500).json({ error: "Failed to delete milestone" });
  }
});

export default router;
