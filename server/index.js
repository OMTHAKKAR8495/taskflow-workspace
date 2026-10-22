"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_express9 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_cookie_parser = __toESM(require("cookie-parser"));
var import_dotenv2 = __toESM(require("dotenv"));

// src/routes/auth.ts
var import_express = require("express");

// src/db.ts
var import_pg = __toESM(require("pg"));
var import_dotenv = __toESM(require("dotenv"));
var import_path = __toESM(require("path"));
var getDirname = () => {
  if (typeof __dirname !== "undefined") {
    return __dirname;
  }
  return process.cwd();
};
var currentDir = getDirname();
import_dotenv.default.config({ path: import_path.default.resolve(currentDir, "../.env") });
import_dotenv.default.config();
var { Pool } = import_pg.default;
function getNormalizedDatabaseUrl() {
  let url = process.env.DATABASE_URL;
  if (!url) return void 0;
  if (url.includes("db.ciqhtdrunnnwsiyobtvp.supabase.co")) {
    url = url.replace("postgres:", "postgres.ciqhtdrunnnwsiyobtvp:").replace("db.ciqhtdrunnnwsiyobtvp.supabase.co:5432", "aws-0-ap-northeast-1.pooler.supabase.com:5432").replace("db.ciqhtdrunnnwsiyobtvp.supabase.co", "aws-0-ap-northeast-1.pooler.supabase.com:5432");
  }
  return url;
}
var resolvedDbUrl = getNormalizedDatabaseUrl();
var isRemoteDb = Boolean(
  resolvedDbUrl && (resolvedDbUrl.includes("supabase") || resolvedDbUrl.includes("sslmode=require") || resolvedDbUrl.includes("neon.tech") || process.env.DB_SSL === "true")
);
var pool = new Pool({
  connectionString: resolvedDbUrl || `postgresql://${process.env.PGUSER || process.env.USER || "postgres"}:${process.env.PGPASSWORD || ""}@${process.env.PGHOST || "localhost"}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || "taskflow_db"}`,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : void 0,
  max: 20,
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 1e4
});
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development") {
  }
  return res;
}

// src/auth.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var JWT_SECRET = process.env["JWT_SECRET"] || "taskflow-super-secret-key-2026";
async function hashPassword(plainText) {
  return import_bcryptjs.default.hash(plainText, 10);
}
async function verifyPassword(plainText, hash) {
  return import_bcryptjs.default.compare(plainText, hash);
}
function generateToken(user) {
  return import_jsonwebtoken.default.sign(user, JWT_SECRET, { expiresIn: "7d" });
}
function verifyToken(token) {
  try {
    return import_jsonwebtoken.default.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
function extractToken(req) {
  if (req.cookies && req.cookies["taskflow_token"]) {
    return req.cookies["taskflow_token"] ?? null;
  }
  const authHeader = req.headers ? req.headers["authorization"] : void 0;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  return null;
}
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.user = decoded;
  req.userId = decoded.userId;
  next();
}
function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
      req.userId = decoded.userId;
    }
  }
  next();
}
var authAttempts = /* @__PURE__ */ new Map();
var RATE_LIMIT_WINDOW_MS = 15 * 60 * 1e3;
var MAX_AUTH_ATTEMPTS = 50;
function authRateLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
  const now = Date.now();
  const record = authAttempts.get(ip);
  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    authAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }
  if (record.count >= MAX_AUTH_ATTEMPTS) {
    return res.status(429).json({
      error: "Too many authentication requests. Please try again later.",
      retryAfterSeconds: Math.ceil((record.firstAttempt + RATE_LIMIT_WINDOW_MS - now) / 1e3)
    });
  }
  record.count++;
  next();
}

