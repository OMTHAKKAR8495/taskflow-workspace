import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { pool, query } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../auth.js";
import { sendInvitationEmail, getAppBaseUrl, isEmailConfigured } from "../email.js";

export const invitationsRouter = Router();

// In-memory sliding-window rate limiters
const createAttempts = new Map<string, { count: number; firstAttempt: number }>();
const validateAttempts = new Map<string, { count: number; firstAttempt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 mins
const MAX_CREATE_ATTEMPTS = 30;
const MAX_VALIDATE_ATTEMPTS = 100;

export function invitationCreateLimiter(req: Request, res: Response, next: () => void) {
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
  const now = Date.now();
  const record = createAttempts.get(ip);

  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    createAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }

  if (record.count >= MAX_CREATE_ATTEMPTS) {
    return res.status(429).json({
      error: "Too many invitation requests. Please try again later.",
      retryAfterSeconds: Math.ceil((record.firstAttempt + RATE_LIMIT_WINDOW_MS - now) / 1000),
    });
  }

  record.count++;
  next();
}

export function invitationValidateLimiter(req: Request, res: Response, next: () => void) {
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
  const now = Date.now();
  const record = validateAttempts.get(ip);

  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    validateAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }

  if (record.count >= MAX_VALIDATE_ATTEMPTS) {
    return res.status(429).json({
      error: "Too many token validation requests. Please try again later.",
      retryAfterSeconds: Math.ceil((record.firstAttempt + RATE_LIMIT_WINDOW_MS - now) / 1000),
    });
  }

  record.count++;
  next();
}

/**
 * Checks if a user has management permissions (owner, lead, admin) for a given project.
 */
export async function canUserManageProject(
  userId: string,
  projectId: string,
): Promise<{ allowed: boolean; role?: string }> {
  // 1. Workspace global admin
  const userRes = await query("SELECT role FROM users WHERE id = $1", [userId]);
  if (userRes.rows.length > 0 && userRes.rows[0].role === "admin") {
    return { allowed: true, role: "owner" };
  }

  // 2. Project owner
  const projRes = await query("SELECT owner_id FROM projects WHERE id = $1", [projectId]);
  if (projRes.rows.length === 0) {
    return { allowed: false };
  }
  if (projRes.rows[0].owner_id === userId) {
    return { allowed: true, role: "owner" };
  }

  // 3. Project member role
  const pmRes = await query(
    "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
    [projectId, userId],
  );
  if (pmRes.rows.length > 0) {
    const r = pmRes.rows[0].role.toLowerCase();
    if (r === "owner" || r === "lead" || r === "admin") {
      return { allowed: true, role: r };
    }
  }

  return { allowed: false };
}

/**
 * Hash raw token with SHA-256
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * POST /api/projects/:projectId/invitations
 * Creates and dispatches an invitation for a project
 */
