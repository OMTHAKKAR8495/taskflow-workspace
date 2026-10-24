import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  Filter,
  FolderKanban,
  Gauge,
  ListTodo,
  MessageSquare,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
  User,
  Check,
  Send,
  HelpCircle,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskStatusBadge, PriorityBadge } from "@/components/tasks/badges";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { ProgressUpdateModal } from "@/components/tasks/ProgressUpdateModal";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { isOverdue } from "@/lib/task-utils";
import { fmtDate, fmtRelative } from "@/lib/format";
import type { Task, TaskPriority, TaskStatus } from "@/types";

export type MemberViewTab =
  | "all_tasks"
  | "due_soon"
  | "overdue"
  | "completed"
  | "my_progress"
  | "my_updates"
  | "my_feedback"
  | "my_profile";

function getDeadlineCountdown(dueDate: string | null | undefined): {
  text: string;
  isUrgent: boolean;
  isOverdue: boolean;
  badgeClass: string;
} {
  if (!dueDate) {
    return {
      text: "No deadline",
      isUrgent: false,
      isOverdue: false,
      badgeClass: "bg-muted text-muted-foreground",
    };
  }
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return {
      text: `${days}d overdue`,
      isUrgent: true,
      isOverdue: true,
      badgeClass: "bg-rose-500/20 text-rose-500 font-bold border border-rose-500/30",
    };
  }
  if (diffDays === 0) {
    return {
      text: "Due today",
      isUrgent: true,
      isOverdue: false,
      badgeClass: "bg-amber-500/20 text-amber-500 font-bold border border-amber-500/30",
    };
  }
  if (diffDays === 1) {
    return {
      text: "Due tomorrow",
      isUrgent: true,
      isOverdue: false,
      badgeClass: "bg-amber-500/20 text-amber-500 font-medium border border-amber-500/20",
    };
  }
  if (diffDays <= 3) {
    return {
      text: `${diffDays} days left`,
      isUrgent: true,
      isOverdue: false,
      badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium",
    };
  }
  return {
    text: `Due in ${diffDays} days`,
    isUrgent: false,
    isOverdue: false,
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
}

