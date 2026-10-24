import { Router, type Response } from "express";
import { query } from "../db.js";
import { extractToken, verifyToken, optionalAuth, requireAuth, type AuthenticatedRequest } from "../auth.js";
import { wouldCreateCycle } from "../dependencies.js";
import {
  canUserEditTask,
  canUserReviewTask,
  canUserViewTask,
  isWorkspaceAdminOrLead,
  isProjectLeader,
} from "../permissions.js";

const router = Router();

export const VALID_STATUSES = [
  "backlog",
  "ready",
  "in_progress",
  "in_review",
  "blocked",
  "completed",
  "pending", // backwards compatibility
];
export const VALID_PRIORITIES = ["critical", "high", "medium", "low"];

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

function formatTask(
  row: any,
  comments: any[] = [],
  dependencies: any[] = [],
  progressUpdates: any[] = [],
  reviews: any[] = [],
) {
  let tags: string[] = [];
  try {
    tags = typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags || [];
  } catch {}

  let subtasks: any[] = [];
  try {
    subtasks = typeof row.subtasks === "string" ? JSON.parse(row.subtasks) : row.subtasks || [];
  } catch {}

  let acceptanceCriteria: any[] = [];
  try {
    acceptanceCriteria =
      typeof row.acceptance_criteria === "string"
        ? JSON.parse(row.acceptance_criteria)
        : row.acceptance_criteria || [];
  } catch {}

  const assignee = row.assignee_id
    ? {
        id: row.assignee_id,
        name: row.assignee_name || "Assignee",
        role: row.assignee_role || "Team Member",
        email: `${row.assignee_id}@example.com`,
        initials: row.assignee_initials || "TM",
      }
    : undefined;

  const reviewer = row.reviewer_id
    ? {
        id: row.reviewer_id,
        name: row.reviewer_name || "Reviewer",
      }
    : undefined;

  // Normalized status: 'pending' displayed as 'ready' if needed, or preserved
  const status = row.status || "backlog";

  let attachments: any[] = [];
  try {
    attachments = typeof row.attachments === "string" ? JSON.parse(row.attachments) : row.attachments || [];
  } catch {}

  return {
    id: row.id,
    identifier: row.identifier || `NEX-${row.id.replace(/[^0-9]/g, "").slice(-3) || "100"}`,
    userId: row.user_id,
    projectId: row.project_id || undefined,
    projectName: row.project_name || undefined,
    projectColor: row.project_color || undefined,
    assignee,
    reviewer,
    title: row.title,
    description: row.description || "",
    type: row.type || "task",
    status,
    priority: row.priority || "medium",
    blockedReason: row.blocked_reason || "",
    submissionStatus: row.submission_status || (status === "in_review" ? "submitted" : (status === "completed" ? "approved" : "none")),
    githubUrl: row.github_url || "",
    deploymentUrl: row.deployment_url || "",
    attachments,
    startDate: row.start_date ? new Date(row.start_date).toISOString() : null,
    dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
    estimatedHours: parseFloat(row.estimated_hours || "0") || 0,
    actualHours: parseFloat(row.actual_hours || "0") || 0,
    estimate: row.estimate || "3 pts",
    progressPercent:
      row.progress_percent !== null && row.progress_percent !== undefined
        ? parseInt(row.progress_percent, 10)
        : 0,
    lastProgressUpdateAt: row.last_progress_update_at
      ? new Date(row.last_progress_update_at).toISOString()
      : null,
    tags,
    subtasks,
    acceptanceCriteria,
    milestoneId: row.milestone_id || undefined,
    isBookmarked: Boolean(row.is_bookmarked),
    isTrash: Boolean(row.is_trash),
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
    recurrence: row.recurrence || "none",
    focusTimeSeconds: row.focus_time_seconds || 0,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    comments: comments.map((c) => ({
      id: c.id,
      userId: c.user_id,
      author: c.author,
      content: c.content,
      mentions: typeof c.mentions === "string" ? JSON.parse(c.mentions) : c.mentions || [],
      createdAt: new Date(c.created_at).toISOString(),
    })),
    dependencies: dependencies.map((d) => ({
      id: d.id,
      taskId: d.task_id,
      dependsOnTaskId: d.depends_on_task_id,
      dependsOnTaskTitle: d.depends_on_title || "Dependent Task",
      dependsOnTaskIdentifier: d.depends_on_identifier || "NEX-000",
      dependsOnTaskStatus: d.depends_on_status || "backlog",
      dependencyType: d.dependency_type,
    })),
    progressUpdates: progressUpdates.map((p) => {
      let pAtts: any[] = [];
      try {
        pAtts = typeof p.attachments === "string" ? JSON.parse(p.attachments) : p.attachments || [];
      } catch {}
      return {
        id: p.id,
        taskId: p.task_id,
        userId: p.user_id,
        userName: p.user_name,
        status: p.status,
        submissionStatus: p.submission_status || (p.status === "in_review" ? "submitted" : "draft"),
        progressPercent: parseInt(p.progress_percent || "0", 10),
        workCompleted: p.work_completed,
        workRemaining: p.work_remaining || "",
        blockers: p.blockers || "",
        nextSteps: p.next_steps || "",
        timeSpentHours: parseFloat(p.time_spent_hours || "0") || 0,
        evidenceUrl: p.evidence_url || "",
        githubUrl: p.github_url || "",
        deploymentUrl: p.deployment_url || "",
        attachments: pAtts,
        createdAt: new Date(p.created_at).toISOString(),
      };
    }),
    reviews: reviews.map((r) => ({
      id: r.id,
      taskId: r.task_id,
      reviewerId: r.reviewer_id,
      reviewerName: r.reviewer_name,
      progressUpdateId: r.progress_update_id || undefined,
      decision: r.decision,
      feedback: r.feedback,
      createdAt: new Date(r.created_at).toISOString(),
    })),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

// 1. GET /tasks/stats - Get dashboard statistics
router.get("/stats", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { projectId } = req.query;

    const isGlobalLead = await isWorkspaceAdminOrLead(userId);
    let isProjLead = false;
    if (projectId && typeof projectId === "string" && projectId !== "all") {
      isProjLead = await isProjectLeader(userId, projectId);
    }
    const isAuthorizedLead = isGlobalLead || isProjLead;

    let sql = "SELECT * FROM tasks WHERE is_trash = FALSE";
    const params: any[] = [];

    // Members only see stats for tasks assigned to them, created by them, or reviewed by them
    if (!isAuthorizedLead) {
      params.push(userId);
      sql += ` AND (assignee_id = $${params.length} OR user_id = $${params.length} OR reviewer_id = $${params.length})`;
    }

    if (projectId && typeof projectId === "string" && projectId !== "all") {
      params.push(projectId);
      sql += ` AND project_id = $${params.length}`;
    }

    const result = await query(sql, params);
    const tasks = result.rows;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const backlog = tasks.filter((t) => t.status === "backlog").length;
    const ready = tasks.filter((t) => t.status === "ready" || t.status === "pending").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const inReview = tasks.filter((t) => t.status === "in_review").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const completed = tasks.filter((t) => t.status === "completed").length;

    const overdue = tasks.filter(
      (t) => t.status !== "completed" && t.due_date && new Date(t.due_date) < now,
    ).length;

    const dueThisWeek = tasks.filter((t) => {
      if (t.status === "completed" || !t.due_date) return false;
      const d = new Date(t.due_date);
      const weekFromNow = new Date();
      weekFromNow.setDate(now.getDate() + 7);
      return d >= now && d <= weekFromNow;
    }).length;

    const total = tasks.length;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;

    res.json({
      total,
      backlog,
      ready,
      pending: ready,
      inProgress,
      inReview,
      blocked,
      completed,
      overdue,
      dueThisWeek,
      completionRate,
      byPriority: {
        critical: tasks.filter((t) => t.priority === "critical").length,
        high: tasks.filter((t) => t.priority === "high").length,
        medium: tasks.filter((t) => t.priority === "medium").length,
        low: tasks.filter((t) => t.priority === "low").length,
      },
    });
  } catch (err: any) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Failed to compute stats" });
  }
});

