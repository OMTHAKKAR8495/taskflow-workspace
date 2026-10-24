import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ListTodo,
  User,
  Calendar,
  Clock,
  Link as LinkIcon,
  CheckSquare,
  AlertCircle,
  Plus,
  Trash2,
  Paperclip,
} from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { TaskPriority, TaskStatus, TeamMember, Project } from "@/types";

interface AssignTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetProjectId?: string;
  presetAssigneeId?: string;
  onTaskCreated?: (taskId: string) => void;
}

export function AssignTaskModal({
  open,
  onOpenChange,
  presetProjectId,
  presetAssigneeId,
  onTaskCreated,
}: AssignTaskModalProps) {
  const { projects, team, createTask } = useTasks();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(presetProjectId || "");
  const [assigneeId, setAssigneeId] = useState(presetAssigneeId || "");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("backlog");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState<number>(4);
  const [refLink, setRefLink] = useState("");
  const [refLinks, setRefLinks] = useState<{ id: string; name: string; url: string }[]>([]);
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync preset changes
  useEffect(() => {
    if (presetProjectId) setProjectId(presetProjectId);
  }, [presetProjectId]);

  useEffect(() => {
    if (presetAssigneeId) setAssigneeId(presetAssigneeId);
  }, [presetAssigneeId]);

  // Selected project info
  const selectedProject = projects.find((p) => p.id === projectId);

  // Filter available assignees strictly to members of the selected project
  const eligibleAssignees = selectedProject?.members && selectedProject.members.length > 0
    ? selectedProject.members.map((m) => {
        const full = team.find((t) => t.id === m.id);
        return {
          id: m.id,
          name: m.name || full?.name || "Team Member",
          email: m.email || full?.email || "",
          role: m.role || full?.role || "Member",
        };
      })
    : team;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      { id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, title: newSubtaskTitle.trim(), completed: false },
    ]);
    setNewSubtaskTitle("");
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddRefLink = () => {
    if (!refLink.trim()) return;
    let url = refLink.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    const name = url.replace(/^https?:\/\//, "").slice(0, 30);
    setRefLinks((prev) => [
      ...prev,
      { id: `link-${Date.now()}`, name, url },
    ]);
    setRefLink("");
  };

  const handleRemoveRefLink = (id: string) => {
    setRefLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    if (!projectId) {
      toast.error("Please select a target project");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createTask({
        title: title.trim(),
        description: description.trim(),
        projectId,
        assigneeId: assigneeId || undefined,
        reviewerId: user?.id || "user-om",
        priority,
        status,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        estimatedHours: Number(estimatedHours) || 0,
        subtasks,
        attachments: refLinks,
      });

      toast.success(`Task "${created.title}" assigned successfully!`);
      onOpenChange(false);
      resetForm();
      if (onTaskCreated) onTaskCreated(created.id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssigneeId(presetAssigneeId || "");
    setPriority("medium");
    setStatus("backlog");
    setStartDate("");
    setDueDate("");
    setEstimatedHours(4);
    setRefLinks([]);
    setSubtasks([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 bg-card rounded-2xl shadow-2xl border">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 mb-2">
            <ListTodo className="size-5" />
          </div>
          <DialogTitle className="text-xl font-bold">Assign Personal Task</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Assign work to a project member with clear deliverables, deadlines, and reference links.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground">Task Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement OAuth 2.0 PKCE Authorization Flow"
              className="w-full text-sm bg-background px-3 py-2 rounded-lg border outline-none focus:border-indigo-500"
            />
          </div>

          {/* Project & Assignee Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Project *</label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setAssigneeId(""); // Reset assignee when project changes to enforce membership
                }}
                className="w-full text-xs bg-background px-3 py-2 rounded-lg border outline-none"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Assign Member</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full text-xs bg-background px-3 py-2 rounded-lg border outline-none"
              >
                <option value="">Unassigned</option>
                {eligibleAssignees.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.role}
                  </option>
                ))}
              </select>
              {selectedProject && selectedProject.members && selectedProject.members.length > 0 && (
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Limited to {selectedProject.members.length} members of this project
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground">Detailed Instructions & Scope</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description, acceptance criteria, or expected output..."
              className="w-full text-xs bg-background px-3 py-2 rounded-lg border outline-none"
            />
          </div>

          {/* Priority & Status & Hours */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full text-xs bg-background px-3 py-2 rounded-lg border outline-none capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Urgent / Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full text-xs bg-background px-3 py-2 rounded-lg border outline-none capitalize"
              >
                <option value="backlog">To Do (Backlog)</option>
                <option value="ready">Ready</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Estimated Hours</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 0)}
                className="w-full text-xs bg-background px-3 py-2 rounded-lg border outline-none"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs bg-background px-3 py-2 rounded-lg border outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Deadline *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs bg-background px-3 py-2 rounded-lg border outline-none"
              />
            </div>
          </div>

          {/* Checklist / Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CheckSquare className="size-3.5 text-indigo-400" /> Checklist & Milestones
              </label>
              <span className="text-[11px] text-muted-foreground">{subtasks.length} items</span>
            </div>

            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Add checklist item (e.g. Unit tests passing)..."
                className="flex-1 text-xs bg-background px-3 py-1.5 rounded-lg border outline-none"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddSubtask} className="text-xs">
                Add
              </Button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {subtasks.map((st) => (
                  <div key={st.id} className="flex items-center justify-between bg-muted/40 px-2.5 py-1.5 rounded-md text-xs">
                    <span className="truncate">{st.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments & Reference Links */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground flex items-center gap-1.5">
              <Paperclip className="size-3.5 text-indigo-400" /> Reference Links & Attachments
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={refLink}
                onChange={(e) => setRefLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddRefLink();
                  }
                }}
                placeholder="Paste design Figma, PR, or docs URL..."
                className="flex-1 text-xs bg-background px-3 py-1.5 rounded-lg border outline-none font-mono"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddRefLink} className="text-xs">
                Link
              </Button>
            </div>

            {refLinks.length > 0 && (
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {refLinks.map((l) => (
                  <div key={l.id} className="flex items-center justify-between bg-muted/40 px-2.5 py-1 rounded-md text-xs">
                    <a href={l.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline truncate">
                      {l.name}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveRefLink(l.id)}
                      className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
            >
              {isSubmitting ? "Assigning Task..." : "Assign Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
