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

const SEED_TASKS = [
  {
    title: "Design onboarding flow",
    description:
      "Create wireframes and high-fidelity mockups for the new user onboarding experience, covering the welcome screen, workspace setup and first-task prompt.",
    status: "in_progress",
    priority: "high",
    dueDate: iso(2),
    created: -9,
    updated: -1,
  },
  {
    title: "Set up PostgreSQL schema",
    description:
      "Define tables for users, tasks and profiles with proper foreign keys, indexes on user_id and due_date, and a migration script.",
    status: "completed",
    priority: "high",
    dueDate: iso(-3),
    created: -14,
    updated: -3,
  },
  {
    title: "Write API documentation",
    description:
      "Document all REST endpoints for the tasks resource including request bodies, response shapes, and error codes.",
    status: "pending",
    priority: "medium",
    dueDate: iso(5),
    created: -6,
    updated: -6,
  },
  {
    title: "Implement JWT authentication",
    description:
      "Add login and registration endpoints in Express, hash passwords with bcrypt, and protect task routes with middleware.",
    status: "in_progress",
    priority: "high",
    dueDate: iso(1),
    created: -8,
    updated: 0,
  },
  {
    title: "Fix date picker timezone bug",
    description:
      "Due dates shift by one day for users west of UTC. Normalize dates to local midnight before saving.",
    status: "pending",
    priority: "high",
    dueDate: iso(-1),
    created: -4,
    updated: -2,
  },
  {
    title: "Add unit tests for task service",
    description:
      "Cover create, update, delete and filtering logic with Vitest. Aim for at least 80% coverage on the service layer.",
    status: "pending",
    priority: "medium",
    dueDate: iso(7),
    created: -3,
    updated: -3,
  },
  {
    title: "Refactor dashboard components",
    description:
      "Split the dashboard into smaller reusable components and move calculation logic into utility functions.",
    status: "completed",
    priority: "medium",
    dueDate: iso(-5),
    created: -12,
    updated: -2,
  },
  {
    title: "Configure CI pipeline",
    description:
      "Set up GitHub Actions to run linting, type checks and tests on every pull request.",
    status: "completed",
    priority: "low",
    dueDate: iso(-7),
    created: -15,
    updated: -5,
  },
  {
    title: "Prepare sprint demo",
    description:
      "Put together a short walkthrough of completed features and record a backup video in case of network issues.",
    status: "pending",
    priority: "low",
    dueDate: iso(10),
    created: -2,
    updated: -2,
  },
  {
    title: "Review accessibility audit",
    description:
      "Go through the audit report and fix contrast issues, missing labels and keyboard traps in modal dialogs.",
    status: "in_progress",
    priority: "medium",
    dueDate: iso(4),
    created: -5,
    updated: -1,
  },
  {
    title: "Optimize task list queries",
    description:
      "Add pagination to the GET /tasks endpoint and an index on (user_id, status) to speed up filtered queries.",
    status: "pending",
    priority: "low",
    dueDate: null,
    created: -1,
    updated: -1,
  },
  {
    title: "Update README",
    description:
      "Add setup instructions, environment variables, and screenshots to the project README.",
    status: "completed",
    priority: "low",
    dueDate: iso(-2),
    created: -6,
    updated: -1,
  },
];

export async function seedDatabase() {
  console.log("🌱 Initializing PostgreSQL Schema and Seeds...");

  // 1. Run Schema
  const schemaPath = path.resolve(__dirname, "../schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    await query(schemaSql);
  }

  // 2. Ensure default user exists
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

  // 3. Check if user already has tasks
  const existingTasks = await query("SELECT count(*) FROM tasks WHERE user_id = $1", [
    defaultUserId,
  ]);
  const taskCount = parseInt(existingTasks.rows[0].count, 10);

  if (taskCount === 0) {
    console.log("📥 Seeding initial tasks for user-om...");
    for (let i = 0; i < SEED_TASKS.length; i++) {
      const t = SEED_TASKS[i];
      const taskId = `task-${i + 1}`;
      const createdAt = iso(t.created, 9 + (i % 6));
      const updatedAt = iso(t.updated, 11 + (i % 6));

      await query(
        `INSERT INTO tasks (id, user_id, title, description, status, priority, due_date, is_bookmarked, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING;`,
        [
          taskId,
          defaultUserId,
          t.title,
          t.description,
          t.status,
          t.priority,
          t.dueDate,
          i === 0 || i === 3, // bookmark first and fourth
          createdAt,
          updatedAt,
        ]
      );

      // Add a sample comment for the first task
      if (i === 0) {
        await query(
          `INSERT INTO task_comments (id, task_id, author, content, created_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING;`,
          [
            `comm-1`,
            taskId,
            "Om Thakkar",
            "Initial wireframes drafted in Figma. Need feedback on step 2.",
            iso(-1, 14),
          ]
        );
      }
    }

    // 4. Seed activities
    console.log("📥 Seeding initial activities...");
    for (let i = 0; i < 6; i++) {
      const t = SEED_TASKS[i];
      const actType =
        t.status === "completed"
          ? "completed"
          : t.created === t.updated
          ? "created"
          : "updated";
      await query(
        `INSERT INTO activities (id, user_id, task_id, task_title, type, at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING;`,
        [`act-seed-${i}`, defaultUserId, `task-${i + 1}`, t.title, actType, iso(t.updated)]
      );
    }
  }

  console.log("✅ Database initialized and verified!");
}

// Run directly if invoked from CLI
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seedDatabase()
    .then(() => pool.end())
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}
