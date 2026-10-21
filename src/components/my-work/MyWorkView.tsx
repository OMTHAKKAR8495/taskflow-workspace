import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck2,
  ListTodo,
  Calendar,
  ArrowRight,
  Filter,
  Check,
  Eye,
  Sparkles,
} from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isOverdue } from "@/lib/task-utils";
import { StatusBadge, PriorityBadge } from "@/components/tasks/badges";
import type { Task, TaskPriority, TaskStatus } from "@/types";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";

export function MyWorkView() {
  const { tasks, projects, toggleTaskComplete, updateTaskStatus } = useTasks();
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<string>("assigned");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");

  const currentUserId = user?.id || "user-om";

  const nonTrash = useMemo(() => tasks.filter((t) => !t.isTrash), [tasks]);

  // Tasks assigned to me
  const assignedToMe = useMemo(() => {
    return nonTrash.filter(
      (t) =>
        (t.assignee?.id === currentUserId || t.assigneeId === currentUserId) &&
        t.status !== "completed",
    );
  }, [nonTrash, currentUserId]);

  // Tasks waiting for my review
  const reviewing = useMemo(() => {
    return nonTrash.filter(
      (t) =>
        (t.reviewer?.id === currentUserId || t.reviewerId === currentUserId) &&
        t.status === "in_review",
    );
  }, [nonTrash, currentUserId]);

  // Tasks created by me
  const createdByMe = useMemo(() => {
    return nonTrash.filter((t) => t.userId === currentUserId && t.status !== "completed");
  }, [nonTrash, currentUserId]);

  // Overdue
  const overdueTasks = useMemo(() => {
    return nonTrash.filter(
      (t) =>
        t.status !== "completed" &&
        (t.assignee?.id === currentUserId || t.userId === currentUserId) &&
        isOverdue(t.dueDate),
    );
  }, [nonTrash, currentUserId]);

  // Completed recently
  const completedRecently = useMemo(() => {
    return nonTrash
      .filter(
        (t) =>
          t.status === "completed" &&
          (t.assignee?.id === currentUserId || t.userId === currentUserId),
      )
      .slice(0, 15);
  }, [nonTrash, currentUserId]);

  const filterByPriority = (items: Task[]) => {
    if (priorityFilter === "all") return items;
    return items.filter((t) => t.priority === priorityFilter);
  };

  const handleApprove = async (task: Task) => {
    await updateTaskStatus(task.id, "completed");
  };

  const handleRequestChanges = async (task: Task) => {
    await updateTaskStatus(task.id, "in_progress", "Changes requested during code review");
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">My Work</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              Personal Cockpit
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Centralized view of tasks assigned to you, pending your review, and your active deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium shadow-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Assigned to Me</span>
            <ListTodo className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{assignedToMe.length}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">Active deliverables</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Pending Review</span>
            <FileCheck2 className="size-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{reviewing.length}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">Requires your approval</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Overdue Items</span>
            <AlertTriangle className="size-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {overdueTasks.length}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Past scheduled deadline</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Completed</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {completedRecently.length}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Recently finished</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="assigned" className="gap-2 text-xs">
            <ListTodo className="size-3.5" />
            Assigned to Me ({assignedToMe.length})
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-2 text-xs">
            <FileCheck2 className="size-3.5" />
            Needs Review ({reviewing.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2 text-xs">
            <AlertTriangle className="size-3.5" />
            Overdue ({overdueTasks.length})
          </TabsTrigger>
          <TabsTrigger value="created" className="gap-2 text-xs">
            Created by Me ({createdByMe.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2 text-xs">
            Completed ({completedRecently.length})
          </TabsTrigger>
        </TabsList>

        {/* Assigned Tab */}
        <TabsContent value="assigned" className="space-y-3">
          {filterByPriority(assignedToMe).length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <CheckCircle2 className="mx-auto size-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">You are all caught up!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                No active tasks are currently assigned to you. Pick up work from the project backlog.
              </p>
              <Link to="/tasks" className="mt-4 inline-flex items-center text-xs text-primary font-medium hover:underline">
                View All Backlog Tasks <ArrowRight className="size-3 ml-1" />
              </Link>
            </div>
          ) : (
            <div className="divide-y rounded-xl border bg-card shadow-xs">
              {filterByPriority(assignedToMe).map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onSelect={() => setSelectedTask(t)}
                  onToggleComplete={() => toggleTaskComplete(t)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="space-y-3">
          {reviewing.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <FileCheck2 className="mx-auto size-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No tasks awaiting your review</h3>
              <p className="text-xs text-muted-foreground mt-1">
                When team members submit deliverables for review, they will show up here for your approval.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewing.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border bg-card p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 cursor-pointer" onClick={() => setSelectedTask(t)}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-primary">{t.identifier}</span>
                      <span className="text-sm font-semibold text-foreground hover:underline">{t.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                      <span>Submitted by: <strong>{t.assignee?.name || "Assignee"}</strong></span>
                      {t.projectName && <span>• {t.projectName}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestChanges(t)}
                      className="text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10 cursor-pointer"
                    >
                      Request Changes
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(t)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    >
                      <Check className="size-3.5 mr-1" /> Approve & Close
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Overdue Tab */}
        <TabsContent value="overdue" className="space-y-3">
          {overdueTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <CheckCircle2 className="mx-auto size-10 text-emerald-500 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No Overdue Tasks!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                All deadlines are on schedule. Outstanding execution!
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-xl border border-rose-500/20 bg-card shadow-xs">
              {overdueTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  isOverdueRow
                  onSelect={() => setSelectedTask(t)}
                  onToggleComplete={() => toggleTaskComplete(t)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Created Tab */}
        <TabsContent value="created" className="space-y-3">
          {filterByPriority(createdByMe).length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-xs text-muted-foreground">
              No tasks created by you yet.
            </div>
          ) : (
            <div className="divide-y rounded-xl border bg-card shadow-xs">
              {filterByPriority(createdByMe).map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onSelect={() => setSelectedTask(t)}
                  onToggleComplete={() => toggleTaskComplete(t)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="space-y-3">
          {completedRecently.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-xs text-muted-foreground">
              No completed tasks recorded yet.
            </div>
          ) : (
            <div className="divide-y rounded-xl border bg-card shadow-xs">
              {completedRecently.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onSelect={() => setSelectedTask(t)}
                  onToggleComplete={() => toggleTaskComplete(t)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Task Detail Drawer */}
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

function TaskRow({
  task,
  onSelect,
  onToggleComplete,
  isOverdueRow,
}: {
  task: Task;
  onSelect: () => void;
  onToggleComplete: () => void;
  isOverdueRow?: boolean;
}) {
  const isDone = task.status === "completed";

  return (
    <div className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleComplete}
          className={`size-4.5 rounded-sm border flex items-center justify-center transition-colors cursor-pointer ${
            isDone
              ? "bg-primary border-primary text-primary-foreground"
              : "border-input hover:border-primary"
          }`}
        >
          {isDone && <Check className="size-3 stroke-[3]" />}
        </button>

        <div className="min-w-0 cursor-pointer" onClick={onSelect}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-primary">{task.identifier}</span>
            <span
              className={`text-sm font-medium truncate ${
                isDone ? "line-through text-muted-foreground" : "text-foreground"
              }`}
            >
              {task.title}
            </span>
          </div>
          {task.projectName && (
            <span className="text-[11px] text-muted-foreground">{task.projectName}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />

        {task.dueDate && (
          <span
            className={`text-xs flex items-center gap-1 ${
              isOverdueRow ? "text-rose-600 font-semibold" : "text-muted-foreground"
            }`}
          >
            <Clock className="size-3" />
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onSelect}
          className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Eye className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
