import { Router, Request, Response } from "express";
import { query } from "../db.js";

const router = Router();

function getUserId(req: Request): string {
  const custom = req.headers["x-user-id"] as string;
  return custom && custom.trim() ? custom.trim() : "user-om";
}

function formatTask(row: any, comments: any[] = []) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description || "",
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
    isBookmarked: Boolean(row.is_bookmarked),
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
    const completed = tasks.filter((t) => t.status === "completed").length;
    const overdue = tasks.filter(
      (t) => t.status !== "completed" && t.due_date && new Date(t.due_date) < now
    ).length;

    const total = tasks.length;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;

    res.json({
      total,
      pending,
      inProgress,
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
      [userId]
    );

    // Fetch comments for these tasks
    const commentsRes = await query(
      `SELECT c.* FROM task_comments c
       JOIN tasks t ON c.task_id = t.id
       WHERE t.user_id = $1
       ORDER BY c.created_at ASC`,
      [userId]
    );

    const commentsByTask: Record<string, any[]> = {};
    for (const c of commentsRes.rows) {
      if (!commentsByTask[c.task_id]) commentsByTask[c.task_id] = [];
      commentsByTask[c.task_id].push(c);
    }

    const tasks = tasksRes.rows.map((row) =>
      formatTask(row, commentsByTask[row.id] || [])
    );

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

    const taskRes = await query("SELECT * FROM tasks WHERE id = $1 AND user_id = $2", [
      id,
      userId,
    ]);

    if (taskRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id]
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
    const { title, description = "", status = "pending", priority = "medium", dueDate = null } =
      req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Ensure user exists in users table (e.g. if new user logged in on frontend)
    await query(
      `INSERT INTO users (id, username, full_name, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [userId, userId, userId, `${userId}@example.com`]
    );

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const result = await query(
      `INSERT INTO tasks (id, user_id, title, description, status, priority, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [taskId, userId, title.trim(), description.trim(), status, priority, dueDate, now, now]
    );

    // Record activity
    const actId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await query(
      `INSERT INTO activities (id, user_id, task_id, task_title, type, at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actId, userId, taskId, title.trim(), "created", now]
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

    const title = req.body.title !== undefined ? req.body.title.trim() : current.title;
    const description =
      req.body.description !== undefined ? req.body.description.trim() : current.description;
    const status = req.body.status !== undefined ? req.body.status : current.status;
    const priority = req.body.priority !== undefined ? req.body.priority : current.priority;
    const dueDate = req.body.dueDate !== undefined ? req.body.dueDate : current.due_date;
    const isBookmarked =
      req.body.isBookmarked !== undefined ? req.body.isBookmarked : current.is_bookmarked;
    const now = new Date().toISOString();

    const updateRes = await query(
      `UPDATE tasks
       SET title = $1, description = $2, status = $3, priority = $4, due_date = $5, is_bookmarked = $6, updated_at = $7
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [title, description, status, priority, dueDate, isBookmarked, now, id, userId]
    );

    // Record activity if status changed or major update
    const actType = status === "completed" && current.status !== "completed" ? "completed" : "updated";
    const actId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await query(
      `INSERT INTO activities (id, user_id, task_id, task_title, type, at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actId, userId, id, title, actType, now]
    );

    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id]
    );

    res.json(formatTask(updateRes.rows[0], commentsRes.rows));
  } catch (err: any) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// 6. DELETE /tasks/:id - Delete task
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

    await query("DELETE FROM tasks WHERE id = $1 AND user_id = $2", [id, userId]);

    // Record activity
    const now = new Date().toISOString();
    const actId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await query(
      `INSERT INTO activities (id, user_id, task_id, task_title, type, at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actId, userId, id, current.title, "deleted", now]
    );

    res.status(204).send();
  } catch (err: any) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// 7. POST /tasks/:id/bookmark - Toggle bookmark
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
    const nextBookmarked = !currentRes.rows[0].is_bookmarked;

    const updateRes = await query(
      `UPDATE tasks
       SET is_bookmarked = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [nextBookmarked, id, userId]
    );

    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id]
    );

    res.json(formatTask(updateRes.rows[0], commentsRes.rows));
  } catch (err: any) {
    console.error("Error toggling bookmark:", err);
    res.status(500).json({ error: "Failed to toggle bookmark" });
  }
});

// 8. POST /tasks/:id/comments - Add comment
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
      [commentId, id, author.trim(), content.trim()]
    );

    // Refresh task and all its comments
    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id]
    );

    res.json(formatTask(currentRes.rows[0], commentsRes.rows));
  } catch (err: any) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

export default router;
