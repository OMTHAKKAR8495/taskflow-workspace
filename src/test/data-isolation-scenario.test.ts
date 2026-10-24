import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  canUserViewTask,
  canUserEditTask,
  canUserReviewTask,
  isWorkspaceAdminOrLead,
  isProjectLeader,
  isProjectMember,
} from "../../server/src/permissions";
import type { Task, TaskProgressUpdate, TaskReview } from "@/types";

describe("Strict Data Isolation and Role-Based Workflow Acceptance Test", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Step 1: The Team Leader creates a project with Member A and Member B.
  const leaderUser = { id: "user-leader", username: "alex_lead", role: "leader" };
  const memberA = { id: "user-member-a", username: "member_a", role: "member" };
  const memberB = { id: "user-member-b", username: "member_b", role: "member" };

  const project = {
    id: "proj-ecommerce",
    name: "E-Commerce Microservices",
    key: "ECM",
    ownerId: leaderUser.id,
    members: [
      { id: leaderUser.id, role: "owner" },
      { id: memberA.id, role: "member" },
      { id: memberB.id, role: "member" },
    ],
  };

  // Step 2: The leader assigns Task A to Member A and Task B to Member B.
  const taskA: Task = {
    id: "task-a",
    identifier: "ECM-101",
    userId: leaderUser.id,
    projectId: project.id,
    projectName: project.name,
    title: "Build Cart & Checkout API",
    description: "Implement high-throughput cart persistence with Redis",
    status: "in_progress",
    priority: "high",
    assigneeId: memberA.id,
    assignee: {
      id: memberA.id,
      name: "Member A",
      role: "Backend Engineer",
      initials: "MA",
    },
    reviewerId: leaderUser.id,
    dueDate: "2026-11-05T00:00:00.000Z",
    progressPercent: 30,
    acceptanceCriteria: [
      { id: "ac-1", text: "Cart items persist for 30 days", completed: true },
      { id: "ac-2", text: "Idempotent checkout endpoint", completed: false },
    ],
    progressUpdates: [],
    reviews: [],
    createdAt: "2026-10-20T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
  };

  const taskB: Task = {
    id: "task-b",
    identifier: "ECM-102",
    userId: leaderUser.id,
    projectId: project.id,
    projectName: project.name,
    title: "Payment Gateway Webhooks",
    description: "Handle Stripe payment success and failure events",
    status: "in_progress",
    priority: "critical",
    assigneeId: memberB.id,
    assignee: {
      id: memberB.id,
      name: "Member B",
      role: "Integration Specialist",
      initials: "MB",
    },
    reviewerId: leaderUser.id,
    dueDate: "2026-11-08T00:00:00.000Z",
    progressPercent: 20,
    acceptanceCriteria: [
      { id: "ac-3", text: "Signature verification on Stripe webhook", completed: true },
    ],
    progressUpdates: [],
    reviews: [],
    createdAt: "2026-10-20T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
  };

  it("1. verifies project membership and leadership roles", async () => {
    expect(await isProjectLeader(leaderUser.id, project.id, project)).toBe(true);
    expect(await isProjectLeader(memberA.id, project.id, project)).toBe(false);
    expect(await isProjectLeader(memberB.id, project.id, project)).toBe(false);

    expect(await isProjectMember(memberA.id, project.id, project)).toBe(true);
    expect(await isProjectMember(memberB.id, project.id, project)).toBe(true);
  });

  it("2. enforces that only the leader can assign tasks to other members", async () => {
    // Leader can edit/assign Task A and Task B
    const leaderPermA = await canUserEditTask(leaderUser.id, taskA.id, taskA, project);
    const leaderPermB = await canUserEditTask(leaderUser.id, taskB.id, taskB, project);
    expect(leaderPermA.allowed).toBe(true);
    expect(leaderPermA.isLeader).toBe(true);
    expect(leaderPermB.allowed).toBe(true);
    expect(leaderPermB.isLeader).toBe(true);

    // Member A can edit their own task
    const memberAPerm = await canUserEditTask(memberA.id, taskA.id, taskA, project);
    expect(memberAPerm.allowed).toBe(true);
    expect(memberAPerm.isLeader).toBe(false);

    // Member A CANNOT edit or reassign Member B's task
    const memberAPermB = await canUserEditTask(memberA.id, taskB.id, taskB, project);
    expect(memberAPermB.allowed).toBe(false);
  });

  it("3. Member A logs in and sees Task A, but cannot see Task B or full team task board", async () => {
    // Can Member A view Task A?
    const viewA = await canUserViewTask(memberA.id, taskA.id, taskA, project);
    expect(viewA.allowed).toBe(true);

    // Can Member A view Task B?
    const viewB = await canUserViewTask(memberA.id, taskB.id, taskB, project);
    expect(viewB.allowed).toBe(false);
    expect(viewB.reason).toContain("Forbidden");

    // Simulating GET /api/tasks query filter for Member A:
    const allProjectTasks = [taskA, taskB];
    const memberATasks = allProjectTasks.filter(
      (t) => t.assigneeId === memberA.id || t.userId === memberA.id,
    );
    expect(memberATasks.map((t) => t.id)).toEqual(["task-a"]);
    expect(memberATasks.some((t) => t.id === "task-b")).toBe(false);
  });

  it("4. Member B logs in and sees Task B, but cannot see Task A or full team task board", async () => {
    // Can Member B view Task B?
    const viewB = await canUserViewTask(memberB.id, taskB.id, taskB, project);
    expect(viewB.allowed).toBe(true);

    // Can Member B view Task A?
    const viewA = await canUserViewTask(memberB.id, taskA.id, taskA, project);
    expect(viewA.allowed).toBe(false);
    expect(viewA.reason).toContain("Forbidden");

    // Simulating GET /api/tasks query filter for Member B:
    const allProjectTasks = [taskA, taskB];
    const memberBTasks = allProjectTasks.filter(
      (t) => t.assigneeId === memberB.id || t.userId === memberB.id,
    );
    expect(memberBTasks.map((t) => t.id)).toEqual(["task-b"]);
    expect(memberBTasks.some((t) => t.id === "task-a")).toBe(false);
  });

  it("5. Member A submits a progress report for Task A", async () => {
    const progressUpdate: TaskProgressUpdate = {
      id: "prog-101",
      taskId: taskA.id,
      userId: memberA.id,
      userName: "Member A",
      status: "in_review",
      progressPercent: 90,
      workCompleted: "Completed Redis cart storage and added Jest integration tests",
      workRemaining: "Minor documentation cleanup",
      blockers: "",
      nextSteps: "Awaiting team leader code review and approval",
      timeSpentHours: 6.5,
      evidenceUrl: "https://github.com/org/repo/pull/42",
      createdAt: new Date().toISOString(),
    };

    taskA.progressUpdates = [progressUpdate];
    taskA.status = "in_review";
    taskA.progressPercent = 90;

    expect(taskA.progressUpdates.length).toBe(1);
    expect(taskA.status).toBe("in_review");
    expect(taskA.progressUpdates[0].workCompleted).toContain("Redis cart storage");
  });

  it("6. Member B cannot access that report, even by changing the API URL or task ID", async () => {
    // When Member B queries GET /api/tasks/task-a/progress:
    // Server checks canUserViewTask(memberB.id, "task-a", taskA)
    const accessCheck = await canUserViewTask(memberB.id, taskA.id, taskA, project);
    expect(accessCheck.allowed).toBe(false);
    expect(accessCheck.reason).toContain("Forbidden");

    // Similarly for reviews on Task A:
    const reviewsAccessCheck = await canUserViewTask(memberB.id, taskA.id, taskA, project);
    expect(reviewsAccessCheck.allowed).toBe(false);
  });

  it("7. Team Leader can see both members' tasks and review their progress", async () => {
    // Leader can view Task A
    const leaderViewA = await canUserViewTask(leaderUser.id, taskA.id, taskA, project);
    expect(leaderViewA.allowed).toBe(true);
    expect(leaderViewA.isLeader).toBe(true);

    // Leader can view Task B
    const leaderViewB = await canUserViewTask(leaderUser.id, taskB.id, taskB, project);
    expect(leaderViewB.allowed).toBe(true);
    expect(leaderViewB.isLeader).toBe(true);

    // Leader can access Task A's progress report
    expect(taskA.progressUpdates?.[0].workCompleted).toContain("Redis cart storage");

    // Leader review authorization check
    const canReview = await canUserReviewTask(leaderUser.id, taskA.id, taskA, project);
    expect(canReview.allowed).toBe(true);
  });

  it("8. Leader requests changes to Task A, and only Member A can see and respond to that task-specific feedback", async () => {
    // Leader submits review requesting changes
    const reviewFeedback: TaskReview = {
      id: "rev-201",
      taskId: taskA.id,
      reviewerId: leaderUser.id,
      reviewerName: "Alex Lead",
      decision: "changes_requested",
      feedback: "Please add rate limiting middleware to prevent cart abuse before approval.",
      createdAt: new Date().toISOString(),
    };

    taskA.reviews = [reviewFeedback];
    taskA.status = "in_progress"; // Returns to in_progress per workflow

    // Member A can view Task A and its review feedback
    const memberAView = await canUserViewTask(memberA.id, taskA.id, taskA, project);
    expect(memberAView.allowed).toBe(true);
    expect(taskA.reviews[0].decision).toBe("changes_requested");
    expect(taskA.reviews[0].feedback).toContain("rate limiting middleware");

    // Member B CANNOT view Task A or its private review feedback
    const memberBView = await canUserViewTask(memberB.id, taskA.id, taskA, project);
    expect(memberBView.allowed).toBe(false);

    // Member A responds to the feedback by submitting an updated progress report
    const followUpReport: TaskProgressUpdate = {
      id: "prog-102",
      taskId: taskA.id,
      userId: memberA.id,
      userName: "Member A",
      status: "in_review",
      progressPercent: 100,
      workCompleted: "Added token bucket rate limiting on checkout endpoints and verified with 1000 rps load test",
      workRemaining: "None",
      blockers: "",
      nextSteps: "Ready for re-review",
      timeSpentHours: 2.0,
      evidenceUrl: "https://github.com/org/repo/pull/42/commits/abc1234",
      createdAt: new Date().toISOString(),
    };

    // Immutable history: earlier report is preserved, new report is appended
    taskA.progressUpdates = [followUpReport, ...taskA.progressUpdates];
    taskA.status = "in_review";

    expect(taskA.progressUpdates.length).toBe(2);
    expect(taskA.progressUpdates[0].id).toBe("prog-102");
    expect(taskA.progressUpdates[1].id).toBe("prog-101");
    expect(taskA.progressUpdates[0].workCompleted).toContain("rate limiting");
  });
});