// 2. GET /tasks/my-work - Cockpit for current user
router.get("/my-work", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const userTasksRes = await query(
      `SELECT * FROM tasks
       WHERE is_trash = FALSE AND (user_id = $1 OR assignee_id = $1 OR reviewer_id = $1)
       ORDER BY due_date ASC NULLS LAST, created_at DESC`,
      [userId],
    );

    const now = new Date();
    const tasks = userTasksRes.rows.map((row) => formatTask(row));

    const allAssigned = tasks.filter((t) => t.assignee?.id === userId || t.userId === userId);
    const assignedToMe = tasks.filter((t) => (t.assignee?.id === userId || (!t.assignee?.id && t.userId === userId)) && t.status !== "completed");
    const notStarted = assignedToMe.filter((t) => t.status === "ready" || t.status === "backlog" || t.status === "pending");
    const inProgress = assignedToMe.filter((t) => t.status === "in_progress");
    const inReview = assignedToMe.filter((t) => t.status === "in_review");
    const blocked = assignedToMe.filter((t) => t.status === "blocked");
    const reviewing = tasks.filter((t) => t.reviewer?.id === userId && t.status === "in_review");
    const createdByMe = tasks.filter((t) => t.userId === userId && t.status !== "completed");
    const overdue = assignedToMe.filter((t) => t.dueDate && new Date(t.dueDate) < now);
    const completed = tasks.filter((t) => (t.assignee?.id === userId || t.userId === userId) && t.status === "completed");
    const completedRecently = completed.slice(0, 15);

    // Upcoming deadlines in the next 14 days
    const upcomingLimit = new Date();
    upcomingLimit.setDate(now.getDate() + 14);
    const upcomingDeadlines = assignedToMe
      .filter((t) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= upcomingLimit)
      .sort((a, b) => (new Date(a.dueDate!).getTime()) - (new Date(b.dueDate!).getTime()));

    res.json({
      stats: {
        totalAssigned: allAssigned.length,
        notStarted: notStarted.length,
        inProgress: inProgress.length,
        inReview: inReview.length,
        blocked: blocked.length,
        completed: completed.length,
        overdue: overdue.length,
        upcomingCount: upcomingDeadlines.length,
      },
      assignedToMe,
      notStarted,
      inProgress,
      inReview,
      blocked,
      reviewing,
      createdByMe,
      overdue,
      upcomingDeadlines,
      completedRecently,
      totalActive: assignedToMe.length + reviewing.length,
    });
  } catch (err: any) {
    console.error("Error fetching my-work:", err);
    res.status(500).json({ error: "Failed to fetch my-work tasks" });
  }
});

// 2b. GET /tasks/review-queue - Tasks awaiting team leader review
router.get("/review-queue", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const isLead = await isWorkspaceAdminOrLead(userId);

    let sql = `SELECT t.*,
              (SELECT json_build_object(
                 'id', pu.id,
                 'workCompleted', pu.work_completed,
                 'workRemaining', pu.work_remaining,
                 'progressPercent', pu.progress_percent,
                 'timeSpentHours', pu.time_spent_hours,
                 'evidenceUrl', pu.evidence_url,
                 'userName', pu.user_name,
                 'createdAt', pu.created_at
               ) FROM task_progress_updates pu WHERE pu.task_id = t.id ORDER BY pu.created_at DESC LIMIT 1) as latest_progress
       FROM tasks t
       WHERE t.is_trash = FALSE AND t.status = 'in_review'`;
    const params: any[] = [];

    if (!isLead) {
      const ledProjectsRes = await query("SELECT id FROM projects WHERE owner_id = $1", [userId]);
      const ledProjectIds = ledProjectsRes.rows.map((r) => r.id);
      if (ledProjectIds.length > 0) {
        params.push(ledProjectIds, userId);
        sql += ` AND (t.project_id = ANY($1) OR t.reviewer_id = $2)`;
      } else {
        params.push(userId);
        sql += ` AND t.reviewer_id = $1`;
      }
    }

    sql += ` ORDER BY t.updated_at DESC`;
    const result = await query(sql, params);

    res.json(
      result.rows.map((r) => ({
        ...formatTask(r),
        latestProgress: r.latest_progress || null,
      })),
    );
  } catch (err: any) {
    console.error("Error fetching review queue:", err);
    res.status(500).json({ error: "Failed to fetch review queue" });
  }
});

