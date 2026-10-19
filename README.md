# TaskFlow Workspace

# Build TaskFlow — Complete Full-Stack Task Management UI

Act as a senior UI/UX designer and React frontend developer. Build a complete, professional, modern, responsive task management web application called **TaskFlow**.

## 1. Project objective

Create a polished project and task management dashboard suitable for a full-stack developer internship technical assignment.

The application should look like a real SaaS product, not a basic student project. Prioritize excellent UI design, clean code, reusable components, responsive layouts, and functional frontend interactions.

**IMPORTANT:** Focus on building the complete FRONTEND UI. Do not spend time implementing a custom backend. Use realistic mock data and a centralized service layer so I can connect my own Node.js + Express + PostgreSQL backend later.

## 2. Technology requirements

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components where appropriate
- Lucide icons
- React Router for navigation
- Recharts for dashboard analytics
- React Hook Form and Zod for form validation
- Local mock data and a service abstraction for frontend functionality

Keep the code modular, maintainable, and ready for future API integration.

## 3. Design system

Create a premium SaaS dashboard design.

Visual direction:
- Clean, minimal, professional interface
- White and very light gray backgrounds
- Dark navy text
- Indigo/violet as the primary accent
- Soft borders and subtle shadows
- Rounded cards with consistent spacing
- Beautiful typography and clear visual hierarchy
- Small status badges and priority indicators
- Smooth, subtle hover transitions
- Consistent Lucide icons
- Professional empty states, loading states, and error states

Use a persistent left sidebar on desktop and a collapsible navigation drawer on mobile. Add a top header containing a page title, breadcrumb where appropriate, notification icon, and user avatar/profile menu.

Avoid excessive gradients, unnecessary animations, giant headings, oversized cards, and cluttered layouts.

## 4. Pages to build

### A. Dashboard — `/dashboard`

Create a complete overview page containing:

- Welcome message with the user's name
- Summary cards for Total Tasks, Pending Tasks, In Progress, and Completed
- Task completion progress indicator
- Tasks due soon section
- Recent tasks section
- Priority distribution chart
- Task completion chart
- Quick Add Task button
- Recent activity feed

Use realistic sample data and calculate dashboard totals from the task dataset rather than hardcoding unrelated numbers.

### B. All Tasks — `/tasks`

Create a complete task management page containing:

- Page title and task count
- Search input
- Filter dropdowns for status and priority
- Sort options for due date, priority, and creation date
- List and grid view toggle
- Add Task button
- Task rows or cards showing title, description preview, status, priority, due date, and last updated date
- Clear filters button
- Pagination or a simple load-more interaction if needed
- Empty state when no tasks match the filters

Use distinct, accessible badges for Pending, In Progress, Completed, Low, Medium, and High.

### C. Task Details — `/tasks/:id`

Create a detailed task view showing:

- Task title and full description
- Status and priority badges
- Due date and creation date
- Last updated date
- Edit Task action
- Delete Task action with a confirmation dialog
- Mark as Complete action
- Back to Tasks navigation
- Related task information where relevant

Handle invalid or missing task IDs with a friendly not-found state.

### D. Create Task — `/tasks/new`

Build a polished form containing:

- Task title
- Description
- Status selection
- Priority selection
- Due date picker
- Create Task button
- Cancel button

Add required-field validation, character limits where appropriate, helpful inline error messages, and disabled/loading button states during submission.

### E. Edit Task — `/tasks/:id/edit`

Reuse the create form with existing task data prefilled.

Allow editing of the title, description, status, priority, and due date. Include Save Changes and Cancel buttons.

### F. User Profile — `/profile`

Create a user profile page showing:

- Avatar and full name
- Email address
- Join date
- Edit profile form
- Task activity summary
- Total, completed, and pending task counts

Keep profile information editable in the frontend demo.

### G. Not Found — `*`

Create a polished 404 page with an illustration or icon, a helpful message, and a button to return to the dashboard.

## 5. Navigation and layout

Sidebar navigation should contain:

- Dashboard
- All Tasks
- Profile
- Settings (simple placeholder page or dialog)

Add a visible active navigation state. The sidebar should collapse or become a drawer on mobile.

