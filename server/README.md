# TaskFlow Backend (Node.js + Express + PostgreSQL)

A robust, production-ready REST API backend for the **TaskFlow** task management application.

## 🛠 Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express 4
- **Database:** PostgreSQL (`taskflow_db`)
- **Driver:** `pg` (node-postgres connection pool)
- **TypeScript:** Strict type checking with `tsx` dev runner

## 🚀 Quick Start

### 1. Database Setup

Ensure PostgreSQL is running locally on port 5432, and create the database:

```bash
createdb taskflow_db
# or via psql:
psql -d postgres -c "CREATE DATABASE taskflow_db;"
```

### 2. Configure Environment

Copy `.env.example` or adjust `.env`:

```env
PORT=4000
DATABASE_URL=postgresql://localhost:5432/taskflow_db
NODE_ENV=development
```

### 3. Install & Run

From the root workspace:

```bash
# Start backend in watch mode (runs on http://localhost:4000)
npm run server

# Seed / re-seed database tables and initial demo tasks
npm run server:seed
```

Or from inside the `server/` directory:

```bash
cd server
npm install
npm run seed
npm run dev
```

---

## 📡 API Endpoints

### Health

- `GET /api/health` - Check API and PostgreSQL connectivity

### Tasks

- `GET /api/tasks` - List all tasks (ordered by creation date desc)
- `GET /api/tasks/:id` - Get specific task with its comments
- `POST /api/tasks` - Create a new task (body: `{ title, description, status, priority, dueDate }`)
- `PATCH /api/tasks/:id` - Update an existing task
- `DELETE /api/tasks/:id` - Delete task (returns 204 No Content)
- `POST /api/tasks/:id/bookmark` - Toggle task bookmark state
- `POST /api/tasks/:id/comments` - Add a comment to task (`{ content, author }`)
- `GET /api/tasks/stats` - Get computed dashboard statistics (total, pending, inProgress, completed, overdue, byPriority)

### Profile

- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile (`{ fullName, email, avatarUrl }`)

### Activity

- `GET /api/activity` - Recent task activity timeline (created, updated, completed, deleted)

---

## 🔒 User Isolation

The API supports an optional `x-user-id` HTTP header. If omitted, it defaults to `"user-om"` (Om Thakkar). When different users log in on the frontend, each user's tasks, comments, and activities remain strictly scoped to their account in PostgreSQL.
