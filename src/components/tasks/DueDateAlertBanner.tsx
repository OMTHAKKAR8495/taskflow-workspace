import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Clock, CalendarDays, X, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isOverdue, isDueToday, isDueSoon } from "@/lib/task-utils";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

interface DueDateAlertBannerProps {
  tasks: Task[];
  onFilterOverdue?: () => void;
  className?: string;
}

export function DueDateAlertBanner({ tasks, onFilterOverdue, className }: DueDateAlertBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const overdueTasks = tasks.filter((t) => isOverdue(t));
  const dueTodayTasks = tasks.filter((t) => t.status !== "completed" && isDueToday(t.dueDate));
  const dueSoonTasks = tasks.filter(
    (t) => t.status !== "completed" && isDueSoon(t.dueDate, 2) && !isDueToday(t.dueDate),
  );

  const totalUrgent = overdueTasks.length + dueTodayTasks.length;

  if (dismissed || totalUrgent === 0) {
    return null;
  }

  const isCritical = overdueTasks.length > 0;

  return (
    <div
      role="alert"
      className={cn(
        "relative rounded-xl border p-4 shadow-sm transition-all",
        isCritical
          ? "border-destructive/30 bg-destructive/10 text-destructive-foreground dark:bg-destructive/15"
          : "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg shadow-2xs",
              isCritical
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-amber-500 text-white",
            )}
          >
            {isCritical ? <AlertTriangle className="size-5" /> : <Clock className="size-5" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={cn(
                  "text-sm font-bold",
                  isCritical ? "text-destructive" : "text-amber-800 dark:text-amber-300",
                )}
              >
                {isCritical
                  ? `Due Date Alert: ${overdueTasks.length} ${overdueTasks.length === 1 ? "task is overdue" : "tasks are overdue"}`
                  : `Due Date Notice: ${dueTodayTasks.length} ${dueTodayTasks.length === 1 ? "task is due today" : "tasks are due today"}`}
              </h3>
              {dueTodayTasks.length > 0 && isCritical && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  +{dueTodayTasks.length} due today
                </span>
              )}
              {dueSoonTasks.length > 0 && (
                <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                  {dueSoonTasks.length} due soon
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {isCritical
                ? "Immediate action required: One or more tasks have passed their scheduled completion deadline."
                : "Heads up: Scheduled task deadlines are coming due before end of day."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {onFilterOverdue && overdueTasks.length > 0 && (
            <Button
              size="sm"
              variant={isCritical ? "destructive" : "default"}
              onClick={onFilterOverdue}
              className="h-8 text-xs font-semibold shadow-2xs cursor-pointer"
            >
              Filter Overdue ({overdueTasks.length})
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpanded(!expanded)}
            className="h-8 text-xs cursor-pointer"
          >
            {expanded ? "Hide Details" : "Review Tasks"}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Expandable list of urgent tasks */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Critical Deadlines:
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[...overdueTasks, ...dueTodayTasks].map((task) => (
              <Link
                key={task.id}
                to="/tasks/$id"
                params={{ id: task.id }}
                className="flex items-center justify-between rounded-lg border bg-card/80 p-2.5 text-xs transition-colors hover:border-primary/50 hover:bg-card"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-foreground truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    <span
                      className={cn(
                        "font-semibold",
                        isOverdue(task) ? "text-destructive" : "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {isOverdue(task) ? `Overdue (${fmtDate(task.dueDate)})` : "Due Today"}
                    </span>
                    {task.projectName && <span className="truncate">· {task.projectName}</span>}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