The top header should contain:
- Current page title
- Breadcrumbs where appropriate
- Notifications button with a simple dropdown
- User avatar menu with Profile and Sign Out demo actions

Keep navigation consistent across all main pages.

## 6. Frontend functionality

Implement working frontend interactions using React state and a centralized mock-data service.

Required behavior:

1. Create a task and display it immediately in the task list.
2. Open a task details page by clicking its row or card.
3. Edit an existing task and update the UI.
4. Delete a task only after confirmation.
5. Mark a task as completed.
6. Search tasks by title and description.
7. Filter tasks by status and priority.
8. Sort tasks by due date, priority, and creation date.
9. Update dashboard statistics when task data changes.
10. Edit and display user profile information.
11. Show toast notifications for successful and failed demo actions.
12. Show appropriate loading, empty, validation, and error states.
13. Persist demo changes with localStorage so data remains after refreshing the browser.

Use a single shared task state or data context so changes are reflected consistently across the dashboard, task list, and task detail pages.

Do not implement fake buttons that do nothing. Every visible interactive control must work or be clearly marked as a placeholder.

## 7. Task data model

Use a TypeScript interface similar to:

Task:
- id: string
- userId: string
- title: string
- description: string
- status: "pending" | "in_progress" | "completed"
- priority: "low" | "medium" | "high"
- dueDate: string | null
- createdAt: string
- updatedAt: string

Create realistic demo data for at least 10–12 tasks with a mix of statuses, priorities, and deadlines.

Create a Profile interface with id, fullName, email, avatarUrl, and createdAt.

## 8. Component architecture

Create reusable components such as:

- AppLayout
- Sidebar
- MobileNavigation
- TopHeader
- PageHeader
- StatCard
- TaskCard
- TaskTable
- TaskStatusBadge
- PriorityBadge
- TaskFilters
- TaskForm
- TaskDetailsPanel
- DeleteConfirmationDialog
- SearchInput
- EmptyState
- LoadingState
- ErrorState
- ProfileCard
- ActivityFeed

Organize code into sensible folders for pages, components, hooks, types, services, and utilities.

Keep business logic out of large UI components.

## 9. Backend integration readiness

The UI will later connect to a Node.js + Express + PostgreSQL backend.

Create a centralized task service with functions for:

- getTasks()
- getTaskById(id)
- createTask(data)
- updateTask(id, data)
- deleteTask(id)
- getDashboardStats()
- getProfile()
- updateProfile(data)

For now, implement these using mock data and localStorage. Keep the service interface easy to replace with HTTP API requests later.

Do not create fake successful backend responses or claim that real authentication or database persistence exists.

Clearly separate the mock service from the future API service.

## 10. Responsive design

Ensure the entire application works on:

- Desktop screens
- Tablets
- Mobile phones

On small screens, use stacked statistic cards, mobile-friendly task cards, compact filters, responsive forms, and a collapsible sidebar.

Prevent horizontal overflow and keep buttons and inputs comfortable to use on touchscreens.

## 11. Quality requirements

- Use TypeScript types correctly.
- Avoid unnecessary `any` types.
- Ensure routes work on direct navigation and page refresh.
- Keep all UI components visually consistent.
- Ensure forms are accessible and labels are connected to inputs.
- Add proper confirmation before destructive actions.
- Handle empty datasets and invalid IDs.
- Avoid duplicate task state and inconsistent dashboard totals.
- Do not leave incomplete imports or broken routes.
- Do not build unrelated features such as chat, billing, teams, AI, or real-time collaboration.
- Do not waste time on backend infrastructure; this task is for the frontend UI.

## 12. Final deliverable

Generate the complete, working TaskFlow frontend in the project.

Prioritize in this order:
1. Shared layout and navigation
2. Dashboard
3. Task listing, search, and filtering
4. Create, details, edit, and delete flows
5. Profile page
6. Responsive behavior and polished states

Before finishing, verify that navigation, CRUD interactions, filters, dashboard statistics, validation, and browser refresh persistence work correctly.

Build the complete application now. Do not stop after generating a landing page or static dashboard mockup.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e52c233c-3409-467e-9c95-727e3a8387ef).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
