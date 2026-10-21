import { Router, Request, Response } from "express";
import { query } from "../db.js";
import { extractToken, verifyToken } from "../auth.js";

const router = Router();

export const VALID_STATUSES = ["pending", "in_progress", "in_review", "completed"];
export const VALID_PRIORITIES = ["low", "medium", "high"];

function getUserId(req: Request): string {
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded?.userId) return decoded.userId;
  }
  const custom = req.headers["x-user-id"] as string;
  return custom && custom.trim() ? custom.trim() : "user-om";
}

function formatTask(row: any, comments: any[] = []) {
  let tags: string[] = [];
  try {
    tags = typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags || [];
  } catch {}

  let subtasks: any[] = [];
  try {
    subtasks = typeof row.subtasks === "string" ? JSON.parse(row.subtasks) : row.subtasks || [];
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

  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id || undefined,
    projectName: row.project_name || undefined,
    projectColor: row.project_color || undefined,
    assignee,
    title: row.title,
    description: row.description || "",
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
    estimate: row.estimate || "3 pts",
    tags,
    subtasks,
    isBookmarked: Boolean(row.is_bookmarked),
    isTrash: Boolean(row.is_trash),
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
    recurrence: row.recurrence || "none",
    focusTimeSeconds: row.focus_time_seconds || 0,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    comments: comments.map((c) => ({
      id: c.id,
      author: c.author,
      content: c.content,
      createdAt: new Date(c.created_at).toISOString(),
    })),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

// 1. GET /tasks/stats - Get dashboard statistics
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await query("SELECT * FROM tasks WHERE user_id = $1", [userId]);
    const tasks = result.rows;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const pending = tasks.filter((t) => t.status === "pending").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const inReview = tasks.filter((t) => t.status === "in_review").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const overdue = tasks.filter(
      (t) => t.status !== "completed" && t.due_date && new Date(t.due_date) < now,
    ).length;

    const total = tasks.length;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;

    res.json({
      total,
      pending,
      inProgress,
      inReview,
      completed,
      overdue,
      completionRate,
      byPriority: {
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

// 2. GET /tasks - List all tasks for user
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tasksRes = await query(
      "SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );

    // Fetch comments for these tasks
    const commentsRes = await query(
      `SELECT c.* FROM task_comments c
       JOIN tasks t ON c.task_id = t.id
       WHERE t.user_id = $1
       ORDER BY c.created_at ASC`,
      [userId],
    );

    const commentsByTask: Record<string, any[]> = {};
    for (const c of commentsRes.rows) {
      if (!commentsByTask[c.task_id]) commentsByTask[c.task_id] = [];
      commentsByTask[c.task_id].push(c);
    }

    const tasks = tasksRes.rows.map((row) => formatTask(row, commentsByTask[row.id] || []));

    res.json(tasks);
  } catch (err: any) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// 3. GET /tasks/:id - Single task
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const taskRes = await query("SELECT * FROM tasks WHERE id = $1 AND user_id = $2", [id, userId]);

    if (taskRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id],
    );

    res.json(formatTask(taskRes.rows[0], commentsRes.rows));
  } catch (err: any) {
    console.error("Error fetching task:", err);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// 4. POST /tasks - Create task
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const {
      title,
      description = "",
      status = "pending",
      priority = "medium",
      dueDate = null,
      projectId,
      assigneeId,
      estimate = "3 pts",
      tags = [],
      subtasks = [],
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

    // Ensure user exists in users table
    await query(
      `INSERT INTO users (id, username, full_name, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [userId, userId, userId, `${userId}@example.com`],
    );

    let projectName = null;
    let projectColor = null;
    if (projectId) {
      const pRes = await query("SELECT name, color FROM projects WHERE id = $1", [projectId]);
      if (pRes.rowCount && pRes.rowCount > 0) {
        projectName = pRes.rows[0].name;
        projectColor = pRes.rows[0].color;
      }
    }

    let assigneeName = null;
    let assigneeRole = null;
    let assigneeInitials = null;
    if (assigneeId) {
      const mRes = await query("SELECT name, role, initials FROM team_members WHERE id = $1", [
        assigneeId,
      ]);
      if (mRes.rowCount && mRes.rowCount > 0) {
        assigneeName = mRes.rows[0].name;
        assigneeRole = mRes.rows[0].role;
        assigneeInitials = mRes.rows[0].initials;
      }
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const result = await query(
      `INSERT INTO tasks (
         id, user_id, project_id, project_name, project_color,
         assignee_id, assignee_name, assignee_role, assignee_initials,
         title, description, status, priority, due_date, estimate, tags, subtasks,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        taskId,
        userId,
        projectId || null,
        projectName,
        projectColor,
        assigneeId || null,
        assigneeName,
        assigneeRole,
        assigneeInitials,
        title.trim(),
        description.trim(),
        status,
        priority,
        dueDate,
        estimate,
        JSON.stringify(tags),
        JSON.stringify(subtasks),
        now,
        now,
      ],
    );

    // Record activity
    const actId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await query(
      `INSERT INTO activities (id, user_id, task_id, task_title, type, at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actId, userId, taskId, title.trim(), "created", now],
    );

    res.status(201).json(formatTask(result.rows[0], []));
  } catch (err: any) {
    console.error("Error creating task:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// 5. PATCH /tasks/:id - Update task
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    // Get current task
    const currentRes = await query("SELECT * FROM tasks WHERE id = $1 AND user_id = $2", [
      id,
      userId,
    ]);
    if (currentRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const current = currentRes.rows[0];

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
    const dueDate = req.body.dueDate !== undefined ? req.body.dueDate : current.due_date;
    const estimate = req.body.estimate !== undefined ? req.body.estimate : current.estimate;
    const isBookmarked =
      req.body.isBookmarked !== undefined ? req.body.isBookmarked : current.is_bookmarked;
    const tags = req.body.tags !== undefined ? JSON.stringify(req.body.tags) : current.tags;
    const subtasks =
      req.body.subtasks !== undefined ? JSON.stringify(req.body.subtasks) : current.subtasks;

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
        } else {
          projectName = null;
          projectColor = null;
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
        const mRes = await query("SELECT name, role, initials FROM team_members WHERE id = $1", [
          assigneeId,
        ]);
        if (mRes.rowCount && mRes.rowCount > 0) {
          assigneeName = mRes.rows[0].name;
          assigneeRole = mRes.rows[0].role;
          assigneeInitials = mRes.rows[0].initials;
        } else {
          assigneeName = null;
          assigneeRole = null;
          assigneeInitials = null;
        }
      }
    }

    const now = new Date().toISOString();

    const updateRes = await query(
      `UPDATE tasks
       SET title = $1, description = $2, status = $3, priority = $4, due_date = $5,
           project_id = $6, project_name = $7, project_color = $8,
           assignee_id = $9, assignee_name = $10, assignee_role = $11, assignee_initials = $12,
           estimate = $13, tags = $14, subtasks = $15, is_bookmarked = $16, updated_at = $17
       WHERE id = $18 AND user_id = $19
       RETURNING *`,
      [
        title,
        description,
        status,
        priority,
        dueDate,
        projectId,
        projectName,
        projectColor,
        assigneeId,
        assigneeName,
        assigneeRole,
        assigneeInitials,
        estimate,
        tags,
        subtasks,
        isBookmarked,
        now,
        id,
        userId,
      ],
    );

    // Only record activity if fields actually changed
    const hasChanged =
      title !== current.title ||
      description !== current.description ||
      status !== current.status ||
      priority !== current.priority ||
      dueDate !== current.due_date ||
      projectId !== current.project_id ||
      assigneeId !== current.assignee_id ||
      estimate !== current.estimate;

    if (hasChanged) {
      const actType =
        status === "completed" && current.status !== "completed" ? "completed" : "updated";
      const actId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await query(
        `INSERT INTO activities (id, user_id, task_id, task_title, type, at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [actId, userId, id, title, actType, now],
      );
    }

    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id],
    );

    res.json(formatTask(updateRes.rows[0], commentsRes.rows));
  } catch (err: any) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// 6. POST /tasks/:id/subtasks/:subtaskId/toggle - Toggle subtask completion
router.post("/:id/subtasks/:subtaskId/toggle", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id, subtaskId } = req.params;

    const currentRes = await query("SELECT * FROM tasks WHERE id = $1 AND user_id = $2", [
      id,
      userId,
    ]);
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

    const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every((s: any) => s.completed);
    const newStatus = allDone
      ? "completed"
      : current.status === "completed"
        ? "in_progress"
        : current.status;

    const updateRes = await query(
      `UPDATE tasks
       SET subtasks = $1, status = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [JSON.stringify(updatedSubtasks), newStatus, id, userId],
    );

    // Record activity for subtask update
    const now = new Date().toISOString();
    const actId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await query(
      `INSERT INTO activities (id, user_id, task_id, task_title, type, at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actId, userId, id, current.title, allDone ? "completed" : "updated", now],
    );

    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id],
    );

    res.json(formatTask(updateRes.rows[0], commentsRes.rows));
  } catch (err: any) {
    console.error("Error toggling subtask:", err);
    res.status(500).json({ error: "Failed to toggle subtask" });
  }
});

