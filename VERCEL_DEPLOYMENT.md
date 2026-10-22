# 🚀 TaskFlow Nexus — Vercel Multi-Services Deployment Guide

TaskFlow Nexus is configured to deploy to **Vercel as a single project with multiple services**, sharing one domain, unified routing, and private inter-service bindings.

---

## 🏗 Multi-Service Architecture Overview

Your repository is configured via the root [vercel.json](file:///Users/omthakkar/taskflow-workspace/vercel.json) with two collocated services:

| Service | Root | Framework | Visibility | Internal Binding | Purpose |
|---|---|---|---|---|---|
| **`app`** | `.` (Root) | `tanstack-start-lovable` | Public on `/(.*)` | `SERVER_URL` ➔ `server` | React 19 + TanStack Start SSR Frontend |
| **`server`** | `server` | `express` | Public on `/api/(.*)` | Target of `app` binding | Express 4 + Supabase PostgreSQL REST API |

---

## ⚙️ Configuration Files

### 1. `vercel.json` (Root)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "app": {
      "root": ".",
      "framework": "tanstack-start-lovable",
      "bindings": [
        {
          "type": "service",
          "service": "server",
          "format": "url",
          "env": "SERVER_URL"
        }
      ]
    },
    "server": {
      "root": "server",
      "framework": "express"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": {
        "service": "server"
      }
    },
    {
      "source": "/(.*)",
      "destination": {
        "service": "app"
      }
    }
  ]
}
```

### 2. Service-to-Service Binding (`SERVER_URL`)
- When `app` executes serverless functions or SSR, Vercel injects the private internal URL of `server` into `process.env.SERVER_URL`.
- [src/lib/api-config.ts](file:///Users/omthakkar/taskflow-workspace/src/lib/api-config.ts) automatically resolves this binding:
  - **In Functions / SSR**: uses `process.env.SERVER_URL + "/api"`.
  - **In Browser**: uses same-origin `/api` (routed via Vercel rewrite to `server`).
  - **Local Development**: falls back to `http://localhost:4000/api` (or `vercel dev`).

---

## 🚀 One-Click Deployment on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new) and import your `taskflow-workspace` repository.
2. Vercel automatically detects the root `vercel.json` and multi-service setup.
3. In **Environment Variables**, add:
   - `DATABASE_URL`: `postgresql://postgres:[YOUR_PASSWORD]@db.your-project-ref.supabase.co:5432/postgres`
   - `JWT_SECRET`: `your_random_secret_key`
4. Click **Deploy**.
5. Both services will build and deploy under a single public URL (e.g., `https://taskflow-nexus.vercel.app`).
   - Frontend UI: `https://taskflow-nexus.vercel.app/`
   - API endpoints: `https://taskflow-nexus.vercel.app/api/health`, `https://taskflow-nexus.vercel.app/api/tasks`, etc.
