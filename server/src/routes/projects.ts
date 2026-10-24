import { Router, type Response } from "express";
import { query } from "../db.js";
import { requireAuth, generateId, type AuthenticatedRequest } from "../auth.js";
import { isWorkspaceAdminOrLead, isProjectLeader, isProjectMember } from "../permissions.js";

const router = Router();

function parseSafeDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Handle DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
    if (dmyMatch) {
      const p1 = parseInt(dmyMatch[1], 10);
      const p2 = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);
      if (p2 <= 12 && p1 <= 31) {
        const d = new Date(Date.UTC(year, p2 - 1, p1));
        if (!isNaN(d.getTime())) return d.toISOString();
      } else if (p1 <= 12 && p2 <= 31) {
        const d = new Date(Date.UTC(year, p1 - 1, p2));
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }

    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d.toISOString();
    } catch {}
    return null;
  }

  try {
    const d = new Date(val as any);
    return !isNaN(d.getTime()) ? d.toISOString() : null;
  } catch {
    return null;
  }
}

// 1. GET /api/projects - List all projects with aggregated statistics
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const { status, search } = req.query;

    const isLead = await isWorkspaceAdminOrLead(userId, req.user);

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

    // Fetch projects, task metrics, member counts, and milestones in parallel
    const [projectsRes, tasksRes, membersRes, milestonesRes] = await Promise.all([
      query(sql, params),
      query(
        `SELECT project_id, status, priority, due_date
         FROM tasks
         WHERE is_trash = FALSE AND project_id IS NOT NULL`,
      ),
      query(
        `SELECT project_id, COUNT(*) as count
         FROM project_members
         GROUP BY project_id`,
      ),
      query(
        `SELECT project_id, status, COUNT(*) as count
         FROM milestones
         GROUP BY project_id, status`,
      ),
    ]);

    const memberCounts: Record<string, number> = {};
    for (const m of membersRes.rows) {
      memberCounts[m.project_id] = parseInt(m.count, 10);
    }

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
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isLead = await isWorkspaceAdminOrLead(userId, req.user);
    if (!isLead) {
      return res.status(403).json({ error: "Unauthorized: Only team leaders and administrators can create projects" });
    }

    const {
      name,
      key,
      key_prefix,
      keyPrefix,
      description,
      desc,
      color,
      color_theme,
      colorTheme,
      status = "active",
      priority = "medium",
      health = "on_track",
      lead,
      startDate,
      start_date,
      deadline,
      due_date,
      dueDate,
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const cleanName = name.trim();
    const rawKey = key || key_prefix || keyPrefix;
    let cleanKey = "";

    if (rawKey && typeof rawKey === "string" && rawKey.trim()) {
      cleanKey = rawKey.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 10);
      if (!cleanKey) {
        cleanKey = cleanName.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "PRJ";
      }

      // Check unique key for user-supplied key
      const existingKey = await query("SELECT id FROM projects WHERE UPPER(key) = $1", [cleanKey]);
      if (existingKey.rowCount && existingKey.rowCount > 0) {
        return res.status(409).json({ error: `Project key '${cleanKey}' is already taken. Please choose another unique key.` });
      }
    } else {
      // Auto-generate key from project name
      let baseKey = cleanName.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();
      if (!baseKey) baseKey = "PRJ";
      cleanKey = baseKey;
      let counter = 1;
      while (true) {
        const existing = await query("SELECT id FROM projects WHERE UPPER(key) = $1", [cleanKey]);
        if (!existing.rowCount || existing.rowCount === 0) break;
        counter++;
        cleanKey = `${baseKey}${counter}`.slice(0, 10);
      }
    }

    const cleanColor = (color || color_theme || colorTheme || "#4f46e5").toString().trim();
    const cleanDesc = (description ?? desc ?? "").toString().trim();
    const cleanPriority = (priority || "medium").toString().trim();
    const cleanStatus = (status || "active").toString().trim();
    const cleanHealth = (health || "on_track").toString().trim();
    const parsedStartDate = parseSafeDate(startDate || start_date);
    const parsedDeadline = parseSafeDate(deadline || due_date || dueDate);

    // Ensure creator exists in users table to satisfy foreign keys
    const userRes = await query("SELECT id, full_name, username FROM users WHERE id = $1", [userId]);
    let creatorName = req.user?.username || "Lead";
    if (userRes.rows.length === 0) {
      creatorName = req.user?.username || "Workspace Leader";
      await query(
        `INSERT INTO users (id, username, full_name, email, role)
         VALUES ($1, $2, $3, $4, 'member')
         ON CONFLICT (id) DO NOTHING`,
        [userId, req.user?.username || userId, creatorName, `${userId}@taskflow.local`],
      );
    } else {
      creatorName = userRes.rows[0].full_name || userRes.rows[0].username || creatorName;
    }

    const cleanLead = (lead && typeof lead === "string" && lead.trim()) ? lead.trim() : creatorName;
    const projectId = generateId("proj");
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
        cleanDesc,
        cleanColor,
        cleanStatus,
        cleanPriority,
        cleanHealth,
        cleanLead,
        userId,
        parsedStartDate,
        parsedDeadline,
        now,
      ],
    );

    // Add creator to project_members as owner
    await query(
      `INSERT INTO project_members (id, project_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, 'owner', $4)
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [generateId("pm"), projectId, userId, now],
    );

    // Record activity
    await query(
      `INSERT INTO activities (id, user_id, project_id, task_id, task_title, type, details, at)
       VALUES ($1, $2, $3, '', $4, 'project_created', $5, $6)`,
      [generateId("act"), userId, projectId, cleanName, JSON.stringify({ key: cleanKey }), now],
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
      startDate: p.start_date ? new Date(p.start_date).toISOString() : null,
      deadline: p.deadline ? new Date(p.deadline).toISOString() : null,
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
router.get("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const projectRes = await query("SELECT * FROM projects WHERE id = $1", [id]);

    if (!projectRes.rowCount || projectRes.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const p = projectRes.rows[0];

    const isGlobalLead = await isWorkspaceAdminOrLead(userId, req.user);
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
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isLead = (await isWorkspaceAdminOrLead(userId, req.user)) || (await isProjectLeader(userId, String(id)));
    if (!isLead) {
      return res.status(403).json({ error: "Unauthorized: Only project leaders can update project settings" });
    }

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
      [generateId("act"), userId, id, updated.name, JSON.stringify(updates)],
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
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isLead = (await isWorkspaceAdminOrLead(userId, req.user)) || (await isProjectLeader(userId, String(id)));
    if (!isLead) {
      return res.status(403).json({ error: "Unauthorized: Only project leaders can archive projects" });
    }

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
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isLead = (await isWorkspaceAdminOrLead(userId, req.user)) || (await isProjectLeader(userId, String(id)));
    if (!isLead) {
      return res.status(403).json({ error: "Unauthorized: Only project leaders can delete projects" });
    }

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
router.get("/:id/members", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isMember = (await isWorkspaceAdminOrLead(userId, req.user)) || (await isProjectMember(userId, String(id)));
    if (!isMember) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this project" });
    }

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
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isLead = (await isWorkspaceAdminOrLead(currentUserId, req.user)) || (await isProjectLeader(currentUserId, String(id)));
    if (!isLead) {
      return res.status(403).json({ error: "Unauthorized: Only project leaders can add members to a project" });
    }

    const { userId, userIds, role = "member" } = req.body;
    const allowedRoles = ["member", "lead", "viewer"];
    const targetRole = allowedRoles.includes(role) ? role : "member";

    const targetUserIds: string[] = Array.isArray(userIds)
      ? userIds.filter((u: any) => typeof u === "string" && u.trim()).map((u: string) => u.trim())
      : userId && typeof userId === "string" && userId.trim()
        ? [userId.trim()]
        : [];

    if (targetUserIds.length === 0) {
      return res.status(400).json({ error: "User ID or User IDs array is required" });
    }

    const added: string[] = [];

    for (const uid of targetUserIds) {
      // Validate user existence in users or team_members
      const uRes = await query("SELECT id FROM users WHERE id = $1", [uid]);
      if (uRes.rows.length === 0) {
        const tmRes = await query("SELECT * FROM team_members WHERE id = $1", [uid]);
        if (tmRes.rows.length > 0) {
          const tm = tmRes.rows[0];
          await query(
            `INSERT INTO users (id, username, full_name, email, role)
             VALUES ($1, $2, $3, $4, 'member')
             ON CONFLICT (id) DO NOTHING`,
            [tm.id, tm.id, tm.name, tm.email],
          );
        } else {
          // Do not create placeholder accounts for arbitrary unrecognized user IDs
          continue;
        }
      }

      const memberId = generateId("pm");
      await query(
        `INSERT INTO project_members (id, project_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [memberId, id, uid, targetRole],
      );
      added.push(uid);

      // Record activity
      await query(
        `INSERT INTO activities (id, user_id, project_id, task_id, task_title, type, details, at)
         VALUES ($1, $2, $3, '', '', 'member_joined', $4, NOW())`,
        [generateId("act"), currentUserId, id, JSON.stringify({ userId: uid, role: targetRole })],
      );
    }

    if (added.length === 0) {
      return res.status(400).json({ error: "No valid existing users found to add to project" });
    }

    res.status(201).json({ success: true, count: added.length, addedUserIds: added, role: targetRole });
  } catch (err: any) {
    console.error("Error adding project member:", err);
    res.status(500).json({ error: "Failed to add member to project" });
  }
});

