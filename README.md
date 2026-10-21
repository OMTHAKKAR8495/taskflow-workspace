# TaskFlow Nexus — Enterprise Project Management & Team Collaboration Platform

TaskFlow Nexus is an enterprise-grade project management and team collaboration SaaS platform built with **React 19**, **TypeScript**, **Express**, and **PostgreSQL 16**. Designed with modern enterprise UX inspired by **Linear**, **ClickUp**, and **Asana**, it delivers a high-performance workspace featuring deep navy navigation (`#0f172a`), real relational database persistence, directed acyclic graph (DAG) task dependency cycle detection, milestone tracking, team workload capacity analysis, project intelligence reports, and real-time notification dispatching.

---

## 🌟 Executive Overview: From Task Tracker to Enterprise Platform

| Capability | Legacy TaskFlow | TaskFlow Nexus (Enterprise Upgrade) |
|---|---|---|
| **Platform Scope** | Single-user to-do checklist | Multi-project enterprise portfolio with 8 active routes |
| **Project Workspaces** | Flat tags/lists | Dedicated `/projects/$id` workspaces with backlog, kanban, milestones & team roles |
| **Workflow Stages** | 3 basic statuses (`pending`, `in_progress`, `completed`) | 6 enterprise stages (`backlog`, `ready`, `in_progress`, `in_review`, `blocked`, `completed`) |
| **Task Dependencies** | None | DAG-based `blocks` and `blocked_by` with automated cycle detection & blocker checks |
| **Personal Cockpit** | Basic "My Day" view | Comprehensive **My Work** hub (Assigned, In Review, Overdue, Created, Completed) |
| **Team & Capacity** | Static contact cards | Team directory with real capacity meters, active project count & workload progress |
| **Intelligence & Exports** | Basic completion streak | Recharts project velocity, burnup distribution, lead times, and dual CSV exports |
| **Notification Engine** | Browser alert trigger | Full relational notification center with categories, unread badges, and entity deep-links |
| **Auth Security** | Header spoofing vulnerability (`x-user-id`) | Hardened JWT verification, bcrypt hashing, and authentication rate limiting |

---

## 🧭 The 8 Primary Enterprise Routes

The top-level application shell provides direct access to 8 fully functional enterprise routes backed by live PostgreSQL queries:

### 1. Overview (`/dashboard`)
- **Executive Portfolio KPI Strip**: Active initiatives, overall completion rate, overdue deliverables, and tasks due this sprint.
- **Weekly Velocity Bar Chart & Status Distribution**: Live Recharts visualization of planned vs completed tasks.
- **Urgent Deliverables Triage**: Instant access to overdue and high-priority blocking tasks.
- **Audit Activity Stream**: Chronological event log tracking project updates, status changes, and task completions.

### 2. My Work (`/my-work`)
- **Personal Cockpit**: Focus zone for individual contributors and team leads.
- **Triage Tabs**:
  - **Assigned to Me**: Work actively owned by the logged-in user.
  - **Needs My Review**: Tasks in `in_review` requiring peer review or acceptance sign-off.
  - **Overdue**: Critical items past target deadlines.
  - **Created by Me**: Tasks authored by the user for delegation tracking.
  - **Completed**: Archive of completed personal accomplishments.
- **Instant Actions**: One-click "Approve & Mark Done" or "Request Changes" directly from review queues.

### 3. Projects Portfolio & Dedicated Workspaces (`/projects` & `/projects/$id`)
- **Portfolio List (`/projects`)**:
  - Health status badges (`On Track`, `At Risk`, `Off Track`).
  - Progress percentages calculated dynamically from child tasks.
  - Priority levels (`Critical`, `High`, `Medium`, `Low`) and target launch dates.
  - Fast-search filter and "+ New Project" creation modal.
- **Project Workspace (`/projects/$id`)**:
  - **Overview**: Executive summary, key statistics, launch deadlines, and initiative lead.
  - **Backlog**: Filterable list view with inline status and priority adjustments.
  - **Kanban Board**: 6-column workflow across `backlog`, `ready`, `in_progress`, `in_review`, `blocked`, and `completed`.
  - **Milestones**: Roadmap timeline tracking target deliverables, progress bars, and completion toggles.
  - **Team & Roles**: Manage project memberships with granular roles (`owner`, `admin`, `member`, `viewer`).

### 4. Team Directory & Capacity Management (`/team`)
- **Workload Capacity Analysis**: Real-time computation of active tasks and assigned hours per team member.
- **Visual Capacity Meters**: Color-coded progress bars indicating workload allocation (Green: Healthy, Amber: High Load, Red: Over Capacity).
- **Contact & Role Metadata**: Department, title, email, active initiatives, and direct "+ Add Team Member" modal.

### 5. Sprint Calendar (`/calendar`)
- **Interactive Monthly Grid**: Full-month calendar plotting tasks by target due date.
- **Project Filter Dropdown**: Isolate calendar deliverables for specific client projects or view workspace-wide deadlines.
- **One-Click Rescheduling**: Intuitive date reassignment and priority indicators.

### 6. Reports & Project Intelligence (`/reports`)
- **Sprint Velocity & Completion Trends**: Multi-series bar and line charts comparing planned vs delivered tasks.
- **Status & Priority Distribution**: Donut and pie charts illustrating workspace health.
- **Team Workload Balance**: Comparative workload chart highlighting bottlenecks across engineering, design, and product.
- **Dual One-Click CSV Exports**:
  - **Export Tasks CSV**: Full metadata dump (ID, Title, Project, Status, Priority, Assignee, Estimate, Due Date).
  - **Export Project Summary CSV**: High-level portfolio metrics (Projects, Health, Progress, Deadlines).