// src/routes/auth.ts
var router = (0, import_express.Router)();
router.post("/register", authRateLimiter, async (req, res) => {
  try {
    const { fullName, email, username, password } = req.body;
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return res.status(400).json({ error: "Full name is required" });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim();
    const existing = await query(
      "SELECT id FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $2",
      [cleanUsername, cleanEmail]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(409).json({ error: "Username or email is already in use" });
    }
    const hashedPassword = await hashPassword(password);
    const userId = `user-${Date.now()}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const insertRes = await query(
      `INSERT INTO users (id, username, full_name, email, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, full_name, email, avatar_url, created_at`,
      [userId, cleanUsername, cleanFullName, cleanEmail, hashedPassword, now, now]
    );
    const user = insertRes.rows[0];
    const token = generateToken({ userId: user.id, username: user.username });
    res.cookie("taskflow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
    });
    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        avatarUrl: user.avatar_url || ""
      },
      token
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});
router.post("/login", authRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    const cleanUsername = String(username).trim().toLowerCase();
    const result = await query(
      `SELECT id, username, full_name, email, avatar_url, password_hash
       FROM users
       WHERE LOWER(username) = $1 OR LOWER(email) = $1`,
      [cleanUsername]
    );
    if (!result.rowCount || result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = result.rows[0];
    let isValid = false;
    if (user.password_hash) {
      if (user.password_hash.startsWith("$2a$") || user.password_hash.startsWith("$2b$")) {
        isValid = await verifyPassword(password, user.password_hash);
      } else {
        isValid = user.password_hash === password;
        if (isValid) {
          const newHash = await hashPassword(password);
          await query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, user.id]);
        }
      }
    }
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = generateToken({ userId: user.id, username: user.username });
    res.cookie("taskflow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
    });
    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        avatarUrl: user.avatar_url || ""
      },
      token
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});
router.post("/logout", (_req, res) => {
  res.clearCookie("taskflow_token");
  res.json({ success: true, message: "Logged out successfully" });
});
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const result = await query(
      `SELECT id, username, full_name, email, avatar_url, created_at
       FROM users WHERE id = $1`,
      [userId]
    );
    if (!result.rowCount || result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const u = result.rows[0];
    res.json({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      email: u.email,
      avatarUrl: u.avatar_url || ""
    });
  } catch (err) {
    console.error("Auth me error:", err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});
var auth_default = router;

// src/routes/tasks.ts
var import_express2 = require("express");

// src/dependencies.ts
async function wouldCreateCycle(taskId, dependsOnTaskId) {
  if (taskId === dependsOnTaskId) {
    return true;
  }
  const res = await query("SELECT task_id, depends_on_task_id, dependency_type FROM task_dependencies");
  const adj = /* @__PURE__ */ new Map();
  for (const row of res.rows) {
    let t = row.task_id;
    let dep = row.depends_on_task_id;
    if (row.dependency_type === "blocks") {
      const temp = t;
      t = dep;
      dep = temp;
    }
    if (!adj.has(t)) adj.set(t, /* @__PURE__ */ new Set());
    adj.get(t).add(dep);
  }
  const visited = /* @__PURE__ */ new Set();
  const queue = [dependsOnTaskId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === taskId) {
      return true;
    }
    if (!visited.has(current)) {
      visited.add(current);
      const prerequisites = adj.get(current);
      if (prerequisites) {
        for (const p of prerequisites) {
          if (!visited.has(p)) {
            queue.push(p);
          }
        }
      }
    }
  }
  return false;
}

// src/routes/tasks.ts
var router2 = (0, import_express2.Router)();
var VALID_STATUSES = [
  "backlog",
  "ready",
  "in_progress",
  "in_review",
  "blocked",
  "completed",
  "pending"
  // backwards compatibility
];
var VALID_PRIORITIES = ["critical", "high", "medium", "low"];
function getUserId(req) {
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded?.userId) return decoded.userId;
  }
  const custom = req.headers["x-user-id"];
  return custom && custom.trim() ? custom.trim() : "user-om";
}
function formatTask(row, comments = [], dependencies = []) {
  let tags = [];
  try {
    tags = typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags || [];
  } catch {
  }
  let subtasks = [];
  try {
    subtasks = typeof row.subtasks === "string" ? JSON.parse(row.subtasks) : row.subtasks || [];
  } catch {
  }
  let acceptanceCriteria = [];
  try {
    acceptanceCriteria = typeof row.acceptance_criteria === "string" ? JSON.parse(row.acceptance_criteria) : row.acceptance_criteria || [];
  } catch {
  }
  const assignee = row.assignee_id ? {
    id: row.assignee_id,
    name: row.assignee_name || "Assignee",
    role: row.assignee_role || "Team Member",
    email: `${row.assignee_id}@example.com`,
    initials: row.assignee_initials || "TM"
  } : void 0;
  const reviewer = row.reviewer_id ? {
    id: row.reviewer_id,
    name: row.reviewer_name || "Reviewer"
  } : void 0;
  const status = row.status || "backlog";
  return {
    id: row.id,
    identifier: row.identifier || `NEX-${row.id.replace(/[^0-9]/g, "").slice(-3) || "100"}`,
    userId: row.user_id,
    projectId: row.project_id || void 0,
    projectName: row.project_name || void 0,
    projectColor: row.project_color || void 0,
    assignee,
    reviewer,
    title: row.title,
    description: row.description || "",
    type: row.type || "task",
    status,
    priority: row.priority || "medium",
    blockedReason: row.blocked_reason || "",
    startDate: row.start_date ? new Date(row.start_date).toISOString() : null,
    dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
    estimatedHours: parseFloat(row.estimated_hours || "0") || 0,
    actualHours: parseFloat(row.actual_hours || "0") || 0,
    estimate: row.estimate || "3 pts",
    tags,
    subtasks,
    acceptanceCriteria,
    milestoneId: row.milestone_id || void 0,
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
      createdAt: new Date(c.created_at).toISOString()
    })),
    dependencies: dependencies.map((d) => ({
      id: d.id,
      taskId: d.task_id,
      dependsOnTaskId: d.depends_on_task_id,
      dependsOnTaskTitle: d.depends_on_title || "Dependent Task",
      dependsOnTaskIdentifier: d.depends_on_identifier || "NEX-000",
      dependsOnTaskStatus: d.depends_on_status || "backlog",
      dependencyType: d.dependency_type
    })),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}
router2.get("/stats", optionalAuth, async (req, res) => {
  try {
    const { projectId } = req.query;
    let sql = "SELECT * FROM tasks WHERE is_trash = FALSE";
    const params = [];
    if (projectId && typeof projectId === "string" && projectId !== "all") {
      params.push(projectId);
      sql += ` AND project_id = $${params.length}`;
    }
    const result = await query(sql, params);
    const tasks = result.rows;
    const now = /* @__PURE__ */ new Date();
    now.setHours(0, 0, 0, 0);
    const backlog = tasks.filter((t) => t.status === "backlog").length;
    const ready = tasks.filter((t) => t.status === "ready" || t.status === "pending").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const inReview = tasks.filter((t) => t.status === "in_review").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const overdue = tasks.filter(
      (t) => t.status !== "completed" && t.due_date && new Date(t.due_date) < now
    ).length;
    const dueThisWeek = tasks.filter((t) => {
      if (t.status === "completed" || !t.due_date) return false;
      const d = new Date(t.due_date);
      const weekFromNow = /* @__PURE__ */ new Date();
      weekFromNow.setDate(now.getDate() + 7);
      return d >= now && d <= weekFromNow;
    }).length;
    const total = tasks.length;
    const completionRate = total ? Math.round(completed / total * 100) : 0;
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
        low: tasks.filter((t) => t.priority === "low").length
      }
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Failed to compute stats" });
  }
});
router2.get("/my-work", optionalAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const userTasksRes = await query(
      `SELECT * FROM tasks
       WHERE is_trash = FALSE AND (user_id = $1 OR assignee_id = $1 OR reviewer_id = $1)
       ORDER BY due_date ASC NULLS LAST, created_at DESC`,
      [userId]
    );
    const now = /* @__PURE__ */ new Date();
    const tasks = userTasksRes.rows.map((row) => formatTask(row));
    const assignedToMe = tasks.filter((t) => t.assignee?.id === userId && t.status !== "completed");
    const reviewing = tasks.filter((t) => t.reviewer?.id === userId && t.status === "in_review");
    const createdByMe = tasks.filter((t) => t.userId === userId && t.status !== "completed");
    const overdue = assignedToMe.filter((t) => t.dueDate && new Date(t.dueDate) < now);
    const completedRecently = tasks.filter((t) => t.status === "completed");
    res.json({
      assignedToMe,
      reviewing,
      createdByMe,
      overdue,
      completedRecently,
      totalActive: assignedToMe.length + reviewing.length
    });
  } catch (err) {
    console.error("Error fetching my-work:", err);
    res.status(500).json({ error: "Failed to fetch my-work tasks" });
  }
});
router2.get("/", optionalAuth, async (req, res) => {
  try {
    const { projectId, status, priority, assigneeId, search, isTrash } = req.query;
    let sql = "SELECT * FROM tasks WHERE 1=1";
    const params = [];
    if (isTrash === "true") {
      sql += " AND is_trash = TRUE";
    } else {
      sql += " AND is_trash = FALSE";
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
    const tasksRes = await query(sql, params);
    const commentsRes = await query(
      "SELECT * FROM task_comments ORDER BY created_at ASC"
    );
    const commentsByTask = {};
    for (const c of commentsRes.rows) {
      if (!commentsByTask[c.task_id]) commentsByTask[c.task_id] = [];
      commentsByTask[c.task_id].push(c);
    }
    const depsRes = await query(
      `SELECT td.*, t.title as depends_on_title, t.identifier as depends_on_identifier, t.status as depends_on_status
       FROM task_dependencies td
       JOIN tasks t ON td.depends_on_task_id = t.id`
    );
    const depsByTask = {};
    for (const d of depsRes.rows) {
      if (!depsByTask[d.task_id]) depsByTask[d.task_id] = [];
      depsByTask[d.task_id].push(d);
    }
    const tasks = tasksRes.rows.map(
      (row) => formatTask(row, commentsByTask[row.id] || [], depsByTask[row.id] || [])
    );
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});
router2.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const taskRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (taskRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id]
    );
    const depsRes = await query(
      `SELECT td.*, t.title as depends_on_title, t.identifier as depends_on_identifier, t.status as depends_on_status
       FROM task_dependencies td
       JOIN tasks t ON td.depends_on_task_id = t.id
       WHERE td.task_id = $1`,
      [id]
    );
    res.json(formatTask(taskRes.rows[0], commentsRes.rows, depsRes.rows));
  } catch (err) {
    console.error("Error fetching task:", err);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});
router2.post("/", requireAuth, async (req, res) => {
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
      acceptanceCriteria = []
    } = req.body;
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required and must be a non-empty string" });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` });
    }
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
    const countRes = await query("SELECT COUNT(*) as count FROM tasks WHERE project_id = $1", [
      projectId || null
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
        [assigneeId]
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
        [reviewerId]
      );
      if (rRes.rowCount && rRes.rowCount > 0) {
        reviewerName = rRes.rows[0].name;
      }
    }
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
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
        now
      ]
    );
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
        now
      ]
    );
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
          now
        ]
      );
    }
    res.status(201).json(formatTask(result.rows[0], [], []));
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});
router2.patch("/:id", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const currentRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (currentRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const current = currentRes.rows[0];
    if (req.body.title !== void 0) {
      if (typeof req.body.title !== "string" || !req.body.title.trim()) {
        return res.status(400).json({ error: "Title must be a non-empty string" });
      }
    }
    if (req.body.status !== void 0 && !VALID_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    }
    if (req.body.priority !== void 0 && !VALID_PRIORITIES.includes(req.body.priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` });
    }
    const title = req.body.title !== void 0 ? String(req.body.title).trim() : current.title;
    const description = req.body.description !== void 0 ? String(req.body.description).trim() : current.description;
    const status = req.body.status !== void 0 ? req.body.status : current.status;
    const priority = req.body.priority !== void 0 ? req.body.priority : current.priority;
    const type = req.body.type !== void 0 ? req.body.type : current.type;
    const blockedReason = req.body.blockedReason !== void 0 ? req.body.blockedReason : current.blocked_reason;
    const startDate = req.body.startDate !== void 0 ? req.body.startDate ? new Date(req.body.startDate).toISOString() : null : current.start_date;
    const dueDate = req.body.dueDate !== void 0 ? req.body.dueDate ? new Date(req.body.dueDate).toISOString() : null : current.due_date;
    const estimatedHours = req.body.estimatedHours !== void 0 ? req.body.estimatedHours : current.estimated_hours;
    const actualHours = req.body.actualHours !== void 0 ? req.body.actualHours : current.actual_hours;
    const estimate = req.body.estimate !== void 0 ? req.body.estimate : current.estimate;
    const isBookmarked = req.body.isBookmarked !== void 0 ? req.body.isBookmarked : current.is_bookmarked;
    const milestoneId = req.body.milestoneId !== void 0 ? req.body.milestoneId : current.milestone_id;
    const tags = req.body.tags !== void 0 ? JSON.stringify(req.body.tags) : current.tags;
    const subtasks = req.body.subtasks !== void 0 ? JSON.stringify(req.body.subtasks) : current.subtasks;
    const acceptanceCriteria = req.body.acceptanceCriteria !== void 0 ? JSON.stringify(req.body.acceptanceCriteria) : current.acceptance_criteria;
    let projectId = current.project_id;
    let projectName = current.project_name;
    let projectColor = current.project_color;
    if (req.body.projectId !== void 0) {
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
    if (req.body.assigneeId !== void 0) {
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
          [assigneeId]
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
    if (req.body.reviewerId !== void 0) {
      reviewerId = req.body.reviewerId || null;
      if (!reviewerId) {
        reviewerName = null;
      } else {
        const rRes = await query(
          `SELECT name FROM team_members WHERE id = $1
           UNION
           SELECT full_name as name FROM users WHERE id = $1`,
          [reviewerId]
        );
        if (rRes.rowCount && rRes.rowCount > 0) {
          reviewerName = rRes.rows[0].name;
        }
      }
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const completedAt = status === "completed" && current.status !== "completed" ? now : status !== "completed" ? null : current.completed_at;
    const updateRes = await query(
      `UPDATE tasks
       SET title = $1, description = $2, type = $3, status = $4, priority = $5, blocked_reason = $6,
           start_date = $7, due_date = $8, estimated_hours = $9, actual_hours = $10, estimate = $11,
           project_id = $12, project_name = $13, project_color = $14,
           assignee_id = $15, assignee_name = $16, assignee_role = $17, assignee_initials = $18,
           reviewer_id = $19, reviewer_name = $20, milestone_id = $21,
           tags = $22, subtasks = $23, acceptance_criteria = $24, is_bookmarked = $25,
           completed_at = $26, updated_at = $27
       WHERE id = $28
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
        now,
        id
      ]
    );
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
          now
        ]
      );
    }
    const actType = status === "completed" && current.status !== "completed" ? "completed" : status === "blocked" && current.status !== "blocked" ? "blocked" : "updated";
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
        now
      ]
    );
    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id]
    );
    const depsRes = await query(
      `SELECT td.*, t.title as depends_on_title, t.identifier as depends_on_identifier, t.status as depends_on_status
       FROM task_dependencies td
       JOIN tasks t ON td.depends_on_task_id = t.id
       WHERE td.task_id = $1`,
      [id]
    );
    res.json(formatTask(updateRes.rows[0], commentsRes.rows, depsRes.rows));
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});
router2.post("/:id/status", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { status, blockedReason } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    }
    const currentRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (currentRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const current = currentRes.rows[0];
    if (status === "completed") {
      const blockersRes = await query(
        `SELECT t.id, t.title, t.identifier, t.status
         FROM task_dependencies td
         JOIN tasks t ON td.depends_on_task_id = t.id
         WHERE td.task_id = $1 AND td.dependency_type = 'blocked_by' AND t.status != 'completed'`,
        [id]
      );
      if (blockersRes.rowCount && blockersRes.rowCount > 0) {
        const blockerNames = blockersRes.rows.map((b) => `${b.identifier || b.id} ("${b.title}")`).join(", ");
        return res.status(400).json({
          error: `Cannot complete task: It is blocked by incomplete prerequisite tasks: ${blockerNames}`
        });
      }
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const completedAt = status === "completed" ? now : null;
    const updateRes = await query(
      `UPDATE tasks
       SET status = $1, blocked_reason = COALESCE($2, blocked_reason), completed_at = $3, updated_at = $4
       WHERE id = $5
       RETURNING *`,
      [status, blockedReason || (status !== "blocked" ? "" : void 0), completedAt, now, id]
    );
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
        now
      ]
    );
    res.json(formatTask(updateRes.rows[0]));
  } catch (err) {
    console.error("Error changing task status:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});
router2.get("/:id/dependencies", async (req, res) => {
  try {
    const { id } = req.params;
    const depsRes = await query(
      `SELECT td.*, t.title as depends_on_title, t.identifier as depends_on_identifier, t.status as depends_on_status
       FROM task_dependencies td
       JOIN tasks t ON td.depends_on_task_id = t.id
       WHERE td.task_id = $1`,
      [id]
    );
    res.json(depsRes.rows);
  } catch (err) {
    console.error("Error fetching dependencies:", err);
    res.status(500).json({ error: "Failed to fetch dependencies" });
  }
});
router2.post("/:id/dependencies", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { dependsOnTaskId, dependencyType = "blocked_by" } = req.body;
    if (!dependsOnTaskId) {
      return res.status(400).json({ error: "Target dependsOnTaskId is required" });
    }
    if (id === dependsOnTaskId) {
      return res.status(400).json({ error: "A task cannot depend on itself" });
    }
    const checkRes = await query("SELECT id FROM tasks WHERE id = $1 OR id = $2", [id, dependsOnTaskId]);
    if (checkRes.rowCount !== 2) {
      return res.status(404).json({ error: "One or both tasks could not be found" });
    }
    const isCircular = await wouldCreateCycle(String(id), String(dependsOnTaskId));
    if (isCircular) {
      return res.status(400).json({
        error: "Circular dependency detected: Adding this relationship would create an invalid cyclic dependency loop between tasks."
      });
    }
    const depId = `dep-${Date.now()}`;
    await query(
      `INSERT INTO task_dependencies (id, task_id, depends_on_task_id, dependency_type, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (task_id, depends_on_task_id, dependency_type) DO NOTHING`,
      [depId, id, dependsOnTaskId, dependencyType]
    );
    if (dependencyType === "blocked_by") {
      const targetTask = await query("SELECT title, status FROM tasks WHERE id = $1", [dependsOnTaskId]);
      if (targetTask.rows[0]?.status !== "completed") {
        await query(
          "UPDATE tasks SET status = 'blocked', blocked_reason = $1 WHERE id = $2 AND status != 'completed'",
          [`Blocked by prerequisite: "${targetTask.rows[0]?.title}"`, id]
        );
      }
    }
    res.status(201).json({ success: true, id: depId });
  } catch (err) {
    console.error("Error adding task dependency:", err);
    res.status(500).json({ error: "Failed to add dependency" });
  }
});
router2.delete("/:id/dependencies/:depId", requireAuth, async (req, res) => {
  try {
    const { depId } = req.params;
    await query("DELETE FROM task_dependencies WHERE id = $1", [depId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error removing dependency:", err);
    res.status(500).json({ error: "Failed to remove dependency" });
  }
});
router2.post("/:id/subtasks/:subtaskId/toggle", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id, subtaskId } = req.params;
    const currentRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (currentRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const current = currentRes.rows[0];
    let subtasks = [];
    try {
      subtasks = typeof current.subtasks === "string" ? JSON.parse(current.subtasks) : current.subtasks || [];
    } catch {
    }
    const updatedSubtasks = subtasks.map(
      (s) => s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    const updateRes = await query(
      `UPDATE tasks
       SET subtasks = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(updatedSubtasks), id]
    );
    res.json(formatTask(updateRes.rows[0]));
  } catch (err) {
    console.error("Error toggling subtask:", err);
    res.status(500).json({ error: "Failed to toggle subtask" });
  }
});
router2.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await query(
      "UPDATE tasks SET is_trash = TRUE, deleted_at = NOW(), updated_at = NOW() WHERE id = $1",
      [id]
    );
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});
router2.post("/:id/restore", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateRes = await query(
      `UPDATE tasks
       SET is_trash = FALSE, deleted_at = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (updateRes.rowCount === 0) return res.status(404).json({ error: "Task not found" });
    res.json(formatTask(updateRes.rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to restore task" });
  }
});
router2.delete("/:id/permanent", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM tasks WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});
router2.delete("/trash/empty", requireAuth, async (req, res) => {
  try {
    await query("DELETE FROM tasks WHERE is_trash = TRUE");
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to empty trash" });
  }
});
router2.post("/:id/bookmark", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentRes = await query("SELECT is_bookmarked FROM tasks WHERE id = $1", [id]);
    if (currentRes.rowCount === 0) return res.status(404).json({ error: "Task not found" });
    const nextBookmarked = !currentRes.rows[0].is_bookmarked;
    const updateRes = await query(
      "UPDATE tasks SET is_bookmarked = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [nextBookmarked, id]
    );
    res.json(formatTask(updateRes.rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle bookmark" });
  }
});
router2.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { content, author } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Comment content is required" });
    }
    const mentionsMatch = content.match(/@(\w+)/g);
    const mentions = mentionsMatch ? mentionsMatch.map((m) => m.substring(1)) : [];
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
        JSON.stringify(mentions)
      ]
    );
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
            id
          ]
        );
      }
    }
    const commentsRes = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [id]
    );
    const taskRes = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    res.json(formatTask(taskRes.rows[0], commentsRes.rows));
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});
var tasks_default = router2;

