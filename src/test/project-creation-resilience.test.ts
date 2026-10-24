import { describe, it, expect } from "vitest";
import { parseSafeDate } from "../lib/utils";
import { mockTaskService } from "../services/mockTaskService";

describe("Project Creation Resilience & Date Parsing", () => {
  it("safely parses localized DD/MM/YYYY dates without throwing RangeError", () => {
    expect(parseSafeDate("17/10/2026")).toBe("2026-10-17T00:00:00.000Z");
    expect(parseSafeDate("25/10/2026")).toBe("2026-10-25T00:00:00.000Z");
    expect(parseSafeDate("05/01/2027")).toBe("2027-01-05T00:00:00.000Z");
  });

  it("safely parses ISO YYYY-MM-DD dates", () => {
    expect(parseSafeDate("2026-10-17")).toBe("2026-10-17T00:00:00.000Z");
    expect(parseSafeDate("2026-10-17T00:00:00.000Z")).toBe("2026-10-17T00:00:00.000Z");
  });

  it("safely handles null, empty, and invalid strings by returning null", () => {
    expect(parseSafeDate("")).toBeNull();
    expect(parseSafeDate(null)).toBeNull();
    expect(parseSafeDate(undefined)).toBeNull();
    expect(parseSafeDate("not-a-date")).toBeNull();
  });

  it("creates a project with single-letter key and localized date safely", async () => {
    const proj = await mockTaskService.createProject({
      name: "rewamp",
      key: "R",
      description: "",
      color: "#e54867",
      priority: "high",
      health: "on_track",
      lead: "Om Thakkar",
      startDate: parseSafeDate("17/10/2026"),
      deadline: parseSafeDate("25/10/2026"),
    });

    expect(proj).toBeDefined();
    expect(proj.id).toContain("proj-");
    expect(proj.name).toBe("rewamp");
    expect(proj.key).toBe("R");
    expect(proj.startDate).toBe("2026-10-17T00:00:00.000Z");
    expect(proj.deadline).toBe("2026-10-25T00:00:00.000Z");
  });

  it("persists created projects across user logout/login and identity changes", async () => {
    // 1. Create a project under current user
    const created = await mockTaskService.createProject({
      name: "New Enterprise Initiative",
      key: "NEI",
      description: "Critical enterprise deliverable",
      color: "#10b981",
      priority: "high",
      lead: "Om Thakkar",
    });

    // 2. Simulate logout: clear active user
    window.localStorage.removeItem("taskflow:auth_user");
    window.localStorage.removeItem("taskflow:jwt_token");

    // 3. Re-fetch projects as logged out user
    let projects = await mockTaskService.getProjects();
    expect(projects.some((p) => p.name === "New Enterprise Initiative")).toBe(true);

    // 4. Simulate login as a different user (e.g. google user)
    window.localStorage.setItem(
      "taskflow:auth_user",
      JSON.stringify({ id: "user-g-99999", fullName: "Google Teammate", email: "teammate@gmail.com", role: "leader" }),
    );

    // 5. Re-fetch projects under the newly logged in user: the project must still be present!
    projects = await mockTaskService.getProjects();
    expect(projects.some((p) => p.name === "New Enterprise Initiative")).toBe(true);
  });
});