invitationsRouter.post(
  "/projects/:projectId/invitations",
  requireAuth,
  invitationCreateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = String(req.params.projectId);
      const inviterId = req.userId!;
      const { email, role = "member", message = "" } = req.body;

      if (!projectId || projectId === "undefined") {
        return res.status(400).json({ error: "Project ID is required" });
      }

      // 1. Authorization check
      const authCheck = await canUserManageProject(inviterId, projectId);
      if (!authCheck.allowed) {
        return res.status(403).json({
          error: "Unauthorized: Only project managers or owners can invite members",
        });
      }

      // 2. Email format validation
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "A valid email address is required" });
      }
      const cleanEmail = email.trim().toLowerCase();

      // 3. Role validation & escalation check
      const validRoles = ["owner", "lead", "developer", "designer", "reviewer", "viewer", "member"];
      const cleanRole = String(role).trim().toLowerCase();
      if (!validRoles.includes(cleanRole)) {
        return res.status(400).json({ error: `Invalid role. Allowed roles: ${validRoles.join(", ")}` });
      }

      // If inviter is not owner/admin, prevent escalating to owner
      if (cleanRole === "owner" && authCheck.role !== "owner") {
        return res.status(403).json({
          error: "Permission denied: Only project owners can invite new owners",
        });
      }

      // 4. Verify project exists
      const projRes = await query("SELECT id, name, description, color FROM projects WHERE id = $1", [
        projectId,
      ]);
      if (projRes.rows.length === 0) {
        return res.status(404).json({ error: "Project not found" });
      }
      const project = projRes.rows[0];

      // 5. Check if user is ALREADY an active project member
      const existingMemberRes = await query(
        `SELECT pm.id FROM project_members pm
         LEFT JOIN users u ON pm.user_id = u.id
         LEFT JOIN team_members tm ON pm.user_id = tm.id
         WHERE pm.project_id = $1 AND (LOWER(u.email) = $2 OR LOWER(tm.email) = $2)`,
        [projectId, cleanEmail],
      );
      if (existingMemberRes.rows.length > 0) {
        return res.status(400).json({
          error: "This user is already an active member of this project",
        });
      }

      // 6. Check if there is already a pending invitation for this project and email
      const existingInviteRes = await query(
        `SELECT id FROM project_invitations
         WHERE project_id = $1 AND LOWER(recipient_email) = $2 AND status = 'pending' AND expires_at > NOW()`,
        [projectId, cleanEmail],
      );
      if (existingInviteRes.rows.length > 0) {
        return res.status(409).json({
          error: "A pending invitation already exists for this email address in this project",
        });
      }

      // 7. Generate cryptographically secure token & SHA-256 hash
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const inviteId = `inv-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Fetch inviter's name
      const inviterRes = await query("SELECT full_name, username FROM users WHERE id = $1", [
        inviterId,
      ]);
      const inviterName = inviterRes.rows[0]?.full_name || inviterRes.rows[0]?.username || "A team lead";

      // 8. Insert invitation (storing only tokenHash in DB)
      await query(
        `INSERT INTO project_invitations
         (id, project_id, inviter_id, recipient_email, role, token_hash, status, message, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, NOW(), NOW())`,
        [inviteId, projectId, inviterId, cleanEmail, cleanRole, tokenHash, message.trim(), expiresAt],
      );

      // Formulate acceptance URL
      const invitationUrl = `${getAppBaseUrl()}/invitations/accept?token=${rawToken}`;

      // 9. Dispatch Email
      const emailResult = await sendInvitationEmail({
        recipientEmail: cleanEmail,
        projectName: project.name,
        inviterName,
        role: cleanRole,
        invitationUrl,
        expiresAt,
        message: message.trim() || undefined,
      });

      res.status(201).json({
        success: true,
        invitation: {
          id: inviteId,
          projectId,
          projectName: project.name,
          recipientEmail: cleanEmail,
          role: cleanRole,
          status: "pending",
          message: message.trim(),
          expiresAt: expiresAt.toISOString(),
          createdAt: new Date().toISOString(),
          inviterName,
        },
        rawToken,
        invitationUrl,
        emailSent: emailResult.delivered,
        emailError: emailResult.delivered ? undefined : emailResult.error,
      });
    } catch (err: any) {
      console.error("Error creating invitation:", err);
      res.status(500).json({ error: "Failed to create invitation: " + err.message });
    }
  },
);

/**
 * GET /api/projects/:projectId/invitations
 * Lists all invitations for a project (excludes token_hash)
 */
invitationsRouter.get(
  "/projects/:projectId/invitations",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = String(req.params.projectId);
      const userId = req.userId!;

      const authCheck = await canUserManageProject(userId, projectId);
      if (!authCheck.allowed) {
        return res.status(403).json({ error: "Unauthorized: Insufficient project permissions" });
      }

      // Auto-expire pending invitations that passed expiration
      await query(
        `UPDATE project_invitations
         SET status = 'expired', updated_at = NOW()
         WHERE project_id = $1 AND status = 'pending' AND expires_at <= NOW()`,
        [projectId],
      );

      const result = await query(
        `SELECT pi.id, pi.project_id, pi.recipient_email, pi.role, pi.status, pi.message,
                pi.expires_at, pi.accepted_at, pi.revoked_at, pi.created_at, pi.updated_at,
                u.full_name as inviter_name, u.email as inviter_email
         FROM project_invitations pi
         LEFT JOIN users u ON pi.inviter_id = u.id
         WHERE pi.project_id = $1
         ORDER BY pi.created_at DESC`,
        [projectId],
      );

      res.json(result.rows);
    } catch (err: any) {
      console.error("Error listing project invitations:", err);
      res.status(500).json({ error: "Failed to fetch project invitations" });
    }
  },
);

/**
 * GET /api/invitations/validate?token=...
 * Validates an invitation token (Public, rate-limited)
 */
invitationsRouter.get(
  "/invitations/validate",
  invitationValidateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string" || !token.trim()) {
        return res.status(400).json({ valid: false, reason: "missing_token", error: "Token is required" });
      }

      const tokenHash = hashToken(token.trim());

      const result = await query(
        `SELECT pi.id, pi.project_id, pi.recipient_email, pi.role, pi.status, pi.message,
                pi.expires_at, pi.accepted_at, pi.revoked_at, pi.created_at,
                p.name as project_name, p.key as project_key, p.description as project_description,
                p.color as project_color,
                u.full_name as inviter_name, u.email as inviter_email
         FROM project_invitations pi
         JOIN projects p ON pi.project_id = p.id
         LEFT JOIN users u ON pi.inviter_id = u.id
         WHERE pi.token_hash = $1`,
        [tokenHash],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          valid: false,
          reason: "not_found",
          error: "This invitation link is invalid or does not exist.",
        });
      }

      const inv = result.rows[0];
      const now = new Date();

      // Check if expired
      if (inv.status === "pending" && new Date(inv.expires_at) <= now) {
        await query("UPDATE project_invitations SET status = 'expired', updated_at = NOW() WHERE id = $1", [
          inv.id,
        ]);
        return res.status(410).json({
          valid: false,
          reason: "expired",
          error: "This invitation has expired. Please request a new invitation from the project lead.",
          invitation: {
            projectName: inv.project_name,
            projectKey: inv.project_key,
            recipientEmail: inv.recipient_email,
            role: inv.role,
            expiresAt: inv.expires_at,
          },
        });
      }

      if (inv.status === "revoked") {
        return res.status(410).json({
          valid: false,
          reason: "revoked",
          error: "This invitation has been revoked by the project lead.",
          invitation: {
            projectName: inv.project_name,
            recipientEmail: inv.recipient_email,
          },
        });
      }

      if (inv.status === "accepted") {
        return res.status(410).json({
          valid: false,
          reason: "already_accepted",
          error: "This invitation has already been accepted.",
          invitation: {
            projectId: inv.project_id,
            projectName: inv.project_name,
            recipientEmail: inv.recipient_email,
          },
        });
      }

      if (inv.status === "declined") {
        return res.status(410).json({
          valid: false,
          reason: "declined",
          error: "This invitation was previously declined.",
        });
      }

      // Valid pending invitation
      res.json({
        valid: true,
        invitation: {
          id: inv.id,
          projectId: inv.project_id,
          projectName: inv.project_name,
          projectKey: inv.project_key,
          projectDescription: inv.project_description || "",
          projectColor: inv.project_color || "#4f46e5",
          recipientEmail: inv.recipient_email,
          role: inv.role,
          message: inv.message || "",
          expiresAt: inv.expires_at,
          inviterName: inv.inviter_name || "A Project Manager",
        },
      });
    } catch (err: any) {
      console.error("Error validating invitation token:", err);
      res.status(500).json({ valid: false, error: "Validation check failed" });
    }
  },
);

/**
 * POST /api/invitations/accept
 * Accepts an invitation using an atomic transaction with verified email check.
 */
invitationsRouter.post(
  "/invitations/accept",
  requireAuth,
  invitationValidateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const client = await pool.connect();
    try {
      const { token } = req.body;
      const userId = req.userId!;

      if (!token || typeof token !== "string" || !token.trim()) {
        return res.status(400).json({ error: "Token is required" });
      }

      const tokenHash = hashToken(token.trim());

      await client.query("BEGIN");

      // 1. Fetch user's verified email
      const userRes = await client.query("SELECT id, email, full_name FROM users WHERE id = $1", [
        userId,
      ]);
      if (userRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(401).json({ error: "Authenticated user not found" });
      }
      const user = userRes.rows[0];

      // 2. Fetch invitation record with FOR UPDATE row lock to prevent race conditions
      const inviteRes = await client.query(
        `SELECT pi.*, p.name as project_name
         FROM project_invitations pi
         JOIN projects p ON pi.project_id = p.id
         WHERE pi.token_hash = $1
         FOR UPDATE`,
        [tokenHash],
      );

      if (inviteRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Invitation not found or invalid token" });
      }

      const inv = inviteRes.rows[0];

      // Check status
      if (inv.status !== "pending") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Invitation is no longer pending (status: ${inv.status})` });
      }

      // Check expiry
      if (new Date(inv.expires_at) <= new Date()) {
        await client.query(
          "UPDATE project_invitations SET status = 'expired', updated_at = NOW() WHERE id = $1",
          [inv.id],
        );
        await client.query("COMMIT");
        return res.status(410).json({ error: "Invitation has expired" });
      }

      // 3. STRICT EMAIL VERIFICATION: Authenticated email must match recipient_email
      if (user.email.toLowerCase().trim() !== inv.recipient_email.toLowerCase().trim()) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: `Email mismatch: You are signed in as "${user.email}", but this invitation was issued to "${inv.recipient_email}". Please sign in with the correct account to accept.`,
        });
      }

      // 4. Add member to project_members (idempotent / ignore duplicate)
      const memberId = `pm-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      await client.query(
        `INSERT INTO project_members (id, project_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [memberId, inv.project_id, user.id, inv.role],
      );

      // 5. Mark invitation accepted atomically (single-use token consumed)
      await client.query(
        `UPDATE project_invitations
         SET status = 'accepted', accepted_at = NOW(), accepted_user_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [user.id, inv.id],
      );

      // 6. Record Activity
      const activityId = `act-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      await client.query(
        `INSERT INTO activities (id, user_id, project_id, task_id, type, task_title, user_name, details, at)
         VALUES ($1, $2, $3, 'system', 'project_updated', $4, $5, $6, NOW())`,
        [
          activityId,
          user.id,
          inv.project_id,
          `Joined ${inv.project_name}`,
          user.full_name,
          JSON.stringify({ action: "accepted_invitation", role: inv.role }),
        ],
      );

      // 7. Dispatch in-app notification to inviter
      const notifId = `notif-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      await client.query(
        `INSERT INTO notifications (id, user_id, actor_id, actor_name, type, title, message, entity_type, entity_id, is_read, created_at)
         VALUES ($1, $2, $3, $4, 'system', $5, $6, 'project', $7, FALSE, NOW())`,
        [
          notifId,
          inv.inviter_id,
          user.id,
          user.full_name,
          "Invitation Accepted",
          `${user.full_name} (${user.email}) accepted the invitation to join ${inv.project_name} as ${inv.role}.`,
          inv.project_id,
        ],
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        message: `Successfully joined ${inv.project_name}!`,
        projectId: inv.project_id,
        projectName: inv.project_name,
        role: inv.role,
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error("Error accepting invitation:", err);
      res.status(500).json({ error: "Failed to accept invitation: " + err.message });
    } finally {
      client.release();
    }
  },
);

/**
 * POST /api/invitations/decline
 * Declines an invitation
 */
invitationsRouter.post(
  "/invitations/decline",
  invitationValidateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token || typeof token !== "string" || !token.trim()) {
        return res.status(400).json({ error: "Token is required" });
      }

      const tokenHash = hashToken(token.trim());

      const result = await query(
        `UPDATE project_invitations
         SET status = 'declined', updated_at = NOW()
         WHERE token_hash = $1 AND status = 'pending'
         RETURNING id, project_id`,
        [tokenHash],
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ error: "Invitation not found or cannot be declined" });
      }

      res.json({ success: true, message: "Invitation declined" });
    } catch (err: any) {
      console.error("Error declining invitation:", err);
      res.status(500).json({ error: "Failed to decline invitation" });
    }
  },
);

/**
 * POST /api/invitations/:id/resend
 * Policy: Rotates the token, resets expiry to 7 days, and attempts to re-send the email.
 */
invitationsRouter.post(
  "/invitations/:id/resend",
  requireAuth,
  invitationCreateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      // 1. Fetch invitation
      const inviteRes = await query(
        `SELECT pi.*, p.name as project_name
         FROM project_invitations pi
         JOIN projects p ON pi.project_id = p.id
         WHERE pi.id = $1`,
        [id],
      );

      if (inviteRes.rows.length === 0) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      const inv = inviteRes.rows[0];

      // 2. Authorization check
      const authCheck = await canUserManageProject(userId, inv.project_id);
      if (!authCheck.allowed) {
        return res.status(403).json({ error: "Unauthorized: Insufficient project permissions" });
      }

      if (inv.status === "accepted") {
        return res.status(400).json({ error: "Cannot resend an invitation that has already been accepted" });
      }

      // 3. Rotate token (security policy)
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await query(
        `UPDATE project_invitations
         SET token_hash = $1, expires_at = $2, status = 'pending', updated_at = NOW()
         WHERE id = $3`,
        [tokenHash, newExpiresAt, id],
      );

      const inviterRes = await query("SELECT full_name, username FROM users WHERE id = $1", [userId]);
      const inviterName = inviterRes.rows[0]?.full_name || inviterRes.rows[0]?.username || "A project manager";

      const invitationUrl = `${getAppBaseUrl()}/invitations/accept?token=${rawToken}`;

      // 4. Send email
      const emailResult = await sendInvitationEmail({
        recipientEmail: inv.recipient_email,
        projectName: inv.project_name,
        inviterName,
        role: inv.role,
        invitationUrl,
        expiresAt: newExpiresAt,
        message: inv.message || undefined,
      });

      res.json({
        success: true,
        message: "Invitation resent with rotated token",
        rawToken,
        invitationUrl,
        expiresAt: newExpiresAt.toISOString(),
        emailSent: emailResult.delivered,
        emailError: emailResult.delivered ? undefined : emailResult.error,
      });
    } catch (err: any) {
      console.error("Error resending invitation:", err);
      res.status(500).json({ error: "Failed to resend invitation: " + err.message });
    }
  },
);

/**
 * POST /api/invitations/:id/revoke
 * Revokes an existing invitation immediately.
 */
invitationsRouter.post(
  "/invitations/:id/revoke",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      const inviteRes = await query("SELECT project_id, status FROM project_invitations WHERE id = $1", [
        id,
      ]);
      if (inviteRes.rows.length === 0) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      const inv = inviteRes.rows[0];

      // Authorization check
      const authCheck = await canUserManageProject(userId, inv.project_id);
      if (!authCheck.allowed) {
        return res.status(403).json({ error: "Unauthorized: Insufficient project permissions" });
      }

      if (inv.status === "accepted") {
        return res.status(400).json({ error: "Cannot revoke an invitation that has already been accepted" });
      }

      await query(
        `UPDATE project_invitations
         SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [id],
      );

      res.json({ success: true, message: "Invitation revoked" });
    } catch (err: any) {
      console.error("Error revoking invitation:", err);
      res.status(500).json({ error: "Failed to revoke invitation" });
    }
  },
);
