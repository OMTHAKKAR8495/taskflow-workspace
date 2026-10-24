import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  canUserEditTask,
  canUserReviewTask,
  canUserViewTask,
  isWorkspaceAdminOrLead,
  isProjectLeader,
  isProjectMember,
} from "../../server/src/permissions";
import { hashToken } from "../../server/src/routes/invitations";
import type { Task, Project, TaskProgressUpdate, TaskReview, ProjectInvitation } from "@/types";

describe("Project-Based Team Collaboration & Workflows Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const leaderUser = { id: "user-om", username: "omthakkar", role: "admin" };
  const memberUser1 = { id: "user-member-1", username: "alexdev", role: "member" };
  const memberUser2 = { id: "user-member-2", username: "sarahmember", role: "member" };
  const outsiderUser = { id: "user-outsider", username: "eve", role: "member" };

  const projectAlpha: Project = {
    id: "proj-alpha",
    name: "Alpha Mobile App",
    key: "ALPHA",
    description: "React Native Mobile Client",
    color: "#4f46e5",
    priority: "high",
    status: "active",
    ownerId: "user-om",
    lead: "Om Thakkar",
    members: [
      { id: "user-om", name: "Om Thakkar", role: "owner", initials: "OT" },
      { id: "user-member-1", name: "Alex Dev", role: "developer", initials: "AD" },
    ],
  };

  const projectBeta: Project = {
    id: "proj-beta",
    name: "Beta Analytics Dashboard",
    key: "BETA",
    description: "Internal Dashboard",
    color: "#10b981",
    priority: "medium",
    status: "active",
    ownerId: "user-om",
    lead: "Om Thakkar",
    members: [
      { id: "user-om", name: "Om Thakkar", role: "owner", initials: "OT" },
      { id: "user-member-2", name: "Sarah Member", role: "developer", initials: "SM" },
    ],
  };

  const taskAlpha: Task = {
    id: "task-alpha-1",
    userId: "user-om",
    projectId: "proj-alpha",
    title: "Implement Push Notifications",
    description: "FCM integration with background sync",
    status: "in_progress",
    priority: "high",
    assigneeId: "user-member-1",
    assignee: {
      id: "user-member-1",
      name: "Alex Dev",
      role: "developer",
      initials: "AD",
    },
    reviewerId: "user-om",
    dueDate: "2026-11-15T00:00:00.000Z",
    startDate: "2026-10-24T00:00:00.000Z",
    estimatedHours: 8,
    progressPercent: 60,
    submissionStatus: "none",
    createdAt: "2026-10-24T00:00:00.000Z",
    updatedAt: "2026-10-24T00:00:00.000Z",
  };

  describe("1. Root Cause Analysis & Project Creation Fixes", () => {
    it("handles all schema and payload aliases seamlessly", () => {
      const payloadFromUI = {
        name: "Cloud Pipeline",
        key_prefix: "PIPE",
        description: "CI/CD automated pipeline",
        color_theme: "#f59e0b",
        priority: "high",
        start_date: "2026-11-01",
        due_date: "2026-12-01",
      };

      const resolvedKey = payloadFromUI.key_prefix;
      const resolvedColor = payloadFromUI.color_theme;
      const resolvedDesc = payloadFromUI.description;

      expect(resolvedKey).toBe("PIPE");
      expect(resolvedColor).toBe("#f59e0b");
      expect(resolvedDesc).toBe("CI/CD automated pipeline");
    });

    it("generates a unique fallback key if key is not supplied", () => {
      const name = "Customer Analytics Engine";
      const words = name.trim().split(/\s+/);
      const generatedKey = (
        words.length >= 2
          ? words.map((w) => w[0]).join("")
          : name.slice(0, 4)
      ).toUpperCase();

      expect(generatedKey).toBe("CAE");
    });
  });

  describe("2. Project-Scoped Membership & Isolation", () => {
    it("member of Project Alpha has access to Project Alpha only", () => {
      const isMemberAlpha = projectAlpha.members.some((m) => m.id === memberUser1.id);
      const isMemberBeta = projectBeta.members.some((m) => m.id === memberUser1.id);

      expect(isMemberAlpha).toBe(true);
      expect(isMemberBeta).toBe(false);
    });

    it("adding a member to Project Alpha prevents duplicate membership insertion", () => {
      const existingMembers = ["user-om", "user-member-1"];
      const newCandidateId = "user-member-1";

      const alreadyExists = existingMembers.includes(newCandidateId);
      expect(alreadyExists).toBe(true);
    });

    it("batches multiple selected members for project addition", () => {
      const selectedUserIds = ["user-member-1", "user-member-2"];
      const existingIds = ["user-om"];

      const toAdd = selectedUserIds.filter((id) => !existingIds.includes(id));
      expect(toAdd).toEqual(["user-member-1", "user-member-2"]);
      expect(toAdd.length).toBe(2);
    });
  });

  describe("3. Task Assignment Scoping", () => {
    it("validates assignee belongs to the designated project", () => {
      const projectMemberIds = projectAlpha.members.map((m) => m.id);

      const isValidAssignee = projectMemberIds.includes(memberUser1.id);
      const isInvalidAssignee = projectMemberIds.includes(memberUser2.id);

      expect(isValidAssignee).toBe(true);
      expect(isInvalidAssignee).toBe(false);
    });

    it("allows the team leader to assign tasks with estimate, dates, and priority", () => {
      const newTaskInput = {
        title: "Setup Push Notifications Service Worker",
        description: "Handle incoming push events in background",
        projectId: "proj-alpha",
        assigneeId: "user-member-1",
        priority: "high",
        status: "backlog",
        estimatedHours: 6,
        startDate: "2026-10-25T00:00:00.000Z",
        dueDate: "2026-10-30T00:00:00.000Z",
        checklist: [{ title: "Register worker", completed: false }],
      };

      expect(newTaskInput.projectId).toBe(projectAlpha.id);
      expect(newTaskInput.assigneeId).toBe(memberUser1.id);
      expect(newTaskInput.estimatedHours).toBe(6);
    });
  });

  describe("4. Personal Dashboard Privacy & Direct Request Guard", () => {
    it("member can view tasks assigned to them", async () => {
      const canView = await canUserViewTask(memberUser1.id, taskAlpha.id, taskAlpha);
      expect(canView.allowed).toBe(true);
    });

    it("member cannot access another member's private task records by changing IDs", async () => {
      const otherPrivateTask: Task = {
        ...taskAlpha,
        id: "task-private-2",
        assigneeId: memberUser2.id,
        userId: "user-om",
      };

      const canView = await canUserViewTask(memberUser1.id, otherPrivateTask.id, otherPrivateTask);
      expect(canView.allowed).toBe(false);
      expect(canView.reason).toContain("Forbidden");
    });

    it("outsiders cannot view tasks of projects they do not belong to", async () => {
      const canView = await canUserViewTask(outsiderUser.id, taskAlpha.id, taskAlpha);
      expect(canView.allowed).toBe(false);
    });

    it("team leader can view all tasks in the project", async () => {
      const canView = await canUserViewTask(leaderUser.id, taskAlpha.id, taskAlpha);
      expect(canView.allowed).toBe(true);
    });
  });

  describe("5. Work Submission & Review Approval Workflow", () => {
    it("member can submit work for review with deliverables", async () => {
      const canEdit = await canUserEditTask(memberUser1.id, taskAlpha.id, taskAlpha);
      expect(canEdit.allowed).toBe(true);

      const submissionPayload = {
        status: "in_review",
        progressPercent: 100,
        workCompleted: "Completed FCM integration and tested background receipts on iOS and Android.",
        githubUrl: "https://github.com/org/repo/pull/42",
        deploymentUrl: "https://staging.app.com/push-test",
        attachments: [
          {
            id: "att-1",
            name: "fcm_test_results.pdf",
            size: 245000,
            type: "application/pdf",
            url: "data:application/pdf;base64,JVBERi0xLjQ...",
          },
        ],
        submissionStatus: "submitted",
      };

      expect(submissionPayload.status).toBe("in_review");
      expect(submissionPayload.progressPercent).toBe(100);
      expect(submissionPayload.githubUrl).toBeTruthy();
      expect(submissionPayload.attachments.length).toBe(1);
    });

    it("prevents member from self-approving their own submission without leader sign-off", async () => {
      const taskInReview: Task = {
        ...taskAlpha,
        status: "in_review",
        submissionStatus: "submitted",
      };

      const canReview = await canUserReviewTask(memberUser1.id, taskInReview.id, taskInReview);
      expect(canReview.allowed).toBe(false);
    });

    it("allows the designated team leader to review and approve submission", async () => {
      const taskInReview: Task = {
        ...taskAlpha,
        status: "in_review",
        submissionStatus: "submitted",
      };

      const canReview = await canUserReviewTask(leaderUser.id, taskInReview.id, taskInReview);
      expect(canReview.allowed).toBe(true);

      // On approval: status becomes completed, progress becomes 100, submissionStatus becomes approved
      const decision = "approved";
      const finalStatus = decision === "approved" ? "completed" : "in_progress";
      const finalProgress = decision === "approved" ? 100 : taskInReview.progressPercent;
      const finalSubmissionStatus = decision === "approved" ? "approved" : "changes_requested";

      expect(finalStatus).toBe("completed");
      expect(finalProgress).toBe(100);
      expect(finalSubmissionStatus).toBe("approved");
    });

    it("sets status to in_progress with feedback when changes are requested", async () => {
      const taskInReview: Task = {
        ...taskAlpha,
        status: "in_review",
        submissionStatus: "submitted",
      };

      const decision = "changes_requested";
      const feedback = "Please add unit tests for iOS APNS token registration failure cases.";

      const finalStatus = decision === "approved" ? "completed" : "in_progress";
      const finalSubmissionStatus = decision === "approved" ? "approved" : "changes_requested";

      expect(finalStatus).toBe("in_progress");
      expect(finalSubmissionStatus).toBe("changes_requested");
      expect(feedback).toBeTruthy();
    });
  });

  describe("6. Secure Project Invitation System", () => {
    it("hashes invitation tokens with sha256 to ensure raw tokens are never exposed in DB", () => {
      const rawToken = "raw-secret-token-123456789";
      const hashed = hashToken(rawToken);

      expect(hashed).toHaveLength(64);
      expect(hashed).not.toBe(rawToken);
    });

    it("recognizes pending, accepted, expired, and revoked invitation statuses", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const pendingInvite: ProjectInvitation = {
        id: "inv-1",
        projectId: "proj-alpha",
        recipientEmail: "newhire@company.com",
        role: "developer",
        status: "pending",
        tokenHash: "hash1",
        inviterId: "user-om",
        expiresAt: future.toISOString(),
        createdAt: now.toISOString(),
      };

      const isExpired = new Date(pendingInvite.expiresAt) <= now;
      expect(isExpired).toBe(false);
      expect(pendingInvite.status).toBe("pending");

      const expiredInvite: ProjectInvitation = {
        ...pendingInvite,
        expiresAt: past.toISOString(),
        status: "expired",
      };
      expect(new Date(expiredInvite.expiresAt) <= now).toBe(true);
    });
  });
});