// src/routes/profile.ts
var import_express3 = require("express");
var router3 = (0, import_express3.Router)();
function getUserId2(req) {
  const custom = req.headers["x-user-id"];
  return custom && custom.trim() ? custom.trim() : "user-om";
}
router3.get("/", async (req, res) => {
  try {
    const userId = getUserId2(req);
    const result = await query("SELECT * FROM users WHERE id = $1", [userId]);
    if (result.rowCount === 0) {
      const isDefault = userId === "user-om";
      const insert = await query(
        `INSERT INTO users (id, username, full_name, email, avatar_url, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [
          userId,
          isDefault ? "omthakkar" : userId,
          isDefault ? "Om Thakkar" : "TaskFlow User",
          isDefault ? "omthakkar@example.com" : `${userId}@example.com`,
          ""
        ]
      );
      const row2 = insert.rows[0];
      return res.json({
        id: row2.id,
        fullName: row2.full_name,
        email: row2.email,
        avatarUrl: row2.avatar_url || "",
        createdAt: new Date(row2.created_at).toISOString()
      });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      avatarUrl: row.avatar_url || "",
      createdAt: new Date(row.created_at).toISOString()
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});
router3.put("/", async (req, res) => {
  try {
    const userId = getUserId2(req);
    const { fullName, email, avatarUrl = "" } = req.body;
    const result = await query(
      `INSERT INTO users (id, username, full_name, email, avatar_url, updated_at)
       VALUES ($1, $1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         avatar_url = EXCLUDED.avatar_url,
         updated_at = NOW()
       RETURNING *`,
      [userId, fullName?.trim() || "User", email?.trim() || "user@example.com", avatarUrl || ""]
    );
    const row = result.rows[0];
    res.json({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      avatarUrl: row.avatar_url || "",
      createdAt: new Date(row.created_at).toISOString()
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});
var profile_default = router3;

// src/routes/activity.ts
var import_express4 = require("express");
var router4 = (0, import_express4.Router)();
function getUserId3(req) {
  if (req.userId) return req.userId;
  const custom = req.headers["x-user-id"];
  return custom && custom.trim() ? custom.trim() : "user-om";
}
router4.get("/", async (req, res) => {
  try {
    const userId = getUserId3(req);
    const result = await query(
      `SELECT DISTINCT a.* FROM activities a
       LEFT JOIN project_members pm ON a.project_id = pm.project_id AND pm.user_id = $1
       WHERE a.user_id = $1 OR pm.user_id = $1
       ORDER BY a.at DESC LIMIT 50`,
      [userId]
    );
    const activities = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      taskId: row.task_id,
      taskTitle: row.task_title,
      at: new Date(row.at).toISOString()
    }));
    res.json(activities);
  } catch (err) {
    console.error("Error fetching activities:", err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});
var activity_default = router4;

// src/routes/projects.ts
var import_express5 = require("express");
var router5 = (0, import_express5.Router)();
function getUserId4(req) {
  if (req.userId) return req.userId;
  return "user-om";
}
router5.get("/", optionalAuth, async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = "SELECT * FROM projects WHERE 1=1";
    const params = [];
    if (status && status !== "all") {
      if (status === "archived") {
        params.push("archived");
        sql += ` AND status = $${params.length}`;
      } else {
        params.push(status);
        sql += ` AND status = $${params.length} AND (archived_at IS NULL OR status != 'archived')`;
      }
    } else {
      sql += " AND (status != 'archived' AND archived_at IS NULL)";
    }
    if (search && typeof search === "string" && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(key) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`;
    }
    sql += " ORDER BY created_at ASC";
    const projectsRes = await query(sql, params);
    const tasksRes = await query(
      `SELECT project_id, status, priority, due_date
       FROM tasks
       WHERE is_trash = FALSE AND project_id IS NOT NULL`
    );
    const membersRes = await query(
      `SELECT project_id, COUNT(*) as count
       FROM project_members
       GROUP BY project_id`
    );
    const memberCounts = {};
    for (const m of membersRes.rows) {
      memberCounts[m.project_id] = parseInt(m.count, 10);
    }
    const milestonesRes = await query(
      `SELECT project_id, status, COUNT(*) as count
       FROM milestones
       GROUP BY project_id, status`
    );
    const milestoneStats = {};
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
    const taskStats = {};
    const now = /* @__PURE__ */ new Date();
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
      const calculatedProgress = stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : p.progress || 0;
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
        updatedAt: p.updated_at ? new Date(p.updated_at).toISOString() : new Date(p.created_at).toISOString()
      };
    });
    res.json(projects);
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});
router5.post("/", requireAuth, async (req, res) => {
  try {
    const userId = getUserId4(req);
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
      deadline
    } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Project name is required" });
    }
    if (!key || typeof key !== "string" || !key.trim()) {
      return res.status(400).json({ error: "Project key is required" });
    }
    const cleanKey = key.trim().toUpperCase().slice(0, 10);
    const cleanName = name.trim();
    const existingKey = await query("SELECT id FROM projects WHERE UPPER(key) = $1", [cleanKey]);
    if (existingKey.rowCount && existingKey.rowCount > 0) {
      return res.status(409).json({ error: `Project key '${cleanKey}' is already taken. Please choose another.` });
    }
    const projectId = `proj-${Date.now()}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
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
        now
      ]
    );
    await query(
      `INSERT INTO project_members (id, project_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, 'owner', $4)
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [`pm-${Date.now()}`, projectId, userId, now]
    );
    await query(
      `INSERT INTO activities (id, user_id, project_id, task_id, task_title, type, details, at)
       VALUES ($1, $2, $3, '', $4, 'project_created', $5, $6)`,
      [`act-${Date.now()}`, userId, projectId, cleanName, JSON.stringify({ key: cleanKey }), now]
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
      updatedAt: p.updated_at
    });
  } catch (err) {
    console.error("Error creating project:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});
router5.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const projectRes = await query("SELECT * FROM projects WHERE id = $1", [id]);
    if (!projectRes.rowCount || projectRes.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    const p = projectRes.rows[0];
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
      [id]
    );
    const milestonesRes = await query(
      `SELECT * FROM milestones WHERE project_id = $1 ORDER BY target_date ASC`,
      [id]
    );
    const tasksRes = await query(
      `SELECT id, identifier, title, status, priority, due_date, assignee_id, assignee_name
       FROM tasks
       WHERE project_id = $1 AND is_trash = FALSE
       ORDER BY created_at DESC`,
      [id]
    );
    const activitiesRes = await query(
      `SELECT a.*, u.full_name as user_name
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.project_id = $1
       ORDER BY a.at DESC
       LIMIT 20`,
      [id]
    );
    const now = /* @__PURE__ */ new Date();
    const tasks = tasksRes.rows;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const total = tasks.length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const overdue = tasks.filter((t) => t.status !== "completed" && t.due_date && new Date(t.due_date) < now).length;
    const progress = total > 0 ? Math.round(completed / total * 100) : p.progress || 0;
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
        joinedAt: new Date(m.joined_at).toISOString()
      })),
      milestones: milestonesRes.rows.map((m) => ({
        id: m.id,
        projectId: m.project_id,
        title: m.title,
        description: m.description || "",
        targetDate: new Date(m.target_date).toISOString(),
        status: m.status,
        createdAt: new Date(m.created_at).toISOString()
      })),
      recentActivity: activitiesRes.rows.map((a) => ({
        id: a.id,
        type: a.type,
        taskTitle: a.task_title,
        userName: a.user_name || "Team Member",
        details: typeof a.details === "string" ? JSON.parse(a.details) : a.details || {},
        at: new Date(a.at).toISOString()
      })),
      createdAt: new Date(p.created_at).toISOString(),
      updatedAt: p.updated_at ? new Date(p.updated_at).toISOString() : new Date(p.created_at).toISOString()
    });
  } catch (err) {
    console.error("Error fetching project detail:", err);
    res.status(500).json({ error: "Failed to fetch project detail" });
  }
});
router5.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId4(req);
    const updates = req.body;
    const fields = [];
    const values = [];
    const allowedKeys = {
      name: "name",
      description: "description",
      color: "color",
      status: "status",
      priority: "priority",
      health: "health",
      lead: "lead",
      progress: "progress",
      startDate: "start_date",
      deadline: "deadline"
    };
    for (const [key, col] of Object.entries(allowedKeys)) {
      if (updates[key] !== void 0) {
        values.push(updates[key]);
        fields.push(`${col} = $${values.length}`);
      }
    }
    if (fields.length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update" });
    }
    values.push((/* @__PURE__ */ new Date()).toISOString());
    fields.push(`updated_at = $${values.length}`);
    values.push(id);
    const sql = `UPDATE projects SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *`;
    const result = await query(sql, values);
    if (!result.rowCount || result.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    const updated = result.rows[0];
    await query(
      `INSERT INTO activities (id, user_id, project_id, task_id, task_title, type, details, at)
       VALUES ($1, $2, $3, '', $4, 'project_updated', $5, NOW())`,
      [`act-${Date.now()}`, userId, id, updated.name, JSON.stringify(updates)]
    );
    res.json(updated);
  } catch (err) {
    console.error("Error updating project:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});
router5.post("/:id/archive", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const projectRes = await query("SELECT status, archived_at FROM projects WHERE id = $1", [id]);
    if (!projectRes.rowCount || projectRes.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    const isArchived = Boolean(projectRes.rows[0].archived_at);
    const newArchivedAt = isArchived ? null : (/* @__PURE__ */ new Date()).toISOString();
    const newStatus = isArchived ? "active" : "archived";
    const updated = await query(
      `UPDATE projects SET status = $1, archived_at = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [newStatus, newArchivedAt, id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error("Error toggling project archive:", err);
    res.status(500).json({ error: "Failed to archive project" });
  }
});
router5.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const del = await query("DELETE FROM projects WHERE id = $1 RETURNING name", [id]);
    if (!del.rowCount || del.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json({ success: true, message: `Project ${del.rows[0].name} deleted` });
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});
router5.get("/:id/members", async (req, res) => {
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
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching project members:", err);
    res.status(500).json({ error: "Failed to fetch project members" });
  }
});
router5.post("/:id/members", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role = "member" } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    const memberId = `pm-${Date.now()}`;
    await query(
      `INSERT INTO project_members (id, project_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [memberId, id, userId, role]
    );
    res.status(201).json({ success: true, memberId, role });
  } catch (err) {
    console.error("Error adding project member:", err);
    res.status(500).json({ error: "Failed to add member to project" });
  }
});
router5.delete("/:id/members/:userId", requireAuth, async (req, res) => {
  try {
    const { id, userId } = req.params;
    await query("DELETE FROM project_members WHERE project_id = $1 AND user_id = $2", [id, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error removing project member:", err);
    res.status(500).json({ error: "Failed to remove member" });
  }
});
router5.get("/:id/milestones", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      "SELECT * FROM milestones WHERE project_id = $1 ORDER BY target_date ASC",
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching milestones:", err);
    res.status(500).json({ error: "Failed to fetch milestones" });
  }
});
router5.post("/:id/milestones", requireAuth, async (req, res) => {
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
      [milestoneId, id, title.trim(), description.trim(), new Date(targetDate).toISOString(), status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating milestone:", err);
    res.status(500).json({ error: "Failed to create milestone" });
  }
});
router5.patch("/:id/milestones/:milestoneId", requireAuth, async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const { title, description, targetDate, status } = req.body;
    const fields = [];
    const values = [];
    if (title !== void 0) {
      values.push(title);
      fields.push(`title = $${values.length}`);
    }
    if (description !== void 0) {
      values.push(description);
      fields.push(`description = $${values.length}`);
    }
    if (targetDate !== void 0) {
      values.push(new Date(targetDate).toISOString());
      fields.push(`target_date = $${values.length}`);
    }
    if (status !== void 0) {
      values.push(status);
      fields.push(`status = $${values.length}`);
    }
    fields.push("updated_at = NOW()");
    values.push(milestoneId);
    const result = await query(
      `UPDATE milestones SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rowCount || result.rowCount === 0) {
      return res.status(404).json({ error: "Milestone not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating milestone:", err);
    res.status(500).json({ error: "Failed to update milestone" });
  }
});
router5.delete("/:id/milestones/:milestoneId", requireAuth, async (req, res) => {
  try {
    const { milestoneId } = req.params;
    await query("DELETE FROM milestones WHERE id = $1", [milestoneId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting milestone:", err);
    res.status(500).json({ error: "Failed to delete milestone" });
  }
});
var projects_default = router5;

// src/routes/team.ts
var import_express6 = require("express");
var router6 = (0, import_express6.Router)();
router6.get("/", async (req, res) => {
  try {
    const membersRes = await query("SELECT * FROM team_members ORDER BY name ASC");
    const tasksRes = await query(
      `SELECT assignee_id, status, priority, due_date, estimated_hours
       FROM tasks
       WHERE is_trash = FALSE AND assignee_id IS NOT NULL`
    );
    const now = /* @__PURE__ */ new Date();
    const workloadByAssignee = {};
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
          totalHours: 0
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
    const projectMembersRes = await query(
      `SELECT pm.user_id, p.id as project_id, p.name as project_name, p.color as project_color, pm.role as project_role
       FROM project_members pm
       JOIN projects p ON pm.project_id = p.id
       WHERE p.status != 'archived'`
    );
    const projectsByUser = {};
    for (const pm of projectMembersRes.rows) {
      if (!projectsByUser[pm.user_id]) projectsByUser[pm.user_id] = [];
      projectsByUser[pm.user_id].push({
        id: pm.project_id,
        name: pm.project_name,
        color: pm.project_color,
        role: pm.project_role
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
        totalHours: 0
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
          capacityPercent: Math.min(Math.round(workload.active / 10 * 100), 120),
          // 10 tasks = 100% capacity
          totalEstimatedHours: Math.round(workload.totalHours)
        },
        projects: projectsByUser[m.id] || []
      };
    });
    res.json(members);
  } catch (err) {
    console.error("Error fetching team members:", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
});
router6.post("/", requireAuth, async (req, res) => {
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
      [memberId, name.trim(), email.trim(), role && role.trim() ? role.trim() : "Team Member", avatarUrl || "", cleanInitials]
    );
    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error("Error adding team member:", err);
    res.status(500).json({ error: "Failed to add team member" });
  }
});
var team_default = router6;

// src/routes/notifications.ts
var import_express7 = require("express");
var router7 = (0, import_express7.Router)();
function getUserId5(req) {
  if (req.userId) return req.userId;
  return "user-om";
}
router7.get("/", requireAuth, async (req, res) => {
  try {
    const userId = getUserId5(req);
    const { unreadOnly, type, limit = 50 } = req.query;
    let sql = "SELECT * FROM notifications WHERE user_id = $1";
    const params = [userId];
    if (unreadOnly === "true") {
      sql += " AND is_read = FALSE";
    }
    if (type && typeof type === "string" && type !== "all") {
      params.push(type);
      sql += ` AND type = $${params.length}`;
    }
    sql += " ORDER BY created_at DESC";
    params.push(parseInt(String(limit), 10) || 50);
    sql += ` LIMIT $${params.length}`;
    const result = await query(sql, params);
    const unreadCountRes = await query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE",
      [userId]
    );
    const unreadCount = parseInt(unreadCountRes.rows[0]?.count || "0", 10);
    const items = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      actorId: row.actor_id,
      actorName: row.actor_name,
      type: row.type,
      title: row.title,
      message: row.message,
      entityType: row.entity_type,
      entityId: row.entity_id,
      isRead: Boolean(row.is_read),
      createdAt: new Date(row.created_at).toISOString()
    }));
    res.json({
      notifications: items,
      unreadCount
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});
router7.post("/:id/read", requireAuth, async (req, res) => {
  try {
    const userId = getUserId5(req);
    const { id } = req.params;
    const result = await query(
      "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );
    if (!result.rowCount || result.rowCount === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json({ success: true, id });
  } catch (err) {
    console.error("Error marking notification read:", err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});
router7.post("/read-all", requireAuth, async (req, res) => {
  try {
    const userId = getUserId5(req);
    await query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1", [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error marking all read:", err);
    res.status(500).json({ error: "Failed to mark all read" });
  }
});
router7.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = getUserId5(req);
    const { id } = req.params;
    await query("DELETE FROM notifications WHERE id = $1 AND user_id = $2", [id, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});
router7.delete("/clear-all", requireAuth, async (req, res) => {
  try {
    const userId = getUserId5(req);
    await query("DELETE FROM notifications WHERE user_id = $1 AND is_read = TRUE", [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error clearing notifications:", err);
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});
var notifications_default = router7;

// src/routes/invitations.ts
var import_express8 = require("express");
var import_crypto = __toESM(require("crypto"));

// src/email.ts
var import_nodemailer = __toESM(require("nodemailer"));
function isEmailConfigured() {
  if (process.env.RESEND_API_KEY) return true;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return true;
  return false;
}
function getAppBaseUrl() {
  return (process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || process.env.VITE_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
async function sendInvitationEmail(params) {
  const { recipientEmail, projectName, inviterName, role, invitationUrl, expiresAt, message } = params;
  if (!isEmailConfigured()) {
    return {
      delivered: false,
      error: "Email delivery provider not configured (missing SMTP_HOST/SMTP_USER or RESEND_API_KEY). Please copy and share the generated invitation link manually."
    };
  }
  const formattedExpiry = expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invitation to ${projectName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden;">
    <tr>
      <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #334155; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);">
        <h1 style="color: #6366f1; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">TaskFlow Nexus</h1>
        <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px;">Enterprise Project Workspace Invitation</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 16px;">You've been invited to join <strong>${projectName}</strong></h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          <strong>${inviterName}</strong> has invited you to collaborate on the <strong>${projectName}</strong> project as a <span style="background-color: #312e81; color: #a5b4fc; padding: 2px 8px; border-radius: 6px; font-weight: 600; text-transform: capitalize;">${role}</span>.
        </p>
        ${message ? `<div style="background-color: #0f172a; border-left: 3px solid #6366f1; padding: 14px 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0; font-size: 13px; color: #94a3b8; font-style: italic;">
                "${message}"
               </div>` : ""}
        <div style="text-align: center; margin: 32px 0;">
          <a href="${invitationUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);">
            Accept Invitation & Join Project
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 24px 0 0; text-align: center;">
          This invitation is single-use and will expire on <strong>${formattedExpiry}</strong>.<br/>
          If you did not expect this invitation, you can safely ignore this email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
        <p style="color: #475569; font-size: 11px; margin: 0;">TaskFlow Nexus \xB7 High-Performance Enterprise Project Management</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
  const textBody = `
You've been invited to join ${projectName} on TaskFlow Nexus!

${inviterName} has invited you to collaborate as a ${role}.
${message ? `Personal note: "${message}"
` : ""}
To accept your invitation, visit:
${invitationUrl}

This invitation will expire on ${formattedExpiry}.
  `.trim();
  if (process.env.RESEND_API_KEY) {
    try {
      const fromEmail = process.env.RESEND_FROM || "TaskFlow Nexus <invitations@taskflow.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipientEmail],
          subject: `Invitation to collaborate on ${projectName}`,
          html: htmlBody,
          text: textBody
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return {
          delivered: false,
          error: `Resend error: ${errData.message || res.statusText}`,
          provider: "resend"
        };
      }
      return { delivered: true, provider: "resend" };
    } catch (err) {
      return {
        delivered: false,
        error: `Resend dispatch failed: ${err.message}`,
        provider: "resend"
      };
    }
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = import_nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"TaskFlow Nexus" <${process.env.SMTP_USER}>`,
        to: recipientEmail,
        subject: `Invitation to collaborate on ${projectName}`,
        text: textBody,
        html: htmlBody
      });
      return { delivered: true, provider: "smtp" };
    } catch (err) {
      return {
        delivered: false,
        error: `SMTP dispatch failed: ${err.message}`,
        provider: "smtp"
      };
    }
  }
  return {
    delivered: false,
    error: "No supported email provider configured."
  };
}

