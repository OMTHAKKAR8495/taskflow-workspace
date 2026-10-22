import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { pool, query } from "./db.js";

const getDirname = (): string => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
};
const seedDirname = getDirname();

function iso(daysFromNow: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const SEED_PROJECTS = [
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
    progress: 65,
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
    progress: 40,
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
    progress: 55,
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
    progress: 80,
  },
];

export const SEED_TEAM_MEMBERS = [
  {
    id: "team-om",
    name: "Om Thakkar",
    email: "omthakkar@example.com",
    role: "Tech Lead & Full Stack",
    initials: "OT",
  },
  {
    id: "team-sarah",
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    role: "Lead Frontend Engineer",
    initials: "SC",
  },
  {
    id: "team-alex",
    name: "Alex Rivera",
    email: "alex.rivera@example.com",
    role: "Senior Backend Architect",
    initials: "AR",
  },
  {
    id: "team-elena",
    name: "Elena Rostova",
    email: "elena.r@example.com",
    role: "Product & UI/UX Designer",
    initials: "ER",
  },
  {
    id: "team-marcus",
    name: "Marcus Vance",
    email: "marcus.v@example.com",
    role: "DevOps & Cloud Engineer",
    initials: "MV",
  },
];

export const SEED_MILESTONES = [
  {
    id: "ms-core-1",
    projectId: "proj-core",
    title: "M1: Database Schema & Migration Engine",
    description: "Establish zero-downtime relational migrations, foreign key constraints, and indexing.",
    targetDate: iso(-5),
    status: "completed",
  },
  {
    id: "ms-core-2",
    projectId: "proj-core",
    title: "M2: Real-time REST & Dependency Graph API",
    description: "Implement cyclic dependency validation, project workspace routing, and metrics queries.",
    targetDate: iso(14),
    status: "pending",
  },
  {
    id: "ms-mob-1",
    projectId: "proj-mobile",
    title: "M1: Responsive Mobile Shell & Touch Kanban",
    description: "Mobile viewport layouts, sliding drawer transitions, and responsive tables.",
    targetDate: iso(20),
    status: "pending",
  },
  {
    id: "ms-sec-1",
    projectId: "proj-security",
    title: "M1: JWT Authorization & Rate Limiting",
    description: "Eliminate header spoofing, enforce bearer token verification, and rate limit auth routes.",
    targetDate: iso(5),
    status: "pending",
  },
  {
    id: "ms-ds-1",
    projectId: "proj-design",
    title: "M1: Enterprise Component Tokens & Palette",
    description: "Deliver charcoal/navy sidebar palette, cohesive state badges, and chart tokens.",
    targetDate: iso(-10),
    status: "completed",
  },
];

