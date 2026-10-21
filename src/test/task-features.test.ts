import { describe, it, expect } from "vitest";
import { parseQuickInput } from "../components/tasks/SmartQuickAdd";
import { mockTaskService } from "../services/mockTaskService";
import type { TaskInput } from "../types";

describe("Smart Quick-Add NLP Parser", () => {
  it("parses full smart token syntax: title, priority, date, time, and list", () => {
    const input = "Buy organic milk tomorrow 5pm !high #groceries";
    const res = parseQuickInput(input);

    expect(res.cleanTitle).toBe("Buy organic milk");
    expect(res.priority).toBe("high");
    expect(res.listName).toBe("groceries");
    expect(res.tags).toContain("groceries");
    expect(res.dateLabel).toContain("Tomorrow");
    expect(res.dueDate).not.toBeNull();

    const date = new Date(res.dueDate!);
    expect(date.getHours()).toBe(17);
  });

  it("handles basic task with default values when no smart tokens are used", () => {
    const input = "Read chapter 4 of distributed systems book";
    const res = parseQuickInput(input);

    expect(res.cleanTitle).toBe("Read chapter 4 of distributed systems book");
    expect(res.priority).toBe("medium");
    expect(res.dueDate).toBeNull();
    expect(res.listName).toBeNull();
    expect(res.tags).toEqual([]);
  });

  it("handles low priority and weekday mentions", () => {
    const input = "Team weekly sync friday !low #work";
    const res = parseQuickInput(input);

    expect(res.cleanTitle).toBe("Team weekly sync");
    expect(res.priority).toBe("low");
    expect(res.listName).toBe("work");
    expect(res.dateLabel).toBe("Friday");
  });
});

describe("Recurring Tasks and Soft Delete / Restore Service", () => {
  it("creates a recurring task and auto-generates the next iteration on completion", async () => {
    const input: TaskInput = {
      title: "Daily morning standup",
      description: "Sync with team",
      status: "pending",
      priority: "high",
      dueDate: new Date().toISOString(),
      recurrence: "daily",
    };

    const task = await mockTaskService.createTask(input);
    expect(task.recurrence).toBe("daily");
    expect(task.status).toBe("pending");

    // Completing the task should generate next occurrence
    const updated = await mockTaskService.updateTask(task.id, { status: "completed" });
    expect(updated.status).toBe("completed");
    expect(updated.completedAt).not.toBeNull();

    // Check that a new recurrence iteration was spawned in tasks list
    const all = await mockTaskService.getTasks();
    const nextIteration = all.find(
      (t) => t.title === task.title && t.id !== task.id && t.status === "pending",
    );
    expect(nextIteration).toBeDefined();
    expect(nextIteration?.recurrence).toBe("daily");
  });

  it("soft-deletes to trash and can restore task", async () => {
    const input: TaskInput = {
      title: "Task to delete and restore",
      description: "Testing soft delete",
      status: "pending",
      priority: "low",
      dueDate: null,
    };

    const task = await mockTaskService.createTask(input);
    await mockTaskService.deleteTask(task.id);

    const trashed = await mockTaskService.getTaskById(task.id);
    expect(trashed?.isTrash).toBe(true);
    expect(trashed?.deletedAt).not.toBeNull();

    // Restore task
    const restored = await mockTaskService.restoreTask!(task.id);
    expect(restored.isTrash).toBe(false);
    expect(restored.deletedAt).toBeNull();
  });
});