// src/routes/invitations.ts
var invitationsRouter = (0, import_express8.Router)();
var createAttempts = /* @__PURE__ */ new Map();
var validateAttempts = /* @__PURE__ */ new Map();
var RATE_LIMIT_WINDOW_MS2 = 15 * 60 * 1e3;
var MAX_CREATE_ATTEMPTS = 30;
var MAX_VALIDATE_ATTEMPTS = 100;
function invitationCreateLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
  const now = Date.now();
  const record = createAttempts.get(ip);
  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW_MS2) {
    createAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }
  if (record.count >= MAX_CREATE_ATTEMPTS) {
    return res.status(429).json({
      error: "Too many invitation requests. Please try again later.",
      retryAfterSeconds: Math.ceil((record.firstAttempt + RATE_LIMIT_WINDOW_MS2 - now) / 1e3)
    });
  }
  record.count++;
  next();
}
function invitationValidateLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
  const now = Date.now();
  const record = validateAttempts.get(ip);
  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW_MS2) {
    validateAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }
  if (record.count >= MAX_VALIDATE_ATTEMPTS) {
    return res.status(429).json({
      error: "Too many token validation requests. Please try again later.",
      retryAfterSeconds: Math.ceil((record.firstAttempt + RATE_LIMIT_WINDOW_MS2 - now) / 1e3)
    });
  }
  record.count++;
  next();
}
async function canUserManageProject(userId, projectId) {
  const userRes = await query("SELECT role FROM users WHERE id = $1", [userId]);
  if (userRes.rows.length > 0 && userRes.rows[0].role === "admin") {
    return { allowed: true, role: "owner" };
  }
  const projRes = await query("SELECT owner_id FROM projects WHERE id = $1", [projectId]);
  if (projRes.rows.length === 0) {
    return { allowed: false };
  }
  if (projRes.rows[0].owner_id === userId) {
    return { allowed: true, role: "owner" };
  }
  const pmRes = await query(
    "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
    [projectId, userId]
  );
  if (pmRes.rows.length > 0) {
    const r = pmRes.rows[0].role.toLowerCase();
    if (r === "owner" || r === "lead" || r === "admin") {
      return { allowed: true, role: r };
    }
  }
  return { allowed: false };
}
function hashToken(rawToken) {
  return import_crypto.default.createHash("sha256").update(rawToken).digest("hex");
}
invitationsRouter.post(
  "/projects/:projectId/invitations",
  requireAuth,
  invitationCreateLimiter,
  async (req, res) => {
    try {
      const projectId = String(req.params.projectId);
      const inviterId = req.userId;
      const { email, role = "member", message = "" } = req.body;
      if (!projectId || projectId === "undefined") {
        return res.status(400).json({ error: "Project ID is required" });
      }
      const authCheck = await canUserManageProject(inviterId, projectId);
      if (!authCheck.allowed) {
        return res.status(403).json({
          error: "Unauthorized: Only project managers or owners can invite members"
        });
      }
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "A valid email address is required" });
      }
      const cleanEmail = email.trim().toLowerCase();
      const validRoles = ["owner", "lead", "developer", "designer", "reviewer", "viewer", "member"];
      const cleanRole = String(role).trim().toLowerCase();
      if (!validRoles.includes(cleanRole)) {
        return res.status(400).json({ error: `Invalid role. Allowed roles: ${validRoles.join(", ")}` });
      }
      if (cleanRole === "owner" && authCheck.role !== "owner") {
        return res.status(403).json({
          error: "Permission denied: Only project owners can invite new owners"
        });
      }
      const projRes = await query("SELECT id, name, description, color FROM projects WHERE id = $1", [
        projectId
      ]);
      if (projRes.rows.length === 0) {
        return res.status(404).json({ error: "Project not found" });
      }
      const project = projRes.rows[0];
      const existingMemberRes = await query(
        `SELECT pm.id FROM project_members pm
         LEFT JOIN users u ON pm.user_id = u.id
         LEFT JOIN team_members tm ON pm.user_id = tm.id
         WHERE pm.project_id = $1 AND (LOWER(u.email) = $2 OR LOWER(tm.email) = $2)`,
        [projectId, cleanEmail]
      );
      if (existingMemberRes.rows.length > 0) {
        return res.status(400).json({
          error: "This user is already an active member of this project"
        });
      }
      const existingInviteRes = await query(
        `SELECT id FROM project_invitations
         WHERE project_id = $1 AND LOWER(recipient_email) = $2 AND status = 'pending' AND expires_at > NOW()`,
        [projectId, cleanEmail]
      );
      if (existingInviteRes.rows.length > 0) {
        return res.status(409).json({
          error: "A pending invitation already exists for this email address in this project"
        });
      }
      const rawToken = import_crypto.default.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const inviteId = `inv-${Date.now()}-${import_crypto.default.randomBytes(4).toString("hex")}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
      const inviterRes = await query("SELECT full_name, username FROM users WHERE id = $1", [
        inviterId
      ]);
      const inviterName = inviterRes.rows[0]?.full_name || inviterRes.rows[0]?.username || "A team lead";
      await query(
        `INSERT INTO project_invitations
         (id, project_id, inviter_id, recipient_email, role, token_hash, status, message, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, NOW(), NOW())`,
        [inviteId, projectId, inviterId, cleanEmail, cleanRole, tokenHash, message.trim(), expiresAt]
      );
      const invitationUrl = `${getAppBaseUrl()}/invitations/accept?token=${rawToken}`;
      const emailResult = await sendInvitationEmail({
        recipientEmail: cleanEmail,
        projectName: project.name,
        inviterName,
        role: cleanRole,
        invitationUrl,
        expiresAt,
        message: message.trim() || void 0
      });
      res.status(201).json({
        success: true,
        invitation: {
          id: inviteId,
          projectId,
          projectName: project.name,
          recipientEmail: cleanEmail,
          role: cleanRole,
          status: "pending",
          message: message.trim(),
          expiresAt: expiresAt.toISOString(),
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          inviterName
        },
        rawToken,
        invitationUrl,
        emailSent: emailResult.delivered,
        emailError: emailResult.delivered ? void 0 : emailResult.error
      });
    } catch (err) {
      console.error("Error creating invitation:", err);
      res.status(500).json({ error: "Failed to create invitation: " + err.message });
    }
  }
);
invitationsRouter.get(
  "/projects/:projectId/invitations",
  requireAuth,
  async (req, res) => {
    try {
      const projectId = String(req.params.projectId);
      const userId = req.userId;
      const authCheck = await canUserManageProject(userId, projectId);
      if (!authCheck.allowed) {
        return res.status(403).json({ error: "Unauthorized: Insufficient project permissions" });
      }
      await query(
        `UPDATE project_invitations
         SET status = 'expired', updated_at = NOW()
         WHERE project_id = $1 AND status = 'pending' AND expires_at <= NOW()`,
        [projectId]
      );
      const result = await query(
        `SELECT pi.id, pi.project_id, pi.recipient_email, pi.role, pi.status, pi.message,
                pi.expires_at, pi.accepted_at, pi.revoked_at, pi.created_at, pi.updated_at,
                u.full_name as inviter_name, u.email as inviter_email
         FROM project_invitations pi
         LEFT JOIN users u ON pi.inviter_id = u.id
         WHERE pi.project_id = $1
         ORDER BY pi.created_at DESC`,
        [projectId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error listing project invitations:", err);
      res.status(500).json({ error: "Failed to fetch project invitations" });
    }
  }
);
invitationsRouter.get(
  "/invitations",
  requireAuth,
  async (req, res) => {
    try {
      const userId = req.userId;
      await query(
        `UPDATE project_invitations
         SET status = 'expired', updated_at = NOW()
         WHERE status = 'pending' AND expires_at <= NOW()`
      );
      const userRes = await query("SELECT role FROM users WHERE id = $1", [userId]);
      const isAdmin = userRes.rows.length > 0 && userRes.rows[0].role === "admin";
      let sql = `
        SELECT pi.id, pi.project_id, pi.recipient_email, pi.role, pi.status, pi.message,
               pi.expires_at, pi.accepted_at, pi.revoked_at, pi.created_at, pi.updated_at,
               p.name as project_name, p.color as project_color,
               u.full_name as inviter_name, u.email as inviter_email
        FROM project_invitations pi
        JOIN projects p ON pi.project_id = p.id
        LEFT JOIN users u ON pi.inviter_id = u.id
      `;
      const params = [];
      if (!isAdmin) {
        sql += `
          WHERE pi.project_id IN (
            SELECT id FROM projects WHERE owner_id = $1
            UNION
            SELECT project_id FROM project_members WHERE user_id = $1
          )
        `;
        params.push(userId);
      }
      sql += ` ORDER BY pi.created_at DESC`;
      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err) {
      console.error("Error listing workspace invitations:", err);
      res.status(500).json({ error: "Failed to fetch workspace invitations" });
    }
  }
);
invitationsRouter.get(
  "/invitations/validate",
  invitationValidateLimiter,
  async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string" || !token.trim()) {
        return res.status(400).json({ valid: false, reason: "missing_token", error: "Token is required" });
      }
      const tokenHash = hashToken(token.trim());
      const result = await query(
        `SELECT pi.id, pi.project_id, pi.recipient_email, pi.role, pi.status, pi.message,
                pi.expires_at, pi.accepted_at, pi.revoked_at, pi.created_at,
                p.name as project_name, p.key as project_key, p.description as project_description,
                p.color as project_color,
                u.full_name as inviter_name, u.email as inviter_email
         FROM project_invitations pi
         JOIN projects p ON pi.project_id = p.id
         LEFT JOIN users u ON pi.inviter_id = u.id
         WHERE pi.token_hash = $1`,
        [tokenHash]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({
          valid: false,
          reason: "not_found",
          error: "This invitation link is invalid or does not exist."
        });
      }
      const inv = result.rows[0];
      const now = /* @__PURE__ */ new Date();
      if (inv.status === "pending" && new Date(inv.expires_at) <= now) {
        await query("UPDATE project_invitations SET status = 'expired', updated_at = NOW() WHERE id = $1", [
          inv.id
        ]);
        return res.status(410).json({
          valid: false,
          reason: "expired",
          error: "This invitation has expired. Please request a new invitation from the project lead.",
          invitation: {
            projectName: inv.project_name,
            projectKey: inv.project_key,
            recipientEmail: inv.recipient_email,
            role: inv.role,
            expiresAt: inv.expires_at
          }
        });
      }
      if (inv.status === "revoked") {
        return res.status(410).json({
          valid: false,
          reason: "revoked",
          error: "This invitation has been revoked by the project lead.",
          invitation: {
            projectName: inv.project_name,
            recipientEmail: inv.recipient_email
          }
        });
      }
      if (inv.status === "accepted") {
        return res.status(410).json({
          valid: false,
          reason: "already_accepted",
          error: "This invitation has already been accepted.",
          invitation: {
            projectId: inv.project_id,
            projectName: inv.project_name,
            recipientEmail: inv.recipient_email
          }
        });
      }
      if (inv.status === "declined") {
        return res.status(410).json({
          valid: false,
          reason: "declined",
          error: "This invitation was previously declined."
        });
      }
      res.json({
        valid: true,
        invitation: {
          id: inv.id,
          projectId: inv.project_id,
          projectName: inv.project_name,
          projectKey: inv.project_key,
          projectDescription: inv.project_description || "",
          projectColor: inv.project_color || "#4f46e5",
          recipientEmail: inv.recipient_email,
          role: inv.role,
          message: inv.message || "",
          expiresAt: inv.expires_at,
          inviterName: inv.inviter_name || "A Project Manager"
        }
      });
    } catch (err) {
      console.error("Error validating invitation token:", err);
      res.status(500).json({ valid: false, error: "Validation check failed" });
    }
  }
);
invitationsRouter.post(
  "/invitations/accept",
  requireAuth,
  invitationValidateLimiter,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { token } = req.body;
      const userId = req.userId;
      if (!token || typeof token !== "string" || !token.trim()) {
        return res.status(400).json({ error: "Token is required" });
      }
      const tokenHash = hashToken(token.trim());
      await client.query("BEGIN");
      const userRes = await client.query("SELECT id, email, full_name FROM users WHERE id = $1", [
        userId
      ]);
      if (userRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(401).json({ error: "Authenticated user not found" });
      }
      const user = userRes.rows[0];
      const inviteRes = await client.query(
        `SELECT pi.*, p.name as project_name
         FROM project_invitations pi
         JOIN projects p ON pi.project_id = p.id
         WHERE pi.token_hash = $1
         FOR UPDATE`,
        [tokenHash]
      );
      if (inviteRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Invitation not found or invalid token" });
      }
      const inv = inviteRes.rows[0];
      if (inv.status !== "pending") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Invitation is no longer pending (status: ${inv.status})` });
      }
      if (new Date(inv.expires_at) <= /* @__PURE__ */ new Date()) {
        await client.query(
          "UPDATE project_invitations SET status = 'expired', updated_at = NOW() WHERE id = $1",
          [inv.id]
        );
        await client.query("COMMIT");
        return res.status(410).json({ error: "Invitation has expired" });
      }
      if (user.email.toLowerCase().trim() !== inv.recipient_email.toLowerCase().trim()) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: `Email mismatch: You are signed in as "${user.email}", but this invitation was issued to "${inv.recipient_email}". Please sign in with the correct account to accept.`
        });
      }
      const memberId = `pm-${Date.now()}-${import_crypto.default.randomBytes(3).toString("hex")}`;
      await client.query(
        `INSERT INTO project_members (id, project_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [memberId, inv.project_id, user.id, inv.role]
      );
      await client.query(
        `UPDATE project_invitations
         SET status = 'accepted', accepted_at = NOW(), accepted_user_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [user.id, inv.id]
      );
      const activityId = `act-${Date.now()}-${import_crypto.default.randomBytes(3).toString("hex")}`;
      await client.query(
        `INSERT INTO activities (id, user_id, project_id, task_id, type, task_title, user_name, details, at)
         VALUES ($1, $2, $3, 'system', 'project_updated', $4, $5, $6, NOW())`,
        [
          activityId,
          user.id,
          inv.project_id,
          `Joined ${inv.project_name}`,
          user.full_name,
          JSON.stringify({ action: "accepted_invitation", role: inv.role })
        ]
      );
      const notifId = `notif-${Date.now()}-${import_crypto.default.randomBytes(3).toString("hex")}`;
      await client.query(
        `INSERT INTO notifications (id, user_id, actor_id, actor_name, type, title, message, entity_type, entity_id, is_read, created_at)
         VALUES ($1, $2, $3, $4, 'system', $5, $6, 'project', $7, FALSE, NOW())`,
        [
          notifId,
          inv.inviter_id,
          user.id,
          user.full_name,
          "Invitation Accepted",
          `${user.full_name} (${user.email}) accepted the invitation to join ${inv.project_name} as ${inv.role}.`,
          inv.project_id
        ]
      );
      const welcomeNotifId = `notif-${Date.now()}-${import_crypto.default.randomBytes(3).toString("hex")}`;
      await client.query(
        `INSERT INTO notifications (id, user_id, actor_id, actor_name, type, title, message, entity_type, entity_id, is_read, created_at)
         VALUES ($1, $2, $3, $4, 'system', $5, $6, 'project', $7, FALSE, NOW())`,
        [
          welcomeNotifId,
          user.id,
          inv.inviter_id,
          inv.inviter_name || "Project Lead",
          `Welcome to ${inv.project_name}`,
          `You have joined ${inv.project_name} as ${inv.role}. You can now view sprint boards, tasks, and project updates.`,
          inv.project_id
        ]
      );
      await client.query("COMMIT");
      res.json({
        success: true,
        message: `Successfully joined ${inv.project_name}!`,
        projectId: inv.project_id,
        projectName: inv.project_name,
        role: inv.role
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error accepting invitation:", err);
      res.status(500).json({ error: "Failed to accept invitation: " + err.message });
    } finally {
      client.release();
    }
  }
);
invitationsRouter.post(
  "/invitations/decline",
  invitationValidateLimiter,
  async (req, res) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string" || !token.trim()) {
        return res.status(400).json({ error: "Token is required" });
      }
      const tokenHash = hashToken(token.trim());
      const result = await query(
        `UPDATE project_invitations
         SET status = 'declined', updated_at = NOW()
         WHERE token_hash = $1 AND status = 'pending'
         RETURNING id, project_id`,
        [tokenHash]
      );
      if (result.rows.length === 0) {
        return res.status(400).json({ error: "Invitation not found or cannot be declined" });
      }
      res.json({ success: true, message: "Invitation declined" });
    } catch (err) {
      console.error("Error declining invitation:", err);
      res.status(500).json({ error: "Failed to decline invitation" });
    }
  }
);
invitationsRouter.post(
  "/invitations/:id/resend",
  requireAuth,
  invitationCreateLimiter,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const inviteRes = await query(
        `SELECT pi.*, p.name as project_name
         FROM project_invitations pi
         JOIN projects p ON pi.project_id = p.id
         WHERE pi.id = $1`,
        [id]
      );
      if (inviteRes.rows.length === 0) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      const inv = inviteRes.rows[0];
      const authCheck = await canUserManageProject(userId, inv.project_id);
      if (!authCheck.allowed) {
        return res.status(403).json({ error: "Unauthorized: Insufficient project permissions" });
      }
      if (inv.status === "accepted") {
        return res.status(400).json({ error: "Cannot resend an invitation that has already been accepted" });
      }
      const rawToken = import_crypto.default.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
      await query(
        `UPDATE project_invitations
         SET token_hash = $1, expires_at = $2, status = 'pending', updated_at = NOW()
         WHERE id = $3`,
        [tokenHash, newExpiresAt, id]
      );
      const inviterRes = await query("SELECT full_name, username FROM users WHERE id = $1", [userId]);
      const inviterName = inviterRes.rows[0]?.full_name || inviterRes.rows[0]?.username || "A project manager";
      const invitationUrl = `${getAppBaseUrl()}/invitations/accept?token=${rawToken}`;
      const emailResult = await sendInvitationEmail({
        recipientEmail: inv.recipient_email,
        projectName: inv.project_name,
        inviterName,
        role: inv.role,
        invitationUrl,
        expiresAt: newExpiresAt,
        message: inv.message || void 0
      });
      res.json({
        success: true,
        message: "Invitation resent with rotated token",
        rawToken,
        invitationUrl,
        expiresAt: newExpiresAt.toISOString(),
        emailSent: emailResult.delivered,
        emailError: emailResult.delivered ? void 0 : emailResult.error
      });
    } catch (err) {
      console.error("Error resending invitation:", err);
      res.status(500).json({ error: "Failed to resend invitation: " + err.message });
    }
  }
);
invitationsRouter.post(
  "/invitations/:id/revoke",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const inviteRes = await query("SELECT project_id, status FROM project_invitations WHERE id = $1", [
        id
      ]);
      if (inviteRes.rows.length === 0) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      const inv = inviteRes.rows[0];
      const authCheck = await canUserManageProject(userId, inv.project_id);
      if (!authCheck.allowed) {
        return res.status(403).json({ error: "Unauthorized: Insufficient project permissions" });
      }
      if (inv.status === "accepted") {
        return res.status(400).json({ error: "Cannot revoke an invitation that has already been accepted" });
      }
      await query(
        `UPDATE project_invitations
         SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
      res.json({ success: true, message: "Invitation revoked" });
    } catch (err) {
      console.error("Error revoking invitation:", err);
      res.status(500).json({ error: "Failed to revoke invitation" });
    }
  }
);

// src/seed.ts
var import_fs = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_bcryptjs2 = __toESM(require("bcryptjs"));
var getDirname2 = () => {
  if (typeof __dirname !== "undefined") {
    return __dirname;
  }
  return process.cwd();
};
var seedDirname = getDirname2();
function iso(daysFromNow, hour = 10) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
var SEED_PROJECTS = [
  {
    id: "proj-core",
    name: "Core Platform 2.0",
    key: "CORE",
    description: "Next-gen distributed infrastructure, PostgreSQL schema migrations, and high-throughput real-time APIs.",
    color: "#4f46e5",
    status: "active",
    priority: "high",
    health: "on_track",
    lead: "Om Thakkar",
    startDate: iso(-20),
    deadline: iso(30),
    progress: 65
  },
  {
    id: "proj-mobile",
    name: "Mobile App Experience",
    key: "MOB",
    description: "Native-feel responsive navigation, offline service worker sync, and touch gestures for mobile workforce.",
    color: "#06b6d4",
    status: "active",
    priority: "medium",
    health: "on_track",
    lead: "Sarah Chen",
    startDate: iso(-15),
    deadline: iso(45),
    progress: 40
  },
  {
    id: "proj-security",
    name: "Security & Enterprise Compliance",
    key: "SEC",
    description: "Strict JWT authentication, role-based access control, cryptographic verification, and tamper-evident audit logging.",
    color: "#e11d48",
    status: "active",
    priority: "critical",
    health: "at_risk",
    lead: "Alex Rivera",
    startDate: iso(-10),
    deadline: iso(15),
    progress: 55
  },
  {
    id: "proj-design",
    name: "Design System & UI Kit",
    key: "DS",
    description: "Accessible Radix-backed component hierarchy, dark/light token architecture, and micro-interactions.",
    color: "#8b5cf6",
    status: "active",
    priority: "medium",
    health: "on_track",
    lead: "Elena Rostova",
    startDate: iso(-30),
    deadline: iso(20),
    progress: 80
  }
];
var SEED_TEAM_MEMBERS = [
  {
    id: "team-om",
    name: "Om Thakkar",
    email: "omthakkar@example.com",
    role: "Tech Lead & Full Stack",
    initials: "OT"
  },
  {
    id: "team-sarah",
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    role: "Lead Frontend Engineer",
    initials: "SC"
  },
  {
    id: "team-alex",
    name: "Alex Rivera",
    email: "alex.rivera@example.com",
    role: "Senior Backend Architect",
    initials: "AR"
  },
  {
    id: "team-elena",
    name: "Elena Rostova",
    email: "elena.r@example.com",
    role: "Product & UI/UX Designer",
    initials: "ER"
  },
  {
    id: "team-marcus",
    name: "Marcus Vance",
    email: "marcus.v@example.com",
    role: "DevOps & Cloud Engineer",
    initials: "MV"
  }
];
var SEED_MILESTONES = [
  {
    id: "ms-core-1",
    projectId: "proj-core",
    title: "M1: Database Schema & Migration Engine",
    description: "Establish zero-downtime relational migrations, foreign key constraints, and indexing.",
    targetDate: iso(-5),
    status: "completed"
  },
  {
    id: "ms-core-2",
    projectId: "proj-core",
    title: "M2: Real-time REST & Dependency Graph API",
    description: "Implement cyclic dependency validation, project workspace routing, and metrics queries.",
    targetDate: iso(14),
    status: "pending"
  },
  {
    id: "ms-mob-1",
    projectId: "proj-mobile",
    title: "M1: Responsive Mobile Shell & Touch Kanban",
    description: "Mobile viewport layouts, sliding drawer transitions, and responsive tables.",
    targetDate: iso(20),
    status: "pending"
  },
  {
    id: "ms-sec-1",
    projectId: "proj-security",
    title: "M1: JWT Authorization & Rate Limiting",
    description: "Eliminate header spoofing, enforce bearer token verification, and rate limit auth routes.",
    targetDate: iso(5),
    status: "pending"
  },
  {
    id: "ms-ds-1",
    projectId: "proj-design",
    title: "M1: Enterprise Component Tokens & Palette",
    description: "Deliver charcoal/navy sidebar palette, cohesive state badges, and chart tokens.",
    targetDate: iso(-10),
    status: "completed"
  }
];
var SEED_TASKS = [
  {
    id: "task-1",
    identifier: "DS-101",
    title: "Design enterprise navigation shell & color system",
    description: "Create charcoal sidebar design with restrained indigo accents, crisp typography hierarchy, and accessible contrast ratios conforming to WCAG AA.",
    type: "feature",
    status: "completed",
    priority: "high",
    startDate: iso(-12),
    dueDate: iso(-2),
    estimatedHours: 16,
    actualHours: 14,
    created: -12,
    updated: -2,
    projectId: "proj-design",
    assigneeIndex: 3,
    reviewerIndex: 0,
    milestoneId: "ms-ds-1",
    tags: ["Design", "UI/UX", "Typography"],
    estimate: "5 pts",
    acceptanceCriteria: [
      { id: "ac-1-1", text: "Deep charcoal sidebar with accessible text contrast", completed: true },
      { id: "ac-1-2", text: "Active item indicator with subtle border highlight", completed: true },
      { id: "ac-1-3", text: "Responsive hamburger collapse on mobile devices", completed: true }
    ],
    subtasks: [
      { id: "sub-1-1", title: "Map information architecture for 8 top-level views", completed: true },
      { id: "sub-1-2", title: "Audit color tokens across light and dark modes", completed: true },
      { id: "sub-1-3", title: "Export SVG icons and verify button tap targets", completed: true }
    ]
  },
  {
    id: "task-2",
    identifier: "CORE-101",
    title: "Set up PostgreSQL relational schema & migrations",
    description: "Define tables for users, projects, project_members, tasks, dependencies, milestones, and notifications with foreign keys and performance indexes.",
    type: "task",
    status: "completed",
    priority: "high",
    startDate: iso(-18),
    dueDate: iso(-4),
    estimatedHours: 24,
    actualHours: 20,
    created: -18,
    updated: -4,
    projectId: "proj-core",
    assigneeIndex: 0,
    reviewerIndex: 2,
    milestoneId: "ms-core-1",
    tags: ["Database", "PostgreSQL", "Backend"],
    estimate: "8 pts",
    acceptanceCriteria: [
      { id: "ac-2-1", text: "Schema DDL with idempotent IF NOT EXISTS clauses", completed: true },
      { id: "ac-2-2", text: "Foreign key constraints with ON DELETE CASCADE rules", completed: true },
      { id: "ac-2-3", text: "Composite indexes on task status and project IDs", completed: true }
    ],
    subtasks: [
      { id: "sub-2-1", title: "Draft ER diagrams & constraints", completed: true },
      { id: "sub-2-2", title: "Write DDL migration scripts", completed: true },
      { id: "sub-2-3", title: "Verify connection pool under load", completed: true }
    ]
  },
  {
    id: "task-3",
    identifier: "SEC-201",
    title: "Harden authentication & eliminate client ID spoofing",
    description: "Remove untrusted x-user-id header fallback from requireAuth middleware and verify signed JWT tokens on every protected endpoint.",
    type: "feature",
    status: "in_review",
    priority: "critical",
    startDate: iso(-6),
    dueDate: iso(2),
    estimatedHours: 12,
    actualHours: 10,
    created: -6,
    updated: 0,
    projectId: "proj-security",
    assigneeIndex: 2,
    reviewerIndex: 0,
    milestoneId: "ms-sec-1",
    tags: ["Security", "JWT", "Auth"],
    estimate: "5 pts",
    acceptanceCriteria: [
      { id: "ac-3-1", text: "Reject requests missing a valid signed JWT bearer token", completed: true },
      { id: "ac-3-2", text: "Rate limit repeated login/register attempts", completed: true },
      { id: "ac-3-3", text: "Pass security unit tests verifying rejection of forged headers", completed: true }
    ],
    subtasks: [
      { id: "sub-3-1", title: "Refactor requireAuth in server/src/auth.ts", completed: true },
      { id: "sub-3-2", title: "Add rate-limiting middleware for auth routes", completed: true },
      { id: "sub-3-3", title: "Write regression test suite for auth security", completed: true }
    ]
  },
  {
    id: "task-4",
    identifier: "CORE-102",
    title: "Implement task dependency graph & circular detection",
    description: "Build directed graph cycle validation on the server so that circular dependencies (A blocks B blocks A) are immediately rejected with descriptive error messages.",
    type: "feature",
    status: "in_progress",
    priority: "high",
    startDate: iso(-4),
    dueDate: iso(4),
    estimatedHours: 16,
    actualHours: 8,
    created: -4,
    updated: 0,
    projectId: "proj-core",
    assigneeIndex: 0,
    reviewerIndex: 2,
    milestoneId: "ms-core-2",
    tags: ["Algorithms", "Graph", "API"],
    estimate: "8 pts",
    acceptanceCriteria: [
      { id: "ac-4-1", text: "Cycle detection algorithm using breadth/depth first search", completed: true },
      { id: "ac-4-2", text: "Return HTTP 400 with explanation when cycle is attempted", completed: true },
      { id: "ac-4-3", text: "Prevent completing task if unresolved blocking tasks exist", completed: true }
    ],
    subtasks: [
      { id: "sub-4-1", title: "Create server/src/dependencies.ts with wouldCreateCycle", completed: true },
      { id: "sub-4-2", title: "Integrate into tasks router dependency endpoints", completed: true },
      { id: "sub-4-3", title: "Add unit tests for direct and indirect 3-node cycles", completed: false }
    ]
  },
  {
    id: "task-5",
    identifier: "MOB-301",
    title: "Implement drag-and-drop Kanban board with server persistence",
    description: "Build smooth card drag-and-drop across 6 columns (Backlog, Ready, In Progress, In Review, Blocked, Completed) with server validation and optimistic rollback.",
    type: "feature",
    status: "in_progress",
    priority: "high",
    startDate: iso(-5),
    dueDate: iso(3),
    estimatedHours: 20,
    actualHours: 12,
    created: -5,
    updated: 0,
    projectId: "proj-mobile",
    assigneeIndex: 1,
    reviewerIndex: 0,
    milestoneId: "ms-mob-1",
    tags: ["Kanban", "DragDrop", "Frontend"],
    estimate: "8 pts",
    acceptanceCriteria: [
      { id: "ac-5-1", text: "6 standard enterprise workflow columns", completed: true },
      { id: "ac-5-2", text: "HTML5 drag and drop with drop indicators and hover animations", completed: true },
      { id: "ac-5-3", text: "Immediate API persistence via /tasks/:id/status", completed: true }
    ],
    subtasks: [
      { id: "sub-5-1", title: "Build KanbanBoard column layout with badge counters", completed: true },
      { id: "sub-5-2", title: "Implement draggable TaskCard with priority colors", completed: true },
      { id: "sub-5-3", title: "Handle blocked task banner and explanations", completed: true }
    ]
  },
  {
    id: "task-6",
    identifier: "CORE-103",
    title: "Executive portfolio dashboard & health analytics",
    description: "Calculate portfolio-level KPIs including active vs completed projects, completion rate, overdue tasks, team workload, and weekly velocity charts.",
    type: "feature",
    status: "ready",
    priority: "high",
    startDate: iso(0),
    dueDate: iso(6),
    estimatedHours: 16,
    actualHours: 2,
    created: -3,
    updated: 0,
    projectId: "proj-core",
    assigneeIndex: 0,
    reviewerIndex: 1,
    milestoneId: "ms-core-2",
    tags: ["Analytics", "Dashboard", "Recharts"],
    estimate: "5 pts",
    acceptanceCriteria: [
      { id: "ac-6-1", text: "Calculate metrics from live PostgreSQL queries", completed: true },
      { id: "ac-6-2", text: "Include interactive Recharts weekly velocity trend", completed: true },
      { id: "ac-6-3", text: "Add date and project filter selectors", completed: false }
    ],
    subtasks: [
      { id: "sub-6-1", title: "Build Executive Overview summary cards", completed: true },
      { id: "sub-6-2", title: "Add Projects at Risk warning section", completed: true },
      { id: "sub-6-3", title: "Embed team member workload progress bars", completed: false }
    ]
  },
  {
    id: "task-7",
    identifier: "SEC-202",
    title: "Audit trail logging & automated security events",
    description: "Log user activities (task created, status changed, project updated) to the activities table with timestamps and actor metadata.",
    type: "task",
    status: "blocked",
    priority: "medium",
    startDate: iso(-2),
    dueDate: iso(5),
    estimatedHours: 8,
    actualHours: 1,
    created: -2,
    updated: 0,
    projectId: "proj-security",
    assigneeIndex: 4,
    reviewerIndex: 2,
    milestoneId: "ms-sec-1",
    blockedReason: "Blocked by prerequisite SEC-201: JWT authorization must be merged before audit actor context is trusted.",
    tags: ["Compliance", "Audit", "Logging"],
    estimate: "3 pts",
    acceptanceCriteria: [
      { id: "ac-7-1", text: "Record actor user_id and IP in audit events", completed: false },
      { id: "ac-7-2", text: "Expose chronological audit stream via /api/activity", completed: false }
    ],
    subtasks: [
      { id: "sub-7-1", title: "Hook audit emitter into task mutations", completed: false }
    ]
  },
  {
    id: "task-8",
    identifier: "DS-102",
    title: "Build task detail drawer with inline comment feed",
    description: "Provide sliding task detail drawer to view and edit task properties, subtasks checklist, dependencies, and @mentions without leaving the board view.",
    type: "feature",
    status: "ready",
    priority: "medium",
    startDate: iso(1),
    dueDate: iso(7),
    estimatedHours: 14,
    actualHours: 0,
    created: -2,
    updated: 0,
    projectId: "proj-design",
    assigneeIndex: 3,
    reviewerIndex: 0,
    milestoneId: "ms-ds-1",
    tags: ["UI", "Drawer", "Comments"],
    estimate: "5 pts",
    acceptanceCriteria: [
      { id: "ac-8-1", text: "Slide-in drawer with smooth transition and backdrop dismissal", completed: false },
      { id: "ac-8-2", text: "Inline editing of priority, status, assignee, and dates", completed: false },
      { id: "ac-8-3", text: "Comment box with instant activity logging", completed: false }
    ],
    subtasks: [
      { id: "sub-8-1", title: "Construct TaskDrawer component with Radix Dialog/Sheet", completed: false },
      { id: "sub-8-2", title: "Connect comment submission to /tasks/:id/comments", completed: false }
    ]
  },
  {
    id: "task-9",
    identifier: "CORE-104",
    title: "Reports & Project Intelligence with CSV Export",
    description: "Generate honest delivery metrics: Planned vs Completed, On-Time Delivery Rate, Average Cycle & Lead Times, and download Tasks CSV.",
    type: "feature",
    status: "backlog",
    priority: "medium",
    startDate: null,
    dueDate: iso(14),
    estimatedHours: 12,
    actualHours: 0,
    created: -1,
    updated: 0,
    projectId: "proj-core",
    assigneeIndex: 0,
    reviewerIndex: 1,
    milestoneId: "ms-core-2",
    tags: ["Reports", "Metrics", "CSV"],
    estimate: "5 pts",
    acceptanceCriteria: [
      { id: "ac-9-1", text: "Accurate mathematical calculation of lead time and cycle time", completed: false },
      { id: "ac-9-2", text: "Client-side and server-supported CSV export with formatted columns", completed: false }
    ],
    subtasks: [
      { id: "sub-9-1", title: "Build ReportsView charts with Recharts", completed: false },
      { id: "sub-9-2", title: "Add CSV download button and format generator", completed: false }
    ]
  },
  {
    id: "task-10",
    identifier: "MOB-302",
    title: "Interactive Calendar & Timeline Gantt view",
    description: "Provide interactive month/week calendar view and timeline bars showing task durations, deadlines, and milestone checkpoints.",
    type: "feature",
    status: "backlog",
    priority: "low",
    startDate: null,
    dueDate: iso(18),
    estimatedHours: 16,
    actualHours: 0,
    created: -1,
    updated: 0,
    projectId: "proj-mobile",
    assigneeIndex: 1,
    reviewerIndex: 3,
    milestoneId: "ms-mob-1",
    tags: ["Calendar", "Timeline", "Gantt"],
    estimate: "5 pts",
    acceptanceCriteria: [
      { id: "ac-10-1", text: "Monthly grid showing tasks on their due dates", completed: false },
      { id: "ac-10-2", text: "Timeline bars indicating start to due date ranges", completed: false }
    ],
    subtasks: [
      { id: "sub-10-1", title: "Implement CalendarView with day event popovers", completed: false },
      { id: "sub-10-2", title: "Build TimelineGanttView with milestone markers", completed: false }
    ]
  }
];
async function seedDatabase(force = false) {
  const schemaPath = import_path2.default.resolve(seedDirname, "../schema.sql");
  if (import_fs.default.existsSync(schemaPath)) {
    const schemaSql = import_fs.default.readFileSync(schemaPath, "utf-8");
    await query(schemaSql);
  }
  const existingUsers = await query("SELECT COUNT(*) as count FROM users");
  const count = parseInt(existingUsers.rows[0]?.count || "0", 10);
  if (count > 0 && !force) {
    console.log("\u2139\uFE0F Database schema up to date. Applying Nexus seed data...");
  } else {
    console.log("\u{1F331} Seeding TaskFlow Nexus Enterprise Database...");
  }
  const defaultUserId = "user-om";
  const defaultPasswordHash = await import_bcryptjs2.default.hash("thakkar2912", 10);
  await query(
    `INSERT INTO users (id, username, full_name, email, avatar_url, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, $6, 'admin')
     ON CONFLICT (username) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       email = EXCLUDED.email,
       password_hash = EXCLUDED.password_hash,
       role = 'admin';`,
    [defaultUserId, "omthakkar", "Om Thakkar", "omthakkar@example.com", "", defaultPasswordHash]
  );
  for (const m of SEED_TEAM_MEMBERS) {
    await query(
      `INSERT INTO team_members (id, name, email, role, avatar_url, initials)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         initials = EXCLUDED.initials;`,
      [m.id, m.name, m.email, m.role, "", m.initials]
    );
    if (m.id === "team-om" || m.email === "omthakkar@example.com") continue;
    const username = m.email.split("@")[0].replace(".", "");
    await query(
      `INSERT INTO users (id, username, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'member')
       ON CONFLICT (username) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email`,
      [m.id, username, m.name, m.email, defaultPasswordHash]
    );
  }
  for (const p of SEED_PROJECTS) {
    await query(
      `INSERT INTO projects (
         id, name, key, description, color, status, priority, health, lead, owner_id,
         start_date, deadline, progress
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         key = EXCLUDED.key,
         description = EXCLUDED.description,
         color = EXCLUDED.color,
         status = EXCLUDED.status,
         priority = EXCLUDED.priority,
         health = EXCLUDED.health,
         lead = EXCLUDED.lead,
         start_date = EXCLUDED.start_date,
         deadline = EXCLUDED.deadline,
         progress = EXCLUDED.progress;`,
      [
        p.id,
        p.name,
        p.key,
        p.description,
        p.color,
        p.status,
        p.priority,
        p.health,
        p.lead,
        defaultUserId,
        p.startDate,
        p.deadline,
        p.progress
      ]
    );
    await query(
      `INSERT INTO project_members (id, project_id, user_id, role)
       VALUES ($1, $2, $3, 'owner')
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [`pm-${p.id}-owner`, p.id, defaultUserId]
    );
    for (let mi = 1; mi <= 2; mi++) {
      const tm = SEED_TEAM_MEMBERS[mi];
      await query(
        `INSERT INTO project_members (id, project_id, user_id, role)
         VALUES ($1, $2, $3, 'developer')
         ON CONFLICT (project_id, user_id) DO NOTHING`,
        [`pm-${p.id}-${tm.id}`, p.id, tm.id]
      );
    }
  }
  for (const ms of SEED_MILESTONES) {
    await query(
      `INSERT INTO milestones (id, project_id, title, description, target_date, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         target_date = EXCLUDED.target_date,
         status = EXCLUDED.status;`,
      [ms.id, ms.projectId, ms.title, ms.description, ms.targetDate, ms.status]
    );
  }
  console.log("\u{1F4E5} Seeding tasks with Project, Assignee, Reviewer, and Status mappings...");
  for (let i = 0; i < SEED_TASKS.length; i++) {
    const t = SEED_TASKS[i];
    const proj = SEED_PROJECTS.find((p) => p.id === t.projectId) || SEED_PROJECTS[0];
    const assignee = SEED_TEAM_MEMBERS[t.assigneeIndex] || SEED_TEAM_MEMBERS[0];
    const reviewer = SEED_TEAM_MEMBERS[t.reviewerIndex] || SEED_TEAM_MEMBERS[1];
    const createdAt = iso(t.created, 9 + i % 6);
    const updatedAt = iso(t.updated, 11 + i % 6);
    const completedAt = t.status === "completed" ? updatedAt : null;
    await query(
      `INSERT INTO tasks (
         id, identifier, user_id, project_id, project_name, project_color,
         assignee_id, assignee_name, assignee_role, assignee_initials,
         reviewer_id, reviewer_name,
         title, description, type, status, priority, blocked_reason,
         start_date, due_date, estimated_hours, actual_hours, estimate,
         tags, subtasks, acceptance_criteria, milestone_id, is_bookmarked,
         completed_at, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
       ON CONFLICT (id) DO UPDATE SET
         identifier = EXCLUDED.identifier,
         project_id = EXCLUDED.project_id,
         project_name = EXCLUDED.project_name,
         project_color = EXCLUDED.project_color,
         assignee_id = EXCLUDED.assignee_id,
         assignee_name = EXCLUDED.assignee_name,
         assignee_role = EXCLUDED.assignee_role,
         assignee_initials = EXCLUDED.assignee_initials,
         reviewer_id = EXCLUDED.reviewer_id,
         reviewer_name = EXCLUDED.reviewer_name,
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         type = EXCLUDED.type,
         status = EXCLUDED.status,
         priority = EXCLUDED.priority,
         blocked_reason = EXCLUDED.blocked_reason,
         start_date = EXCLUDED.start_date,
         due_date = EXCLUDED.due_date,
         estimated_hours = EXCLUDED.estimated_hours,
         actual_hours = EXCLUDED.actual_hours,
         estimate = EXCLUDED.estimate,
         tags = EXCLUDED.tags,
         subtasks = EXCLUDED.subtasks,
         acceptance_criteria = EXCLUDED.acceptance_criteria,
         milestone_id = EXCLUDED.milestone_id,
         completed_at = EXCLUDED.completed_at;`,
      [
        t.id,
        t.identifier,
        defaultUserId,
        proj.id,
        proj.name,
        proj.color,
        assignee.id,
        assignee.name,
        assignee.role,
        assignee.initials,
        reviewer.id,
        reviewer.name,
        t.title,
        t.description,
        t.type,
        t.status,
        t.priority,
        t.blockedReason || "",
        t.startDate,
        t.dueDate,
        t.estimatedHours,
        t.actualHours,
        t.estimate,
        JSON.stringify(t.tags),
        JSON.stringify(t.subtasks),
        JSON.stringify(t.acceptanceCriteria),
        t.milestoneId || null,
        i === 0 || i === 2,
        completedAt,
        createdAt,
        updatedAt
      ]
    );
  }
  console.log("\u{1F517} Seeding task dependencies...");
  const sampleDependencies = [
    { id: "dep-1", taskId: "task-4", dependsOn: "task-2", type: "blocked_by" },
    { id: "dep-2", taskId: "task-7", dependsOn: "task-3", type: "blocked_by" },
    { id: "dep-3", taskId: "task-8", dependsOn: "task-1", type: "related" },
    { id: "dep-4", taskId: "task-5", dependsOn: "task-1", type: "blocked_by" }
  ];
  for (const dep of sampleDependencies) {
    await query(
      `INSERT INTO task_dependencies (id, task_id, depends_on_task_id, dependency_type, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (task_id, depends_on_task_id, dependency_type) DO NOTHING`,
      [dep.id, dep.taskId, dep.dependsOn, dep.type]
    );
  }
  console.log("\u{1F514} Seeding notifications...");
  const sampleNotifications = [
    {
      id: "notif-1",
      userId: defaultUserId,
      actorId: "team-alex",
      actorName: "Alex Rivera",
      type: "review",
      title: "Review Requested: SEC-201",
      message: "Alex requested your architectural review on JWT authentication and header hardening.",
      entityType: "task",
      entityId: "task-3",
      isRead: false
    },
    {
      id: "notif-2",
      userId: defaultUserId,
      actorId: "team-sarah",
      actorName: "Sarah Chen",
      type: "assignment",
      title: "Assigned to CORE-102",
      message: "You have been assigned as lead on task dependency cycle detection.",
      entityType: "task",
      entityId: "task-4",
      isRead: false
    },
    {
      id: "notif-3",
      userId: defaultUserId,
      actorId: "team-elena",
      actorName: "Elena Rostova",
      type: "mention",
      title: "Mentioned in Design System",
      message: "@omthakkar Can you check the contrast ratio tokens on the dark charcoal sidebar?",
      entityType: "task",
      entityId: "task-1",
      isRead: true
    },
    {
      id: "notif-4",
      userId: defaultUserId,
      actorId: "system",
      actorName: "TaskFlow Nexus",
      type: "deadline",
      title: "Approaching Milestone",
      message: "Milestone 'JWT Authorization & Rate Limiting' target date is in 5 days.",
      entityType: "milestone",
      entityId: "ms-sec-1",
      isRead: false
    }
  ];
  for (const n of sampleNotifications) {
    await query(
      `INSERT INTO notifications (id, user_id, actor_id, actor_name, type, title, message, entity_type, entity_id, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [n.id, n.userId, n.actorId, n.actorName, n.type, n.title, n.message, n.entityType, n.entityId, n.isRead]
    );
  }
  console.log("\u{1F4CB} Seeding activities feed...");
  const sampleActivities = [
    {
      id: "act-1",
      userId: defaultUserId,
      projectId: "proj-core",
      taskId: "task-2",
      taskTitle: "Set up PostgreSQL relational schema & migrations",
      type: "task_completed",
      details: { status: "completed" }
    },
    {
      id: "act-2",
      userId: "team-alex",
      projectId: "proj-security",
      taskId: "task-3",
      taskTitle: "Harden authentication & eliminate client ID spoofing",
      type: "review_requested",
      details: { reviewer: "Om Thakkar" }
    },
    {
      id: "act-3",
      userId: "team-elena",
      projectId: "proj-design",
      taskId: "task-1",
      taskTitle: "Design enterprise navigation shell & color system",
      type: "task_completed",
      details: { status: "completed" }
    }
  ];
  for (const a of sampleActivities) {
    await query(
      `INSERT INTO activities (id, user_id, project_id, task_id, task_title, type, details, at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.userId, a.projectId, a.taskId, a.taskTitle, a.type, JSON.stringify(a.details)]
    );
  }
  console.log("\u2705 TaskFlow Nexus Enterprise database ready!");
}
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seedDatabase(true).then(() => pool.end()).catch((err) => {
    console.error("\u274C Seed failed:", err);
    process.exit(1);
  });
}

