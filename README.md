# TaskFlow — Modern Intelligent Task Management System

A high-performance, full-stack personal and team task management application built with **React**, **TypeScript**, **Express**, and **PostgreSQL**. Designed with a refined SaaS aesthetic (indigo/slate palette, glassmorphism, responsive dark mode) and to-do workflows.

---

## Highlights & Features

### 1. Smart Quick-Add Bar (NLP Parser)
Type natural language instructions into the quick-add bar to instantly create tasks with parsed metadata:
- **Priority**: `!high`, `!medium`, `!low`
- **Lists / Tags**: `#groceries`, `#work`, `#study`
- **Due Dates & Times**: `tomorrow`, `today`, `friday`, `5pm`, `10am`, `next week`
- *Example*: `Buy organic milk tomorrow 5pm !high #groceries`
- **Interactive Live Preview**: Shows chips for clean title, target list, due time, and priority before pressing Enter.

### 2. Smart Views & Workflow Organization
- **My Day**: Clean morning briefing view with dynamic progress ring ("3 of 7 completed"), quick-add input, and one-click task completion.
- **Upcoming**: Chronologically organized tasks due over the coming days and weeks.
- **Overdue**: Urgent triage view highlighting missed deadlines with red indicators.
- **Custom Colored Lists**: Organize tasks into personal lists (e.g., Personal, Work, Study, Fitness) with custom color badges and counts.
- **Soft Delete & Trash**: Deleted tasks move to Trash with instant undo toasts, full recovery/restore, and permanent empty trash actions.

### 3. Recurring Tasks
- Set tasks to recur **Daily**, **Weekdays**, **Weekly**, or **Monthly**.
- Ticking a recurring task completes the current instance and automatically schedules the next occurrence with the incremented due date.

### 4. Interactive Views (List, Kanban Board & Calendar)
- **Checkbox List View**: Strikethrough animations, inline subtask counters, priority indicators, and tags.
- **Kanban Board**: Drag-and-drop workflow across Backlog/To-Do, In Progress, In Review, and Completed.
- **Calendar View**: Full month grid displaying task chips with drag-and-drop rescheduling across days.

### 5. Focus Mode (Pomodoro Timer)
- Built-in minimalist Pomodoro timer (25 min focus, 50 min deep work, 5 min break).
- Automatically tracks and logs focus seconds accumulated on each task.

### 6. Productivity Insights
- **Completion Streak**: Flame counter tracking consecutive active days.
- **12-Week Activity Heatmap**: GitHub-style activity grid mapping completed tasks and focus sessions.
- **Productivity Analytics**: Best performing day of the week, total focus hours, and weekly created vs completed task charts.

### 7. Keyboard Command Palette (`Ctrl+K` / `Cmd+K`)
- Powered by `cmdk`.
- Quickly search tasks by title, switch between smart views and lists, toggle themes, and trigger new task modals directly from the keyboard.

### 8. Notifications & Reminders
- Dynamic notifications popover displaying overdue items and tasks due soon.
- Optional browser Web Notification permission toggle for system alerts.

### 9. Export & Import
- Export your tasks database as clean **JSON** or spreadsheet-compatible **CSV**.
- Import tasks from JSON or CSV with instant schema validation and merging.

### 10. Robust Authentication & Offline Resilience
- **Bcrypt Password Hashing & JWT**: Real secure authentication via `taskflow_token` httpOnly cookies and `Authorization: Bearer` headers.
- **Explicit Offline Banner**: Amber network status indicator when disconnected from PostgreSQL backend.
- **Strict Error Handling**: Validation and 4xx client errors are surfaced to the user without silent mock masking.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide Icons, cmdk, date-fns, Recharts |
| **Backend** | Node.js, Express, TypeScript, bcryptjs, jsonwebtoken, cookie-parser, pg (node-postgres) |
| **Database** | PostgreSQL 16 (with idempotent schema migrations) |
| **Quality** | ESLint 9, Prettier, Vitest, TypeScript strict mode (`exactOptionalPropertyTypes`) |
| **DevOps** | Docker Compose for PostgreSQL |

---

## Quickstart Guide

### Option A: Using Docker Compose (Recommended)

1. **Clone the repository and install dependencies**:
   ```bash
   git clone <repo-url> taskflow
   cd taskflow
   npm install
   npm --prefix server install
   ```

2. **Start PostgreSQL via Docker Compose**:
   ```bash
   docker compose up -d
   ```