export function MemberDashboardView() {
  const { tasks, projects, reload, profile } = useTasks();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updatingTask, setUpdatingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Read URL query parameter if present, e.g. ?tab=updates, ?tab=feedback, ?tab=tasks
  const [mainTab, setMainTab] = useState<MemberViewTab>("all_tasks");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p === "updates" || p === "my_updates") setMainTab("my_updates");
      else if (p === "feedback" || p === "my_feedback") setMainTab("my_feedback");
      else if (p === "progress" || p === "my_progress") setMainTab("my_progress");
      else if (p === "due_soon" || p === "due") setMainTab("due_soon");
      else if (p === "overdue") setMainTab("overdue");
      else if (p === "completed") setMainTab("completed");
      else if (p === "profile" || p === "my_profile") setMainTab("my_profile");
      else if (p === "tasks" || p === "all_tasks") setMainTab("all_tasks");
    }
  }, []);

  const userId = user?.id || "user-om";

  // Filter tasks assigned to this logged-in member
  const myAssignedTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.isTrash) return false;
      const isAssigned =
        t.assigneeId === userId ||
        t.assignee?.id === userId ||
        t.userId === userId ||
        (user?.email && t.assignee?.email === user.email);
      return isAssigned;
    });
  }, [tasks, userId, user?.email]);

  // Derived Metrics
  const stats = useMemo(() => {
    const total = myAssignedTasks.length;
    const notStarted = myAssignedTasks.filter(
      (t) => t.status === "pending" || t.status === "ready" || t.status === "backlog",
    ).length;
    const inProgress = myAssignedTasks.filter((t) => t.status === "in_progress").length;
    const inReview = myAssignedTasks.filter((t) => t.status === "in_review").length;
    const blocked = myAssignedTasks.filter((t) => t.status === "blocked").length;
    const completed = myAssignedTasks.filter((t) => t.status === "completed").length;
    const overdue = myAssignedTasks.filter(
      (t) => t.status !== "completed" && isOverdue(t.dueDate),
    ).length;

    const now = new Date();
    const next14Days = new Date();
    next14Days.setDate(now.getDate() + 14);

    const upcomingDeadlines = myAssignedTasks.filter((t) => {
      if (t.status === "completed" || !t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= now && d <= next14Days;
    }).length;

    const totalHoursLogged = myAssignedTasks.reduce((acc, t) => acc + (t.actualHours || 0), 0);
    const avgProgress =
      total > 0
        ? Math.round(
            myAssignedTasks.reduce(
              (acc, t) => acc + (t.status === "completed" ? 100 : t.progressPercent || 0),
              0,
            ) / total,
          )
        : 0;

    return {
      total,
      notStarted,
      inProgress,
      inReview,
      blocked,
      completed,
      overdue,
      upcomingDeadlines,
      totalHoursLogged,
      avgProgress,
    };
  }, [myAssignedTasks]);

  // Collect all progress updates submitted by this member across their tasks
  const allSubmittedUpdates = useMemo(() => {
    const list: Array<{
      update: any;
      task: Task;
    }> = [];

    for (const t of myAssignedTasks) {
      if (t.progressUpdates && t.progressUpdates.length > 0) {
        for (const pu of t.progressUpdates) {
          list.push({ update: pu, task: t });
        }
      }
    }
    return list.sort(
      (a, b) => new Date(b.update.createdAt).getTime() - new Date(a.update.createdAt).getTime(),
    );
  }, [myAssignedTasks]);

  // Collect all review decisions and leader feedback received
  const allLeaderFeedback = useMemo(() => {
    const list: Array<{
      review: any;
      task: Task;
    }> = [];

    for (const t of myAssignedTasks) {
      if (t.reviews && t.reviews.length > 0) {
        for (const rev of t.reviews) {
          list.push({ review: rev, task: t });
        }
      }
    }
    return list.sort(
      (a, b) => new Date(b.review.createdAt).getTime() - new Date(a.review.createdAt).getTime(),
    );
  }, [myAssignedTasks]);

  // Tasks with leader changes requested
  const tasksNeedingAttention = useMemo(() => {
    return myAssignedTasks.filter((t) => {
      const hasChangesRequested =
        t.reviews && t.reviews.length > 0 && t.reviews[0].decision === "changes_requested";
      return hasChangesRequested || t.status === "blocked";
    });
  }, [myAssignedTasks]);

  // Filtered task list based on main tab and dropdown filters
  const filteredTasks = useMemo(() => {
    return myAssignedTasks.filter((t) => {
      // Tab filter
      if (mainTab === "due_soon") {
        if (t.status === "completed" || !t.dueDate) return false;
        const now = new Date();
        const next14Days = new Date();
        next14Days.setDate(now.getDate() + 14);
        const d = new Date(t.dueDate);
        if (d < now || d > next14Days) return false;
      } else if (mainTab === "overdue") {
        if (t.status === "completed" || !isOverdue(t.dueDate)) return false;
      } else if (mainTab === "completed") {
        if (t.status !== "completed") return false;
      }

      // Dropdown filters
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (projectFilter !== "all" && t.projectId !== projectFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = (t.description || "").toLowerCase().includes(q);
        const matchesKey = (t.identifier || "").toLowerCase().includes(q);
        const matchesProject = (t.projectName || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesKey && !matchesProject) return false;
      }
      return true;
    });
  }, [myAssignedTasks, mainTab, statusFilter, priorityFilter, projectFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Welcome & Personal Workspace Header */}
      <div className="rounded-2xl border bg-gradient-to-r from-indigo-950/20 via-slate-900/10 to-card p-6 shadow-xs border-indigo-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-2 border border-indigo-500/20">
              <User className="size-3.5" /> Team Member Personal Workspace
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {user?.fullName || "Team Member"}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Your private workspace. Inspect assigned deliverables, record daily progress updates,
              report blockers, and respond to Team Leader review feedback.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => reload()}
              className="text-xs cursor-pointer gap-1.5"
            >
              <RotateCcw className="size-3.5" /> Refresh Workspace
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Priority Attention Alert: Leader Feedback / Requested Changes */}
      {tasksNeedingAttention.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs">
              <AlertTriangle className="size-4" />
              <span>
                {tasksNeedingAttention.length} Task(s) Require Your Immediate Attention
              </span>
            </div>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Action Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {tasksNeedingAttention.map((task) => {
              const latestReview = task.reviews?.[0];
              const isBlocked = task.status === "blocked";
              return (
                <div
                  key={task.id}
                  className="rounded-lg border border-amber-500/20 bg-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-primary">
                        {task.identifier}
                      </span>
                      <TaskStatusBadge status={task.status} />
                      {latestReview?.decision === "changes_requested" && (
                        <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-500 border-rose-500/30">
                          Changes Requested
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate">{task.title}</p>
                    {latestReview && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                        "{latestReview.feedback}"
                      </p>
                    )}
                    {isBlocked && task.blockedReason && (
                      <p className="text-[11px] text-rose-500 line-clamp-1 font-medium">
                        Blocker: {task.blockedReason}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setUpdatingTask(task)}
                    className="cursor-pointer text-xs shrink-0 gap-1.5 font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <TrendingUp className="size-3.5" /> Open & Respond
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Personal Workspace Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setMainTab("all_tasks")}
          className={`rounded-xl border p-3.5 space-y-1 text-left transition-all cursor-pointer ${
            mainTab === "all_tasks" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "bg-card hover:border-border/80"
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground">My Tasks</span>
          <p className="text-2xl font-bold tracking-tight text-foreground">{stats.total}</p>
          <span className="text-[10px] text-muted-foreground">Assigned to you</span>
        </button>

        <button
          onClick={() => setMainTab("due_soon")}
          className={`rounded-xl border p-3.5 space-y-1 text-left transition-all cursor-pointer ${
            mainTab === "due_soon" ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20" : "bg-card hover:border-border/80"
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground">Due Soon</span>
          <p className="text-2xl font-bold tracking-tight text-amber-500">{stats.upcomingDeadlines}</p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Next 14 days</span>
        </button>

        <button
          onClick={() => setMainTab("overdue")}
          className={`rounded-xl border p-3.5 space-y-1 text-left transition-all cursor-pointer ${
            mainTab === "overdue" ? "border-rose-500 bg-rose-500/5 ring-1 ring-rose-500/20" : "bg-card hover:border-border/80"
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground">Overdue</span>
          <p className="text-2xl font-bold tracking-tight text-rose-500">{stats.overdue}</p>
          <span className="text-[10px] text-rose-500 font-medium">Missed deadlines</span>
        </button>

        <button
          onClick={() => setMainTab("completed")}
          className={`rounded-xl border p-3.5 space-y-1 text-left transition-all cursor-pointer ${
            mainTab === "completed" ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20" : "bg-card hover:border-border/80"
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground">Completed</span>
          <p className="text-2xl font-bold tracking-tight text-emerald-500">{stats.completed}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Approved by leader</span>
        </button>

        <button
          onClick={() => setMainTab("my_progress")}
          className={`rounded-xl border p-3.5 space-y-1 text-left transition-all cursor-pointer ${
            mainTab === "my_progress" ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20" : "bg-card hover:border-border/80"
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground">My Progress</span>
          <p className="text-2xl font-bold tracking-tight text-indigo-500">{stats.avgProgress}%</p>
          <span className="text-[10px] text-indigo-400 font-medium">{stats.totalHoursLogged}h logged</span>
        </button>

        <button
          onClick={() => setMainTab("my_feedback")}
          className={`rounded-xl border p-3.5 space-y-1 text-left transition-all cursor-pointer ${
            mainTab === "my_feedback" ? "border-purple-500 bg-purple-500/5 ring-1 ring-purple-500/20" : "bg-card hover:border-border/80"
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground">My Feedback</span>
          <p className="text-2xl font-bold tracking-tight text-purple-500">{allLeaderFeedback.length}</p>
          <span className="text-[10px] text-purple-400 font-medium">Leader reviews</span>
        </button>
      </div>

      {/* 4. Dedicated Workspace Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b pb-2">
        {[
          { id: "all_tasks", label: "My Tasks", icon: ListTodo, count: stats.total },
          { id: "due_soon", label: "Due Soon", icon: Clock, count: stats.upcomingDeadlines },
          { id: "overdue", label: "Overdue Tasks", icon: AlertTriangle, count: stats.overdue },
          { id: "completed", label: "Completed Tasks", icon: CheckCircle2, count: stats.completed },
          { id: "my_progress", label: "My Progress", icon: Gauge },
          { id: "my_updates", label: "My Updates", icon: FileCheck2, count: allSubmittedUpdates.length },
          { id: "my_feedback", label: "My Feedback", icon: MessageSquare, count: allLeaderFeedback.length },
          { id: "my_profile", label: "My Profile", icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = mainTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id as MemberViewTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-bold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 5. TAB VIEW: Tasks / Due Soon / Overdue / Completed */}
      {(mainTab === "all_tasks" || mainTab === "due_soon" || mainTab === "overdue" || mainTab === "completed") && (
        <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-card">
          {/* Header & Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ListTodo className="size-4 text-primary" />
                {mainTab === "all_tasks" && "All Assigned Tasks"}
                {mainTab === "due_soon" && "Tasks Due Soon (Next 14 Days)"}
                {mainTab === "overdue" && "Overdue Tasks Requiring Completion"}
                {mainTab === "completed" && "Completed & Approved Tasks"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every task card includes requirements, countdown, acceptance criteria, and direct update controls.
              </p>
            </div>

            {/* Quick Status Sub-Filter */}
            {mainTab === "all_tasks" && (
              <div className="flex items-center gap-1 overflow-x-auto p-1 bg-muted/30 rounded-xl border">
                {[
                  { id: "all", label: "All", count: stats.total },
                  { id: "in_progress", label: "In Progress", count: stats.inProgress },
                  { id: "in_review", label: "In Review", count: stats.inReview },
                  { id: "blocked", label: "Blocked", count: stats.blocked },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      statusFilter === s.id
                        ? "bg-card text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search and Secondary Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="relative sm:col-span-1">
              <Search className="size-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assigned tasks..."
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-input bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
            </div>

            <div>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full h-8 rounded-lg border border-input bg-card px-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full h-8 rounded-lg border border-input bg-card px-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical Priority</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Task Cards Grid / List */}
          {filteredTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">No tasks found in this view</p>
              <p>
                {myAssignedTasks.length === 0
                  ? "You have no tasks assigned to you by your team leader."
                  : "No assigned tasks match your current filter selection."}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredTasks.map((task) => {
                const countdown = getDeadlineCountdown(task.dueDate);
                const latestReview = task.reviews?.[0];
                const latestProgress = task.latestProgress || task.progressUpdates?.[0];
                const criteria = task.acceptanceCriteria || [];

                return (
                  <div
                    key={task.id}
                    className="rounded-xl border bg-card hover:border-primary/40 p-4 transition-all shadow-2xs space-y-3"
                  >
                    {/* Top Row: Key, Project, Status, Priority, Countdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                          {task.identifier || `TASK-${task.id.slice(0, 6)}`}
                        </span>
                        {task.projectName && (
                          <span className="text-xs font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                            {task.projectName}
                          </span>
                        )}
                        <TaskStatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 ${countdown.badgeClass}`}
                        >
                          <Clock className="size-3" />
                          {countdown.text}
                        </span>
                      </div>

                      {/* Action Buttons: Clear Open Task & Update Progress */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTask(task)}
                          className="h-7 text-xs font-semibold cursor-pointer gap-1.5"
                        >
                          <Eye className="size-3.5" />
                          Open Task
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setUpdatingTask(task)}
                          className="h-7 text-xs font-semibold cursor-pointer gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <TrendingUp className="size-3.5" />
                          Update Progress
                        </Button>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3
                        onClick={() => setSelectedTask(task)}
                        className="text-sm font-bold text-foreground hover:text-primary cursor-pointer transition-colors"
                      >
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Progress Percentage & Completion Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-medium">Completion Progress</span>
                        <span className="font-mono font-bold text-primary">
                          {task.progressPercent ?? (task.status === "completed" ? 100 : 0)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            task.status === "completed"
                              ? "bg-emerald-500"
                              : task.status === "blocked"
                              ? "bg-rose-500"
                              : "bg-indigo-600"
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(0, task.progressPercent ?? 0))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Required Deliverables & Acceptance Criteria Preview */}
                    {criteria.length > 0 && (
                      <div className="rounded-lg bg-muted/30 border border-border/50 p-2.5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileCheck2 className="size-3 text-primary" /> Deliverables & Criteria ({criteria.length})
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {criteria.filter((c: any) => c.completed).length} / {criteria.length} completed
                          </span>
                        </div>
                        <ul className="space-y-1 text-[11px] text-foreground">
                          {criteria.slice(0, 2).map((item: any, i: number) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <span
                                className={`size-3 rounded-xs border flex items-center justify-center shrink-0 ${
                                  item.completed
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : "border-muted-foreground/40"
                                }`}
                              >
                                {item.completed && <Check className="size-2.5 stroke-[3]" />}
                              </span>
                              <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                                {typeof item === "string" ? item : item.text || item.title}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Latest Feedback from Team Leader Preview */}
                    {latestReview && (
                      <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-purple-400 flex items-center gap-1.5">
                            <MessageSquare className="size-3" /> Latest Leader Feedback
                          </span>
                          <span className="text-[10px] text-purple-300">
                            {latestReview.decision === "approved" ? "Approved" : "Changes Requested"}
                          </span>
                        </div>
                        <p className="text-[11px] text-purple-200 line-clamp-2">
                          "{latestReview.feedback}"
                        </p>
                      </div>
                    )}

                    {/* Footer Info Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" /> Due {fmtDate(task.dueDate)}
                          </span>
                        )}
                        {task.estimatedHours ? (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" /> Est: {task.estimatedHours}h
                          </span>
                        ) : null}
                        {task.actualHours ? (
                          <span className="flex items-center gap-1 font-semibold text-foreground">
                            Logged: {task.actualHours}h
                          </span>
                        ) : null}
                      </div>

                      {latestProgress && (
                        <div className="text-[11px] text-muted-foreground truncate max-w-sm">
                          <span className="font-semibold text-foreground">Last report: </span>
                          <span>{latestProgress.workCompleted.slice(0, 40)}...</span>
                          <span className="opacity-75"> ({fmtRelative(latestProgress.createdAt)})</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB VIEW: My Progress (Individual Completion & Metrics History) */}
      {mainTab === "my_progress" && (
        <div className="rounded-2xl border bg-card p-6 space-y-6 shadow-card">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Gauge className="size-4 text-primary" /> My Individual Progress & Velocity
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review your overall completion percentage, hours logged, and task delivery performance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border p-4 bg-muted/20 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Overall Completion Rate</span>
              <p className="text-3xl font-bold text-foreground">{stats.avgProgress}%</p>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-500"
                  style={{ width: `${stats.avgProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {stats.completed} of {stats.total} total assigned tasks completed & approved
              </p>
            </div>

            <div className="rounded-xl border p-4 bg-muted/20 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Total Time Invested</span>
              <p className="text-3xl font-bold text-foreground">{stats.totalHoursLogged} hrs</p>
              <p className="text-[11px] text-muted-foreground">
                Logged across all historical daily progress update submissions
              </p>
            </div>

            <div className="rounded-xl border p-4 bg-muted/20 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Work Status Breakdown</span>
              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">In Progress:</span>
                  <span className="font-bold text-foreground">{stats.inProgress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Awaiting Review:</span>
                  <span className="font-bold text-purple-500">{stats.inReview}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blocked:</span>
                  <span className="font-bold text-rose-500">{stats.blocked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="font-bold text-emerald-500">{stats.completed}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB VIEW: My Updates (Timestamped History Log) */}
      {mainTab === "my_updates" && (
        <div className="rounded-2xl border bg-card p-6 space-y-5 shadow-card">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <FileCheck2 className="size-4 text-primary" /> My Submitted Progress Reports
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Timestamped submission history. Previous reports are permanently archived for auditing.
              </p>
            </div>
            <span className="text-xs font-bold text-primary px-2.5 py-1 rounded-lg bg-primary/10">
              {allSubmittedUpdates.length} Reports Logged
            </span>
          </div>

          {allSubmittedUpdates.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">No progress reports submitted yet</p>
              <p className="mt-1">
                Open any assigned task and click "Update Progress" to submit your daily progress report to the Team Leader.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allSubmittedUpdates.map(({ update, task }) => (
                <div
                  key={update.id}
                  className="rounded-xl border bg-muted/20 p-4 space-y-2.5 text-xs hover:border-primary/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">{task.identifier}</span>
                      <span className="font-bold text-foreground">{task.title}</span>
                      <TaskStatusBadge status={update.status} />
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                      <span className="font-mono font-bold text-foreground">{update.progressPercent}% progress</span>
                      <span>•</span>
                      <span>{fmtRelative(update.createdAt)} ({fmtDate(update.createdAt)})</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <span className="font-semibold text-foreground">Work Completed: </span>
                      <span className="text-muted-foreground">{update.workCompleted}</span>
                    </div>

                    {update.workRemaining && (
                      <div>
                        <span className="font-semibold text-foreground">Remaining Work: </span>
                        <span className="text-muted-foreground">{update.workRemaining}</span>
                      </div>
                    )}

                    {update.blockers && (
                      <div className="text-rose-500 font-medium">
                        <span className="font-bold">Blockers Reported: </span>
                        <span>{update.blockers}</span>
                      </div>
                    )}

                    {update.nextSteps && (
                      <div>
                        <span className="font-semibold text-foreground">Next Steps: </span>
                        <span className="text-muted-foreground">{update.nextSteps}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-1 text-[11px] text-muted-foreground">
                      {update.timeSpentHours ? (
                        <span>Time Spent: <strong className="text-foreground">{update.timeSpentHours} hrs</strong></span>
                      ) : null}

                      {update.evidenceUrl && (
                        <a
                          href={update.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-semibold"
                        >
                          <ExternalLink className="size-3" /> Evidence Link
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. TAB VIEW: My Feedback (Comments, Reviews & Requested Changes) */}
      {mainTab === "my_feedback" && (
        <div className="rounded-2xl border bg-card p-6 space-y-5 shadow-card">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" /> My Feedback & Leader Reviews
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official review decisions and guidance provided by the Team Leader on your work submissions.
              </p>
            </div>
            <span className="text-xs font-bold text-purple-500 px-2.5 py-1 rounded-lg bg-purple-500/10">
              {allLeaderFeedback.length} Reviews Received
            </span>
          </div>

          {allLeaderFeedback.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">No review feedback received yet</p>
              <p className="mt-1">
                When you submit tasks for review, your team leader's approvals or requested changes will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allLeaderFeedback.map(({ review, task }) => {
                const isApproved = review.decision === "approved";
                return (
                  <div
                    key={review.id}
                    className={`rounded-xl border p-4 space-y-2.5 text-xs transition-colors ${
                      isApproved ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-border/40 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary">{task.identifier}</span>
                        <span className="font-bold text-foreground">{task.title}</span>
                        <Badge
                          variant="outline"
                          className={isApproved ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}
                        >
                          {isApproved ? "Approved" : "Changes Requested"}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Reviewed by <strong className="text-foreground">{review.reviewerName || "Team Leader"}</strong> • {fmtRelative(review.createdAt)}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-card border text-foreground leading-relaxed">
                      "{review.feedback}"
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTask(task)}
                        className="h-7 text-xs cursor-pointer gap-1"
                      >
                        <Eye className="size-3" /> View Task Workspace
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 9. TAB VIEW: My Profile */}
      {mainTab === "my_profile" && (
        <div className="rounded-2xl border bg-card p-6 space-y-6 shadow-card">
          <div className="border-b pb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <User className="size-4 text-primary" /> My Member Profile
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personal account information and role credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account Information</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Full Name</span>
                  <span className="font-bold text-foreground">{user?.fullName || profile?.fullName || "Om Thakkar"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Email Address</span>
                  <span className="font-medium text-foreground">{user?.email || profile?.email || "member@example.com"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Account Username</span>
                  <span className="font-mono text-foreground">{user?.username || profile?.username || "member"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">System Role</span>
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Team Member
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Work Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-card p-2.5 border">
                  <span className="text-muted-foreground text-[10px]">Total Assigned</span>
                  <p className="text-lg font-bold text-foreground">{stats.total}</p>
                </div>
                <div className="rounded-lg bg-card p-2.5 border">
                  <span className="text-muted-foreground text-[10px]">Tasks Completed</span>
                  <p className="text-lg font-bold text-emerald-600">{stats.completed}</p>
                </div>
                <div className="rounded-lg bg-card p-2.5 border">
                  <span className="text-muted-foreground text-[10px]">In Progress</span>
                  <p className="text-lg font-bold text-blue-600">{stats.inProgress}</p>
                </div>
                <div className="rounded-lg bg-card p-2.5 border">
                  <span className="text-muted-foreground text-[10px]">Hours Logged</span>
                  <p className="text-lg font-bold text-indigo-600">{stats.totalHoursLogged}h</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Drawer for Full Requirements & Deliverables */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Progress Update Modal */}
      {updatingTask && (
        <ProgressUpdateModal
          task={updatingTask}
          open={!!updatingTask}
          onOpenChange={(open) => {
            if (!open) setUpdatingTask(null);
          }}
          onSuccess={() => {
            reload();
          }}
        />
      )}
    </div>
  );
}
