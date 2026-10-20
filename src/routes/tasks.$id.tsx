import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  FileQuestion,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/common/AppLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { PriorityBadge, TaskStatusBadge } from "@/components/tasks/badges";
import { DeleteConfirmationDialog } from "@/components/tasks/DeleteConfirmationDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarDatePicker } from "@/components/ui/calendar";
import { useTasks } from "@/context/TaskContext";
import { fmtDate, fmtRelative } from "@/lib/format";
import { isOverdue } from "@/lib/task-utils";
import type { TaskPriority, TaskStatus } from "@/types";

export const Route = createFileRoute("/tasks/$id")({
  head: () => ({
    meta: [
      { title: "Task Details · TaskFlow" },
      { name: "description", content: "View and manage task details in TaskFlow." },
      { property: "og:title", content: "Task Details · TaskFlow" },
      { property: "og:description", content: "View and manage task details in TaskFlow." },
    ],
  }),
  component: TaskDetailsPage,
});

function TaskDetailsPage() {
  const { id } = Route.useParams();
  const { tasks, state, reload, updateTask, deleteTask, toggleBookmark, addComment } = useTasks();
  const navigate = useNavigate();

  if (state === "loading") {
    return (
      <AppLayout title="Task Details">
        <div className="mx-auto max-w-3xl">
          <LoadingState rows={3} />
        </div>
      </AppLayout>
    );
  }

  if (state === "error") {
    return (
      <AppLayout title="Task Details">
        <div className="mx-auto max-w-3xl">
          <ErrorState onRetry={reload} />
        </div>
      </AppLayout>
    );
  }

  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return (
      <AppLayout title="Task Not Found">
        <div className="mx-auto max-w-3xl py-12">
          <EmptyState
            icon={FileQuestion}
            title="Task not found"
            description="The requested task ID could not be found or may have been deleted."
            action={
              <Button onClick={() => navigate({ to: "/tasks" })}>
                Back to All Tasks
              </Button>
            }
          />
        </div>
      </AppLayout>
    );
  }

  const overdue = isOverdue(task);

  const relatedTasks = tasks
    .filter((t) => t.id !== task.id && (t.status === task.status || t.priority === task.priority))
    .slice(0, 3);

  return (
    <AppLayout
      title="Task Details"
      breadcrumb={[
        { label: "Workspace" },
        { label: "Tasks", href: "/tasks" },
        { label: task.title },
      ]}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Navigation & Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/tasks" })}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to Tasks
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/tasks/$id/edit", params: { id: task.id } })}
            >
              <Edit className="size-4" /> Edit Task
            </Button>

            <DeleteConfirmationDialog
              taskTitle={task.title}
              onConfirm={async () => {
                await deleteTask(task.id);
                toast.success("Task deleted successfully");
                navigate({ to: "/tasks" });
              }}
              trigger={
                <Button variant="outline" size="sm" className="text-destructive hover:bg-danger-soft">
                  <Trash2 className="size-4" /> Delete
                </Button>
              }
            />

            <Button
              variant={task.isBookmarked ? "default" : "outline"}
              size="sm"
              onClick={async () => {
                await toggleBookmark(task.id);
                toast.success(task.isBookmarked ? "Removed from bookmarks" : "Bookmarked task");
              }}
              className="gap-1.5"
            >
              ★ {task.isBookmarked ? "Bookmarked" : "Bookmark"}
            </Button>

            {task.status !== "completed" && (
              <Button
                size="sm"
                onClick={async () => {
                  await updateTask(task.id, { status: "completed" });
                  toast.success("Task marked as completed!");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <CheckCircle2 className="size-4" /> Mark as Complete
              </Button>
            )}
          </div>
        </div>

        {/* Task Details Card */}
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Status Dropdown */}
              <Select
                value={task.status}
                onValueChange={async (val) => {
                  try {
                    await updateTask(task.id, { status: val as TaskStatus });
                    toast.success(`Status updated to ${val.replace("_", " ")}`);
                  } catch {
                    toast.error("Failed to update status");
                  }
                }}
              >
                <SelectTrigger className="h-auto border-none bg-transparent p-0 hover:opacity-85 focus:ring-0 [&>svg]:hidden">
                  <TaskStatusBadge
                    status={task.status}
                    className="cursor-pointer transition-transform hover:scale-105"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* Quick Priority Dropdown */}
              <Select
                value={task.priority}
                onValueChange={async (val) => {
                  try {
                    await updateTask(task.id, { priority: val as TaskPriority });
                    toast.success(`Priority updated to ${val}`);
                  } catch {
                    toast.error("Failed to update priority");
                  }
                }}
              >
                <SelectTrigger className="h-auto border-none bg-transparent p-0 hover:opacity-85 focus:ring-0 [&>svg]:hidden">
                  <PriorityBadge
                    priority={task.priority}
                    className="cursor-pointer transition-transform hover:scale-105"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>

              {task.isBookmarked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft border border-warning/20 px-2.5 py-0.5 text-xs font-semibold text-warning">
                  ★ Bookmarked
                </span>
              )}
              {overdue && (
                <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft border border-destructive/20 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                  <AlertCircle className="size-3" /> Overdue
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">ID: {task.id}</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {task.title}
            </h1>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {task.description || "No description provided for this task."}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 gap-4 border-t pt-5 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-muted/30 p-3 flex flex-col justify-between">
              <span className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Due Date
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline font-medium cursor-pointer"
                    >
                      Change date
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
                      <span className="font-semibold text-foreground">Pick Due Date</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await updateTask(task.id, { dueDate: null });
                            toast.success("Due date cleared");
                          } catch {
                            toast.error("Failed to clear date");
                          }
                        }}
                        className="text-muted-foreground hover:text-destructive text-xs"
                      >
                        Clear
                      </button>
                    </div>
                    <CalendarDatePicker
                      mode="single"
                      selected={task.dueDate ? new Date(task.dueDate) : undefined}
                      onSelect={async (d) => {
                        let due: string | null = null;
                        if (d) {
                          const dateObj = new Date(d);
                          dateObj.setHours(12, 0, 0, 0);
                          due = dateObj.toISOString();
                        }
                        try {
                          await updateTask(task.id, { dueDate: due });
                          toast.success("Due date updated");
                        } catch {
                          toast.error("Failed to update date");
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto p-3"
                    />
                  </PopoverContent>
                </Popover>
              </span>
              <p className={`mt-1 font-semibold ${overdue ? "text-destructive" : "text-foreground"}`}>
                {fmtDate(task.dueDate, "No due date")}
              </p>
            </div>

            <div className="rounded-lg bg-muted/30 p-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> Created
              </span>
              <p className="mt-1 font-semibold text-foreground">
                {fmtDate(task.createdAt)}
              </p>
              <p className="text-[11px] text-muted-foreground">{fmtRelative(task.createdAt)}</p>
            </div>

            <div className="rounded-lg bg-muted/30 p-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> Last Updated
              </span>
              <p className="mt-1 font-semibold text-foreground">
                {fmtDate(task.updatedAt)}
              </p>
              <p className="text-[11px] text-muted-foreground">{fmtRelative(task.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Task Comments Section */}
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-semibold text-foreground">
              Comments ({task.comments?.length || 0})
            </h2>
            <span className="text-xs text-muted-foreground">Task discussion & notes</span>
          </div>

          <div className="space-y-3">
            {(!task.comments || task.comments.length === 0) ? (
              <p className="text-xs text-muted-foreground py-2">No comments yet. Leave a note or update below.</p>
            ) : (
              task.comments.map((comment) => (
                <div key={comment.id} className="rounded-lg bg-muted/30 p-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-semibold text-foreground">{comment.author}</span>
                    <span>{fmtRelative(comment.createdAt)}</span>
                  </div>
                  <p className="text-foreground">{comment.content}</p>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = form.elements.namedItem("comment") as HTMLInputElement;
              const val = input.value.trim();
              if (!val) return;
              try {
                await addComment(task.id, val);
                input.value = "";
                toast.success("Comment added!");
              } catch {
                toast.error("Failed to add comment");
              }
            }}
            className="flex gap-2 pt-2"
          >
            <input
              name="comment"
              placeholder="Add a comment or work log..."
              required
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" size="sm">
              Post Comment
            </Button>
          </form>
        </div>

        {/* Related Tasks Section */}
        {relatedTasks.length > 0 && (
          <div className="space-y-3 pt-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Related Tasks
            </h2>
            <div className="divide-y rounded-xl border bg-card p-2 shadow-card">
              {relatedTasks.map((rel) => (
                <Link
                  key={rel.id}
                  to="/tasks/$id"
                  params={{ id: rel.id }}
                  className="flex items-center justify-between p-3 transition-colors hover:bg-muted/40 rounded-lg"
                >
                  <div className="min-w-0 pr-3">
                    <p className="truncate font-medium text-sm text-foreground">{rel.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Due {fmtDate(rel.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TaskStatusBadge status={rel.status} />
                    <PriorityBadge priority={rel.priority} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
