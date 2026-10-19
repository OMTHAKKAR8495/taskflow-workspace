import { Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, CalendarDays, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate, fmtRelative } from "@/lib/format";
import { isOverdue } from "@/lib/task-utils";
import { useTasks } from "@/context/TaskContext";
import { toast } from "sonner";
import type { Task } from "@/types";
import { PriorityBadge, TaskStatusBadge } from "./badges";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

export function TaskCard({ task }: { task: Task }) {
  const navigate = useNavigate();
  const { toggleBookmark, deleteTask } = useTasks();
  const overdue = isOverdue(task);

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
      className="group flex h-full flex-col rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <TaskStatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
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
          <Bookmark className={cn("size-4", task.isBookmarked && "fill-amber-500")} />
        </button>
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
