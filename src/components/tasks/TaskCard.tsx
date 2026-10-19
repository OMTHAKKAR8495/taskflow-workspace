import { Link } from "@tanstack/react-router";
import { CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate, fmtRelative } from "@/lib/format";
import { isOverdue } from "@/lib/task-utils";
import type { Task } from "@/types";
import { PriorityBadge, TaskStatusBadge } from "./badges";

export function TaskCard({ task }: { task: Task }) {
  const overdue = isOverdue(task);
  return (
    <Link
      to="/tasks/$id"
      params={{ id: task.id }}
      className="group flex h-full flex-col rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <TaskStatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
      </div>
      <h3 className={cn("mt-3 font-semibold leading-snug group-hover:text-primary", task.status === "completed" && "text-muted-foreground line-through")}>
        {task.title}
      </h3>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{task.description || "No description"}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-destructive")}>
          <CalendarDays className="size-3.5" aria-hidden />
          {overdue ? "Overdue · " : ""}
          {fmtDate(task.dueDate)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden />
          {fmtRelative(task.updatedAt)}
        </span>
      </div>
    </Link>
  );
}
