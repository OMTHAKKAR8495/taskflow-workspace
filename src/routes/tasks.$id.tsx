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
  CheckSquare,
  Users,
  FolderKanban,
  Tag,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AppLayout } from "@/components/common/AppLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { PriorityBadge, TaskStatusBadge } from "@/components/tasks/badges";
import { DeleteConfirmationDialog } from "@/components/tasks/DeleteConfirmationDialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
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
  const {
    tasks,
    state,
    reload,
    updateTask,
    deleteTask,
    toggleBookmark,
    addComment,
    toggleSubtask,
  } = useTasks();
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
            action={<Button onClick={() => navigate({ to: "/tasks" })}>Back to All Tasks</Button>}
          />
        </div>
      </AppLayout>
    );
  }

  const overdue = isOverdue(task);
  const subtasks = task.subtasks || [];
  const subDone = subtasks.filter((s) => s.completed).length;

  const relatedTasks = tasks
    .filter((t) => t.id !== task.id && (t.status === task.status || t.projectId === task.projectId))
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
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-danger-soft"
                >
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
                <CheckCircle2 className="size-4" /> Mark as Done
              </Button>
            )}
          </div>
        </div>

        {/* Task Details Card */}
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-6">
          {/* Top Info Bar: Status, Priority, Project, ID */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
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
                  <SelectItem value="pending">Backlog / To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="completed">Done</SelectItem>
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
            <span className="text-xs text-muted-foreground font-mono">ID: {task.id}</span>
          </div>

          {/* Project & Assignee Callout Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/60">
            {/* Project */}
            <div className="flex items-center gap-3">
              <div
                className="size-8 rounded-lg flex items-center justify-center text-white shrink-0 font-bold text-xs"
                style={{ backgroundColor: task.projectColor || "#6366f1" }}
              >
                <FolderKanban className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Project
                </span>
                <p className="text-sm font-semibold text-foreground truncate">
                  {task.projectName || "General Workspace Project"}
                </p>
              </div>
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-3">
              <Avatar className="size-8 border shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  {task.assignee?.initials || "UN"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Assignee
                </span>
                <p className="text-sm font-semibold text-foreground truncate">
                  {task.assignee?.name || "Unassigned"}
                </p>
                {task.assignee?.role && (
                  <span className="text-[11px] text-muted-foreground block truncate">
                    {task.assignee.role}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {task.title}
            </h1>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {task.description || "No description provided for this task."}
            </p>
          </div>

          {/* Tags & Estimates Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
            {task.estimate && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                <Gauge className="size-3 text-muted-foreground" />
                Estimate: {task.estimate}
              </span>
            )}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {task.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-medium"
                  >
                    <Tag className="size-2.5" />
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Subtasks Checklist */}
          {subtasks.length > 0 && (
            <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Subtasks Checklist</h3>
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {subDone} of {subtasks.length} done (
                  {Math.round((subDone / subtasks.length) * 100)}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${Math.round((subDone / subtasks.length) * 100)}%` }}
                />
              </div>

              {/* Checklist items with instant toggle */}
              <div className="space-y-1.5 pt-1">
                {subtasks.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg border bg-card p-2.5 text-xs transition-colors hover:bg-muted/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={s.completed}
                      onChange={async () => {
                        try {
                          await toggleSubtask(task.id, s.id);
                          toast.success(s.completed ? "Marked incomplete" : "Subtask completed!");
                        } catch {
                          toast.error("Failed to update subtask");
                        }
                      }}
                      className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                    <span
                      className={
                        s.completed
                          ? "line-through text-muted-foreground"
                          : "font-medium text-foreground"
                      }
                    >
                      {s.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
              <p
                className={`mt-1 font-semibold ${overdue ? "text-destructive" : "text-foreground"}`}
              >
                {fmtDate(task.dueDate, "No due date")}
              </p>
            </div>

            <div className="rounded-lg bg-muted/30 p-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> Created
              </span>
              <p className="mt-1 font-semibold text-foreground">{fmtDate(task.createdAt)}</p>
              <p className="text-[11px] text-muted-foreground">{fmtRelative(task.createdAt)}</p>
            </div>

            <div className="rounded-lg bg-muted/30 p-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> Last Updated
              </span>
              <p className="mt-1 font-semibold text-foreground">{fmtDate(task.updatedAt)}</p>
              <p className="text-[11px] text-muted-foreground">{fmtRelative(task.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Task Comments Section */}
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-semibold text-foreground">
              Work Log & Discussion ({task.comments?.length || 0})
            </h2>
            <span className="text-xs text-muted-foreground">Team collaboration</span>
          </div>

          <div className="space-y-3">
            {!task.comments || task.comments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No updates logged yet. Add notes or feedback below.
              </p>
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
              placeholder="Add an update, QA note, or discussion..."
              required
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" size="sm">
              Post Update
            </Button>
          </form>
        </div>

        {/* Related Tasks Section */}
        {relatedTasks.length > 0 && (
          <div className="space-y-3 pt-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Related Project Tasks
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
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due {fmtDate(rel.dueDate)}
                    </p>
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
