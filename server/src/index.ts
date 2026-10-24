import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import tasksRouter from "./routes/tasks.js";
import profileRouter from "./routes/profile.js";
import activityRouter from "./routes/activity.js";
import projectsRouter from "./routes/projects.js";
import teamRouter from "./routes/team.js";
import notificationsRouter from "./routes/notifications.js";
import { invitationsRouter } from "./routes/invitations.js";
import { isEmailConfigured, getAppBaseUrl } from "./email.js";
import { pool, query } from "./db.js";
import { seedDatabase } from "./seed.js";

import { requireAuth, type AuthenticatedRequest } from "./auth.js";
import { isWorkspaceAdminOrLead } from "./permissions.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

// Trust reverse proxy (Vercel / Cloudflare / Nginx) for accurate IP resolution
app.set("trust proxy", 1);

// Allowed origins for credentialed CORS
const allowedOrigins = [
  process.env.APP_BASE_URL,
  process.env.PUBLIC_APP_URL,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl)
      if (!requestOrigin) return callback(null, true);
      if (
        process.env.NODE_ENV !== "production" ||
        allowedOrigins.includes(requestOrigin) ||
        requestOrigin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      return callback(new Error("Blocked by CORS policy"));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

// Request logger in dev
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== "test") {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Health check endpoint
const handleHealth = async (req: express.Request, res: express.Response) => {
  try {
    const dbCheck = await query("SELECT NOW() as db_time");
    res.json({
      status: "ok",
      database: "connected",
      dbTime: dbCheck.rows[0].db_time,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: process.env.NODE_ENV === "production" ? "Database connection error" : err.message,
    });
  }
};

const handleEmailStatus = (req: express.Request, res: express.Response) => {
  const configured = isEmailConfigured();
  const provider = process.env.RESEND_API_KEY
    ? "resend"
    : process.env.SMTP_HOST
      ? "smtp"
      : null;
  res.json({
    configured,
    provider,
    appBaseUrl: getAppBaseUrl(),
  });
};

// Lightweight response headers for high-performance API delivery
app.use((req, res, next) => {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "private, no-cache, no-transform");
  }
  next();
});

app.get("/api/health", handleHealth);
app.get("/health", handleHealth);
app.get("/api/settings/email-status", handleEmailStatus);
app.get("/settings/email-status", handleEmailStatus);

// Protected admin migration endpoint (POST only, requires authentication & admin role)
app.post(["/api/admin/migrate", "/admin/migrate"], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ status: "error", message: "Authentication required" });
    }
    const isLead = await isWorkspaceAdminOrLead(userId);
    if (!isLead) {
      return res.status(403).json({ status: "error", message: "Forbidden: Admin privileges required" });
    }
    const migrationSecret = process.env.ADMIN_MIGRATION_SECRET;
    if (migrationSecret) {
      const headerSecret = req.headers["x-migration-secret"];
      if (headerSecret !== migrationSecret) {
        return res.status(403).json({ status: "error", message: "Forbidden: Invalid migration secret" });
      }
    }
    await seedDatabase(false);
    res.json({ status: "ok", message: "Database schema migration executed successfully" });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: process.env.NODE_ENV === "production" ? "Migration execution failed" : err.message,
    });
  }
});
app.get("/", (req, res) => res.json({ name: "TaskFlow Nexus Enterprise API", status: "ok" }));

// Mount Routes (supporting both /api/* and root /* for flexible reverse-proxy / serverless rewrites)
app.use(["/api/auth", "/auth"], authRouter);
app.use(["/api/tasks", "/tasks"], tasksRouter);
app.use(["/api/projects", "/projects"], projectsRouter);
app.use(["/api/team", "/team"], teamRouter);
app.use(["/api/profile", "/profile"], profileRouter);
app.use(["/api/activity", "/activity"], activityRouter);
app.use(["/api/notifications", "/notifications"], notificationsRouter);
app.use(["/api", "/"], invitationsRouter);

// 404 handler for API
app.use(["/api/*", "/*"], (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start Server and ensure DB is seeded
async function startServer() {
  try {
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 TaskFlow Enterprise API running at http://localhost:${PORT}`);
      console.log(`📡 Endpoints available:`);
      console.log(`   - GET  /api/health`);
      console.log(`   - GET  /api/tasks`);
      console.log(`   - GET  /api/tasks/stats`);
      console.log(`   - POST /api/tasks`);
      console.log(`   - GET  /api/projects`);
      console.log(`   - GET  /api/team`);
      console.log(`   - GET  /api/profile`);
      console.log(`   - GET  /api/activity`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// In serverless environments like Vercel, export the handler directly without starting a port listener
if (!process.env.VERCEL) {
  startServer();
}

export default app;
