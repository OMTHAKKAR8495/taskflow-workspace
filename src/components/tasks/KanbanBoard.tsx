import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Plus,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Calendar,
  CheckSquare,
  Sparkles,
  Tag,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityBadge, StatusBadge } from "@/components/tasks/badges";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { fmtDate } from "@/lib/format";
import { isOverdue } from "@/lib/task-utils";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";
import { useTasks } from "@/context/TaskContext";

const COLUMNS: {
  status: TaskStatus;
  title: string;
  dotColor: string;
  badgeBg: string;
}[] = [
  {
    status: "backlog",
    title: "Backlog",
    dotColor: "bg-slate-400",
    badgeBg: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  {
    status: "ready",
    title: "Ready",
    dotColor: "bg-sky-500",
    badgeBg: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  },
  {
    status: "in_progress",
    title: "In Progress",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  {
    status: "in_review",
    title: "In Review",
    dotColor: "bg-purple-500",
    badgeBg: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  },
  {
    status: "blocked",
    title: "Blocked",
    dotColor: "bg-rose-500",
    badgeBg: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  {
    status: "completed",
    title: "Done",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
];

const STATUS_ORDER: TaskStatus[] = [
  "backlog",
  "ready",
  "in_progress",
  "in_review",
  "blocked",
  "completed",
];

export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const { updateTaskStatus, toggleBookmark } = useTasks();
  const navigate = useNavigate();
  const [movingId, setMovingId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Helper to map legacy status like 'pending' to 'backlog'
  const normalizeStatus = (status: TaskStatus): TaskStatus => {
    if (status === "pending") return "backlog";
    return status;
  };

  const handleMove = async (task: Task, direction: "prev" | "next") => {
    const curStatus = normalizeStatus(task.status);
    const currentIndex = STATUS_ORDER.indexOf(curStatus);
    if (currentIndex === -1) return;

    const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    const nextStatus = STATUS_ORDER[nextIndex];
    if (!nextStatus) return;

    setMovingId(task.id);
    try {
      await updateTaskStatus(task.id, nextStatus);
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Mobile Column Quick Switcher */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:hidden -mx-2 px-2">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => normalizeStatus(t.status) === col.status);
          return (
            <button
              key={col.status}
              type="button"
              onClick={() => {
                const el = document.getElementById(`kanban-col-${col.status}`);
                el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/60 text-muted-foreground hover:text-foreground shrink-0 border"
            >
              <span className={cn("size-2 rounded-full", col.dotColor)} />
              <span>{col.title}</span>
              <span className="font-mono text-[10px] text-muted-foreground">({colTasks.length})</span>
            </button>
          );
        })}
      </div>

      {/* 6-Column Responsive Kanban View with Horizontal Scroll & Touch Snap */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 min-h-[500px] snap-x snap-mandatory scrollbar-thin scrollbar-thumb-muted-foreground/20 -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => normalizeStatus(t.status) === col.status);

          return (
            <div
              key={col.status}
              id={`kanban-col-${col.status}`}
              className="flex w-[82vw] max-w-xs sm:w-72 shrink-0 snap-center flex-col rounded-xl border bg-card/60 p-3 shadow-xs backdrop-blur-sm"
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("size-2.5 rounded-full ring-2 ring-background", col.dotColor)}
                  />
                  <h3 className="text-xs font-bold tracking-tight text-foreground uppercase">
                    {col.title}
                  </h3>
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-0.2 text-[10px] font-bold",
                      col.badgeBg,
                    )}
                  >
                    {colTasks.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => navigate({ to: "/tasks/new" })}
                  title="Add task"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>

              {/* Tasks List */}
              <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center text-xs text-muted-foreground">
                    <span>No {col.title} tasks</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const overdue = isOverdue(task.dueDate);
                    const subtasks = task.subtasks || [];
                    const subDone = subtasks.filter((s) => s.completed).length;
                    const curStatus = normalizeStatus(task.status);
                    const currentIndex = STATUS_ORDER.indexOf(curStatus);
                    const canPrev = currentIndex > 0;
                    const canNext = currentIndex < STATUS_ORDER.length - 1;

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="group relative flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-2xs transition-all hover:border-indigo-500/50 hover:shadow-md cursor-pointer"
                      >
                        {/* Identifier & Bookmark */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                            {task.identifier ? (
                              <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                {task.identifier}
                              </span>
                            ) : null}
                            {task.projectName ? (
                              <span className="font-semibold text-foreground truncate max-w-[110px]">
                                {task.projectName}
                              </span>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void toggleBookmark(task.id);
                            }}
                            className={cn(
                              "cursor-pointer transition-colors p-0.5",
                              task.isBookmarked
                                ? "text-amber-500 fill-amber-500"
                                : "text-muted-foreground/30 hover:text-muted-foreground",
                            )}
                            title="Bookmark task"
                          >
                            <Bookmark
                              className="size-3"
                              fill={task.isBookmarked ? "currentColor" : "none"}
                            />
                          </button>
                        </div>

                        {/* Title & Blocked Banner */}
                        <div>
                          <h4 className="font-semibold text-foreground text-xs leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {task.title}
                          </h4>
                          {task.status === "blocked" && task.blockedReason && (
                            <div className="mt-1 flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-600 dark:text-rose-400 font-medium border border-rose-500/20">
                              <ShieldAlert className="size-3 shrink-0" />
                              <span className="truncate">{task.blockedReason}</span>
                            </div>
                          )}
                        </div>

                        {/* Subtasks Progress */}
                        {subtasks.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CheckSquare className="size-2.5 text-indigo-500" />
                                Subtasks
                              </span>
                              <span className="font-bold">
                                {subDone}/{subtasks.length}
                              </span>
                            </div>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full bg-indigo-500 transition-all rounded-full"
                                style={{
                                  width: `${Math.round((subDone / subtasks.length) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Badges strip */}
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          <PriorityBadge priority={task.priority} />
                          {task.estimatedHours ? (
                            <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
                              {task.estimatedHours}h
                            </span>
                          ) : null}
                          {task.tags?.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="rounded bg-muted/60 px-1 py-0.2 text-[9px] text-muted-foreground font-mono"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>

                        {/* Card Footer: Assignee, Due Date, Move Buttons */}
                        <div className="mt-1 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            {task.assignee ? (
                              <div
                                className="flex items-center gap-1"
                                title={`Assigned to ${task.assignee.name}`}
                              >
                                <Avatar className="size-4.5 border">
                                  <AvatarFallback className="text-[8px] font-bold bg-indigo-500/15 text-indigo-600">
                                    {task.assignee.initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[10px] font-medium text-foreground truncate max-w-[65px]">
                                  {task.assignee.name.split(" ")[0]}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] italic text-muted-foreground">
                                Unassigned
                              </span>
                            )}

                            {task.dueDate && (
                              <span
                                className={cn(
                                  "flex items-center gap-1 text-[10px] font-medium",
                                  overdue ? "text-rose-600 font-bold" : "text-muted-foreground",
                                )}
                              >
                                <Calendar className="size-2.5" />
                                {fmtDate(task.dueDate)}
                              </span>
                            )}
                          </div>

                          {/* Quick Stage Transitions */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={!canPrev || movingId === task.id}
                              onClick={() => handleMove(task, "prev")}
                              className="flex size-5 items-center justify-center rounded border bg-background hover:bg-muted disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                              title="Move back"
                            >
                              <ArrowLeft className="size-2.5" />
                            </button>
                            <button
                              type="button"
                              disabled={!canNext || movingId === task.id}
                              onClick={() => handleMove(task, "next")}
                              className="flex size-5 items-center justify-center rounded border bg-background hover:bg-muted disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                              title="Move forward"
                            >
                              <ArrowRight className="size-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
