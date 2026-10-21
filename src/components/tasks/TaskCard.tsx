import { Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, CalendarDays, CheckSquare, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { isOverdue } from "@/lib/task-utils";
import { useTasks } from "@/context/TaskContext";
import { toast } from "sonner";
import type { Task } from "@/types";
import { PriorityBadge, TaskStatusBadge } from "./badges";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function TaskCard({ task }: { task: Task }) {
  const navigate = useNavigate();
  const { toggleBookmark, deleteTask } = useTasks();
  const overdue = isOverdue(task);

  const subtasks = task.subtasks || [];
  const subDone = subtasks.filter((s) => s.completed).length;

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleBookmark(task.id);
      toast.success(task.isBookmarked ? "Removed from bookmarks" : "Added to bookmarks");
    } catch {
      toast.error("Failed to update bookmark");
    }
  };

  return (
    <Link
      to="/tasks/$id"
      params={{ id: task.id }}
      className="group flex h-full flex-col rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Top Header: Project & Bookmark */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border/50">
        <div className="flex items-center gap-1.5 font-medium truncate max-w-[200px]">
          <span
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: task.projectColor || "#6366f1" }}
          />
          <span className="truncate text-[11px] font-semibold uppercase tracking-wider">
            {task.projectName || "General Project"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleBookmark}
          aria-label={task.isBookmarked ? "Remove bookmark" : "Bookmark task"}
          className={cn(
            "rounded-md p-1 transition-colors hover:bg-muted",
            task.isBookmarked ? "text-amber-500 fill-amber-500" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Bookmark className={cn("size-3.5", task.isBookmarked && "fill-amber-500")} />
        </button>
      </div>

      {/* Badges Bar */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <TaskStatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
        {task.estimate && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {task.estimate}
          </span>
        )}
      </div>

      {/* Title & Description */}
      <h3
        className={cn(
          "mt-2 font-semibold text-sm leading-snug group-hover:text-primary transition-colors",
          task.status === "completed" && "text-muted-foreground line-through"
        )}
      >
        {task.title}
      </h3>
      <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground leading-relaxed">
        {task.description || "No description"}
      </p>

      {/* Subtasks Progress */}
      {subtasks.length > 0 && (
        <div className="my-2.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckSquare className="size-3 text-primary" />
              Subtasks
            </span>
            <span className="font-semibold text-foreground">
              {subDone}/{subtasks.length}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{
                width: `${Math.round((subDone / subtasks.length) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer Info: Assignee, Due Date & Actions */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <div className="flex items-center gap-1.5" title={`Assigned to ${task.assignee.name}`}>
              <Avatar className="size-5 border ring-1 ring-border">
                <AvatarFallback className="text-[9px] font-semibold bg-primary/15 text-primary">
                  {task.assignee.initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] font-medium text-foreground truncate max-w-[90px]">
                {task.assignee.name.split(" ")[0]}
              </span>
            </div>
          ) : (
            <span className="text-[11px] italic text-muted-foreground">Unassigned</span>
          )}

          {task.dueDate && (
            <span className={cn("inline-flex items-center gap-1 text-[11px]", overdue && "font-medium text-destructive")}>
              <CalendarDays className="size-3" aria-hidden />
              {fmtDate(task.dueDate)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <button
            type="button"
            onClick={() => navigate({ to: "/tasks/$id/edit", params: { id: task.id } })}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Edit task"
          >
            <Edit className="size-3.5" />
          </button>
          <DeleteConfirmationDialog
            taskTitle={task.title}
            onConfirm={async () => {
              await deleteTask(task.id);
              toast.success("Task deleted");
            }}
            trigger={
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                aria-label="Delete task"
              >
                <Trash2 className="size-3.5" />
              </button>
            }
          />
        </div>
      </div>
    </Link>
  );
}