// 3. GET /tasks - List tasks with project, status, and search filters
router.get("/", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { projectId, status, priority, assigneeId, search, isTrash } = req.query;

    const isGlobalLead = await isWorkspaceAdminOrLead(userId);
    let isProjLead = false;
    if (projectId && typeof projectId === "string" && projectId !== "all") {
      isProjLead = await isProjectLeader(userId, projectId);
    }
    const isAuthorizedLead = isGlobalLead || isProjLead;

    let sql = "SELECT * FROM tasks WHERE 1=1";
    const params: any[] = [];

    if (isTrash === "true") {
      sql += " AND is_trash = TRUE";
    } else {
      sql += " AND is_trash = FALSE";
    }

    // Role-based data isolation for members:
    // Non-leaders can only see tasks assigned to them, created by them, or designated for their review
    if (!isAuthorizedLead) {
      params.push(userId);
      sql += ` AND (assignee_id = $${params.length} OR user_id = $${params.length} OR reviewer_id = $${params.length})`;
    }

    if (projectId && typeof projectId === "string" && projectId !== "all") {
      params.push(projectId);
      sql += ` AND project_id = $${params.length}`;
    }

    if (status && typeof status === "string" && status !== "all") {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (priority && typeof priority === "string" && priority !== "all") {
      params.push(priority);
      sql += ` AND priority = $${params.length}`;
    }

    if (assigneeId && typeof assigneeId === "string" && assigneeId !== "all") {
      params.push(assigneeId);
      sql += ` AND assignee_id = $${params.length}`;
    }

    if (search && typeof search === "string" && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(COALESCE(identifier, '')) LIKE $${params.length})`;
    }

    sql += " ORDER BY created_at DESC";

    // Fetch tasks, comments, and dependencies in parallel to minimize cross-region latency
    const [tasksRes, commentsRes, depsRes] = await Promise.all([
      query(sql, params),
      query("SELECT * FROM task_comments ORDER BY created_at ASC"),
      query(
        `SELECT td.*, t.title as depends_on_title, t.identifier as depends_on_identifier, t.status as depends_on_status
         FROM task_dependencies td
         JOIN tasks t ON td.depends_on_task_id = t.id`,
      ),
    ]);

    const commentsByTask: Record<string, any[]> = {};
    for (const c of commentsRes.rows) {
      if (!commentsByTask[c.task_id]) commentsByTask[c.task_id] = [];
      commentsByTask[c.task_id].push(c);
    }

    const depsByTask: Record<string, any[]> = {};
    for (const d of depsRes.rows) {
      if (!depsByTask[d.task_id]) depsByTask[d.task_id] = [];
      depsByTask[d.task_id].push(d);
    }

    const tasks = tasksRes.rows.map((row) =>
      formatTask(row, commentsByTask[row.id] || [], depsByTask[row.id] || []),
    );

    res.json(tasks);
  } catch (err: any) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// 4. GET /tasks/:id - Single task
router.get("/:id", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const taskRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (taskRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const task = taskRes.rows[0];

    const canView = await canUserViewTask(userId, String(id), task);
    if (!canView.allowed) {
      return res.status(403).json({ error: canView.reason || "Forbidden: You do not have permission to access this task" });
    }

    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id],
    );

    const depsRes = await query(
      `SELECT td.*, t.title as depends_on_title, t.identifier as depends_on_identifier, t.status as depends_on_status
       FROM task_dependencies td
       JOIN tasks t ON td.depends_on_task_id = t.id
       WHERE td.task_id = $1`,
      [id],
    );

    const progressRes = await query(
      "SELECT * FROM task_progress_updates WHERE task_id = $1 ORDER BY created_at DESC",
      [id],
    );

    const reviewsRes = await query(
      "SELECT * FROM task_reviews WHERE task_id = $1 ORDER BY created_at DESC",
      [id],
    );

    res.json(
      formatTask(
        task,
        commentsRes.rows,
        depsRes.rows,
        progressRes.rows,
        reviewsRes.rows,
      ),
    );
  } catch (err: any) {
    console.error("Error fetching task:", err);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// 5. POST /tasks - Create task
router.post("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const {
      title,
      description = "",
      type = "task",
      status = "backlog",
      priority = "medium",
      blockedReason = "",
      startDate = null,
      dueDate = null,
      estimatedHours = 0,
      actualHours = 0,
      projectId,
      assigneeId,
      reviewerId,
      milestoneId,
      estimate = "3 pts",
      tags = [],
      subtasks = [],
      acceptanceCriteria = [],
    } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required and must be a non-empty string" });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res
        .status(400)
        .json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` });
    }

    // Role-based authorization: Only team leaders can assign tasks to other members
    const isGlobalLead = await isWorkspaceAdminOrLead(userId);
    let isProjLead = false;
    if (projectId) {
      isProjLead = await isProjectLeader(userId, projectId);
    }
    if (!isGlobalLead && !isProjLead) {
      if (assigneeId && assigneeId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Only team leaders can assign tasks to other team members" });
      }
    }

    // Lookup Project info and auto-generate identifier (e.g. CORE-101)
    let projectName = null;
    let projectColor = null;
    let projectKey = "NEX";
    if (projectId) {
      const pRes = await query("SELECT name, color, key FROM projects WHERE id = $1", [projectId]);
      if (pRes.rowCount && pRes.rowCount > 0) {
        projectName = pRes.rows[0].name;
        projectColor = pRes.rows[0].color;
        projectKey = pRes.rows[0].key || "NEX";
      }
    }

    // Sequence for identifier
    const countRes = await query("SELECT COUNT(*) as count FROM tasks WHERE project_id = $1", [
      projectId || null,
    ]);
    const nextSeq = parseInt(countRes.rows[0]?.count || "0", 10) + 101;
    const identifier = `${projectKey}-${nextSeq}`;

    let assigneeName = null;
    let assigneeRole = null;
    let assigneeInitials = null;
    if (assigneeId) {
      const mRes = await query(
        `SELECT name, role, initials FROM team_members WHERE id = $1
         UNION
         SELECT full_name as name, 'Member' as role, SUBSTRING(full_name, 1, 2) as initials FROM users WHERE id = $1`,
        [assigneeId],
      );
      if (mRes.rowCount && mRes.rowCount > 0) {
        assigneeName = mRes.rows[0].name;
        assigneeRole = mRes.rows[0].role;
        assigneeInitials = mRes.rows[0].initials;
      }
    }

    let reviewerName = null;
    if (reviewerId) {
      const rRes = await query(
        `SELECT name FROM team_members WHERE id = $1
         UNION
         SELECT full_name as name FROM users WHERE id = $1`,
        [reviewerId],
      );
      if (rRes.rowCount && rRes.rowCount > 0) {
        reviewerName = rRes.rows[0].name;
      }
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const result = await query(
      `INSERT INTO tasks (
         id, identifier, user_id, project_id, project_name, project_color,
         assignee_id, assignee_name, assignee_role, assignee_initials,
         reviewer_id, reviewer_name,
         title, description, type, status, priority, blocked_reason,
         start_date, due_date, estimated_hours, actual_hours, estimate,
         tags, subtasks, acceptance_criteria, milestone_id,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
       RETURNING *`,
      [
        taskId,
        identifier,
        userId,
        projectId || null,
        projectName,
        projectColor,
        assigneeId || null,
        assigneeName,
        assigneeRole,
        assigneeInitials,
        reviewerId || null,
        reviewerName,
        title.trim(),
        description.trim(),
        type,
        status,
        priority,
        blockedReason,
        startDate ? new Date(startDate).toISOString() : null,
        dueDate ? new Date(dueDate).toISOString() : null,
        estimatedHours,
        actualHours,
        estimate,
        JSON.stringify(tags),
        JSON.stringify(subtasks),
        JSON.stringify(acceptanceCriteria),
        milestoneId || null,
        now,
        now,
      ],
    );

    // Record activity
    const actId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await query(
      `INSERT INTO activities (id, user_id, project_id, task_id, task_title, type, details, at)
       VALUES ($1, $2, $3, $4, $5, 'task_created', $6, $7)`,
      [
        actId,
        userId,
        projectId || null,
        taskId,
        title.trim(),
        JSON.stringify({ identifier, priority, status }),
        now,
      ],
    );

    // If assigned to a different user, create notification
    if (assigneeId && assigneeId !== userId) {
      await query(
        `INSERT INTO notifications (id, user_id, actor_id, actor_name, type, title, message, entity_type, entity_id, created_at)
         VALUES ($1, $2, $3, $4, 'assignment', $5, $6, 'task', $7, $8)`,
        [
          `notif-${Date.now()}`,
          assigneeId,
          userId,
          req.user?.username || "A teammate",
          `Assigned to ${identifier}`,
          `You have been assigned to: "${title.trim()}"`,
          taskId,
          now,
        ],
      );
    }

    res.status(201).json(formatTask(result.rows[0], [], []));
  } catch (err: any) {
    console.error("Error creating task:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// 6. PATCH /tasks/:id - Update task fields
router.patch("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const currentRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (currentRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const current = currentRes.rows[0];
    const taskId = String(id);

    const perm = await canUserEditTask(userId, taskId, current);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.reason || "Unauthorized to update this task" });
    }

    if (!perm.isLeader) {
      if (req.body.assigneeId !== undefined && req.body.assigneeId !== current.assignee_id) {
        return res.status(403).json({ error: "Unauthorized: Team members cannot reassign tasks to other members" });
      }
      if (req.body.projectId !== undefined && req.body.projectId !== current.project_id) {
        return res.status(403).json({ error: "Unauthorized: Team members cannot move tasks between projects" });
      }
      if (req.body.status === "completed" && current.reviewer_id && current.reviewer_id !== userId && current.status !== "completed") {
        return res.status(400).json({
          error: "This task requires leader/reviewer sign-off. Please submit your work for review instead.",
        });
      }
    }

    // Validate fields if provided
    if (req.body.title !== undefined) {
      if (typeof req.body.title !== "string" || !req.body.title.trim()) {
        return res.status(400).json({ error: "Title must be a non-empty string" });
      }
    }
    if (req.body.status !== undefined && !VALID_STATUSES.includes(req.body.status)) {
      return res
        .status(400)
        .json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    }
    if (req.body.priority !== undefined && !VALID_PRIORITIES.includes(req.body.priority)) {
      return res
        .status(400)
        .json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` });
    }

    const title = req.body.title !== undefined ? String(req.body.title).trim() : current.title;
    const description =
      req.body.description !== undefined
        ? String(req.body.description).trim()
        : current.description;
    const status = req.body.status !== undefined ? req.body.status : current.status;
    const priority = req.body.priority !== undefined ? req.body.priority : current.priority;
    const type = req.body.type !== undefined ? req.body.type : current.type;
    const blockedReason =
      req.body.blockedReason !== undefined ? req.body.blockedReason : current.blocked_reason;
    const startDate =
      req.body.startDate !== undefined
        ? req.body.startDate
          ? new Date(req.body.startDate).toISOString()
          : null
        : current.start_date;
    const dueDate =
      req.body.dueDate !== undefined
        ? req.body.dueDate
          ? new Date(req.body.dueDate).toISOString()
          : null
        : current.due_date;
    const estimatedHours =
      req.body.estimatedHours !== undefined ? req.body.estimatedHours : current.estimated_hours;
    const actualHours =
      req.body.actualHours !== undefined ? req.body.actualHours : current.actual_hours;
    const estimate = req.body.estimate !== undefined ? req.body.estimate : current.estimate;
    const isBookmarked =
      req.body.isBookmarked !== undefined ? req.body.isBookmarked : current.is_bookmarked;
    const milestoneId =
      req.body.milestoneId !== undefined ? req.body.milestoneId : current.milestone_id;
    const progressPercent =
      req.body.progressPercent !== undefined ? Math.max(0, Math.min(100, parseInt(req.body.progressPercent, 10) || 0)) : (current.progress_percent || 0);

    const tags = req.body.tags !== undefined ? JSON.stringify(req.body.tags) : current.tags;
    const subtasks =
      req.body.subtasks !== undefined ? JSON.stringify(req.body.subtasks) : current.subtasks;
    const acceptanceCriteria =
      req.body.acceptanceCriteria !== undefined
        ? JSON.stringify(req.body.acceptanceCriteria)
        : current.acceptance_criteria;

    let projectId = current.project_id;
    let projectName = current.project_name;
    let projectColor = current.project_color;
    if (req.body.projectId !== undefined) {
      projectId = req.body.projectId || null;
      if (!projectId) {
        projectName = null;
        projectColor = null;
      } else {
        const pRes = await query("SELECT name, color FROM projects WHERE id = $1", [projectId]);
        if (pRes.rowCount && pRes.rowCount > 0) {
          projectName = pRes.rows[0].name;
          projectColor = pRes.rows[0].color;
        }
      }
    }

    let assigneeId = current.assignee_id;
    let assigneeName = current.assignee_name;
    let assigneeRole = current.assignee_role;
    let assigneeInitials = current.assignee_initials;
    if (req.body.assigneeId !== undefined) {
      assigneeId = req.body.assigneeId || null;
      if (!assigneeId) {
        assigneeName = null;
        assigneeRole = null;
        assigneeInitials = null;
      } else {
        const mRes = await query(
          `SELECT name, role, initials FROM team_members WHERE id = $1
           UNION
           SELECT full_name as name, 'Member' as role, SUBSTRING(full_name, 1, 2) as initials FROM users WHERE id = $1`,
          [assigneeId],
        );
        if (mRes.rowCount && mRes.rowCount > 0) {
          assigneeName = mRes.rows[0].name;
          assigneeRole = mRes.rows[0].role;
          assigneeInitials = mRes.rows[0].initials;
        }
      }
    }

    let reviewerId = current.reviewer_id;
    let reviewerName = current.reviewer_name;
    if (req.body.reviewerId !== undefined) {
      reviewerId = req.body.reviewerId || null;
      if (!reviewerId) {
        reviewerName = null;
      } else {
        const rRes = await query(
          `SELECT name FROM team_members WHERE id = $1
           UNION
           SELECT full_name as name FROM users WHERE id = $1`,
          [reviewerId],
        );
        if (rRes.rowCount && rRes.rowCount > 0) {
          reviewerName = rRes.rows[0].name;
        }
      }
    }

    const now = new Date().toISOString();
    const completedAt =
      status === "completed" && current.status !== "completed"
        ? now
        : status !== "completed"
          ? null
          : current.completed_at;

    const updateRes = await query(
      `UPDATE tasks
       SET title = $1, description = $2, type = $3, status = $4, priority = $5, blocked_reason = $6,
           start_date = $7, due_date = $8, estimated_hours = $9, actual_hours = $10, estimate = $11,
           project_id = $12, project_name = $13, project_color = $14,
           assignee_id = $15, assignee_name = $16, assignee_role = $17, assignee_initials = $18,
           reviewer_id = $19, reviewer_name = $20, milestone_id = $21,
           tags = $22, subtasks = $23, acceptance_criteria = $24, is_bookmarked = $25,
           completed_at = $26, progress_percent = $27, updated_at = $28
       WHERE id = $29
       RETURNING *`,
      [
        title,
        description,
        type,
        status,
        priority,
        blockedReason,
        startDate,
        dueDate,
        estimatedHours,
        actualHours,
        estimate,
        projectId,
        projectName,
        projectColor,
        assigneeId,
        assigneeName,
        assigneeRole,
        assigneeInitials,
        reviewerId,
        reviewerName,
        milestoneId,
        tags,
        subtasks,
        acceptanceCriteria,
        isBookmarked,
        completedAt,
        progressPercent,
        now,
        id,
      ],
    );

    // If status changed to in_review and reviewer exists, notify reviewer
    if (status === "in_review" && reviewerId && reviewerId !== userId) {
      await query(
        `INSERT INTO notifications (id, user_id, actor_id, actor_name, type, title, message, entity_type, entity_id, created_at)
         VALUES ($1, $2, $3, $4, 'review', $5, $6, 'task', $7, $8)`,
        [
          `notif-${Date.now()}`,
          reviewerId,
          userId,
          req.user?.username || "A teammate",
          `Review requested: ${current.identifier || title}`,
          `Task "${title}" is ready for your review and approval.`,
          id,
          now,
        ],
      );
    }

    // Record activity
    const actType =
      status === "completed" && current.status !== "completed"
        ? "completed"
        : status === "blocked" && current.status !== "blocked"
          ? "blocked"
          : "updated";

    await query(
      `INSERT INTO activities (id, user_id, project_id, task_id, task_title, type, details, at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        `act-${Date.now()}`,
        userId,
        projectId || current.project_id,
        id,
        title,
        actType,
        JSON.stringify({ status, priority }),
        now,
      ],
    );

    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id],
    );

    const depsRes = await query(
      `SELECT td.*, t.title as depends_on_title, t.identifier as depends_on_identifier, t.status as depends_on_status
       FROM task_dependencies td
       JOIN tasks t ON td.depends_on_task_id = t.id
       WHERE td.task_id = $1`,
      [id],
    );

    res.json(formatTask(updateRes.rows[0], commentsRes.rows, depsRes.rows));
  } catch (err: any) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// 7. POST /tasks/:id/status - Dedicated status transition for Kanban Drag & Drop
