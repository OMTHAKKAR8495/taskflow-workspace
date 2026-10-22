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
import { pool, query } from "./db.js";
import { seedDatabase } from "./seed.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

// Enable CORS for frontend Vite dev server
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());
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
      message: err.message,
    });
  }
};

app.get("/api/health", handleHealth);
app.get("/health", handleHealth);
app.get("/", (req, res) => res.json({ name: "TaskFlow Nexus Enterprise API", status: "ok" }));

// Mount Routes (supporting both /api/* and root /* for flexible reverse-proxy / serverless rewrites)
app.use(["/api/auth", "/auth"], authRouter);
app.use(["/api/tasks", "/tasks"], tasksRouter);
app.use(["/api/projects", "/projects"], projectsRouter);
app.use(["/api/team", "/team"], teamRouter);
app.use(["/api/profile", "/profile"], profileRouter);
app.use(["/api/activity", "/activity"], activityRouter);
app.use(["/api/notifications", "/notifications"], notificationsRouter);

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
