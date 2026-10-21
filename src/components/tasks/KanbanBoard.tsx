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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityBadge, StatusBadge } from "@/components/tasks/badges";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    status: "pending",
    title: "Backlog / To Do",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  {
    status: "in_progress",
    title: "In Progress",
    dotColor: "bg-blue-500",
    badgeBg: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  {
    status: "in_review",
    title: "In Review",
    dotColor: "bg-purple-500",
    badgeBg: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  },
  {
    status: "completed",
    title: "Done",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
];

const STATUS_ORDER: TaskStatus[] = ["pending", "in_progress", "in_review", "completed"];

export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const { updateTask, toggleBookmark, toggleSubtask } = useTasks();
  const navigate = useNavigate();
  const [movingId, setMovingId] = useState<string | null>(null);

  const handleMove = async (task: Task, direction: "prev" | "next") => {
    const currentIndex = STATUS_ORDER.indexOf(task.status);
    if (currentIndex === -1) return;

    const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    const nextStatus = STATUS_ORDER[nextIndex];
    if (!nextStatus) return;

    setMovingId(task.id);
    try {
      await updateTask(task.id, { status: nextStatus });
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4 items-start">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);

        return (
          <div
            key={col.status}
            className="flex flex-col rounded-xl border bg-card/60 p-3.5 shadow-sm backdrop-blur-sm min-h-[450px]"
          >
            {/* Column Header */}
            <div className="mb-3.5 flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn("size-2.5 rounded-full ring-2 ring-background", col.dotColor)}
                />
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  {col.title}
                </h3>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs font-semibold",
                    col.badgeBg,
                  )}
                >
                  {colTasks.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => navigate({ to: "/tasks/new" })}
                title="Add task to this column"
              >
                <Plus className="size-4" />
              </Button>
            </div>

            {/* Tasks Container */}
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
              {colTasks.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
                  <span>No tasks in {col.title}</span>
                </div>
              ) : (
                colTasks.map((task) => {
                  const overdue = isOverdue(task);
                  const subtasks = task.subtasks || [];
                  const subDone = subtasks.filter((s) => s.completed).length;
                  const currentIndex = STATUS_ORDER.indexOf(task.status);
                  const canPrev = currentIndex > 0;
                  const canNext = currentIndex < STATUS_ORDER.length - 1;

                  return (
                    <div
                      key={task.id}
                      className="group relative flex flex-col gap-2.5 rounded-lg border bg-card p-3.5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      {/* Project Tag & Bookmark */}
                      <div className="flex items-center justify-between text-xs">
                        {task.projectName ? (
                          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: task.projectColor || "#6366f1" }}
                            />
                            <span className="truncate max-w-[140px] text-[11px] uppercase tracking-wider font-semibold">
                              {task.projectName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-medium uppercase">
                            General
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleBookmark(task.id);
                          }}
                          className={cn(
                            "cursor-pointer transition-colors",
                            task.isBookmarked
                              ? "text-amber-500 fill-amber-500"
                              : "text-muted-foreground/40 hover:text-muted-foreground",
                          )}
                          title="Bookmark task"
                        >
                          <Bookmark
                            className="size-3.5"
                            fill={task.isBookmarked ? "currentColor" : "none"}
                          />
                        </button>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <Link
                          to="/tasks/$id"
                          params={{ id: task.id }}
                          className="font-medium text-foreground hover:text-primary transition-colors text-sm line-clamp-2 block leading-snug"
                        >
                          {task.title}
                        </Link>
                        {task.description && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Subtasks Progress */}
                      {subtasks.length > 0 && (
                        <div className="space-y-1 py-0.5">
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

                      {/* Tags & Estimate */}
                      <div className="flex flex-wrap items-center gap-1 text-[11px]">
                        <PriorityBadge priority={task.priority} />
                        {task.estimate && (
                          <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
                            {task.estimate}
                          </span>
                        )}
                        {task.tags?.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="rounded bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary border border-primary/10"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      {/* Card Footer: Assignee, Due Date, Move Controls */}
                      <div className="mt-1 flex items-center justify-between border-t pt-2.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          {task.assignee ? (
                            <div
                              className="flex items-center gap-1.5"
                              title={`Assigned to ${task.assignee.name} (${task.assignee.role})`}
                            >
                              <Avatar className="size-5 border ring-1 ring-border">
                                <AvatarFallback className="text-[9px] font-semibold bg-primary/15 text-primary">
                                  {task.assignee.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[11px] font-medium text-foreground truncate max-w-[80px]">
                                {task.assignee.name.split(" ")[0]}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] italic text-muted-foreground">
                              Unassigned
                            </span>
                          )}

                          {task.dueDate && (
                            <span
                              className={cn(
                                "flex items-center gap-1 text-[11px] font-medium",
                                overdue
                                  ? "text-destructive font-semibold"
                                  : "text-muted-foreground",
                              )}
                            >
                              <Calendar className="size-3" />
                              {fmtDate(task.dueDate)}
                            </span>
                          )}
                        </div>

                        {/* Move Left / Right Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!canPrev || movingId === task.id}
                            onClick={() => handleMove(task, "prev")}
                            className="flex size-6 items-center justify-center rounded border bg-background/80 hover:bg-muted disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                            title="Move to previous column"
                          >
                            <ArrowLeft className="size-3" />
                          </button>
                          <button
                            type="button"
                            disabled={!canNext || movingId === task.id}
                            onClick={() => handleMove(task, "next")}
                            className="flex size-6 items-center justify-center rounded border bg-background/80 hover:bg-muted disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                            title="Move to next column"
                          >
                            <ArrowRight className="size-3" />
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
  );
}
