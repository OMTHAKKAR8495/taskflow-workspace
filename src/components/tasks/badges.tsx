import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Ban,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Flame,
  Minus,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, STATUS_LABEL, getDueAlertInfo } from "@/lib/task-utils";
import type { Task, TaskPriority, TaskStatus } from "@/types";

const statusStyle: Record<TaskStatus, string> = {
  backlog: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  ready: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  pending: "bg-warning-soft text-warning border-warning/20",
  in_progress: "bg-info-soft text-info border-info/20",
  in_review: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  blocked: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  completed: "bg-success-soft text-success border-success/20",
};

const statusIcon: Record<TaskStatus, typeof Circle> = {
  backlog: Circle,
  ready: Circle,
  pending: Circle,
  in_progress: Timer,
  in_review: Eye,
  blocked: Ban,
  completed: CheckCircle2,
};

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const Icon = (status && statusIcon[status]) || Circle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        (status && statusStyle[status]) || statusStyle.pending,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {(status && STATUS_LABEL[status]) || status || "Pending"}
    </span>
  );
}

const priorityStyle: Record<TaskPriority, string> = {
  critical: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-bold",
  high: "bg-danger-soft text-destructive border-destructive/20",
  medium: "bg-primary-soft text-primary border-primary/20",
  low: "bg-muted text-muted-foreground border-border",
};
const priorityIcon: Record<TaskPriority, typeof ArrowUp> = {
  critical: Flame,
  high: ArrowUp,
  medium: Minus,
  low: ArrowDown,
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  const Icon = (priority && priorityIcon[priority]) || Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        (priority && priorityStyle[priority]) || priorityStyle.medium,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {(priority && PRIORITY_LABEL[priority]) || priority || "Medium"}
      <span className="sr-only"> priority</span>
    </span>
  );
}

export function DueDateBadge({ task, className }: { task: Task; className?: string }) {
  const alert = getDueAlertInfo(task);
  if (!task.dueDate) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
        alert.badgeClass,
        className,
      )}
      title={alert.alertDescription || alert.badgeText}
    >
      {alert.level === "overdue" ? (
        <AlertTriangle className="size-3 text-destructive animate-pulse" />
      ) : alert.level === "due_today" ? (
        <Clock className="size-3 text-amber-500" />
      ) : (
        <CalendarDays className="size-3" />
      )}
      <span>{alert.badgeText}</span>
    </span>
  );
}

// Re-export alias for compatibility
export { TaskStatusBadge as StatusBadge };
