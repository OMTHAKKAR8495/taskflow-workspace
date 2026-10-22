# 🚀 TaskFlow Nexus — Vercel Deployment Guide

TaskFlow Nexus is ready for zero-downtime, production deployment on **Vercel** connected to your live **Supabase PostgreSQL** database.

---

## ⚡ Option A: Deploy Both Frontend & Backend on Vercel (Recommended)

Since TaskFlow Nexus consists of a **TanStack Start / React 19 Frontend** and an **Express + PostgreSQL Backend API**, you can deploy both on Vercel under the same GitHub repository.

### Step 1: Deploy Backend API on Vercel

1. In your [Vercel Dashboard](https://vercel.com/new), click **"Add New" ➔ "Project"**.
2. Select your `taskflow-workspace` repository.
3. In the setup screen:
   - **Project Name:** `taskflow-api` (or your preferred name)
   - **Root Directory:** Click **Edit** and choose `server`
   - **Framework Preset:** `Other`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Expand **Environment Variables** and add:
   - `DATABASE_URL`: `postgresql://postgres:9558413347%40Om@db.ciqhtdrunnnwsiyobtvp.supabase.co:5432/postgres`
   - `JWT_SECRET`: `your_super_secret_jwt_key_here`
   - `NODE_ENV`: `production`
5. Click **Deploy**.
6. Once deployed, copy your backend URL (e.g., `https://taskflow-api.vercel.app`).
   - Health check can be verified at `https://taskflow-api.vercel.app/api/health`.

---

### Step 2: Deploy Frontend on Vercel

1. In your [Vercel Dashboard](https://vercel.com/new), click **"Add New" ➔ "Project"**.
2. Select the same `taskflow-workspace` repository.
3. In the setup screen:
   - **Project Name:** `taskflow` (or your preferred name)
   - **Root Directory:** `./` (default root)
   - **Framework Preset:** `Other` (or Vite)
   - **Build Command:** `npm run build:vercel`
   - **Output Directory:** Leave blank (Nitro automatically outputs to `.vercel/output`)
4. Expand **Environment Variables** and add:
   - `VITE_API_URL`: `https://taskflow-api.vercel.app/api` (the backend URL from Step 1)
   - `NITRO_PRESET`: `vercel`
5. Click **Deploy**.

---

## 🛠 What Has Been Prepared & Hardened

1. **Nitro Vercel Preset**:
   - `vite.config.ts` automatically compiles TanStack Start to Vercel's Build Output API v3 (`.vercel/output`).
   - Root script `npm run build:vercel` generates production serverless SSR handlers.

2. **Serverless-Ready Express Backend**:
   - `server/src/index.ts` is guarded with `!process.env.VERCEL`, ensuring `app.listen()` is not invoked in serverless environments.
   - Dual-mounted routes (`/api/...` and `/...`) prevent path mismatch across reverse proxies.
   - Dedicated serverless entry point at `server/api/index.ts` and rewrite rules in `server/vercel.json`.

3. **Resilient Dynamic URL Resolution**:
   - Created `src/lib/api-config.ts` so `getApiBaseUrl()` resolves environment variables without hardcoded `localhost:4000`.
   - Updated `apiTaskService`, `connectionStatus`, `AuthContext`, `TeamView`, and `SettingsView` to use centralized API config.
   - Offline fallback mode safely preserves state in local memory if connection drops.

4. **Database Verified**:
   - Schema tables and seed data are already populated and tested against Supabase PostgreSQL 17.
