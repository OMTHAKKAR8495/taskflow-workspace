# 🚀 TaskFlow Nexus — Vercel Multi-Services Deployment & Configuration Guide

TaskFlow Nexus is an enterprise project and task management system built with React 19 + TanStack Start on the frontend, and Express + hosted PostgreSQL (Supabase/Neon) in the `/server` directory, configured for seamless deployment on Vercel as a multi-service workspace.

---

## 🏗 Multi-Service Architecture Overview

Your repository is configured via the root [vercel.json](file:///Users/omthakkar/taskflow-workspace/vercel.json) with two collocated services:

| Service | Root | Framework | Visibility | Internal Binding | Purpose |
|---|---|---|---|---|---|
| **`app`** | `.` (Root) | `tanstack-start-lovable` | Public on `/(.*)` | `SERVER_URL` ➔ `server` | React 19 + TanStack Start SSR Frontend |
| **`server`** | `server` | `express` | Public on `/api/(.*)` | Target of `app` binding | Express 4 + Supabase PostgreSQL REST API |

---

## 🔑 Environment Variables Reference

Configure these environment variables in your Vercel Project Settings (**Settings > Environment Variables**) and in your local `server/.env`:

### 1. `DATABASE_URL` (Required)
- **Value**: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`
- **Why it matters**: Local in-memory mock mode cannot be shared across distributed users or Vercel serverless lambda instances. A hosted PostgreSQL database (Supabase or Neon) is essential so all teammates see the same tasks, team directory, and invitations in real-time.
- **Important IPv4 Note**: Supabase direct endpoints (`db.[ref].supabase.co:5432`) are IPv6-only and will fail on AWS Lambda/Vercel with `ENOTFOUND`. Always use the **Supavisor IPv4 Pooler** endpoint (port 5432 or 6543). The backend also includes automatic pooler host normalization in [server/src/db.ts](file:///Users/omthakkar/taskflow-workspace/server/src/db.ts).

### 2. `APP_BASE_URL` (Required in Production)
- **Value**: `https://taskflow-workspace-seven.vercel.app` (or your custom domain)
- **Why it matters**: Used by the backend email service and invitation generator to construct absolute single-use acceptance links:
  `${APP_BASE_URL}/invitations/accept?token=[crypto_token]`
- **Local default**: `http://localhost:3000`

### 3. Email Delivery Configuration (Optional — Honest Fallback)
TaskFlow Nexus provides honest delivery reporting. If email credentials are not set, the system never claims an email was sent. Instead, it generates a secure single-use link that owners can copy and share directly.

#### Option A: Resend (Recommended)
- `RESEND_API_KEY`: Your Resend API token (e.g., `re_abc123...`)
- `RESEND_FROM`: Sender address, e.g., `"TaskFlow Nexus <invitations@yourdomain.com>"`

#### Option B: Standard SMTP (Alternative)
- `SMTP_HOST`: e.g. `smtp.mailgun.org`, `smtp.sendgrid.net`, or `smtp.gmail.com`
- `SMTP_PORT`: `587` (TLS) or `465` (SSL)
- `SMTP_SECURE`: `false` (for 587) or `true` (for 465)
- `SMTP_USER`: SMTP username or API user
- `SMTP_PASS`: SMTP password or app password
- `SMTP_FROM`: e.g. `"TaskFlow Team <no-reply@yourdomain.com>"`

### 4. `JWT_SECRET` (Required)
- **Value**: A random 32+ character string used to cryptographically sign session cookies and prevent spoofing.

---

## ⚙️ Settings Diagnostics

TaskFlow Nexus includes built-in diagnostics at `/settings`:
- **Database Node Status**: Shows `PostgreSQL Active` when connected to Supabase, or `Local Mode` if offline.
- **Email Delivery Status**: Queries `GET /api/settings/email-status` using `isEmailConfigured()`:
  - Displays `Configured` (with provider name) when Resend/SMTP is active.
  - Displays `Not configured` (Fallback Mode) when credentials are absent, informing the user that links can be copied manually.

---

## 🧪 Testing Guide

### A. Local Testing (Without Email Keys — Using Copy-Link Fallback)
1. Start the backend:
   ```bash
   npm --prefix server run dev
   ```
2. Start the frontend:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000/team`.
4. Click **Invite Member**.
5. Fill in an email (e.g. `alex.new@example.com`), select a project, and click **Send Invitation**.
6. The modal shows:
   - An honest warning: *"Email Service Not Configured — SMTP/Resend provider is not active"*.
   - The generated shareable link: `http://localhost:3000/invitations/accept?token=...`
   - A **Copy Link** button.
7. Click **Copy Link**, open a private/incognito browser window, and paste the URL.
8. The accept page opens with the invited email pre-filled.
9. Enter a password and click **Create Account**.
10. The system automatically creates the account, accepts the invitation via cryptographic token, assigns the project role, and redirects to the **Dashboard** with project activities and notifications!

### B. Production Verification (On Vercel)
1. Navigate to: `https://taskflow-workspace-seven.vercel.app/team`
2. Confirm the bottom-left node badge shows **Database Node: PostgreSQL Active**.
3. Click **Invite Member**, enter recipient details and submit.
4. Verify the invitation appears in the **Pending Invitations** section with status, expiry, **Resend**, and **Revoke** actions.
5. In **Settings**, verify the **Email Delivery Status** card reflects the active provider or fallback mode honestly.