// src/index.ts
import_dotenv2.default.config();
var app = (0, import_express9.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4e3;
app.use(
  (0, import_cors.default)({
    origin: true,
    credentials: true
  })
);
app.use(import_express9.default.json());
app.use((0, import_cookie_parser.default)());
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== "test") {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});
var handleHealth = async (req, res) => {
  try {
    const dbCheck = await query("SELECT NOW() as db_time");
    res.json({
      status: "ok",
      database: "connected",
      dbTime: dbCheck.rows[0].db_time,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: err.message
    });
  }
};
var handleEmailStatus = (req, res) => {
  const configured = isEmailConfigured();
  const provider = process.env.RESEND_API_KEY ? "resend" : process.env.SMTP_HOST ? "smtp" : null;
  res.json({
    configured,
    provider,
    appBaseUrl: getAppBaseUrl()
  });
};
app.get("/api/health", handleHealth);
app.get("/health", handleHealth);
app.get("/api/settings/email-status", handleEmailStatus);
app.get("/settings/email-status", handleEmailStatus);
app.get("/", (req, res) => res.json({ name: "TaskFlow Nexus Enterprise API", status: "ok" }));
app.use(["/api/auth", "/auth"], auth_default);
app.use(["/api/tasks", "/tasks"], tasks_default);
app.use(["/api/projects", "/projects"], projects_default);
app.use(["/api/team", "/team"], team_default);
app.use(["/api/profile", "/profile"], profile_default);
app.use(["/api/activity", "/activity"], activity_default);
app.use(["/api/notifications", "/notifications"], notifications_default);
app.use(["/api", "/"], invitationsRouter);
app.use(["/api/*", "/*"], (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});
async function startServer() {
  try {
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`\u{1F680} TaskFlow Enterprise API running at http://localhost:${PORT}`);
      console.log(`\u{1F4E1} Endpoints available:`);
      console.log(`   - GET  /api/health`);
      console.log(`   - GET  /api/tasks`);
      console.log(`   - GET  /api/tasks/stats`);
      console.log(`   - POST /api/tasks`);
      console.log(`   - GET  /api/projects`);
      console.log(`   - GET  /api/team`);
      console.log(`   - GET  /api/profile`);
      console.log(`   - GET  /api/activity`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}
if (!process.env.VERCEL) {
  startServer();
}
var index_default = app;
module.exports = index_default; module.exports.default = index_default;
