import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { computeStats, filterAndSortTasks } from "@/lib/task-utils";
import { buildSeedTasks } from "@/services/mockData";

describe("App routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it("matches root / route", () => {
    const matches = router.matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(matches.at(-1)?.pathname).toBe("/");
  });

  it("matches /dashboard route", () => {
    const matches = router.matchRoutes("/dashboard");
    expect(matches.at(-1)?.pathname).toBe("/dashboard");
  });

  it("matches /tasks route", () => {
    const matches = router.matchRoutes("/tasks");
    expect(matches.at(-1)?.pathname).toMatch(/^\/tasks\/?$/);
  });

  it("matches /tasks/new route", () => {
    const matches = router.matchRoutes("/tasks/new");
    expect(matches.at(-1)?.pathname).toBe("/tasks/new");
  });

  it("matches /profile route", () => {
    const matches = router.matchRoutes("/profile");
    expect(matches.at(-1)?.pathname).toBe("/profile");
  });
});

describe("Task business logic", () => {
  it("calculates accurate dashboard stats from seed tasks", () => {
    const tasks = buildSeedTasks();
    const stats = computeStats(tasks);

    expect(stats.total).toBe(tasks.length);
    expect(stats.pending + stats.inProgress + stats.completed).toBe(tasks.length);
    expect(stats.completionRate).toBe(Math.round((stats.completed / tasks.length) * 100));
    expect(stats.byPriority.high + stats.byPriority.medium + stats.byPriority.low).toBe(tasks.length);
  });

  it("filters tasks by status and priority", () => {
    const tasks = buildSeedTasks();
    const completedTasks = filterAndSortTasks(tasks, {
      search: "",
      status: "completed",
      priority: "all",
      sort: "dueDate",
    });

    expect(completedTasks.every((t) => t.status === "completed")).toBe(true);

    const highPriorityTasks = filterAndSortTasks(tasks, {
      search: "",
      status: "all",
      priority: "high",
      sort: "dueDate",
    });

    expect(highPriorityTasks.every((t) => t.priority === "high")).toBe(true);
  });
});