router.post("/:id/status", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { status, blockedReason } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const currentRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (currentRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const current = currentRes.rows[0];

    const perm = await canUserEditTask(userId, String(id), current);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.reason || "Unauthorized to update this task" });
    }
    if (status === "completed" && !perm.isLeader && current.reviewer_id && current.reviewer_id !== userId) {
      return res.status(400).json({
        error: "This task requires leader/reviewer approval. Submit for review instead.",
      });
    }

    // If moving to completed, verify if this task has unresolved blocking tasks
    if (status === "completed") {
      const blockersRes = await query(
        `SELECT t.id, t.title, t.identifier, t.status
         FROM task_dependencies td
         JOIN tasks t ON td.depends_on_task_id = t.id
         WHERE td.task_id = $1 AND td.dependency_type = 'blocked_by' AND t.status != 'completed'`,
        [id],
      );
      if (blockersRes.rowCount && blockersRes.rowCount > 0) {
        const blockerNames = blockersRes.rows.map((b) => `${b.identifier || b.id} ("${b.title}")`).join(", ");
        return res.status(400).json({
          error: `Cannot complete task: It is blocked by incomplete prerequisite tasks: ${blockerNames}`,
        });
      }
    }

    const now = new Date().toISOString();
    const completedAt = status === "completed" ? now : null;

    const updateRes = await query(
      `UPDATE tasks
       SET status = $1, blocked_reason = COALESCE($2, blocked_reason), completed_at = $3, updated_at = $4
       WHERE id = $5
       RETURNING *`,
      [status, blockedReason || (status !== "blocked" ? "" : undefined), completedAt, now, id],
    );

    // Record activity
    await query(
      `INSERT INTO activities (id, user_id, project_id, task_id, task_title, type, details, at)
       VALUES ($1, $2, $3, $4, $5, 'status_changed', $6, $7)`,
      [
        `act-${Date.now()}`,
        userId,
        current.project_id,
        id,
        current.title,
        JSON.stringify({ from: current.status, to: status }),
        now,
      ],
    );

    res.json(formatTask(updateRes.rows[0]));
  } catch (err: any) {
    console.error("Error changing task status:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// 7b. POST /tasks/:id/progress - Submit formal task progress update
router.post("/:id/progress", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const {
      status,
      progressPercent,
      workCompleted,
      workRemaining = "",
      blockers = "",
      nextSteps = "",
      timeSpentHours = 0,
      evidenceUrl = "",
      githubUrl = "",
      deploymentUrl = "",
      attachments = [],
      submissionStatus = "",
    } = req.body;

    const taskRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (taskRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const task = taskRes.rows[0];

    const perm = await canUserEditTask(userId, String(id), task);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.reason || "Unauthorized to update this task" });
    }

    if (!workCompleted || typeof workCompleted !== "string" || !workCompleted.trim()) {
      return res.status(400).json({ error: "Work completed description is required" });
    }

    const pct = parseInt(progressPercent !== undefined ? progressPercent : (task.progress_percent || 0), 10);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ error: "Progress percentage must be an integer between 0 and 100" });
    }

    const validProgressStatuses = ["ready", "in_progress", "in_review", "blocked", "completed", "backlog"];
    const targetStatus = status && validProgressStatuses.includes(status) ? status : task.status;

    if (targetStatus === "blocked" && (!blockers || !blockers.trim())) {
      return res.status(400).json({ error: "A blocker or issue reason is required when marking a task as Blocked" });
    }

    if (targetStatus === "completed" && !perm.isLeader && task.reviewer_id && task.reviewer_id !== userId) {
      return res.status(400).json({
        error: "This task requires leader/reviewer approval. Please submit for review instead.",
      });
    }

    const userRes = await query("SELECT full_name, username FROM users WHERE id = $1", [userId]);
    const userName = userRes.rows[0]?.full_name || userRes.rows[0]?.username || "Team Member";

    const updateId = `prog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const completedAt = targetStatus === "completed" ? now : null;
    const cleanBlockedReason = targetStatus === "blocked" ? blockers.trim() : (task.status === "blocked" && targetStatus !== "blocked" ? "" : task.blocked_reason);
    const addedHours = parseFloat(timeSpentHours) || 0;
    const newActualHours = (parseFloat(task.actual_hours) || 0) + addedHours;

    const effectiveSubmissionStatus = submissionStatus || (targetStatus === "in_review" ? "submitted" : (task.submission_status || "none"));
    const safeAttachmentsJson = JSON.stringify(Array.isArray(attachments) ? attachments : []);

    const progInsert = await query(
      `INSERT INTO task_progress_updates
       (id, task_id, user_id, user_name, status, progress_percent, work_completed, work_remaining, blockers, next_steps, time_spent_hours, evidence_url, github_url, deployment_url, attachments, submission_status, project_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16, $17, NOW())
       RETURNING *`,
      [
        updateId,
        id,
        userId,
        userName,
        targetStatus,
        pct,
        workCompleted.trim(),
        workRemaining ? workRemaining.trim() : "",
        blockers ? blockers.trim() : "",
        nextSteps ? nextSteps.trim() : "",
        addedHours,
        evidenceUrl ? evidenceUrl.trim() : "",
        githubUrl ? githubUrl.trim() : "",
        deploymentUrl ? deploymentUrl.trim() : "",
        safeAttachmentsJson,
        effectiveSubmissionStatus,
        task.project_id || null,
      ],
    );

    const taskUpdateRes = await query(
      `UPDATE tasks
       SET status = $1,
           progress_percent = $2,
           blocked_reason = $3,
           actual_hours = $4,
           last_progress_update_at = NOW(),
           completed_at = COALESCE($5, completed_at),
           submission_status = $6,
           github_url = COALESCE(NULLIF($7, ''), github_url),
           deployment_url = COALESCE(NULLIF($8, ''), deployment_url),
           attachments = CASE WHEN $9::jsonb IS NOT NULL AND jsonb_array_length($9::jsonb) > 0 THEN $9::jsonb ELSE attachments END,
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        targetStatus,
        pct,
        cleanBlockedReason,
        newActualHours,
        completedAt,
        effectiveSubmissionStatus,
        githubUrl ? githubUrl.trim() : "",
        deploymentUrl ? deploymentUrl.trim() : "",
        safeAttachmentsJson,
        id,
      ],
    );

    const actType = targetStatus === "in_review"
      ? "review_requested"
      : targetStatus === "blocked"
        ? "task_blocked"
        : targetStatus === "completed"
          ? "task_completed"
          : "progress_updated";

    await query(
      `INSERT INTO activities (id, user_id, project_id, task_id, task_title, type, details, at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        `act-${Date.now()}`,
        userId,
        task.project_id,
        id,
        task.title,
        actType,
        JSON.stringify({
          status: targetStatus,
          progressPercent: pct,
          workCompleted: workCompleted.trim(),
          userName,
          submissionStatus: effectiveSubmissionStatus,
          githubUrl: githubUrl || undefined,
          deploymentUrl: deploymentUrl || undefined,
        }),
      ],
    );

    const recipientId = task.reviewer_id || (task.project_id ? (await query("SELECT owner_id FROM projects WHERE id = $1", [task.project_id])).rows[0]?.owner_id : "user-om") || "user-om";

    if (recipientId && recipientId !== userId) {
      let notifTitle = `Progress Update: ${task.identifier || task.title}`;
      let notifMessage = `${userName} updated progress to ${pct}%: ${workCompleted.trim().slice(0, 100)}`;
      let notifType = "system";

      if (targetStatus === "in_review" || effectiveSubmissionStatus === "submitted") {
        notifTitle = `Work Submitted for Review: ${task.identifier || task.title}`;
        notifMessage = `${userName} submitted work for review (${pct}% complete).`;
        notifType = "review";
      } else if (targetStatus === "blocked") {
        notifTitle = `Task Blocked: ${task.identifier || task.title}`;
        notifMessage = `${userName} reported a blocker: ${blockers.trim().slice(0, 100)}`;
        notifType = "system";
      }

      await query(
        `INSERT INTO notifications (id, user_id, actor_id, actor_name, type, title, message, entity_type, entity_id, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'task', $8, FALSE, NOW())`,
        [`notif-${Date.now()}`, recipientId, userId, userName, notifType, notifTitle, notifMessage, id],
      );
    }

    res.status(201).json({
      success: true,
      task: formatTask(taskUpdateRes.rows[0]),
      progressUpdate: {
        id: progInsert.rows[0].id,
        taskId: id,
        userId,
        userName,
        status: targetStatus,
        progressPercent: pct,
        workCompleted: workCompleted.trim(),
        workRemaining: workRemaining.trim(),
        blockers: blockers.trim(),
        nextSteps: nextSteps.trim(),
        timeSpentHours: addedHours,
        evidenceUrl: evidenceUrl.trim(),
        githubUrl: progInsert.rows[0].github_url || "",
        deploymentUrl: progInsert.rows[0].deployment_url || "",
        attachments: progInsert.rows[0].attachments || [],
        submissionStatus: effectiveSubmissionStatus,
        createdAt: new Date(progInsert.rows[0].created_at).toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Error submitting progress update:", err);
    res.status(500).json({ error: "Failed to submit progress update: " + err.message });
  }
});

// 7c. GET /tasks/:id/progress - Historical progress update log
router.get("/:id/progress", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const taskRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (taskRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const task = taskRes.rows[0];

    const canView = await canUserViewTask(userId, String(id), task);
    if (!canView.allowed) {
      return res.status(403).json({ error: canView.reason || "Forbidden: You do not have permission to access this task" });
    }

    const result = await query(
      "SELECT * FROM task_progress_updates WHERE task_id = $1 ORDER BY created_at DESC",
      [id],
    );
    res.json(
      result.rows.map((p) => ({
        id: p.id,
        taskId: p.task_id,
        userId: p.user_id,
        userName: p.user_name,
        status: p.status,
        progressPercent: parseInt(p.progress_percent || "0", 10),
        workCompleted: p.work_completed,
        workRemaining: p.work_remaining || "",
        blockers: p.blockers || "",
        nextSteps: p.next_steps || "",
        timeSpentHours: parseFloat(p.time_spent_hours || "0") || 0,
        evidenceUrl: p.evidence_url || "",
        githubUrl: p.github_url || "",
        deploymentUrl: p.deployment_url || "",
        attachments: p.attachments || [],
        submissionStatus: p.submission_status || (p.status === "in_review" ? "submitted" : "none"),
        createdAt: new Date(p.created_at).toISOString(),
      })),
    );
  } catch (err: any) {
    console.error("Error fetching progress updates:", err);
    res.status(500).json({ error: "Failed to fetch progress updates" });
  }
});

// 7d. POST /tasks/:id/review - Review submission (Approve or Request Changes)
router.post("/:id/review", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { decision, feedback, progressUpdateId } = req.body;

    if (!decision || (decision !== "approved" && decision !== "changes_requested")) {
      return res.status(400).json({ error: "Decision must be either 'approved' or 'changes_requested'" });
    }
    if (!feedback || typeof feedback !== "string" || !feedback.trim()) {
      return res.status(400).json({ error: "Written feedback is required for review decisions" });
    }

    const taskRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (taskRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const task = taskRes.rows[0];

    const authCheck = await canUserReviewTask(userId, String(id), task);
    if (!authCheck.allowed) {
      return res.status(403).json({ error: authCheck.reason || "Unauthorized to review this task" });
    }

    const reviewerRes = await query("SELECT full_name, username FROM users WHERE id = $1", [userId]);
    const reviewerName = reviewerRes.rows[0]?.full_name || reviewerRes.rows[0]?.username || "Team Leader";

    const reviewId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const revInsert = await query(
      `INSERT INTO task_reviews (id, task_id, reviewer_id, reviewer_name, progress_update_id, decision, feedback, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [reviewId, id, userId, reviewerName, progressUpdateId || null, decision, feedback.trim()],
    );

    let newStatus = task.status;
    let completedAt = task.completed_at;
    let progressPercent = task.progress_percent;
    const newSubmissionStatus = decision === "approved" ? "approved" : "changes_requested";

    if (decision === "approved") {
      newStatus = "completed";
      completedAt = now;
      progressPercent = 100;
    } else {
      newStatus = "in_progress";
      completedAt = null;
    }

    const taskUpdateRes = await query(
      `UPDATE tasks
       SET status = $1, completed_at = $2, progress_percent = $3, submission_status = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [newStatus, completedAt, progressPercent, newSubmissionStatus, id],
    );

    // Update progress updates submission_status
    if (progressUpdateId) {
      await query(
        `UPDATE task_progress_updates SET submission_status = $1 WHERE id = $2`,
        [newSubmissionStatus, progressUpdateId],
      );
    } else {
      await query(
        `UPDATE task_progress_updates SET submission_status = $1 WHERE task_id = $2 AND created_at = (SELECT MAX(created_at) FROM task_progress_updates WHERE task_id = $2)`,
        [newSubmissionStatus, id],
      );
    }

    await query(
      `INSERT INTO activities (id, user_id, project_id, task_id, task_title, type, details, at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        `act-${Date.now()}`,
        userId,
        task.project_id,
        id,
        task.title,
        decision === "approved" ? "task_approved" : "changes_requested",
        JSON.stringify({ decision, reviewerName, feedback: feedback.trim() }),
      ],
    );

    if (task.assignee_id && task.assignee_id !== userId) {
      const notifTitle = decision === "approved"
        ? `Task Approved: ${task.identifier || task.title}`
        : `Changes Requested: ${task.identifier || task.title}`;
      const notifMessage = decision === "approved"
        ? `${reviewerName} approved your work: "${feedback.trim().slice(0, 100)}"`
        : `${reviewerName} requested changes: "${feedback.trim().slice(0, 100)}"`;

      await query(
        `INSERT INTO notifications (id, user_id, actor_id, actor_name, type, title, message, entity_type, entity_id, is_read, created_at)
         VALUES ($1, $2, $3, $4, 'review', $5, $6, 'task', $7, FALSE, NOW())`,
        [`notif-${Date.now()}`, task.assignee_id, userId, reviewerName, notifTitle, notifMessage, id],
      );
    }

    res.status(201).json({
      success: true,
      task: formatTask(taskUpdateRes.rows[0]),
      review: {
        id: revInsert.rows[0].id,
        taskId: id,
        reviewerId: userId,
        reviewerName,
        progressUpdateId: progressUpdateId || undefined,
        decision,
        feedback: feedback.trim(),
        createdAt: new Date(revInsert.rows[0].created_at).toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Error submitting review:", err);
    res.status(500).json({ error: "Failed to submit review: " + err.message });
  }
});

// 7e. GET /tasks/:id/reviews - Review decision history
router.get("/:id/reviews", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const taskRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (taskRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const task = taskRes.rows[0];

    const canView = await canUserViewTask(userId, String(id), task);
    if (!canView.allowed) {
      return res.status(403).json({ error: canView.reason || "Forbidden: You do not have permission to access this task" });
    }

    const result = await query(
      "SELECT * FROM task_reviews WHERE task_id = $1 ORDER BY created_at DESC",
      [id],
    );
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        taskId: r.task_id,
        reviewerId: r.reviewer_id,
        reviewerName: r.reviewer_name,
        progressUpdateId: r.progress_update_id || undefined,
        decision: r.decision,
        feedback: r.feedback,
        createdAt: new Date(r.created_at).toISOString(),
      })),
    );
  } catch (err: any) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// 8. Task Dependencies API with Circular Dependency Prevention
