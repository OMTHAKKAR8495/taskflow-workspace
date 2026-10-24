import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  User,
  FolderKanban,
  AlertCircle,
  CheckCircle2,
  Send,
  Trash2,
  Bookmark,
  Share2,
  Sparkles,
  Link2,
  Plus,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { taskService } from "@/services";
import { StatusBadge, PriorityBadge } from "./badges";
import { TaskProgressTimeline } from "./TaskProgressTimeline";
import { toast } from "sonner";
import type { Task, TaskPriority, TaskStatus, TaskType } from "@/types";

interface TaskDrawerProps {
  task: Task;
  open: boolean;
  onClose: () => void;
}

export function TaskDrawer({ task, open, onClose }: TaskDrawerProps) {
  const { updateTask, updateTaskStatus, deleteTask, projects, team, addComment, toggleSubtask } =
    useTasks();
  const { user } = useAuth();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [type, setType] = useState<TaskType>(task.type || "task");
  const [projectId, setProjectId] = useState<string>(task.projectId || "");
  const [assigneeId, setAssigneeId] = useState<string>(task.assignee?.id || task.assigneeId || "");
  const [reviewerId, setReviewerId] = useState<string>(task.reviewer?.id || task.reviewerId || "");
  const [dueDate, setDueDate] = useState<string>(
    task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
  );
  const [startDate, setStartDate] = useState<string>(
    task.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : "",
  );
  const [estimatedHours, setEstimatedHours] = useState<number>(task.estimatedHours || 0);
  const [actualHours, setActualHours] = useState<number>(task.actualHours || 0);
  const [blockedReason, setBlockedReason] = useState<string>(task.blockedReason || "");
  const [commentText, setCommentText] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newCriteriaText, setNewCriteriaText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync state on task change
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setType(task.type || "task");
    setProjectId(task.projectId || "");
    setAssigneeId(task.assignee?.id || task.assigneeId || "");
    setReviewerId(task.reviewer?.id || task.reviewerId || "");
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
    setStartDate(task.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : "");
    setEstimatedHours(task.estimatedHours || 0);
    setActualHours(task.actualHours || 0);
    setBlockedReason(task.blockedReason || "");
  }, [task]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTask(task.id, {
        title,
        description,
        status,
        priority,
        type,
        projectId: projectId || undefined,
        assigneeId: assigneeId || undefined,
        reviewerId: reviewerId || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        estimatedHours,
        actualHours,
        blockedReason,
      });
      toast.success("Task updated successfully");
      onClose();
    } catch {
      toast.error("Failed to update task");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setStatus(newStatus);
    try {
      await updateTaskStatus(task.id, newStatus, blockedReason);
    } catch {
      // rollback handled by context
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await addComment(task.id, commentText.trim(), user?.fullName || "Om Thakkar");
      setCommentText("");
    } catch {
      toast.error("Failed to post comment");
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const currentSubtasks = task.subtasks || [];
    const updated = [
      ...currentSubtasks,
      { id: `sub-${Date.now()}`, title: newSubtaskTitle.trim(), completed: false },
    ];
    await updateTask(task.id, { subtasks: updated });
    setNewSubtaskTitle("");
    toast.success("Subtask added");
  };

  const handleAddCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCriteriaText.trim()) return;
    const currentCriteria = task.acceptanceCriteria || [];
    const updated = [
      ...currentCriteria,
      { id: `ac-${Date.now()}`, text: newCriteriaText.trim(), completed: false },
    ];
    await updateTask(task.id, { acceptanceCriteria: updated });
    setNewCriteriaText("");
    toast.success("Acceptance criteria added");
  };

  const handleToggleCriteria = async (criteriaId: string) => {
    const current = task.acceptanceCriteria || [];
    const updated = current.map((c) =>
      c.id === criteriaId ? { ...c, completed: !c.completed } : c,
    );
    await updateTask(task.id, { acceptanceCriteria: updated });
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to move this task to Trash?")) {
      await deleteTask(task.id);
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col bg-card border-l shadow-2xl z-50 overflow-hidden"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
              {task.identifier || "NEX-100"}
            </span>
            <Badge variant="outline" className="capitalize text-xs font-semibold">
              {type}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + `/tasks/${task.id}`);
                toast.success("Task link copied to clipboard");
              }}
              title="Copy task link"
              className="size-8 cursor-pointer"
            >
              <Share2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              title="Delete task"
              className="size-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
            >
              <Trash2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-8 cursor-pointer"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title input */}
          <div className="space-y-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl font-bold tracking-tight bg-transparent border-0 border-b border-transparent hover:border-input focus:border-primary focus:outline-hidden pb-1 transition-all"
              placeholder="Task title..."
            />
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/20 p-4 text-xs">
            {/* Status */}
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Status</label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="w-full h-8 rounded-lg border border-input bg-card px-2.5 font-medium shadow-2xs focus:ring-1 focus:ring-primary"
              >
                <option value="backlog">Backlog</option>
                <option value="ready">Ready</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full h-8 rounded-lg border border-input bg-card px-2.5 font-medium shadow-2xs focus:ring-1 focus:ring-primary"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Project */}
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-8 rounded-lg border border-input bg-card px-2.5 font-medium shadow-2xs focus:ring-1 focus:ring-primary"
              >
                <option value="">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full h-8 rounded-lg border border-input bg-card px-2.5 font-medium shadow-2xs focus:ring-1 focus:ring-primary"
              >
                <option value="">Unassigned</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Reviewer */}
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Reviewer</label>
              <select
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value)}
                className="w-full h-8 rounded-lg border border-input bg-card px-2.5 font-medium shadow-2xs focus:ring-1 focus:ring-primary"
              >
                <option value="">No Reviewer</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-8 rounded-lg border border-input bg-card px-2.5 font-medium shadow-2xs focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-8 rounded-lg border border-input bg-card px-2.5 font-medium shadow-2xs focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Effort Hours */}
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Estimated Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 0)}
                className="w-full h-8 rounded-lg border border-input bg-card px-2.5 font-medium shadow-2xs focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Blocked Alert Banner if blocked */}
          {status === "blocked" && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle className="size-4" />
                <span>Task is Blocked</span>
              </div>
              <input
                type="text"
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                placeholder="Explain why this task is blocked (e.g. waiting for API endpoint)..."
                className="w-full text-xs rounded-lg border border-rose-300 dark:border-rose-800 bg-card p-2 text-foreground focus:ring-1 focus:ring-rose-500"
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add detailed task requirements, specifications, or architectural notes..."
              className="w-full text-sm rounded-xl border border-input bg-card p-3 text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
            />
          </div>

          {/* Acceptance Criteria */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Acceptance Criteria
              </label>
              <span className="text-xs text-muted-foreground">
                {(task.acceptanceCriteria || []).filter((c) => c.completed).length} of{" "}
                {(task.acceptanceCriteria || []).length} met
              </span>
            </div>

            <div className="space-y-2">
              {(task.acceptanceCriteria || []).map((ac) => (
                <div
                  key={ac.id}
                  onClick={() => handleToggleCriteria(ac.id)}
                  className="flex items-start gap-2.5 p-2 rounded-lg border bg-card/60 hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <div
                    className={`size-4 rounded-sm border flex items-center justify-center mt-0.5 shrink-0 ${
                      ac.completed
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-input"
                    }`}
                  >
                    {ac.completed && <Check className="size-3 stroke-[3]" />}
                  </div>
                  <span
                    className={`text-xs ${
                      ac.completed ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {ac.text}
                  </span>
                </div>
              ))}

              <form onSubmit={handleAddCriteria} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newCriteriaText}
                  onChange={(e) => setNewCriteriaText(e.target.value)}
                  placeholder="Add acceptance criterion..."
                  className="flex-1 h-8 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary"
                />
                <Button type="submit" size="sm" variant="outline" className="h-8 text-xs cursor-pointer">
                  Add
                </Button>
              </form>
            </div>
          </div>

          {/* Subtasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Subtasks & Checklist
              </label>
              <span className="text-xs text-muted-foreground">
                {(task.subtasks || []).filter((s) => s.completed).length} of{" "}
                {(task.subtasks || []).length} done
              </span>
            </div>

            <div className="space-y-2">
              {(task.subtasks || []).map((st) => (
                <div
                  key={st.id}
                  onClick={() => toggleSubtask(task.id, st.id)}
                  className="flex items-center gap-2.5 p-2 rounded-lg border bg-card/60 hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <div
                    className={`size-4 rounded-sm border flex items-center justify-center shrink-0 ${
                      st.completed ? "bg-primary border-primary text-white" : "border-input"
                    }`}
                  >
                    {st.completed && <Check className="size-3 stroke-[3]" />}
                  </div>
                  <span
                    className={`text-xs ${
                      st.completed ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {st.title}
                  </span>
                </div>
              ))}

              <form onSubmit={handleAddSubtask} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add new subtask..."
                  className="flex-1 h-8 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary"
                />
                <Button type="submit" size="sm" variant="outline" className="h-8 text-xs cursor-pointer">
                  Add
                </Button>
              </form>
            </div>
          </div>

          {/* Dependencies */}
          {task.dependencies && task.dependencies.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dependencies
              </label>
              <div className="space-y-1.5">
                {task.dependencies.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Link2 className="size-3.5 text-primary" />
                      <span className="font-semibold text-foreground">
                        {dep.dependencyType === "blocked_by" ? "Blocked by: " : "Blocks: "}
                      </span>
                      <span className="font-mono text-primary">{dep.dependsOnTaskIdentifier}</span>
                      <span>{dep.dependsOnTaskTitle}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {dep.dependsOnTaskStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Progress & Reviews */}
          <div className="pt-2 border-t border-border/60">
            <TaskProgressTimeline task={task} />
          </div>

          {/* Comments & Discussion */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Comments & Activity
            </label>

            <form onSubmit={handleAddComment} className="space-y-2">
              <textarea
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment... (use @username to mention a teammate)"
                className="w-full text-xs rounded-xl border border-input bg-card p-3 text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!commentText.trim()}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <Send className="size-3" /> Post Comment
                </Button>
              </div>
            </form>

            <div className="space-y-3 pt-2">
              {(task.comments || []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 border rounded-xl border-dashed">
                  No comments yet. Start the conversation with your team.
                </p>
              ) : (
                task.comments!.map((c) => (
                  <div key={c.id} className="rounded-xl border bg-card p-3 text-xs space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{c.author}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t px-6 py-4 flex items-center justify-between bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose} className="cursor-pointer text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="cursor-pointer text-xs font-medium"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