// 7. DELETE /tasks/:id - Soft-delete task (move to Trash)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const currentRes = await query("SELECT * FROM tasks WHERE id = $1 AND user_id = $2", [
      id,
      userId,
    ]);
    if (currentRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const current = currentRes.rows[0];

    await query(
      "UPDATE tasks SET is_trash = TRUE, deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2",
      [id, userId],
    );

    // Record activity
    const now = new Date().toISOString();
    const actId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await query(
      `INSERT INTO activities (id, user_id, task_id, task_title, type, at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actId, userId, id, current.title, "deleted", now],
    );

    res.status(204).send();
  } catch (err: unknown) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// 7a. POST /tasks/:id/restore - Restore from Trash
router.post("/:id/restore", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const updateRes = await query(
      `UPDATE tasks
       SET is_trash = FALSE, deleted_at = NULL, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId],
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found in trash" });
    }

    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id],
    );

    res.json(formatTask(updateRes.rows[0], commentsRes.rows));
  } catch (err: unknown) {
    console.error("Error restoring task:", err);
    res.status(500).json({ error: "Failed to restore task" });
  }
});

// 7b. DELETE /tasks/:id/permanent - Permanently delete task
router.delete("/:id/permanent", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    await query("DELETE FROM tasks WHERE id = $1 AND user_id = $2", [id, userId]);
    res.status(204).send();
  } catch (err: unknown) {
    console.error("Error permanently deleting task:", err);
    res.status(500).json({ error: "Failed to delete task permanently" });
  }
});

