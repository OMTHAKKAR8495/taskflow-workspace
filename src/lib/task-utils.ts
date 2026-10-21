import type {
  DashboardStats,
  Project,
  Task,
  TaskFilterState,
  TaskPriority,
  TaskStatus,
  TeamMember,
} from "@/types";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Backlog",
  ready: "Ready",
  in_progress: "In Progress",
  in_review: "In Review",
  blocked: "Blocked",
  completed: "Completed",
  pending: "Backlog / Ready",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const PRIORITY_RANK: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function computeStats(tasks: Task[], now = new Date()): DashboardStats {
  const backlog = tasks.filter((t) => t.status === "backlog").length;
  const ready = tasks.filter((t) => t.status === "ready" || t.status === "pending").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const inReview = tasks.filter((t) => t.status === "in_review").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const completed = tasks.filter((t) => t.status === "completed").length;

  const overdue = tasks.filter(
    (t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < startOfDay(now),
  ).length;

  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const dueThisWeek = tasks.filter((t) => {
    if (t.status === "completed" || !t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d >= startOfDay(now) && d <= weekFromNow;
  }).length;

  return {
    total: tasks.length,
    backlog,
    ready,
    pending: ready,
    inProgress,
    inReview,
    blocked,
    completed,
    overdue,
    dueThisWeek,
    completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    byPriority: {
      critical: tasks.filter((t) => t.priority === "critical").length,
      high: tasks.filter((t) => t.priority === "high").length,
      medium: tasks.filter((t) => t.priority === "medium").length,
      low: tasks.filter((t) => t.priority === "low").length,
    },
  };
}

export function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function filterAndSortTasks(tasks: Task[], f: TaskFilterState): Task[] {
  const q = f.search.trim().toLowerCase();
  const out = tasks.filter((t) => {
    if (f.bookmarkedOnly && !t.isBookmarked) return false;
    if (f.status !== "all" && t.status !== f.status) return false;
    if (f.priority !== "all" && t.priority !== f.priority) return false;
    if (f.projectId && f.projectId !== "all" && t.projectId !== f.projectId) return false;
    if (f.assigneeId && f.assigneeId !== "all") {
      if (f.assigneeId === "unassigned") {
        if (t.assignee?.id) return false;
      } else if (t.assignee?.id !== f.assigneeId) {
        return false;
      }
    }
    if (f.tag && f.tag !== "all" && (!t.tags || !t.tags.includes(f.tag))) return false;
    if (
      q &&
      !t.title.toLowerCase().includes(q) &&
      !t.description.toLowerCase().includes(q) &&
      !(t.projectName && t.projectName.toLowerCase().includes(q)) &&
      !(t.assignee?.name && t.assignee.name.toLowerCase().includes(q)) &&
      !(t.identifier && t.identifier.toLowerCase().includes(q))
    )
      return false;
    return true;
  });

  return out.sort((a, b) => {
    if (f.sort === "priority") {
      const aRank = PRIORITY_RANK[a.priority] ?? 2;
      const bRank = PRIORITY_RANK[b.priority] ?? 2;
      return aRank - bRank;
    }
    if (f.sort === "createdAt") return b.createdAt.localeCompare(a.createdAt);
    if (f.sort === "title") return a.title.localeCompare(b.title);
    // dueDate ascending, nulls last
    if (!a.dueDate) return b.dueDate ? 1 : 0;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

export function isOverdue(target: Task | string | null | undefined, now = new Date()): boolean {
  if (!target) return false;
  if (typeof target === "object" && "status" in target) {
    if (target.status === "completed" || !target.dueDate) return false;
    return new Date(target.dueDate) < startOfDay(now);
  }
  return new Date(target).getTime() < startOfDay(now).getTime();
}

export function isDueToday(dueDate: string | null | undefined, now = new Date()): boolean {
  if (!dueDate) return false;
  const today = startOfDay(now);
  const due = startOfDay(new Date(dueDate));
  return today.getTime() === due.getTime();
}

export function isDueSoon(dueDate: string | null | undefined, days = 2, now = new Date()): boolean {
  if (!dueDate) return false;
  const today = startOfDay(now);
  const due = startOfDay(new Date(dueDate));
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  return diffDays > 0 && diffDays <= days;
}

export type DueAlertLevel =
  | "overdue"
  | "due_today"
  | "due_tomorrow"
  | "due_soon"
  | "upcoming"
  | "none";

export interface DueAlertInfo {
  level: DueAlertLevel;
  daysDiff: number | null;
  badgeText: string;
  badgeClass: string;
  alertTitle: string;
  alertDescription: string;
  isUrgent: boolean;
}

export function getDueAlertInfo(task: Task, now = new Date()): DueAlertInfo {
  if (!task.dueDate || task.status === "completed") {
    return {
      level: "none",
      daysDiff: null,
      badgeText: task.dueDate
        ? new Date(task.dueDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "No due date",
      badgeClass: "text-muted-foreground bg-muted/40",
      alertTitle: "",
      alertDescription: "",
      isUrgent: false,
    };
  }

  const today = startOfDay(now);
  const due = startOfDay(new Date(task.dueDate));
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  const formattedDate = new Date(task.dueDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    const dayStr = daysAgo === 1 ? "1 day ago" : `${daysAgo} days ago`;
    return {
      level: "overdue",
      daysDiff: diffDays,
      badgeText: `Overdue (${dayStr})`,
      badgeClass:
        "bg-destructive/15 text-destructive border-destructive/30 font-semibold ring-1 ring-destructive/20",
      alertTitle: `Overdue Deadline (${dayStr})`,
      alertDescription: `This task missed its scheduled deadline on ${formattedDate}. Immediate resolution or rescheduling is required.`,
      isUrgent: true,
    };
  }

  if (diffDays === 0) {
    return {
      level: "due_today",
      daysDiff: 0,
      badgeText: "Due Today",
      badgeClass:
        "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold ring-1 ring-amber-500/20",
      alertTitle: "Due Today",
      alertDescription: `This task is scheduled for completion today (${formattedDate}). Prioritize wrapping up deliverables before end of day.`,
      isUrgent: true,
    };
  }

  if (diffDays === 1) {
    return {
      level: "due_tomorrow",
      daysDiff: 1,
      badgeText: "Due Tomorrow",
      badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium",
      alertTitle: "Due Tomorrow",
      alertDescription: `This task deadline is tomorrow (${formattedDate}).`,
      isUrgent: false,
    };
  }

  if (diffDays <= 3) {
    return {
      level: "due_soon",
      daysDiff: diffDays,
      badgeText: `Due in ${diffDays} days`,
      badgeClass:
        "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 font-medium",
      alertTitle: `Approaching Deadline (${diffDays} days)`,
      alertDescription: `This task deadline is approaching on ${formattedDate}.`,
      isUrgent: false,
    };
  }

  return {
    level: "upcoming",
    daysDiff: diffDays,
    badgeText: formattedDate,
    badgeClass: "text-muted-foreground bg-muted/30 border-border/50",
    alertTitle: "Upcoming Task",
    alertDescription: `Scheduled deadline: ${formattedDate}.`,
    isUrgent: false,
  };
}
