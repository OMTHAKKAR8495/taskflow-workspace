import type { Activity, Profile, Task, TaskInput } from "@/types";

export const DEMO_USER_ID = "user-1";

function iso(daysFromNow: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

type Seed = TaskInput & { created: number; updated: number };

const SEEDS: Seed[] = [
  { title: "Design onboarding flow", description: "Create wireframes and high-fidelity mockups for the new user onboarding experience, covering the welcome screen, workspace setup and first-task prompt.", status: "in_progress", priority: "high", dueDate: iso(2), created: -9, updated: -1 },
  { title: "Set up PostgreSQL schema", description: "Define tables for users, tasks and profiles with proper foreign keys, indexes on user_id and due_date, and a migration script.", status: "completed", priority: "high", dueDate: iso(-3), created: -14, updated: -3 },
  { title: "Write API documentation", description: "Document all REST endpoints for the tasks resource including request bodies, response shapes, and error codes.", status: "pending", priority: "medium", dueDate: iso(5), created: -6, updated: -6 },
  { title: "Implement JWT authentication", description: "Add login and registration endpoints in Express, hash passwords with bcrypt, and protect task routes with middleware.", status: "in_progress", priority: "high", dueDate: iso(1), created: -8, updated: 0 },
  { title: "Fix date picker timezone bug", description: "Due dates shift by one day for users west of UTC. Normalize dates to local midnight before saving.", status: "pending", priority: "high", dueDate: iso(-1), created: -4, updated: -2 },
  { title: "Add unit tests for task service", description: "Cover create, update, delete and filtering logic with Vitest. Aim for at least 80% coverage on the service layer.", status: "pending", priority: "medium", dueDate: iso(7), created: -3, updated: -3 },
  { title: "Refactor dashboard components", description: "Split the dashboard into smaller reusable components and move calculation logic into utility functions.", status: "completed", priority: "medium", dueDate: iso(-5), created: -12, updated: -2 },
  { title: "Configure CI pipeline", description: "Set up GitHub Actions to run linting, type checks and tests on every pull request.", status: "completed", priority: "low", dueDate: iso(-7), created: -15, updated: -5 },
  { title: "Prepare sprint demo", description: "Put together a short walkthrough of completed features and record a backup video in case of network issues.", status: "pending", priority: "low", dueDate: iso(10), created: -2, updated: -2 },
  { title: "Review accessibility audit", description: "Go through the audit report and fix contrast issues, missing labels and keyboard traps in modal dialogs.", status: "in_progress", priority: "medium", dueDate: iso(4), created: -5, updated: -1 },
  { title: "Optimize task list queries", description: "Add pagination to the GET /tasks endpoint and an index on (user_id, status) to speed up filtered queries.", status: "pending", priority: "low", dueDate: null, created: -1, updated: -1 },
  { title: "Update README", description: "Add setup instructions, environment variables, and screenshots to the project README.", status: "completed", priority: "low", dueDate: iso(-2), created: -6, updated: -1 },
];

export function buildSeedTasks(): Task[] {
  return SEEDS.map(({ created, updated, ...t }, i) => ({
    ...t,
    id: `task-${i + 1}`,
    userId: DEMO_USER_ID,
    createdAt: iso(created, 9 + (i % 6)),
    updatedAt: iso(updated, 11 + (i % 6)),
  }));
}

export function buildSeedProfile(): Profile {
  return {
    id: DEMO_USER_ID,
    fullName: "Alex Morgan",
    email: "alex.morgan@example.com",
    avatarUrl: "",
    createdAt: iso(-120),
  };
}

export function buildSeedActivity(tasks: Task[]): Activity[] {
  return [...tasks]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6)
    .map((t, i) => ({
      id: `act-seed-${i}`,
      type: t.status === "completed" ? "completed" : t.createdAt === t.updatedAt ? "created" : "updated",
      taskId: t.id,
      taskTitle: t.title,
      at: t.updatedAt,
    }));
}
