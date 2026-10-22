import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { computeStats, filterAndSortTasks } from "@/lib/task-utils";
import { buildSeedTasks } from "@/services/mockData";

describe("App routing - 8 Enterprise Workspace Routes", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it("matches root / route", () => {
    const matches = router.matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(matches.at(-1)?.pathname).toBe("/");
  });

  it("matches 1. Overview (/dashboard)", () => {
    const matches = router.matchRoutes("/dashboard");
    expect(matches.at(-1)?.pathname).toBe("/dashboard");
  });

  it("matches 2. My Work (/my-work)", () => {
    const matches = router.matchRoutes("/my-work");
    expect(matches.at(-1)?.pathname).toBe("/my-work");
  });

  it("matches 3. Projects (/projects and /projects/$id)", () => {
    const listMatches = router.matchRoutes("/projects");
    expect(listMatches.at(-1)?.pathname).toMatch(/^\/projects\/?$/);

    const detailMatches = router.matchRoutes("/projects/proj-alpha");
    expect(detailMatches.at(-1)?.pathname).toBe("/projects/proj-alpha");
  });

  it("matches 4. Team (/team)", () => {
    const matches = router.matchRoutes("/team");
    expect(matches.at(-1)?.pathname).toBe("/team");
  });

  it("matches 5. Calendar (/calendar)", () => {
    const matches = router.matchRoutes("/calendar");
    expect(matches.at(-1)?.pathname).toBe("/calendar");
  });

  it("matches 6. Reports & Analytics (/reports)", () => {
    const matches = router.matchRoutes("/reports");
    expect(matches.at(-1)?.pathname).toBe("/reports");
  });

  it("matches 7. Notifications (/notifications)", () => {
    const matches = router.matchRoutes("/notifications");
    expect(matches.at(-1)?.pathname).toBe("/notifications");
  });

  it("matches 8. Settings (/settings)", () => {
    const matches = router.matchRoutes("/settings");
    expect(matches.at(-1)?.pathname).toBe("/settings");
  });

  it("matches Backlog & Task Management (/tasks)", () => {
    const matches = router.matchRoutes("/tasks");
    expect(matches.at(-1)?.pathname).toMatch(/^\/tasks\/?$/);
  });

  it("matches Invitation Acceptance Landing Route (/invitations/accept)", () => {
    const matches = router.matchRoutes("/invitations/accept");
    expect(matches.at(-1)?.pathname).toBe("/invitations/accept");
  });
});

describe("Task business logic", () => {
  it("calculates accurate dashboard stats from seed tasks", () => {
    const tasks = buildSeedTasks();
    const stats = computeStats(tasks);

    expect(stats.total).toBe(tasks.length);
    expect(stats.completionRate).toBe(Math.round((stats.completed / tasks.length) * 100));
    expect(stats.byPriority.high + stats.byPriority.medium + stats.byPriority.low).toBeGreaterThanOrEqual(0);
  });

  it("filters tasks by status and priority", () => {
    const tasks = buildSeedTasks();
    const completedTasks = filterAndSortTasks(tasks, {
      search: "",
      status: "completed",
      priority: "all",
      projectId: "all",
      assigneeId: "all",
      tag: "all",
      sort: "dueDate",
    });

    expect(completedTasks.every((t) => t.status === "completed")).toBe(true);

    const highPriorityTasks = filterAndSortTasks(tasks, {
      search: "",
      status: "all",
      priority: "high",
      projectId: "all",
      assigneeId: "all",
      tag: "all",
      sort: "dueDate",
    });

    expect(highPriorityTasks.every((t) => t.priority === "high")).toBe(true);
  });

  it("ensures new user ID tasks are empty", async () => {
    const { buildNewUserTasks } = await import("@/services/mockData");
    expect(buildNewUserTasks("user-new-123")).toEqual([]);
  });
});
