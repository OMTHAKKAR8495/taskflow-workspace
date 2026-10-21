import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool, query } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    description: "Next-gen infrastructure, database schema, and high-performance microservices.",
    color: "#6366f1",
    status: "active",
    lead: "Om Thakkar",
  },
  {
    id: "proj-mobile",
    name: "Mobile App Experience",
    key: "MOB",
    description: "Touch gestures, offline data caching, and native responsive optimizations.",
    color: "#06b6d4",
    status: "active",
    lead: "Sarah Chen",
  },
  {
    id: "proj-security",
    name: "Security & Compliance",
    key: "SEC",
    description: "Role-based access control, cryptographic verification, and audit trail logging.",
    color: "#ec4899",
    status: "active",
    lead: "Alex Rivera",
  },
  {
    id: "proj-design",
    name: "Design System & UI Kit",
    key: "DS",
    description: "Accessible component library, theme tokens, and motion guidelines.",
    color: "#8b5cf6",
    status: "active",
    lead: "Elena Rostova",
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

const SEED_TASKS = [
  {
    title: "Design onboarding flow",
    description: "Create wireframes and high-fidelity mockups for the new user onboarding experience, covering the welcome screen, workspace setup and first-task prompt.",
    status: "in_progress",
    priority: "high",
    dueDate: iso(2),
    created: -9,
    updated: -1,
    projectId: "proj-design",
    assigneeIndex: 3,
    tags: ["Design", "UX", "Figma"],
    estimate: "5 pts",
    subtasks: [
      { id: "sub-1-1", title: "User journey mapping & personas", completed: true },
      { id: "sub-1-2", title: "Low-fidelity wireframes in Figma", completed: true },
      { id: "sub-1-3", title: "Interactive prototype & user testing", completed: false },
    ],
  },
  {
    title: "Set up PostgreSQL schema",
    description: "Define tables for users, tasks and profiles with proper foreign keys, indexes on user_id and due_date, and a migration script.",
    status: "completed",
    priority: "high",
    dueDate: iso(-3),
    created: -14,
    updated: -3,
    projectId: "proj-core",
    assigneeIndex: 0,
    tags: ["Database", "PostgreSQL", "Backend"],
    estimate: "8 pts",
    subtasks: [
      { id: "sub-2-1", title: "Draft ER diagrams & constraints", completed: true },
      { id: "sub-2-2", title: "Write DDL migration scripts", completed: true },
      { id: "sub-2-3", title: "Verify connection pool under load", completed: true },
    ],
  },
  {
    title: "Write API documentation",
    description: "Document all REST endpoints for the tasks resource including request bodies, response shapes, and error codes.",
    status: "pending",
    priority: "medium",
    dueDate: iso(5),
    created: -6,
    updated: -6,
    projectId: "proj-core",
    assigneeIndex: 2,
    tags: ["Documentation", "API", "Swagger"],
    estimate: "3 pts",
    subtasks: [
      { id: "sub-3-1", title: "OpenAPI 3.0 specification file", completed: false },
      { id: "sub-3-2", title: "Provide sample payloads for all status codes", completed: false },
    ],
  },
  {
    title: "Implement JWT authentication",
    description: "Add login and registration endpoints in Express, hash passwords with bcrypt, and protect task routes with middleware.",
    status: "in_progress",
    priority: "high",
    dueDate: iso(1),
    created: -8,
    updated: 0,
    projectId: "proj-security",
    assigneeIndex: 2,
    tags: ["Security", "Auth", "JWT"],
    estimate: "5 pts",
    subtasks: [
      { id: "sub-4-1", title: "Bcrypt salt & hash password helpers", completed: true },
      { id: "sub-4-2", title: "Sign access & refresh tokens", completed: true },
      { id: "sub-4-3", title: "Express authenticate middleware with Bearer scheme", completed: false },
    ],
  },
  {
    title: "Fix date picker timezone bug",
    description: "Due dates shift by one day for users west of UTC. Normalize dates to local midnight before saving.",
    status: "pending",
    priority: "high",
    dueDate: iso(-1),
    created: -4,
    updated: -2,
    projectId: "proj-mobile",
    assigneeIndex: 1,
    tags: ["Bug", "Frontend", "DateFns"],
    estimate: "2 pts",
    subtasks: [
      { id: "sub-5-1", title: "Reproduce bug in EST timezone", completed: true },
      { id: "sub-5-2", title: "Normalize ISO strings with date-fns tz helper", completed: false },
    ],
  },
  {
    title: "Add unit tests for task service",
    description: "Cover create, update, delete and filtering logic with Vitest. Aim for at least 80% coverage on the service layer.",
    status: "pending",
    priority: "medium",
    dueDate: iso(7),
    created: -3,
    updated: -3,
    projectId: "proj-core",
    assigneeIndex: 0,
    tags: ["QA", "Testing", "Vitest"],
    estimate: "3 pts",
    subtasks: [
      { id: "sub-6-1", title: "Test task sorting & priority filters", completed: true },
      { id: "sub-6-2", title: "Test optimistic update rollback on API failure", completed: false },
    ],
  },
  {
    title: "Refactor dashboard components",
    description: "Split the dashboard into smaller reusable components and move calculation logic into utility functions.",
    status: "completed",
    priority: "medium",
    dueDate: iso(-5),
    created: -12,
    updated: -2,
    projectId: "proj-design",
    assigneeIndex: 1,
    tags: ["Refactoring", "React", "Frontend"],
    estimate: "5 pts",
    subtasks: [
      { id: "sub-7-1", title: "Extract StatCard & ActivityFeed components", completed: true },
      { id: "sub-7-2", title: "Unit test computeStats utility", completed: true },
    ],
  },
  {
    title: "Configure CI pipeline",
    description: "Set up GitHub Actions to run linting, type checks and tests on every pull request.",
    status: "completed",
    priority: "low",
    dueDate: iso(-7),
    created: -15,
    updated: -5,
    projectId: "proj-core",
    assigneeIndex: 4,
    tags: ["DevOps", "GitHub Actions", "CI"],
    estimate: "3 pts",
    subtasks: [
      { id: "sub-8-1", title: "Write workflow YAML for lint and test", completed: true },
      { id: "sub-8-2", title: "Cache node_modules and pnpm store", completed: true },
    ],
  },
  {
    title: "Prepare sprint demo",
    description: "Put together a short walkthrough of completed features and record a backup video in case of network issues.",
    status: "pending",
    priority: "low",
    dueDate: iso(10),
    created: -2,
    updated: -2,
    projectId: "proj-design",
    assigneeIndex: 3,
    tags: ["Sprint", "Product", "Demo"],
    estimate: "2 pts",
    subtasks: [
      { id: "sub-9-1", title: "Slide deck covering deliverables", completed: false },
      { id: "sub-9-2", title: "Loom walkthrough recording", completed: false },
    ],
  },
  {
    title: "Review accessibility audit",
    description: "Go through the audit report and fix contrast issues, missing labels and keyboard traps in modal dialogs.",
    status: "in_progress",
    priority: "medium",
    dueDate: iso(4),
    created: -5,
    updated: -1,
    projectId: "proj-mobile",
    assigneeIndex: 1,
    tags: ["A11y", "Accessibility", "Frontend"],
    estimate: "3 pts",
    subtasks: [
      { id: "sub-10-1", title: "Audit color contrast on badges", completed: true },
      { id: "sub-10-2", title: "Add aria-label to icon buttons", completed: false },
    ],
  },
  {
    title: "Optimize task list queries",
    description: "Add pagination to the GET /tasks endpoint and an index on (user_id, status) to speed up filtered queries.",
    status: "pending",
    priority: "low",
    dueDate: null,
    created: -1,
    updated: -1,
    projectId: "proj-core",
    assigneeIndex: 4,
    tags: ["Database", "Performance", "Optimization"],
    estimate: "5 pts",
    subtasks: [
      { id: "sub-11-1", title: "Benchmark current query response time", completed: false },
      { id: "sub-11-2", title: "Create composite index on tasks table", completed: false },
    ],
  },
  {
    title: "Update README",
    description: "Add setup instructions, environment variables, and screenshots to the project README.",
    status: "completed",
    priority: "low",
    dueDate: iso(-2),
    created: -6,
    updated: -1,
    projectId: "proj-core",
    assigneeIndex: 0,
    tags: ["Documentation", "Docs"],
    estimate: "1 pt",
    subtasks: [
      { id: "sub-12-1", title: "Document quick start commands", completed: true },
    ],
  },
];

export async function seedDatabase() {
  console.log("🌱 Initializing Enterprise Task Management Schema and Seeds...");

  // 1. Run Schema
  const schemaPath = path.resolve(__dirname, "../schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    await query(schemaSql);
  }

  // 2. Seed Projects
  for (const p of SEED_PROJECTS) {
    await query(
      `INSERT INTO projects (id, name, key, description, color, status, lead)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         color = EXCLUDED.color,
         lead = EXCLUDED.lead;`,
      [p.id, p.name, p.key, p.description, p.color, p.status, p.lead]
    );
  }

  // 3. Seed Team Members
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
  }

  // 4. Ensure default user exists
  const defaultUserId = "user-om";
  await query(
    `INSERT INTO users (id, username, full_name, email, avatar_url, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       email = EXCLUDED.email;`,
    [
      defaultUserId,
      "omthakkar",
      "Om Thakkar",
      "omthakkar@example.com",
      "",
      "thakkar2912",
    ]
  );

  // 5. Seed or Update tasks with Project and Assignee data
  console.log("📥 Seeding tasks with Project & Assignee mappings...");
  for (let i = 0; i < SEED_TASKS.length; i++) {
    const t = SEED_TASKS[i];
    const taskId = `task-${i + 1}`;
    const proj = SEED_PROJECTS.find((p) => p.id === t.projectId) || SEED_PROJECTS[0];
    const assignee = SEED_TEAM_MEMBERS[t.assigneeIndex] || SEED_TEAM_MEMBERS[0];
    const createdAt = iso(t.created, 9 + (i % 6));
    const updatedAt = iso(t.updated, 11 + (i % 6));

    await query(
      `INSERT INTO tasks (
         id, user_id, project_id, project_name, project_color,
         assignee_id, assignee_name, assignee_role, assignee_initials,
         title, description, status, priority, due_date, estimate,
         tags, subtasks, is_bookmarked, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       ON CONFLICT (id) DO UPDATE SET
         project_id = EXCLUDED.project_id,
         project_name = EXCLUDED.project_name,
         project_color = EXCLUDED.project_color,
         assignee_id = EXCLUDED.assignee_id,
         assignee_name = EXCLUDED.assignee_name,
         assignee_role = EXCLUDED.assignee_role,
         assignee_initials = EXCLUDED.assignee_initials,
         estimate = EXCLUDED.estimate,
         tags = EXCLUDED.tags,
         subtasks = EXCLUDED.subtasks;`,
      [
        taskId,
        defaultUserId,
        proj.id,
        proj.name,
        proj.color,
        assignee.id,
        assignee.name,
        assignee.role,
        assignee.initials,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.dueDate,
        t.estimate,
        JSON.stringify(t.tags),
        JSON.stringify(t.subtasks),
        i === 0 || i === 3,
        createdAt,
        updatedAt,
      ]
    );
  }

  console.log("✅ Enterprise Task Management database ready!");
}

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seedDatabase()
    .then(() => pool.end())
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}