router.delete("/:id/members/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, userId } = req.params;
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isLead = (await isWorkspaceAdminOrLead(currentUserId, req.user)) || (await isProjectLeader(currentUserId, String(id)));
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
router.get("/:id/milestones", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isMember = (await isWorkspaceAdminOrLead(userId, req.user)) || (await isProjectMember(userId, String(id)));
    if (!isMember) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this project" });
    }

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
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isLead = (await isWorkspaceAdminOrLead(userId, req.user)) || (await isProjectLeader(userId, String(id)));
    if (!isLead) {
      return res.status(403).json({ error: "Unauthorized: Only project leaders can create milestones" });
    }

    const { title, description = "", targetDate, status = "pending" } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Milestone title is required" });
    }
    if (!targetDate) {
      return res.status(400).json({ error: "Milestone target date is required" });
    }

    const milestoneId = generateId("ms");
    const parsedTarget = parseSafeDate(targetDate) || new Date().toISOString();
    const result = await query(
      `INSERT INTO milestones (id, project_id, title, description, target_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [milestoneId, id, title.trim(), description.trim(), parsedTarget, status],
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("Error creating milestone:", err);
    res.status(500).json({ error: "Failed to create milestone" });
  }
});

router.patch("/:id/milestones/:milestoneId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, milestoneId } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isLead = (await isWorkspaceAdminOrLead(userId, req.user)) || (await isProjectLeader(userId, String(id)));
    if (!isLead) {
      return res.status(403).json({ error: "Unauthorized: Only project leaders can update milestones" });
    }

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
      values.push(parseSafeDate(targetDate) || new Date().toISOString());
      fields.push(`target_date = $${values.length}`);
    }
    if (status !== undefined) {
      values.push(status);
      fields.push(`status = $${values.length}`);
    }

    fields.push("updated_at = NOW()");
    values.push(milestoneId);
    values.push(id);

    const result = await query(
      `UPDATE milestones SET ${fields.join(", ")} WHERE id = $${values.length - 1} AND project_id = $${values.length} RETURNING *`,
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
    const { id, milestoneId } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isLead = (await isWorkspaceAdminOrLead(userId, req.user)) || (await isProjectLeader(userId, String(id)));
    if (!isLead) {
      return res.status(403).json({ error: "Unauthorized: Only project leaders can delete milestones" });
    }

    const del = await query("DELETE FROM milestones WHERE id = $1 AND project_id = $2 RETURNING id", [milestoneId, id]);
    if (!del.rowCount || del.rowCount === 0) {
      return res.status(404).json({ error: "Milestone not found" });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting milestone:", err);
    res.status(500).json({ error: "Failed to delete milestone" });
  }
});

// 9. Project Submissions & Deliverables
router.get("/:id/submissions", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isGlobalLead = await isWorkspaceAdminOrLead(userId, req.user);
    const isProjLead = isGlobalLead || (await isProjectLeader(userId, String(id)));
    const isMember = isProjLead || (await isProjectMember(userId, String(id)));

    if (!isMember) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this project" });
    }

    let sql = `
      SELECT pu.*, t.title as task_title, t.identifier as task_identifier, t.assignee_id,
             COALESCE(u.full_name, pu.user_name) as submitter_name,
             COALESCE(u.avatar_url, '') as submitter_avatar
      FROM task_progress_updates pu
      JOIN tasks t ON pu.task_id = t.id
      LEFT JOIN users u ON pu.user_id = u.id
      WHERE (t.project_id = $1 OR pu.project_id = $1)
    `;
    const params: any[] = [id];

    // Privacy rule: non-leaders only see their own submissions
    if (!isProjLead) {
      params.push(userId);
      sql += ` AND pu.user_id = $${params.length}`;
    }

    sql += ` ORDER BY pu.created_at DESC`;

    const result = await query(sql, params);

    // Also fetch reviews for tasks in this project
    const reviewsRes = await query(
      `SELECT r.* FROM task_reviews r
       JOIN tasks t ON r.task_id = t.id
       WHERE t.project_id = $1
       ORDER BY r.created_at DESC`,
      [id],
    );
    const reviewsByUpdate: Record<string, any[]> = {};
    for (const r of reviewsRes.rows) {
      const upId = r.progress_update_id || r.task_id;
      if (!reviewsByUpdate[upId]) reviewsByUpdate[upId] = [];
      reviewsByUpdate[upId].push(r);
    }

    res.json(
      result.rows.map((row) => {
        let atts: any[] = [];
        try {
          atts = typeof row.attachments === "string" ? JSON.parse(row.attachments) : row.attachments || [];
        } catch {}
        return {
          id: row.id,
          taskId: row.task_id,
          taskTitle: row.task_title,
          taskIdentifier: row.task_identifier || "NEX-000",
          userId: row.user_id,
          userName: row.submitter_name,
          userAvatar: row.submitter_avatar,
          status: row.status,
          submissionStatus: row.submission_status || (row.status === "in_review" ? "submitted" : "draft"),
          progressPercent: row.progress_percent,
          workCompleted: row.work_completed,
          workRemaining: row.work_remaining || "",
          blockers: row.blockers || "",
          nextSteps: row.next_steps || "",
          timeSpentHours: parseFloat(row.time_spent_hours || "0") || 0,
          evidenceUrl: row.evidence_url || "",
          githubUrl: row.github_url || "",
          deploymentUrl: row.deployment_url || "",
          attachments: atts,
          reviews: (reviewsByUpdate[row.id] || reviewsByUpdate[row.task_id] || []).map((r) => ({
            id: r.id,
            reviewerId: r.reviewer_id,
            reviewerName: r.reviewer_name,
            decision: r.decision,
            feedback: r.feedback,
            createdAt: new Date(r.created_at).toISOString(),
          })),
          createdAt: new Date(row.created_at).toISOString(),
        };
      }),
    );
  } catch (err: any) {
    console.error("Error fetching project submissions:", err);
    res.status(500).json({ error: "Failed to fetch project submissions" });
  }
});

// 10. Project Activity History
router.get("/:id/activity", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isMember = (await isWorkspaceAdminOrLead(userId, req.user)) || (await isProjectMember(userId, String(id)));
    if (!isMember) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this project" });
    }

    const result = await query(
      `SELECT a.*, COALESCE(u.full_name, u.username, 'Team Member') as user_name, COALESCE(u.avatar_url, '') as user_avatar
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.project_id = $1
       ORDER BY a.at DESC
       LIMIT 100`,
      [id],
    );
    res.json(
      result.rows.map((a) => ({
        id: a.id,
        userId: a.user_id,
        userName: a.user_name,
        userAvatar: a.user_avatar,
        type: a.type,
        taskTitle: a.task_title,
        taskId: a.task_id,
        details: typeof a.details === "string" ? JSON.parse(a.details) : a.details || {},
        at: new Date(a.at).toISOString(),
      })),
    );
  } catch (err: any) {
    console.error("Error fetching project activity:", err);
    res.status(500).json({ error: "Failed to fetch project activity" });
  }
});

export default router;