const SEED_TASKS = [
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
      { id: "ac-1-3", text: "Responsive hamburger collapse on mobile devices", completed: true },
    ],
    subtasks: [
      { id: "sub-1-1", title: "Map information architecture for 8 top-level views", completed: true },
      { id: "sub-1-2", title: "Audit color tokens across light and dark modes", completed: true },
      { id: "sub-1-3", title: "Export SVG icons and verify button tap targets", completed: true },
    ],
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
      { id: "ac-2-3", text: "Composite indexes on task status and project IDs", completed: true },
    ],
    subtasks: [
      { id: "sub-2-1", title: "Draft ER diagrams & constraints", completed: true },
      { id: "sub-2-2", title: "Write DDL migration scripts", completed: true },
      { id: "sub-2-3", title: "Verify connection pool under load", completed: true },
    ],
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
      { id: "ac-3-3", text: "Pass security unit tests verifying rejection of forged headers", completed: true },
    ],
    subtasks: [
      { id: "sub-3-1", title: "Refactor requireAuth in server/src/auth.ts", completed: true },
      { id: "sub-3-2", title: "Add rate-limiting middleware for auth routes", completed: true },
      { id: "sub-3-3", title: "Write regression test suite for auth security", completed: true },
    ],
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
      { id: "ac-4-3", text: "Prevent completing task if unresolved blocking tasks exist", completed: true },
    ],
    subtasks: [
      { id: "sub-4-1", title: "Create server/src/dependencies.ts with wouldCreateCycle", completed: true },
      { id: "sub-4-2", title: "Integrate into tasks router dependency endpoints", completed: true },
      { id: "sub-4-3", title: "Add unit tests for direct and indirect 3-node cycles", completed: false },
    ],
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
      { id: "ac-5-3", text: "Immediate API persistence via /tasks/:id/status", completed: true },
    ],
    subtasks: [
      { id: "sub-5-1", title: "Build KanbanBoard column layout with badge counters", completed: true },
      { id: "sub-5-2", title: "Implement draggable TaskCard with priority colors", completed: true },
      { id: "sub-5-3", title: "Handle blocked task banner and explanations", completed: true },
    ],
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
      { id: "ac-6-3", text: "Add date and project filter selectors", completed: false },
    ],
    subtasks: [
      { id: "sub-6-1", title: "Build Executive Overview summary cards", completed: true },
      { id: "sub-6-2", title: "Add Projects at Risk warning section", completed: true },
      { id: "sub-6-3", title: "Embed team member workload progress bars", completed: false },
    ],
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
      { id: "ac-7-2", text: "Expose chronological audit stream via /api/activity", completed: false },
    ],
    subtasks: [
      { id: "sub-7-1", title: "Hook audit emitter into task mutations", completed: false },
    ],
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
      { id: "ac-8-3", text: "Comment box with instant activity logging", completed: false },
    ],
    subtasks: [
      { id: "sub-8-1", title: "Construct TaskDrawer component with Radix Dialog/Sheet", completed: false },
      { id: "sub-8-2", title: "Connect comment submission to /tasks/:id/comments", completed: false },
    ],
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
      { id: "ac-9-2", text: "Client-side and server-supported CSV export with formatted columns", completed: false },
    ],
    subtasks: [
      { id: "sub-9-1", title: "Build ReportsView charts with Recharts", completed: false },
      { id: "sub-9-2", title: "Add CSV download button and format generator", completed: false },
    ],
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
      { id: "ac-10-2", text: "Timeline bars indicating start to due date ranges", completed: false },
    ],
    subtasks: [
      { id: "sub-10-1", title: "Implement CalendarView with day event popovers", completed: false },
      { id: "sub-10-2", title: "Build TimelineGanttView with milestone markers", completed: false },
    ],
  },
];

