import nodemailer from "nodemailer";

export interface SendInvitationParams {
  recipientEmail: string;
  projectName: string;
  inviterName: string;
  role: string;
  invitationUrl: string;
  expiresAt: Date;
  message?: string;
}

export interface SendInvitationResult {
  delivered: boolean;
  error?: string;
  provider?: "smtp" | "resend";
}

/**
 * Checks whether an email delivery provider is configured.
 */
export function isEmailConfigured(): boolean {
  if (process.env.RESEND_API_KEY) return true;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return true;
  return false;
}

/**
 * Returns the public application URL for link formulation.
 */
export function getAppBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.VITE_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * Sanitizes unsafe HTML special characters to prevent HTML/XSS injection in emails.
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sends an invitation email using the configured provider (SMTP or Resend).
 * Returns { delivered: false, error: ... } if no provider is configured,
 * ensuring honest delivery reporting.
 */
export async function sendInvitationEmail(
  params: SendInvitationParams,
): Promise<SendInvitationResult> {
  const { recipientEmail, projectName, inviterName, role, invitationUrl, expiresAt, message } =
    params;

  if (!isEmailConfigured()) {
    return {
      delivered: false,
      error:
        "Email delivery provider not configured (missing SMTP_HOST/SMTP_USER or RESEND_API_KEY). Please copy and share the generated invitation link manually.",
    };
  }

  const safeProjectName = escapeHtml(projectName);
  const safeInviterName = escapeHtml(inviterName);
  const safeRole = escapeHtml(role);
  const safeMessage = message ? escapeHtml(message) : "";
  // Ensure invitationUrl is a valid URL starting with http:// or https://
  const safeInvitationUrl = invitationUrl.startsWith("http://") || invitationUrl.startsWith("https://")
    ? invitationUrl.replace(/["'<>]/g, "")
    : "";

  const formattedExpiry = expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invitation to ${safeProjectName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden;">
    <tr>
      <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #334155; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);">
        <h1 style="color: #6366f1; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">TaskFlow Nexus</h1>
        <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px;">Enterprise Project Workspace Invitation</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 16px;">You've been invited to join <strong>${safeProjectName}</strong></h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          <strong>${safeInviterName}</strong> has invited you to collaborate on the <strong>${safeProjectName}</strong> project as a <span style="background-color: #312e81; color: #a5b4fc; padding: 2px 8px; border-radius: 6px; font-weight: 600; text-transform: capitalize;">${safeRole}</span>.
        </p>
        ${
          safeMessage
            ? `<div style="background-color: #0f172a; border-left: 3px solid #6366f1; padding: 14px 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0; font-size: 13px; color: #94a3b8; font-style: italic;">
                "${safeMessage}"
               </div>`
            : ""
        }
        <div style="text-align: center; margin: 32px 0;">
          <a href="${safeInvitationUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);">
            Accept Invitation & Join Project
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 24px 0 0; text-align: center;">
          This invitation is single-use and will expire on <strong>${formattedExpiry}</strong>.<br/>
          If you did not expect this invitation, you can safely ignore this email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
        <p style="color: #475569; font-size: 11px; margin: 0;">TaskFlow Nexus · High-Performance Enterprise Project Management</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textBody = `
You've been invited to join ${projectName} on TaskFlow Nexus!

${inviterName} has invited you to collaborate as a ${role}.
${message ? `Personal note: "${message}"\n` : ""}
To accept your invitation, visit:
${invitationUrl}

This invitation will expire on ${formattedExpiry}.
  `.trim();

  // 1. Try Resend if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const fromEmail = process.env.RESEND_FROM || "TaskFlow Nexus <invitations@taskflow.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipientEmail],
          subject: `Invitation to collaborate on ${projectName}`,
          html: htmlBody,
          text: textBody,
        }),
      });

      if (!res.ok) {
        const errData: any = await res.json().catch(() => ({}));
        return {
          delivered: false,
          error: `Resend error: ${errData.message || res.statusText}`,
          provider: "resend",
        };
      }
      return { delivered: true, provider: "resend" };
    } catch (err: any) {
      return {
        delivered: false,
        error: `Resend dispatch failed: ${err.message}`,
        provider: "resend",
      };
    }
  }

  // 2. Try SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"TaskFlow Nexus" <${process.env.SMTP_USER}>`,
        to: recipientEmail,
        subject: `Invitation to collaborate on ${projectName}`,
        text: textBody,
        html: htmlBody,
      });

      return { delivered: true, provider: "smtp" };
    } catch (err: any) {
      return {
        delivered: false,
        error: `SMTP dispatch failed: ${err.message}`,
        provider: "smtp",
      };
    }
  }

  return {
    delivered: false,
    error: "No supported email provider configured.",
  };
}