router.get("/:id/dependencies", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const taskRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (taskRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const task = taskRes.rows[0];

    const canView = await canUserViewTask(userId, String(id), task);
    if (!canView.allowed) {
      return res.status(403).json({ error: canView.reason || "Forbidden: You do not have permission to access this task" });
    }

    const depsRes = await query(
      `SELECT td.*, t.title as depends_on_title, t.identifier as depends_on_identifier, t.status as depends_on_status
       FROM task_dependencies td
       JOIN tasks t ON td.depends_on_task_id = t.id
       WHERE td.task_id = $1`,
      [id],
    );
    res.json(depsRes.rows);
  } catch (err: any) {
    console.error("Error fetching dependencies:", err);
    res.status(500).json({ error: "Failed to fetch dependencies" });
  }
});

router.post("/:id/dependencies", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { dependsOnTaskId, dependencyType = "blocked_by" } = req.body;

    if (!dependsOnTaskId) {
      return res.status(400).json({ error: "Target dependsOnTaskId is required" });
    }
    if (id === dependsOnTaskId) {
      return res.status(400).json({ error: "A task cannot depend on itself" });
    }

    // Verify both tasks exist
    const checkRes = await query("SELECT id FROM tasks WHERE id = $1 OR id = $2", [id, dependsOnTaskId]);
    if (checkRes.rowCount !== 2) {
      return res.status(404).json({ error: "One or both tasks could not be found" });
    }

    // Run directed acyclic graph cycle check
    const isCircular = await wouldCreateCycle(String(id), String(dependsOnTaskId));
    if (isCircular) {
      return res.status(400).json({
        error: "Circular dependency detected: Adding this relationship would create an invalid cyclic dependency loop between tasks.",
      });
    }

    const depId = `dep-${Date.now()}`;
    await query(
      `INSERT INTO task_dependencies (id, task_id, depends_on_task_id, dependency_type, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (task_id, depends_on_task_id, dependency_type) DO NOTHING`,
      [depId, id, dependsOnTaskId, dependencyType],
    );

    // If dependencyType is 'blocked_by', optionally mark task as 'blocked'
    if (dependencyType === "blocked_by") {
      const targetTask = await query("SELECT title, status FROM tasks WHERE id = $1", [dependsOnTaskId]);
      if (targetTask.rows[0]?.status !== "completed") {
        await query(
          "UPDATE tasks SET status = 'blocked', blocked_reason = $1 WHERE id = $2 AND status != 'completed'",
          [`Blocked by prerequisite: "${targetTask.rows[0]?.title}"`, id],
        );
      }
    }

    res.status(201).json({ success: true, id: depId });
  } catch (err: any) {
    console.error("Error adding task dependency:", err);
    res.status(500).json({ error: "Failed to add dependency" });
  }
});