export async function seedDatabase(force = false) {
  // 1. Run Schema
  const schemaPath = path.resolve(seedDirname, "../schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    await query(schemaSql);
  }

  // Check if force is requested or if projects need updating
  const existingUsers = await query("SELECT COUNT(*) as count FROM users");
  const count = parseInt(existingUsers.rows[0]?.count || "0", 10);
  if (count > 0 && !force) {
    console.log("ℹ️ Database schema up to date. Applying Nexus seed data...");
  } else {
    console.log("🌱 Seeding TaskFlow Nexus Enterprise Database...");
  }

  // 2. Ensure default users exist with bcrypt hash
  const defaultUserId = "user-om";
  const defaultPasswordHash = await bcrypt.hash("thakkar2912", 10);
  await query(
    `INSERT INTO users (id, username, full_name, email, avatar_url, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, $6, 'admin')
     ON CONFLICT (username) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       email = EXCLUDED.email,
       password_hash = EXCLUDED.password_hash,
       role = 'admin';`,
    [defaultUserId, "omthakkar", "Om Thakkar", "omthakkar@example.com", "", defaultPasswordHash],
  );

  // 3. Seed Team Members
  for (const m of SEED_TEAM_MEMBERS) {
    await query(
      `INSERT INTO team_members (id, name, email, role, avatar_url, initials)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         initials = EXCLUDED.initials;`,
      [m.id, m.name, m.email, m.role, "", m.initials],
    );

    // Skip creating duplicate user account for Om Thakkar
    if (m.id === "team-om" || m.email === "omthakkar@example.com") continue;

    // Ensure each team member has a corresponding user account for assignment & login
    const username = m.email.split("@")[0].replace(".", "");
    await query(
      `INSERT INTO users (id, username, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'member')
       ON CONFLICT (username) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email`,
      [m.id, username, m.name, m.email, defaultPasswordHash],
    );
  }

  // 4. Seed Projects
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
        p.progress,
      ],
    );

    // Seed project members (Lead + 2 other teammates)
    await query(
      `INSERT INTO project_members (id, project_id, user_id, role)
       VALUES ($1, $2, $3, 'owner')
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [`pm-${p.id}-owner`, p.id, defaultUserId],
    );

    for (let mi = 1; mi <= 2; mi++) {
      const tm = SEED_TEAM_MEMBERS[mi];
      await query(
        `INSERT INTO project_members (id, project_id, user_id, role)
         VALUES ($1, $2, $3, 'developer')
         ON CONFLICT (project_id, user_id) DO NOTHING`,
        [`pm-${p.id}-${tm.id}`, p.id, tm.id],
      );
    }
  }

  // 5. Seed Milestones
  for (const ms of SEED_MILESTONES) {
    await query(
      `INSERT INTO milestones (id, project_id, title, description, target_date, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         target_date = EXCLUDED.target_date,
         status = EXCLUDED.status;`,
      [ms.id, ms.projectId, ms.title, ms.description, ms.targetDate, ms.status],
    );
  }

  // 6. Seed Tasks
  console.log("📥 Seeding tasks with Project, Assignee, Reviewer, and Status mappings...");
  for (let i = 0; i < SEED_TASKS.length; i++) {
    const t = SEED_TASKS[i];
    const proj = SEED_PROJECTS.find((p) => p.id === t.projectId) || SEED_PROJECTS[0];
    const assignee = SEED_TEAM_MEMBERS[t.assigneeIndex] || SEED_TEAM_MEMBERS[0];
    const reviewer = SEED_TEAM_MEMBERS[t.reviewerIndex] || SEED_TEAM_MEMBERS[1];
    const createdAt = iso(t.created, 9 + (i % 6));
    const updatedAt = iso(t.updated, 11 + (i % 6));
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
        updatedAt,
      ],
    );
  }

  // 7. Seed Task Dependencies
  console.log("🔗 Seeding task dependencies...");
  const sampleDependencies = [
    { id: "dep-1", taskId: "task-4", dependsOn: "task-2", type: "blocked_by" },
    { id: "dep-2", taskId: "task-7", dependsOn: "task-3", type: "blocked_by" },
    { id: "dep-3", taskId: "task-8", dependsOn: "task-1", type: "related" },
    { id: "dep-4", taskId: "task-5", dependsOn: "task-1", type: "blocked_by" },
  ];

  for (const dep of sampleDependencies) {
    await query(
      `INSERT INTO task_dependencies (id, task_id, depends_on_task_id, dependency_type, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (task_id, depends_on_task_id, dependency_type) DO NOTHING`,
      [dep.id, dep.taskId, dep.dependsOn, dep.type],
    );
  }

  // 8. Seed Notifications for default user
  console.log("🔔 Seeding notifications...");
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
      isRead: false,
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
      isRead: false,
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
      isRead: true,
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
      isRead: false,
    },
  ];

  for (const n of sampleNotifications) {
    await query(
      `INSERT INTO notifications (id, user_id, actor_id, actor_name, type, title, message, entity_type, entity_id, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [n.id, n.userId, n.actorId, n.actorName, n.type, n.title, n.message, n.entityType, n.entityId, n.isRead],
    );
  }

  // 9. Seed Activities
  console.log("📋 Seeding activities feed...");
  const sampleActivities = [
    {
      id: "act-1",
      userId: defaultUserId,
      projectId: "proj-core",
      taskId: "task-2",
      taskTitle: "Set up PostgreSQL relational schema & migrations",
      type: "task_completed",
      details: { status: "completed" },
    },
    {
      id: "act-2",
      userId: "team-alex",
      projectId: "proj-security",
      taskId: "task-3",
      taskTitle: "Harden authentication & eliminate client ID spoofing",
      type: "review_requested",
      details: { reviewer: "Om Thakkar" },
    },
    {
      id: "act-3",
      userId: "team-elena",
      projectId: "proj-design",
      taskId: "task-1",
      taskTitle: "Design enterprise navigation shell & color system",
      type: "task_completed",
      details: { status: "completed" },
    },
  ];

  for (const a of sampleActivities) {
    await query(
      `INSERT INTO activities (id, user_id, project_id, task_id, task_title, type, details, at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.userId, a.projectId, a.taskId, a.taskTitle, a.type, JSON.stringify(a.details)],
    );
  }

  console.log("✅ TaskFlow Nexus Enterprise database ready!");
}

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seedDatabase(true)
    .then(() => pool.end())
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}
