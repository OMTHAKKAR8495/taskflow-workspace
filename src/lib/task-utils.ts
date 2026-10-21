import type { DashboardStats, Project, Task, TaskFilterState, TaskPriority, TaskStatus, TeamMember } from "@/types";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Backlog / To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  completed: "Completed",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export function computeStats(tasks: Task[], now = new Date()): DashboardStats {
  const pending = tasks.filter((t) => t.status === "pending").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const inReview = tasks.filter((t) => t.status === "in_review").length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const overdue = tasks.filter(
    (t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < startOfDay(now),
  ).length;

  return {
    total: tasks.length,
    pending,
    inProgress,
    inReview,
    completed,
    overdue,
    completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    byPriority: {
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
      !(t.assignee?.name && t.assignee.name.toLowerCase().includes(q))
    )
      return false;
    return true;
  });

  return out.sort((a, b) => {
    if (f.sort === "priority") return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (f.sort === "createdAt") return b.createdAt.localeCompare(a.createdAt);
    // dueDate ascending, nulls last
    if (!a.dueDate) return b.dueDate ? 1 : 0;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

export function isOverdue(t: Task, now = new Date()) {
  return t.status !== "completed" && !!t.dueDate && new Date(t.dueDate) < startOfDay(now);
}

/** Open tasks due within the next `days` days (including overdue), soonest first. */
export function dueSoon(tasks: Task[], days = 7, now = new Date()) {
  const limit = new Date(startOfDay(now).getTime() + (days + 1) * 86400000);
  return tasks
    .filter((t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < limit)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
}

/** Created vs completed counts for each of the last `days` days. */
export function completionSeries(tasks: Task[], days = 7, now = new Date()) {
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(today.getTime() - (days - 1 - i) * 86400000);
    const next = day.getTime() + 86400000;
    const inDay = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= day.getTime() && t < next;
    };
    return {
      day: day.toLocaleDateString("en-US", { weekday: "short" }),
      created: tasks.filter((t) => inDay(t.createdAt)).length,
      completed: tasks.filter((t) => t.status === "completed" && inDay(t.updatedAt)).length,
    };
  });
}

/** Compute project level metrics */
export function computeProjectStats(projects: Project[], tasks: Task[]): Project[] {
  return projects.map((p) => {
    const pTasks = tasks.filter((t) => t.projectId === p.id);
    const completed = pTasks.filter((t) => t.status === "completed").length;
    return {
      ...p,
      taskCount: pTasks.length,
      completedCount: completed,
    };
  });
}

/** Compute workload per team member */
export function computeTeamWorkload(
  team: TeamMember[],
  tasks: Task[]
): { member: TeamMember; total: number; inProgress: number; completed: number }[] {
  return team.map((member) => {
    const mTasks = tasks.filter((t) => t.assignee?.id === member.id);
    return {
      member,
      total: mTasks.length,
      inProgress: mTasks.filter((t) => t.status === "in_progress" || t.status === "in_review").length,
      completed: mTasks.filter((t) => t.status === "completed").length,
    };
  });
}