3. **Start the Express API server**:
   ```bash
   npm --prefix server run dev
   ```
   *The server runs on `http://localhost:4000` and automatically runs idempotent database migrations on startup.*

4. **Start the Frontend development server**:
   ```bash
   npm run dev
   ```
   *Open `http://localhost:3000` (or the printed Vite URL) in your browser.*

---

### Option B: Local PostgreSQL Setup

1. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE taskflow_db;
   ```
2. Configure `server/.env`:
   ```env
   PORT=4000
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskflow_db
   JWT_SECRET=your-secret-key
   NODE_ENV=development
   ```
3. Run the database seed & migration:
   ```bash
   npm --prefix server run seed
   ```
4. Start both servers:
   ```bash
   # Terminal 1: Backend
   npm --prefix server run dev

   # Terminal 2: Frontend
   npm run dev
   ```

---

## Architecture & Directory Structure

```
taskflow/
├── docker-compose.yml       # One-command PostgreSQL 16 service
├── server/                  # Express + PostgreSQL backend
│   ├── schema.sql           # Database schema & safe idempotent migrations
│   ├── src/
│   │   ├── auth.ts          # Bcrypt hashing, JWT generation & verification middleware
│   │   ├── db.ts            # PostgreSQL connection pool with query helpers
│   │   ├── index.ts         # Express app entrypoint & cookie parser
│   │   ├── seed.ts          # Idempotent database seeder
│   │   └── routes/
│   │       ├── auth.ts      # /api/auth/register, /login, /logout, /me
│   │       ├── tasks.ts     # CRUD, soft-delete, restore, permanent delete, batch
│   │       ├── projects.ts  # Projects & initiatives
│   │       ├── team.ts      # Team members
│   │       ├── activity.ts  # Audit log / activity stream
│   │       └── profile.ts   # User profile management
├── src/                     # React frontend
│   ├── components/
│   │   ├── common/          # AppLayout, CommandPalette, NotificationsBell, OfflineBanner
│   │   ├── tasks/           # SmartQuickAdd, FocusModeModal, ProductivityInsights, CalendarView
│   │   └── dashboard/       # Dashboard analytics & charts
│   ├── context/             # AuthContext, TaskContext, ThemeContext
│   ├── services/            # apiTaskService, mockTaskService, connectionStatus
│   ├── lib/                 # task-utils, formatters, cn helper
│   ├── test/                # Vitest test suites (auth, routing, task logic)
│   └── types/               # Full TypeScript type definitions
└── README.md
```

---

## API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user with bcrypt-hashed password & set JWT cookie |
| `POST` | `/api/auth/login` | Authenticate user & return JWT token / set cookie |
| `POST` | `/api/auth/logout` | Clear auth cookie |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |

### Tasks (`/api/tasks`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tasks` | List all tasks (with optional `status`, `priority`, `projectId`, `listId`) |
| `POST` | `/api/tasks` | Create task (validated title, priority, status, recurrence, subtasks) |
| `GET` | `/api/tasks/:id` | Fetch single task by ID |
| `PATCH` | `/api/tasks/:id` | Update task fields (status, priority, recurrence, focus time) |
| `DELETE` | `/api/tasks/:id` | Soft delete task (moves to trash) |
| `POST` | `/api/tasks/:id/restore` | Restore soft-deleted task from trash |
| `DELETE` | `/api/tasks/:id/permanent` | Permanently remove task from database |
| `DELETE` | `/api/tasks/trash/empty` | Empty all trashed tasks |
| `POST` | `/api/tasks/:id/subtasks` | Toggle subtask completed status |
| `POST` | `/api/tasks/:id/bookmark` | Toggle task bookmark flag |
| `POST` | `/api/tasks/:id/comments` | Add comment to task |

---

## Testing & Quality Assurance

TaskFlow maintains zero TypeScript errors, strict linting compliance, and automated test coverage.

```bash
# Run TypeScript compilation check
npx tsc --noEmit

# Run ESLint check
npm run lint

# Run Vitest test suite
npm test
```

### Test Coverage Highlights
- **`src/test/auth-security.test.ts`**: Verifies bcrypt password hashing, signature verification, token expiration, and HTTP header/cookie parsing.
- **`src/test/task-features.test.ts`**: Verifies NLP parsing of tokens (`!high`, `#list`, `tomorrow 5pm`), recurring task auto-generation on complete, and soft-delete/restore lifecycles.
- **`src/test/app-routing.test.tsx`**: Verifies application routing, dashboard metrics aggregation, and query filters.

---

## License
MIT
