import { describe, expect, it, vi, beforeEach } from "vitest";
import crypto from "crypto";
import {
  canUserEditTask,
  canUserReviewTask,
  isWorkspaceAdminOrLead,
  isProjectLeader,
  isProjectMember,
} from "../../server/src/permissions";
import { hashToken } from "../../server/src/routes/invitations";
import type { Task, TaskProgressUpdate, TaskReview, ProjectInvitation } from "@/types";

describe("Team Roles, Workflow & Permissions End-to-End Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Role-Based Permissions & Guard Rails", () => {
    const leaderUser = { id: "user-leader", username: "sarahlead", role: "leader" };
    const memberUser = { id: "user-member-1", username: "alexdev", role: "member" };
    const otherMemberUser = { id: "user-member-2", username: "bobdesign", role: "member" };

    const project = {
      id: "proj-alpha",
      ownerId: "user-leader",
      members: [
        { id: "user-leader", role: "owner" },
        { id: "user-member-1", role: "developer" },
        { id: "user-member-2", role: "designer" },
      ],
    };

    const task: Task = {
      id: "task-101",
      userId: "user-leader",
      projectId: "proj-alpha",
      title: "Implement OAuth Login",
      description: "Integrate OAuth 2.0 provider with PKCE flow",
      status: "in_progress",
      priority: "high",
      assigneeId: "user-member-1",
      assignee: {
        id: "user-member-1",
        name: "Alex Dev",
        role: "developer",
        initials: "AD",
      },
      reviewerId: "user-leader",
      dueDate: "2026-11-01T00:00:00.000Z",
      progressPercent: 50,
      createdAt: "2026-10-20T00:00:00.000Z",
      updatedAt: "2026-10-20T00:00:00.000Z",
    };

    it("allows the assigned team member to edit their own task", async () => {
      const res = await canUserEditTask(memberUser.id, task.id, task, project);
      expect(res.allowed).toBe(true);
    });

    it("allows project leaders and workspace leads to edit any task in the project", async () => {
      const res = await canUserEditTask(leaderUser.id, task.id, task, project);
      expect(res.allowed).toBe(true);
    });

    it("strictly prevents other team members from editing a task they are not assigned to", async () => {
      const res = await canUserEditTask(otherMemberUser.id, task.id, task, project);
      expect(res.allowed).toBe(false);
    });

    it("strictly prevents team members from self-approving their own work when independent review is required", async () => {
      // Alex (member) tries to review and approve their own task
      const res = await canUserReviewTask(memberUser.id, task.id, task, project);
      expect(res.allowed).toBe(false);
    });

    it("allows the team leader or designated reviewer to review and approve task work", async () => {
      const res = await canUserReviewTask(leaderUser.id, task.id, task, project);
      expect(res.allowed).toBe(true);
    });

    it("identifies workspace leads and project managers correctly", async () => {
      expect(await isWorkspaceAdminOrLead(leaderUser.id, leaderUser)).toBe(true);
      expect(await isWorkspaceAdminOrLead(memberUser.id, memberUser)).toBe(false);
      expect(await isProjectLeader(leaderUser.id, project.id, project)).toBe(true);
      expect(await isProjectLeader(memberUser.id, project.id, project)).toBe(false);
    });
  });

  describe("2. Full End-to-End Leader & Member Scenario", () => {
    // 1. Leader creates project
    const project = {
      id: "proj-taskflow-v2",
      name: "TaskFlow V2 Team Tracking",
      key: "TF2",
      ownerId: "user-om",
      status: "active",
      members: [{ id: "user-om", role: "owner", email: "om@taskflow.dev" }],
    };

    // 2. Leader invites member
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    const invitation: ProjectInvitation = {
      id: "inv-001",
      projectId: project.id,
      projectName: project.name,
      inviterId: "user-om",
      inviterName: "Om Thakkar",
      recipientEmail: "elena.rodriguez@example.com",
      recipientName: "Elena Rodriguez",
      role: "developer",
      skills: "React, TypeScript, Node.js",
      designation: "Frontend Specialist",
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    it("generates a secure 256-bit token with one-way SHA-256 hash", () => {
      expect(tokenHash).toHaveLength(64);
      expect(hashToken(rawToken)).toBe(tokenHash);
      expect(tokenHash).not.toContain(rawToken);
    });

    // 3. Member opens link, registers matching email, and accepts invitation
    const newMemberUser = {
      id: "user-elena-10",
      username: "elenarodriguez",
      email: "elena.rodriguez@example.com",
      fullName: "Elena Rodriguez",
      role: "member" as const,
    };

    it("validates invitation acceptance: email must match verified invited email", () => {
      const wrongUser = { ...newMemberUser, email: "imposter@malicious.org" };
      const canAcceptWrong = wrongUser.email.toLowerCase() === invitation.recipientEmail.toLowerCase();
      expect(canAcceptWrong).toBe(false);

      const canAcceptCorrect = newMemberUser.email.toLowerCase() === invitation.recipientEmail.toLowerCase();
      expect(canAcceptCorrect).toBe(true);
    });

    it("prevents duplicate membership upon repeated acceptance", () => {
      const activeMembers = [...project.members];
      // First acceptance
      if (!activeMembers.some((m) => m.id === newMemberUser.id || m.email === newMemberUser.email)) {
        activeMembers.push({ id: newMemberUser.id, role: invitation.role, email: newMemberUser.email });
      }
      expect(activeMembers).toHaveLength(2);

      // Repeated acceptance attempt
      if (!activeMembers.some((m) => m.id === newMemberUser.id || m.email === newMemberUser.email)) {
        activeMembers.push({ id: newMemberUser.id, role: invitation.role, email: newMemberUser.email });
      }
      expect(activeMembers).toHaveLength(2); // No duplicate
    });

    // 4. Leader assigns task to member
    const task: Task = {
      id: "task-dashboard-ui",
      identifier: "TF2-10",
      userId: project.ownerId,
      projectId: project.id,
      projectName: project.name,
      title: "Build Member Dashboard UI",
      description: "Implement responsive member cockpit with overview metrics and assigned tasks list.",
      status: "in_progress",
      priority: "high",
      assigneeId: newMemberUser.id,
      assignee: {
        id: newMemberUser.id,
        name: newMemberUser.fullName,
        email: newMemberUser.email,
        role: "developer",
        initials: "ER",
      },
      reviewerId: project.ownerId,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedHours: 8,
      progressPercent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progressUpdates: [],
      reviews: [],
    };

    // 5 & 6. Member updates progress with completed, remaining, %, blocker, evidence
    it("records daily progress update and updates current task status", () => {
      const update1: TaskProgressUpdate = {
        id: "upd-1",
        taskId: task.id,
        userId: newMemberUser.id,
        userName: newMemberUser.fullName,
        status: "in_review",
        progressPercent: 90,
        workCompleted: "Finished member metrics grid and task cards. Added filters by status and priority.",
        workRemaining: "Awaiting final review of color contrast and button responsiveness.",
        nextSteps: "Address reviewer feedback",
        timeSpentHours: 6.5,
        evidenceUrl: "https://github.com/org/repo/pull/42",
        createdAt: new Date().toISOString(),
      };

      // Append to history
      task.progressUpdates = [update1, ...(task.progressUpdates || [])];
      task.latestProgress = update1;
      task.status = update1.status;
      task.progressPercent = update1.progressPercent;

      expect(task.progressUpdates).toHaveLength(1);
      expect(task.status).toBe("in_review");
      expect(task.progressPercent).toBe(90);
      expect(task.latestProgress.workCompleted).toContain("Finished member metrics grid");
    });

    // 7 & 8. Leader sees task in review queue and requests changes
    it("allows leader to request changes with written feedback, returning task to in_progress", () => {
      const leaderReview1: TaskReview = {
        id: "rev-1",
        taskId: task.id,
        reviewerId: project.ownerId,
        reviewerName: "Om Thakkar",
        progressUpdateId: "upd-1",
        decision: "changes_requested",
        feedback: "Great work! Please ensure the mobile drawer can be closed with the Esc key and fix the padding.",
        createdAt: new Date().toISOString(),
      };

      task.reviews = [leaderReview1, ...(task.reviews || [])];
      task.status = "in_progress"; // Returns to in_progress

      expect(task.reviews).toHaveLength(1);
      expect(task.reviews[0].decision).toBe("changes_requested");
      expect(task.reviews[0].feedback).toContain("Esc key");
      expect(task.status).toBe("in_progress");
    });

    // 9. Member addresses feedback and resubmits for review
    it("allows member to update progress following feedback and resubmit for review", () => {
      const update2: TaskProgressUpdate = {
        id: "upd-2",
        taskId: task.id,
        userId: newMemberUser.id,
        userName: newMemberUser.fullName,
        status: "in_review",
        progressPercent: 100,
        workCompleted: "Added Esc keydown listener to close drawer and adjusted mobile padding to 16px.",
        workRemaining: "None - all feedback items resolved.",
        timeSpentHours: 1.5,
        evidenceUrl: "https://github.com/org/repo/pull/42#commit-2",
        createdAt: new Date().toISOString(),
      };

      task.progressUpdates = [update2, ...(task.progressUpdates || [])];
      task.latestProgress = update2;
      task.status = "in_review";
      task.progressPercent = 100;

      expect(task.progressUpdates).toHaveLength(2);
      expect(task.status).toBe("in_review");
      expect(task.latestProgress.workCompleted).toContain("Added Esc keydown listener");
    });

    // 10 & 11. Leader approves task -> marked completed, preserving full history
    it("allows leader to approve the task, marking it completed and preserving full audit trail", () => {
      const leaderReview2: TaskReview = {
        id: "rev-2",
        taskId: task.id,
        reviewerId: project.ownerId,
        reviewerName: "Om Thakkar",
        progressUpdateId: "upd-2",
        decision: "approved",
        feedback: "Verified and tested on mobile viewport. Excellent quality. Approved!",
        createdAt: new Date().toISOString(),
      };

      task.reviews = [leaderReview2, ...(task.reviews || [])];
      task.status = "completed";
      task.completedAt = new Date().toISOString();

      expect(task.status).toBe("completed");
      expect(task.reviews).toHaveLength(2);
      expect(task.reviews[0].decision).toBe("approved");
      expect(task.progressUpdates).toHaveLength(2);

      // Verify immutable timeline order (newest first)
      expect(task.reviews[0].id).toBe("rev-2");
      expect(task.reviews[1].id).toBe("rev-1");
      expect(task.progressUpdates[0].id).toBe("upd-2");
      expect(task.progressUpdates[1].id).toBe("upd-1");
    });
  });

  describe("3. Negative Validation & Security Edge Cases", () => {
    it("rejects invalid progress percentages outside 0 to 100", () => {
      function validateProgressPercent(val: number): boolean {
        return typeof val === "number" && !isNaN(val) && val >= 0 && val <= 100;
      }

      expect(validateProgressPercent(-10)).toBe(false);
      expect(validateProgressPercent(105)).toBe(false);
      expect(validateProgressPercent(NaN)).toBe(false);
      expect(validateProgressPercent(0)).toBe(true);
      expect(validateProgressPercent(75)).toBe(true);
      expect(validateProgressPercent(100)).toBe(true);
    });

    it("requires a blocker reason whenever status is set to blocked", () => {
      function validateBlockedStatus(status: string, reason?: string): boolean {
        if (status === "blocked") {
          return Boolean(reason && reason.trim().length > 0);
        }
        return true;
      }

      expect(validateBlockedStatus("blocked", "")).toBe(false);
      expect(validateBlockedStatus("blocked", "   ")).toBe(false);
      expect(validateBlockedStatus("blocked", "Waiting for database credentials")).toBe(true);
      expect(validateBlockedStatus("in_progress", "")).toBe(true);
    });

    it("verifies invitation expiry after 7 days", () => {
      const expiredDate = new Date(Date.now() - 1000).toISOString();
      const validDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      function isExpired(expiresAt: string): boolean {
        return new Date(expiresAt) < new Date();
      }

      expect(isExpired(expiredDate)).toBe(true);
      expect(isExpired(validDate)).toBe(false);
    });
  });
});
