import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Briefcase,
  ListTodo,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FolderKanban,
  ExternalLink,
  Search,
} from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge, PriorityBadge } from "@/components/tasks/badges";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { toast } from "sonner";
import type { Task, TeamMember } from "@/types";
import { getApiBaseUrl } from "@/lib/api-config";

export function TeamView() {
  const { team, tasks, projects } = useTasks();
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Software Engineer");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return team;
    const q = search.trim().toLowerCase();
    return team.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q),
    );
  }, [team, search]);

  const nonTrash = useMemo(() => tasks.filter((t) => !t.isTrash), [tasks]);

  const tasksByMember = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const m of team) {
      map[m.id] = nonTrash.filter((t) => t.assignee?.id === m.id || t.assigneeId === m.id);
    }
    return map;
  }, [team, nonTrash]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role: role.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add member");
      toast.success(`Team member ${name} added!`);
      setAddMemberOpen(false);
      setName("");
      setEmail("");
      window.location.reload();
    } catch {
      toast.error("Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Team Directory & Workload</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              {team.length} Members
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage engineering and design team capacity, assignments, project roles, and workload distribution.
          </p>
        </div>

        <Button onClick={() => setAddMemberOpen(true)} className="gap-2 cursor-pointer shadow-sm shadow-primary/25">
          <UserPlus className="size-4" /> Add Team Member
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search team members by name, role, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 rounded-lg border border-input bg-card pl-9 pr-3 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
        />
      </div>

      {/* Members Workload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMembers.map((member) => {
          const memberTasks = tasksByMember[member.id] || [];
          const activeTasks = memberTasks.filter((t) => t.status !== "completed");
          const inProgressTasks = memberTasks.filter((t) => t.status === "in_progress");
          const inReviewTasks = memberTasks.filter((t) => t.status === "in_review");
          const completedTasks = memberTasks.filter((t) => t.status === "completed");
          const overdueTasks = activeTasks.filter(
            (t) => t.dueDate && new Date(t.dueDate) < new Date(),
          );

          const totalHours = activeTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
          const capacityPercent = Math.min(Math.round((activeTasks.length / 8) * 100), 125);

          return (
            <div
              key={member.id}
              className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs hover:shadow-md transition-all"
            >
              <div>
                {/* Profile Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shadow-2xs">
                      {member.initials}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{member.name}</h3>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Briefcase className="size-3" /> {member.role}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${
                      capacityPercent >= 100
                        ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                        : capacityPercent >= 75
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    }`}
                  >
                    {capacityPercent >= 100 ? "At Capacity" : `${capacityPercent}% Load`}
                  </Badge>
                </div>

                {/* Email */}
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="size-3.5" />
                  <span>{member.email}</span>
                </div>

                {/* Assigned Projects */}
                {member.projects && member.projects.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {member.projects.map((pr) => (
                      <span
                        key={pr.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: pr.color || "#4f46e5" }}
                        />
                        {pr.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Workload Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Sprint Capacity</span>
                    <span className="font-semibold text-foreground">
                      {activeTasks.length} active ({totalHours}h estimated)
                    </span>
                  </div>
                  <Progress value={Math.min(capacityPercent, 100)} className="h-1.5" />
                </div>

                {/* Task Breakdown Chips */}
                <div className="mt-4 grid grid-cols-4 gap-1.5 text-center text-xs">
                  <div className="rounded-lg bg-muted/40 p-1.5">
                    <span className="text-[10px] text-muted-foreground block">Progress</span>
                    <span className="font-bold text-primary">{inProgressTasks.length}</span>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-1.5">
                    <span className="text-[10px] text-muted-foreground block">Review</span>
                    <span className="font-bold text-purple-600">{inReviewTasks.length}</span>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-1.5">
                    <span className="text-[10px] text-muted-foreground block">Done</span>
                    <span className="font-bold text-emerald-600">{completedTasks.length}</span>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-1.5">
                    <span className="text-[10px] text-muted-foreground block">Overdue</span>
                    <span className="font-bold text-rose-600">{overdueTasks.length}</span>
                  </div>
                </div>
              </div>

              {/* Collapsible Active Tasks Preview */}
              <div className="mt-4 pt-3 border-t space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Current Deliverables
                </span>
                {activeTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No active tasks assigned.</p>
                ) : (
                  <div className="space-y-1.5">
                    {activeTasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="flex items-center justify-between p-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-xs"
                      >
                        <span className="truncate max-w-[200px] text-foreground font-medium">
                          {t.title}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>
                    ))}
                    {activeTasks.length > 3 && (
                      <span className="text-[11px] text-muted-foreground block text-right">
                        +{activeTasks.length - 3} more tasks
                      </span>
                    )}
                  </div>
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

      {/* Add Member Modal */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Invite a new engineer, designer, or lead to the TaskFlow Nexus workspace.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddMember} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. David Kumar"
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="david.k@example.com"
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Role / Title *</label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddMemberOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Member"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