### 7. Notification Center (`/notifications`)
- **Multi-Category Inbox**: Filter notifications across `All`, `Unread`, `Task Assignments`, `Deadlines`, `Reviews`, and `System`.
- **Entity Deep-Linking**: Clicking a notification opens the related task in the slide-in drawer.
- **Batch Management**: "Mark All as Read" and individual dismiss actions.

### 8. Workspace Settings & Diagnostics (`/settings`)
- **Profile Customization**: Update display name, email, department, job title, and bio.
- **Theme Switcher**: Seamless toggling between dark, light, and system themes.
- **PostgreSQL Engine Diagnostics**: Live health checker displaying connection state, latency, and database uptime.

---

## 🔒 Security Hardening & Architecture

### 1. Eliminated Header Spoofing Vulnerability
- **Previous Vulnerability**: The legacy server accepted unauthenticated requests if an `x-user-id` header was passed, allowing trivial authentication bypass and identity spoofing.
- **Hardened Fix**: `server/src/auth.ts` now strictly validates cryptographically signed JSON Web Tokens (`jwt.verify`). Requests missing valid signed tokens in cookies or `Authorization: Bearer` headers are rejected with HTTP 401 Unauthorized.

### 2. Rate Limiting Protection
- Added in-memory sliding-window rate limiting on `/api/auth/login` and `/api/auth/register` to block brute-force attacks (50 requests per 15-minute window).

### 3. Directed Acyclic Graph (DAG) Cycle Prevention
- `server/src/dependencies.ts` implements breadth-first search (BFS) graph traversal (`wouldCreateCycle`) before inserting any task dependency. If task $A$ depends on $B$, and $B$ directly or transitively depends on $A$, the server rejects the request with HTTP 400 Bad Request to prevent circular deadlocks.

### 4. Blocker Protection on Task Completion
- When moving a task to `completed`, the API and frontend check all `blocked_by` prerequisites. If any prerequisite task is not in `completed` status, the transition is rejected with an actionable blocker notice.

---

## 🗄️ Relational Database Schema (PostgreSQL)

```
 users (id, username, email, password_hash, full_name, avatar_url, role, department, created_at)
   │
   ├─► projects (id, name, key, description, color, status, health, priority, progress, owner_id, deadline)
   │     │
   │     ├─► project_members (id, project_id, user_id, role, created_at)
   │     │
   │     ├─► milestones (id, project_id, title, description, target_date, completed, created_at)
   │     │
   │     └─► tasks (id, user_id, project_id, milestone_id, assignee_id, reviewer_id,
   │                identifier, title, description, status, priority, type,
   │                estimated_hours, actual_hours, blocked_reason, due_date, ...)
   │           │
   │           ├─► task_dependencies (id, task_id, depends_on_task_id, dependency_type)
   │           ├─► comments (id, task_id, author, content, created_at)
   │           └─► subtasks (id, task_id, title, completed, created_at)
   │
   └─► notifications (id, user_id, title, message, type, entity_type, entity_id, is_read, created_at)
```

---

## 🚀 Quickstart Guide

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ (or Docker Compose)

### 1. Clone & Install Dependencies
```bash
git clone <repo-url> taskflow-nexus
cd taskflow-nexus
npm install
npm --prefix server install
```

### 2. Configure Environment Files

**Backend (`server/.env`):**
```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskflow_db
JWT_SECRET=super-secret-enterprise-key-change-in-prod
NODE_ENV=development
```

**Frontend (`.env`):**
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### 3. Initialize & Seed Database
```bash
# Apply schema and seed demo workspace with projects, milestones, tasks & dependencies:
npm --prefix server run seed
```

### 4. Start Development Servers
```bash
# Starts both Express API (:4000) and Vite Frontend (:3000):
npm run dev:all
```

---

## 👤 Demo User Accounts

The database seeder provisions realistic accounts with pre-populated workspaces:

| Username | Password | Role | Description |
|---|---|---|---|
| `omthakkar` | `password123` | **Engineering Lead (Admin)** | Primary account with full access to all projects, tasks & reviews |
| `sarahchen` | `password123` | **Product Manager** | Oversees mobile banking and platform milestones |
| `marcus` | `password123` | **Senior Backend Engineer** | Assigned core architecture & database tasks |
| `elena` | `password123` | **Lead UI/UX Designer** | Owns design system tokens and component reviews |

---

## 🧪 Automated Testing & Verification

TaskFlow Nexus includes automated test suites covering routing, authentication security, NLP parsing, DAG cycle detection, and enterprise 6-state task workflows:

```bash
# Run Vitest test suite (All 33 tests passing):
npm test

# Run TypeScript compilation check:
npx tsc --noEmit

# Run production build:
npm run build
```

### Test Suites:
1. **`src/test/enterprise-features.test.ts`**: Verifies DAG cycle prevention, 2-node/3-node transitive cycles, 6-state transitions, and dependency blocker enforcement.
2. **`src/test/app-routing.test.tsx`**: Verifies all 8 primary application routes, route params, and search queries.
3. **`src/test/auth-security.test.ts`**: Verifies bcrypt hashing, JWT cookie parsing, and signature validation.
4. **`src/test/task-features.test.ts`**: Verifies natural language quick-add parsing, recurring task generation, and soft-delete/restore lifecycles.

---

## 📦 Production Deployment

To build the client and server for production deployment:
```bash
npm run build
```
The output is generated in `.output/` ready for containerization or edge deployment.

---

## 📄 License
MIT License. Built for full-stack software engineering evaluation.
