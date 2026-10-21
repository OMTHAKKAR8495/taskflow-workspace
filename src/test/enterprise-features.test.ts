import { describe, expect, it } from "vitest";
import type { Task, TaskStatus } from "@/types";

/**
 * Pure DAG cycle detection helper (mirrors server/src/dependencies.ts algorithm)
 */
function wouldCreateCycleInMemory(
  taskId: string,
  dependsOnTaskId: string,
  existingDependencies: { taskId: string; dependsOnTaskId: string; dependencyType: "blocks" | "blocked_by" }[]
): boolean {
  if (taskId === dependsOnTaskId) return true;

  const adj = new Map<string, Set<string>>();
  for (const edge of existingDependencies) {
    let t = edge.taskId;
    let dep = edge.dependsOnTaskId;

    if (edge.dependencyType === "blocks") {
      const temp = t;
      t = dep;
      dep = temp;
    }

    if (!adj.has(t)) adj.set(t, new Set());
    adj.get(t)!.add(dep);
  }

  // Check if dependsOnTaskId can reach taskId through prerequisites
  const visited = new Set<string>();
  const queue = [dependsOnTaskId];

  while (queue.length > 0) {
    const current = queue.shift()!;
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

/**
 * Validation helper for enterprise 6-status workflow
 */
const VALID_STATUSES: TaskStatus[] = [
  "backlog",
  "ready",
  "in_progress",
  "in_review",
  "blocked",
  "completed",
];

function canTransitionToCompleted(
  task: { id: string; status: TaskStatus; blockedReason?: string },
  prerequisites: { id: string; status: TaskStatus }[]
): { allowed: boolean; reason?: string } {
  if (task.status === "blocked" && task.blockedReason) {
    return { allowed: false, reason: `Task is blocked: ${task.blockedReason}` };
  }

  const incompletePrereqs = prerequisites.filter((p) => p.status !== "completed");
  if (incompletePrereqs.length > 0) {
    return {
      allowed: false,
      reason: `Cannot complete task: blocked by incomplete prerequisite tasks (${incompletePrereqs.map((p) => p.id).join(", ")})`,
    };
  }

  return { allowed: true };
}

describe("Enterprise DAG Dependency Cycle Detection", () => {
  it("detects direct self-dependencies as cycles", () => {
    expect(wouldCreateCycleInMemory("task-1", "task-1", [])).toBe(true);
  });

  it("permits valid directed acyclic additions", () => {
    // task-2 depends on task-1 (task-1 must finish before task-2)
    const existing = [
      { taskId: "task-2", dependsOnTaskId: "task-1", dependencyType: "blocked_by" as const },
    ];

    // Adding task-3 depends on task-2 is valid (task-1 -> task-2 -> task-3)
    expect(wouldCreateCycleInMemory("task-3", "task-2", existing)).toBe(false);
  });

  it("detects simple 2-node cycle", () => {
    // task-2 depends on task-1
    const existing = [
      { taskId: "task-2", dependsOnTaskId: "task-1", dependencyType: "blocked_by" as const },
    ];

    // Attempting to make task-1 depend on task-2 creates cycle (task-1 -> task-2 -> task-1)
    expect(wouldCreateCycleInMemory("task-1", "task-2", existing)).toBe(true);
  });

  it("detects transitive 3-node cycle", () => {
    // task-1 -> task-2 -> task-3
    const existing = [
      { taskId: "task-2", dependsOnTaskId: "task-1", dependencyType: "blocked_by" as const },
      { taskId: "task-3", dependsOnTaskId: "task-2", dependencyType: "blocked_by" as const },
    ];

    // Making task-1 depend on task-3 would create cycle
    expect(wouldCreateCycleInMemory("task-1", "task-3", existing)).toBe(true);
  });
});

describe("6-Stage Enterprise Task Workflow", () => {
  it("recognizes all 6 enterprise statuses", () => {
    expect(VALID_STATUSES).toEqual([
      "backlog",
      "ready",
      "in_progress",
      "in_review",
      "blocked",
      "completed",
    ]);
  });

  it("blocks completion when prerequisite tasks are incomplete", () => {
    const task = { id: "task-auth-jwt", status: "in_progress" as TaskStatus };
    const prereqs = [
      { id: "task-schema-db", status: "completed" as TaskStatus },
      { id: "task-crypto-keys", status: "in_progress" as TaskStatus }, // incomplete
    ];

    const result = canTransitionToCompleted(task, prereqs);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("blocked by incomplete prerequisite tasks");
  });

  it("allows completion when all prerequisite tasks are completed", () => {
    const task = { id: "task-auth-jwt", status: "in_review" as TaskStatus };
    const prereqs = [
      { id: "task-schema-db", status: "completed" as TaskStatus },
      { id: "task-crypto-keys", status: "completed" as TaskStatus },
    ];

    const result = canTransitionToCompleted(task, prereqs);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("prevents completion if task is explicitly blocked with a reason", () => {
    const task = {
      id: "task-auth-jwt",
      status: "blocked" as TaskStatus,
      blockedReason: "Waiting on SecOps API key approval",
    };

    const result = canTransitionToCompleted(task, []);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Task is blocked: Waiting on SecOps API key approval");
  });
});

describe("Project Portfolio Calculations", () => {
  it("accurately computes project progress from task counts", () => {
    const projectTasks = [
      { status: "completed" },
      { status: "completed" },
      { status: "in_progress" },
      { status: "ready" },
    ];

    const completed = projectTasks.filter((t) => t.status === "completed").length;
    const progress = Math.round((completed / projectTasks.length) * 100);

    expect(progress).toBe(50);
  });

  it("accurately reports 0% progress when no tasks are completed", () => {
    const projectTasks = [{ status: "backlog" }, { status: "ready" }];
    const completed = projectTasks.filter((t) => t.status === "completed").length;
    const progress = Math.round((completed / projectTasks.length) * 100);

    expect(progress).toBe(0);
  });

  it("safely formats project health with fallback when undefined", () => {
    const p1: { health?: string } = { health: "at_risk" };
    const p2: { health?: string } = {};

    const formatted1 = (p1.health || "on_track").replace("_", " ");
    const formatted2 = (p2.health || "on_track").replace("_", " ");

    expect(formatted1).toBe("at risk");
    expect(formatted2).toBe("on track");
  });
});

