import { describe, expect, it, vi, beforeEach } from "vitest";
import { isWorkspaceAdminOrLead, isProjectLeader } from "../../server/src/permissions";
import { taskService } from "@/services";

describe("Role Switcher & Fluent Leader-Member Movement Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Active Role Perspective & Permission Evaluation", () => {
    it("evaluates a user with active role 'leader' as workspace leader", async () => {
      const leaderUser = { id: "user-123", role: "leader" };
      expect(await isWorkspaceAdminOrLead(leaderUser.id, leaderUser)).toBe(true);
    });

    it("evaluates a user with active role 'member' as standard member (not workspace leader)", async () => {
      const memberUser = { id: "user-123", role: "member" };
      expect(await isWorkspaceAdminOrLead(memberUser.id, memberUser)).toBe(false);
    });

    it("allows fluently toggling between leader and member perspective repeatedly without lockout", async () => {
      const user = { id: "user-om", role: "leader" };
      // 1. Initial leader mode
      expect(await isWorkspaceAdminOrLead(user.id, user)).toBe(true);

      // 2. Switch to member mode
      user.role = "member";
      expect(await isWorkspaceAdminOrLead(user.id, user)).toBe(false);

      // 3. Switch back to leader mode
      user.role = "leader";
      expect(await isWorkspaceAdminOrLead(user.id, user)).toBe(true);

      // 4. Switch to member mode again
      user.role = "member";
      expect(await isWorkspaceAdminOrLead(user.id, user)).toBe(false);

      // 5. Switch back to leader mode again
      user.role = "leader";
      expect(await isWorkspaceAdminOrLead(user.id, user)).toBe(true);
    });
  });

  describe("2. Team Member Role Management (Leader <-> Member)", () => {
    it("updates a team member's role between member and leader in taskService", async () => {
      // Add a member
      const newMember = await taskService.addTeamMember({
        name: "Test Engineer",
        email: "test.engineer@example.com",
        role: "Team Member",
      });
      expect(newMember.role).toBe("Team Member");

      // Promote to Team Leader
      const promoted = await taskService.updateTeamMember(newMember.id, {
        role: "Team Leader",
      });
      expect(promoted.role).toBe("Team Leader");

      // Demote back to Team Member
      const demoted = await taskService.updateTeamMember(newMember.id, {
        role: "Team Member",
      });
      expect(demoted.role).toBe("Team Member");
    });
  });

  describe("3. Project Member Role Transition", () => {
    const project = {
      id: "proj-sync",
      ownerId: "user-owner",
      members: [
        { id: "user-owner", role: "owner" },
        { id: "user-dev-1", role: "developer" },
      ],
    };

    it("evaluates project leader status correctly when member is developer vs lead", async () => {
      // Developer role -> not leader
      expect(await isProjectLeader("user-dev-1", project.id, project)).toBe(false);

      // Promote to lead in project
      project.members[1].role = "lead";
      expect(await isProjectLeader("user-dev-1", project.id, project)).toBe(true);

      // Demote back to developer
      project.members[1].role = "developer";
      expect(await isProjectLeader("user-dev-1", project.id, project)).toBe(false);
    });
  });
});
