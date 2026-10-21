import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  ListTodo,
  CheckCircle2,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  Trash2,
  Flame,
  RotateCcw,
  AlertTriangle,
  Play,
  MoreVertical,
  Bookmark,
  Edit,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, LoadingState, ErrorState } from "@/components/common/states";
import { TaskFilters, type ViewMode } from "@/components/tasks/TaskFilters";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { CalendarView } from "@/components/tasks/CalendarView";
import { SmartQuickAdd } from "@/components/tasks/SmartQuickAdd";
import { FocusModeModal } from "@/components/tasks/FocusModeModal";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { filterAndSortTasks, isOverdue } from "@/lib/task-utils";
import { fmtDate, fmtRelative } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task, TaskFilterState } from "@/types";

const INITIAL_FILTERS: TaskFilterState = {
  search: "",
  status: "all",
  priority: "all",
  projectId: "all",
  assigneeId: "all",
  tag: "all",
  sort: "dueDate",
};

export function TasksListView() {
  const {
    tasks,
    state,
    reload,
    lists,
    activeFilter,
    setActiveFilter,
    toggleTaskComplete,
    deleteTask,
    restoreTask,
    permanentDeleteTask,
    emptyTrash,
    toggleBookmark,
  } = useTasks();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<TaskFilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("list");
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);

  // Determine current smart view or list
  const isTrashView = activeFilter === "trash";
  const isMyDayView = activeFilter === "my-day";
  const isUpcomingView = activeFilter === "upcoming";
  const isOverdueView = activeFilter === "overdue";
  const isCalendarView = activeFilter === "calendar" || view === "calendar";

  const selectedList = useMemo(() => {
    return lists.find((l) => l.id === activeFilter) || null;
  }, [lists, activeFilter]);

  // Filter tasks based on trash, smart view, and filter bar
  const tasksForView = useMemo(() => {
    if (isTrashView) {
      return tasks.filter((t) => t.isTrash);
    }
    const nonTrash = tasks.filter((t) => !t.isTrash);

    if (isMyDayView) {
      const todayStr = new Date().toISOString().slice(0, 10);
      return nonTrash.filter(
        (t) => t.dueDate && new Date(t.dueDate).toISOString().slice(0, 10) === todayStr,
      );
    }
    if (isUpcomingView) {
      const now = new Date();
      return nonTrash.filter(
        (t) => t.dueDate && new Date(t.dueDate) > now && t.status !== "completed",
      );
    }
    if (isOverdueView) {
      return nonTrash.filter((t) => t.status !== "completed" && isOverdue(t.dueDate));
    }
    if (selectedList) {
      return nonTrash.filter((t) => t.listId === selectedList.id);
    }
    return nonTrash;
  }, [tasks, isTrashView, isMyDayView, isUpcomingView, isOverdueView, selectedList]);

  const filteredTasks = useMemo(() => {
    return filterAndSortTasks(tasksForView, filters);
  }, [tasksForView, filters]);

  const completedCount = useMemo(() => {
    return tasksForView.filter((t) => t.status === "completed").length;
  }, [tasksForView]);

  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const handleOpenFocus = (task: Task) => {
    setFocusTask(task);
    setFocusOpen(true);
  };

  if (state === "loading") {
    return <LoadingState rows={5} />;
  }

  if (state === "error") {
    return <ErrorState onRetry={reload} />;
  }

  return (
    <div className="space-y-6">
      <FocusModeModal task={focusTask} open={focusOpen} onOpenChange={setFocusOpen} />

      {/* Smart View Header / Greetings */}
      {isMyDayView ? (
        <div className="rounded-2xl border bg-gradient-to-r from-amber-500/10 via-card to-card p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <Sparkles className="size-4" />
                <span>My Day</span>
                <span>•</span>
                <span>
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
                {greeting}, {user?.fullName?.split(" ")[0] || "Om"}!
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Focus on what matters today. Check items off to build your completion streak.
              </p>
            </div>

            {/* Circular Progress Indicator */}
            {tasksForView.length > 0 && (
              <div className="flex items-center gap-3 bg-card px-4 py-2.5 rounded-xl border shadow-xs shrink-0 self-start sm:self-auto">
                <div className="text-right">
                  <span className="text-xs font-bold text-foreground">
                    {completedCount} of {tasksForView.length}
                  </span>
                  <span className="block text-[10px] text-muted-foreground font-medium">
                    completed today
                  </span>
                </div>
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-extrabold">
                  {Math.round((completedCount / tasksForView.length) * 100)}%
                </div>
              </div>
            )}
          </div>
        </div>
      ) : isTrashView ? (
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <Trash2 className="size-5 text-rose-500" />
              <span>Trash Bin ({tasksForView.length})</span>
            </div>
          }
          description="Tasks moved to trash. You can restore them anytime or permanently delete them."
          actions={
            tasksForView.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure you want to permanently delete all items in trash?")) {
                    void emptyTrash();
                  }
                }}
                className="gap-2 text-xs font-semibold"
              >
                <Trash2 className="size-3.5" />
                <span>Empty Trash</span>
              </Button>
            )
          }
        />
      ) : (
        <PageHeader
          title={
            <div className="flex items-center gap-2.5">
              {selectedList && (
                <span
                  className="size-3.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: selectedList.color }}
                />
              )}
              <span>
                {selectedList
                  ? selectedList.name
                  : isUpcomingView
                    ? "Upcoming Tasks"
                    : isOverdueView
                      ? "Overdue Tasks"
                      : "All Tasks"}
              </span>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
              </span>
            </div>
          }
          description={
            selectedList
              ? `Tasks organized inside the "${selectedList.name}" list.`
              : isOverdueView
                ? "Urgent tasks past their deadlines that require your attention."
                : isUpcomingView
                  ? "Tasks scheduled for upcoming dates and deadlines."
                  : "Keep track of all your personal to-dos, habits, and projects."
          }
          actions={
            <Button
              onClick={() => navigate({ to: "/tasks/new" })}
              className="gap-2 shadow-sm shadow-primary/25 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Add Task</span>
            </Button>
          }
        />
      )}

      {/* Smart Quick-Add Bar (Shown unless in Trash) */}
      {!isTrashView && <SmartQuickAdd />}

      {/* Filter and View Toggles */}
      <TaskFilters
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(INITIAL_FILTERS)}
        view={view}
        onViewChange={setView}
      />

      {/* Main View Area */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={isTrashView ? Trash2 : ListTodo}
          title={
            isTrashView
              ? "Trash is empty"
              : filters.search !== ""
                ? "No matching tasks found"
                : "No tasks in this view"
          }
          description={
            isTrashView
              ? "Deleted tasks will appear here and can be restored anytime."
              : isMyDayView
                ? "You have no tasks scheduled for today. Use the Quick-Add bar above to add one!"
                : "Create a task above to start organizing your day."
          }
          action={
            !isTrashView ? (
              <Button onClick={() => navigate({ to: "/tasks/new" })} className="gap-2">
                <Plus className="size-4" /> Create task
              </Button>
            ) : undefined
          }
        />
      ) : isCalendarView ? (
        <CalendarView tasks={filteredTasks} />
      ) : view === "kanban" ? (
        <KanbanBoard tasks={filteredTasks} />
      ) : (
        /* Modern To-Do Interactive Checkbox List View */
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const isDone = task.status === "completed";
            const overdue = isOverdue(task.dueDate) && !isDone;

            return (
              <div
                key={task.id}
                className={`group flex items-center justify-between gap-3 rounded-2xl border p-3 sm:p-4 transition-all duration-150 ${
                  isDone
                    ? "bg-muted/30 border-border/60 opacity-80"
                    : "bg-card border-border hover:border-primary/40 hover:shadow-sm"
                }`}
              >
                {/* Checkbox and Task Details */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {!isTrashView ? (
                    <button
                      type="button"
                      onClick={() => toggleTaskComplete(task)}
                      className={`flex size-6 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                        isDone
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-xs"
                          : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10"
                      }`}
                      aria-label={isDone ? "Mark pending" : "Mark completed"}
                    >
                      {isDone && <CheckCircle2 className="size-4" />}
                    </button>
                  ) : (
                    <Trash2 className="size-5 text-muted-foreground shrink-0" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/tasks/$id"
                        params={{ id: task.id }}
                        className={`truncate text-sm font-semibold transition-colors hover:text-primary ${
                          isDone ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </Link>

                      {/* Recurrence badge */}
                      {task.recurrence && task.recurrence !== "none" && (
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                          <RotateCcw className="size-2.5" />
                          <span>{task.recurrence}</span>
                        </span>
                      )}
                    </div>

                    {/* Metadata Sub-row */}
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      {/* Priority dot */}
                      <span className="flex items-center gap-1 capitalize font-medium">
                        <span
                          className={`size-2 rounded-full ${
                            task.priority === "high"
                              ? "bg-rose-500"
                              : task.priority === "low"
                                ? "bg-slate-400"
                                : "bg-amber-500"
                          }`}
                        />
                        <span>{task.priority}</span>
                      </span>

                      {/* Due date badge */}
                      {task.dueDate && (
                        <>
                          <span>•</span>
                          <span
                            className={`flex items-center gap-1 font-medium ${
                              overdue ? "text-rose-600 dark:text-rose-400 font-bold" : ""
                            }`}
                          >
                            <Clock className="size-3" />
                            <span>
                              {overdue ? "Overdue: " : ""}
                              {fmtRelative(task.dueDate)}
                            </span>
                          </span>
                        </>
                      )}

                      {/* List or Project Pill */}
                      {task.listName && (
                        <>
                          <span>•</span>
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-[10px]"
                            style={{
                              backgroundColor: `${task.listColor || "#6366f1"}15`,
                              color: task.listColor || "#6366f1",
                            }}
                          >
                            <Tag className="size-2.5" />
                            <span>{task.listName}</span>
                          </span>
                        </>
                      )}

                      {/* Subtasks Count */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <>
                          <span>•</span>
                          <span>
                            {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}{" "}
                            subtasks
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!isTrashView ? (
                    <>
                      {/* Pomodoro Focus Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenFocus(task)}
                        className="hidden sm:inline-flex h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Start Focus Mode (Pomodoro)"
                      >
                        <Play className="size-3 text-primary" />
                        <span>Focus</span>
                      </Button>

                      {/* Bookmark Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleBookmark(task.id)}
                        className={`size-8 cursor-pointer ${
                          task.isBookmarked
                            ? "text-amber-500"
                            : "text-muted-foreground/60 hover:text-foreground"
                        }`}
                        aria-label="Bookmark task"
                      >
                        <Bookmark
                          className="size-4"
                          fill={task.isBookmarked ? "currentColor" : "none"}
                        />
                      </Button>

                      {/* Row dropdown options */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 cursor-pointer">
                            <MoreVertical className="size-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate({ to: "/tasks/$id/edit", params: { id: task.id } })
                            }
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Edit className="size-3.5" />
                            <span>Edit Task</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenFocus(task)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Play className="size-3.5 text-primary" />
                            <span>Focus Timer</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => deleteTask(task.id)}
                            className="text-rose-600 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Move to Trash</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  ) : (
                    /* Trash Row Actions */
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreTask(task.id)}
                        className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
                      >
                        <RotateCcw className="size-3.5 text-emerald-600" />
                        <span>Restore</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (
                            confirm(`Permanently delete "${task.title}"? This cannot be undone.`)
                          ) {
                            void permanentDeleteTask(task.id);
                          }
                        }}
                        className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