// 7c. DELETE /tasks/trash/empty - Empty all trash items
router.delete("/trash/empty", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    await query("DELETE FROM tasks WHERE user_id = $1 AND is_trash = TRUE", [userId]);
    res.status(204).send();
  } catch (err: unknown) {
    console.error("Error emptying trash:", err);
    res.status(500).json({ error: "Failed to empty trash" });
  }
});

// 8. POST /tasks/:id/bookmark - Toggle bookmark
router.post("/:id/bookmark", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const currentRes = await query("SELECT * FROM tasks WHERE id = $1 AND user_id = $2", [
      id,
      userId,
    ]);
    if (currentRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const current = currentRes.rows[0];
    const nextBookmarked = !current.is_bookmarked;

    const updateRes = await query(
      `UPDATE tasks
       SET is_bookmarked = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [nextBookmarked, id, userId],
    );

    // Record activity for bookmark update
    const now = new Date().toISOString();
    const actId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await query(
      `INSERT INTO activities (id, user_id, task_id, task_title, type, at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actId, userId, id, current.title, "updated", now],
    );

    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id],
    );

    res.json(formatTask(updateRes.rows[0], commentsRes.rows));
  } catch (err: any) {
    console.error("Error toggling bookmark:", err);
    res.status(500).json({ error: "Failed to toggle bookmark" });
  }
});

// 9. POST /tasks/:id/comments - Add comment
router.post("/:id/comments", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { content, author = "Om Thakkar" } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    const currentRes = await query("SELECT * FROM tasks WHERE id = $1 AND user_id = $2", [
      id,
      userId,
    ]);
    if (currentRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const commentId = `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await query(
      `INSERT INTO task_comments (id, task_id, author, content, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [commentId, id, author.trim(), content.trim()],
    );

    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id],
    );

    res.json(formatTask(currentRes.rows[0], commentsRes.rows));
  } catch (err: any) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

export default router;