router.delete("/:id/dependencies/:depId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { depId } = req.params;
    await query("DELETE FROM task_dependencies WHERE id = $1", [depId]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error removing dependency:", err);
    res.status(500).json({ error: "Failed to remove dependency" });
  }
});

// 9. Subtasks, Bookmark, Delete, Comments
router.post("/:id/subtasks/:subtaskId/toggle", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id, subtaskId } = req.params;

    const currentRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (currentRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const current = currentRes.rows[0];

    let subtasks: any[] = [];
    try {
      subtasks =
        typeof current.subtasks === "string"
          ? JSON.parse(current.subtasks)
          : current.subtasks || [];
    } catch {}

    const updatedSubtasks = subtasks.map((s: any) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s,
    );

    const updateRes = await query(
      `UPDATE tasks
       SET subtasks = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(updatedSubtasks), id],
    );

    res.json(formatTask(updateRes.rows[0]));
  } catch (err: any) {
    console.error("Error toggling subtask:", err);
    res.status(500).json({ error: "Failed to toggle subtask" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query(
      "UPDATE tasks SET is_trash = TRUE, deleted_at = NOW(), updated_at = NOW() WHERE id = $1",
      [id],
    );
    res.status(204).send();
  } catch (err: any) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

router.post("/:id/restore", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateRes = await query(
      `UPDATE tasks
       SET is_trash = FALSE, deleted_at = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    if (updateRes.rowCount === 0) return res.status(404).json({ error: "Task not found" });
    res.json(formatTask(updateRes.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to restore task" });
  }
});

router.delete("/:id/permanent", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM tasks WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

router.delete("/trash/empty", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await query("DELETE FROM tasks WHERE is_trash = TRUE");
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: "Failed to empty trash" });
  }
});

