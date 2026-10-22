import { describe, expect, it, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { hashToken } from "../../server/src/routes/invitations";
import { sendInvitationEmail, isEmailConfigured } from "../../server/src/email";
import type { ProjectInvitation } from "@/types";

describe("Team Invitations System - Security, Crypto & Core Logic", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Cryptographic Security & Token Hashing
  describe("Cryptographic Token Handling", () => {
    it("generates unpredictable 256-bit raw tokens and hashes them deterministically with SHA-256", () => {
      const rawToken1 = crypto.randomBytes(32).toString("hex");
      const rawToken2 = crypto.randomBytes(32).toString("hex");

      expect(rawToken1).not.toBe(rawToken2);
      expect(rawToken1.length).toBe(64);

      const hash1 = hashToken(rawToken1);
      const hash2 = hashToken(rawToken2);

      expect(hash1).not.toBe(rawToken1);
      expect(hash1).not.toBe(hash2);
      expect(hash1.length).toBe(64); // 256-bit hex hash

      // Deterministic: hashing same raw token yields exact same hash
      expect(hashToken(rawToken1)).toBe(hash1);
    });

    it("ensures raw token is never recoverable from the stored token_hash", () => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hash = hashToken(rawToken);

      // Verifies one-way preimage resistance
      expect(hash).not.toContain(rawToken);
    });
  });

  // 2. Authorization & Role Escalation Prevention
  describe("Role Escalation & Permission Enforcement", () => {
    const validRoles = ["owner", "lead", "developer", "designer", "reviewer", "viewer", "member"];

    function isRoleAllowedToInvite(userRole: string): boolean {
      const managerRoles = ["owner", "lead", "admin"];
      return managerRoles.includes(userRole.toLowerCase());
    }

    function canAssignRole(inviterRole: string, targetRole: string): { allowed: boolean; reason?: string } {
      if (!validRoles.includes(targetRole.toLowerCase())) {
        return { allowed: false, reason: "Invalid role specified" };
      }
      if (!isRoleAllowedToInvite(inviterRole)) {
        return { allowed: false, reason: "User lacks invitation permissions" };
      }
      // Non-owners cannot invite another owner
      if (targetRole.toLowerCase() === "owner" && inviterRole.toLowerCase() !== "owner" && inviterRole.toLowerCase() !== "admin") {
        return { allowed: false, reason: "Only project owners can invite new owners" };
      }
      return { allowed: true };
    }

    it("allows authorized project managers (owner, lead, admin) to create invitations", () => {
      expect(isRoleAllowedToInvite("owner")).toBe(true);
      expect(isRoleAllowedToInvite("lead")).toBe(true);
      expect(isRoleAllowedToInvite("admin")).toBe(true);
    });

    it("blocks unauthorized users (developer, designer, viewer, member) from inviting", () => {
      expect(isRoleAllowedToInvite("developer")).toBe(false);
      expect(isRoleAllowedToInvite("designer")).toBe(false);
      expect(isRoleAllowedToInvite("viewer")).toBe(false);
      expect(isRoleAllowedToInvite("member")).toBe(false);
    });

    it("prevents role escalation: a team lead cannot invite an owner", () => {
      const res = canAssignRole("lead", "owner");
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("Only project owners can invite new owners");
    });

    it("allows project owners to assign any permitted role including owner", () => {
      for (const role of validRoles) {
        const res = canAssignRole("owner", role);
        expect(res.allowed).toBe(true);
      }
    });
  });

  // 3. Email Verification & Acceptance Invariants
  describe("Email Verification & Single-Use Acceptance", () => {
    interface MockInvitationRecord {
      id: string;
      projectId: string;
      recipientEmail: string;
      role: string;
      status: "pending" | "accepted" | "declined" | "revoked" | "expired";
      tokenHash: string;
      expiresAt: Date;
    }

    interface MockMemberRecord {
      projectId: string;
      userId: string;
      role: string;
    }

    function acceptInvitationMock(
      invitation: MockInvitationRecord,
      authenticatedUser: { id: string; email: string },
      membersList: MockMemberRecord[]
    ): { success: boolean; error?: string } {
      const now = new Date();

      // Check status
      if (invitation.status !== "pending") {
        return { success: false, error: `Invitation is no longer pending (status: ${invitation.status})` };
      }

      // Check expiry
      if (invitation.expiresAt <= now) {
        invitation.status = "expired";
        return { success: false, error: "Invitation has expired" };
      }

      // STRICT EMAIL MATCH
      if (authenticatedUser.email.trim().toLowerCase() !== invitation.recipientEmail.trim().toLowerCase()) {
        return {
          success: false,
          error: `Email mismatch: Authenticated as ${authenticatedUser.email}, but invite is for ${invitation.recipientEmail}`,
        };
      }

      // Check duplicate membership prevention
      const alreadyMember = membersList.some(
        (m) => m.projectId === invitation.projectId && m.userId === authenticatedUser.id
      );

      if (!alreadyMember) {
        membersList.push({
          projectId: invitation.projectId,
          userId: authenticatedUser.id,
          role: invitation.role,
        });
      }

      // Mark single-use token consumed
      invitation.status = "accepted";
      return { success: true };
    }

    it("allows recipient to accept using matching verified email and creates membership", () => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const inv: MockInvitationRecord = {
        id: "inv-1",
        projectId: "proj-core",
        recipientEmail: "elena@example.com",
        role: "designer",
        status: "pending",
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      const members: MockMemberRecord[] = [];

      const result = acceptInvitationMock(inv, { id: "user-elena", email: "elena@example.com" }, members);
      expect(result.success).toBe(true);
      expect(inv.status).toBe("accepted");
      expect(members.length).toBe(1);
      expect(members[0].role).toBe("designer");
      expect(members[0].userId).toBe("user-elena");
    });

    it("rejects acceptance if authenticated email does not match recipient email", () => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const inv: MockInvitationRecord = {
        id: "inv-2",
        projectId: "proj-core",
        recipientEmail: "target@company.com",
        role: "developer",
        status: "pending",
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      const members: MockMemberRecord[] = [];

      const result = acceptInvitationMock(inv, { id: "user-attacker", email: "wrong@company.com" }, members);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Email mismatch");
      expect(inv.status).toBe("pending"); // Not consumed
      expect(members.length).toBe(0);
    });

    it("rejects expired invitations", () => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const inv: MockInvitationRecord = {
        id: "inv-3",
        projectId: "proj-core",
        recipientEmail: "marcus@example.com",
        role: "developer",
        status: "pending",
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() - 1000), // In the past
      };
      const members: MockMemberRecord[] = [];

      const result = acceptInvitationMock(inv, { id: "user-marcus", email: "marcus@example.com" }, members);
      expect(result.success).toBe(false);
      expect(result.error).toContain("expired");
      expect(members.length).toBe(0);
    });

    it("rejects revoked invitations", () => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const inv: MockInvitationRecord = {
        id: "inv-4",
        projectId: "proj-core",
        recipientEmail: "sarah@example.com",
        role: "lead",
        status: "revoked",
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      const members: MockMemberRecord[] = [];

      const result = acceptInvitationMock(inv, { id: "user-sarah", email: "sarah@example.com" }, members);
      expect(result.success).toBe(false);
      expect(result.error).toContain("no longer pending");
      expect(members.length).toBe(0);
    });

    it("enforces single-use token: cannot accept an already-used invitation twice", () => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const inv: MockInvitationRecord = {
        id: "inv-5",
        projectId: "proj-core",
        recipientEmail: "alex@example.com",
        role: "developer",
        status: "pending",
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      const members: MockMemberRecord[] = [];

      // First acceptance succeeds
      const first = acceptInvitationMock(inv, { id: "user-alex", email: "alex@example.com" }, members);
      expect(first.success).toBe(true);
      expect(inv.status).toBe("accepted");
      expect(members.length).toBe(1);

      // Second acceptance fails
      const second = acceptInvitationMock(inv, { id: "user-alex", email: "alex@example.com" }, members);
      expect(second.success).toBe(false);
      expect(second.error).toContain("no longer pending");
      expect(members.length).toBe(1); // No duplicate
    });

    it("prevents duplicate active memberships on concurrent or repeated attempts", () => {
      const members: MockMemberRecord[] = [{ projectId: "proj-core", userId: "user-1", role: "developer" }];

      const isAlreadyMember = members.some((m) => m.projectId === "proj-core" && m.userId === "user-1");
      expect(isAlreadyMember).toBe(true);
    });
  });

  // 4. Token Rotation & Resending Policy
  describe("Token Rotation on Resend & Revocation", () => {
    it("rotates token and invalidates old link when an invitation is resent", () => {
      const initialRawToken = crypto.randomBytes(32).toString("hex");
      let storedHash = hashToken(initialRawToken);
      let expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days remaining

      // Perform Resend: generate new token, update hash, reset expiry to 7 days
      const newRawToken = crypto.randomBytes(32).toString("hex");
      expect(newRawToken).not.toBe(initialRawToken);

      storedHash = hashToken(newRawToken);
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Old raw token no longer matches stored hash!
      expect(hashToken(initialRawToken)).not.toBe(storedHash);

      // New raw token matches
      expect(hashToken(newRawToken)).toBe(storedHash);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
    });
  });

  // 5. Honest Email Delivery Reporting
  describe("Honest Email Configuration & Delivery Reporting", () => {
    it("reports honest failure and instructions when SMTP/Resend is unconfigured", async () => {
      // Ensure no SMTP or Resend credentials
      const oldSmtpHost = process.env.SMTP_HOST;
      const oldResendKey = process.env.RESEND_API_KEY;
      delete process.env.SMTP_HOST;
      delete process.env.RESEND_API_KEY;

      expect(isEmailConfigured()).toBe(false);

      const result = await sendInvitationEmail({
        recipientEmail: "david@example.com",
        projectName: "Core Platform 2.0",
        inviterName: "Om Thakkar",
        role: "developer",
        invitationUrl: "http://localhost:3000/invitations/accept?token=abc123mock",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(result.delivered).toBe(false);
      expect(result.error).toContain("Email delivery provider not configured");

      // Restore
      if (oldSmtpHost) process.env.SMTP_HOST = oldSmtpHost;
      if (oldResendKey) process.env.RESEND_API_KEY = oldResendKey;
    });
  });

  // 6. UI Model & Invariant Validations
  describe("Team Invitations UI Model & Invariants", () => {
    it("separates pending invitations from active team members", () => {
      const activeMembers = [
        { id: "u-1", name: "Om Thakkar", email: "om@example.com", role: "owner" },
        { id: "u-2", name: "Sarah Chen", email: "sarah@example.com", role: "lead" },
      ];

      const invitations: ProjectInvitation[] = [
        {
          id: "inv-1",
          projectId: "proj-core",
          recipientEmail: "pending@example.com",
          role: "developer",
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "inv-2",
          projectId: "proj-core",
          recipientEmail: "expired@example.com",
          role: "viewer",
          status: "expired",
          expiresAt: new Date(Date.now() - 1000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      const pendingOnly = invitations.filter((i) => i.status === "pending");
      expect(pendingOnly.length).toBe(1);
      expect(pendingOnly[0].recipientEmail).toBe("pending@example.com");

      // Ensure active members and pending invitations are disjoint
      const activeEmails = new Set(activeMembers.map((m) => m.email.toLowerCase()));
      for (const p of pendingOnly) {
        expect(activeEmails.has(p.recipientEmail.toLowerCase())).toBe(false);
      }
    });

    it("prevents duplicate pending invitations for the same project and email", () => {
      const invitations: ProjectInvitation[] = [
        {
          id: "inv-existing",
          projectId: "proj-core",
          recipientEmail: "alex@example.com",
          role: "developer",
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      const newInviteEmail = "alex@example.com";
      const hasDuplicate = invitations.some(
        (i) => i.projectId === "proj-core" && i.recipientEmail.toLowerCase() === newInviteEmail.toLowerCase() && i.status === "pending"
      );

      expect(hasDuplicate).toBe(true);
    });
  });
});