router.post("/:id/bookmark", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentRes = await query("SELECT is_bookmarked FROM tasks WHERE id = $1", [id]);
    if (currentRes.rowCount === 0) return res.status(404).json({ error: "Task not found" });

    const nextBookmarked = !currentRes.rows[0].is_bookmarked;
    const updateRes = await query(
      "UPDATE tasks SET is_bookmarked = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [nextBookmarked, id],
    );
    res.json(formatTask(updateRes.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to toggle bookmark" });
  }
});

router.post("/:id/comments", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { content, author } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    const taskRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (taskRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const task = taskRes.rows[0];

    const canView = await canUserViewTask(userId, String(id), task);
    if (!canView.allowed) {
      return res.status(403).json({ error: canView.reason || "Forbidden: You do not have permission to access this task" });
    }

    // Extract @mentions if any
    const mentionsMatch = content.match(/@(\w+)/g);
    const mentions = mentionsMatch ? mentionsMatch.map((m: string) => m.substring(1)) : [];

    const commentId = `comm-${Date.now()}`;
    await query(
      `INSERT INTO task_comments (id, task_id, user_id, author, content, mentions, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        commentId,
        id,
        userId,
        author && author.trim() ? author.trim() : req.user?.username || "Teammate",
        content.trim(),
        JSON.stringify(mentions),
      ],
    );

    // If there are mentions, generate notifications for mentioned users
    for (const mention of mentions) {
      const uRes = await query("SELECT id FROM users WHERE LOWER(username) = $1", [mention.toLowerCase()]);
      if (uRes.rowCount && uRes.rowCount > 0) {
        await query(
          `INSERT INTO notifications (id, user_id, actor_id, actor_name, type, title, message, entity_type, entity_id, created_at)
           VALUES ($1, $2, $3, $4, 'mention', 'Mentioned in a comment', $5, 'task', $6, NOW())`,
          [
            `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            uRes.rows[0].id,
            userId,
            author || "A teammate",
            `Mentioned you in task comments: "${content.trim().slice(0, 80)}"`,
            id,
          ],
        );
      }
    }

    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id],
    );
    const freshTaskRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    res.json(formatTask(freshTaskRes.rows[0] || task, commentsRes.rows));
  } catch (err: any) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

export default router;
