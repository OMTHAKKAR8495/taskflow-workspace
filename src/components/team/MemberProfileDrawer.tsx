import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Briefcase,
  Mail,
  FolderKanban,
  Calendar,
  Check,
  Copy,
  Plus,
  ArrowRight,
  ListTodo,
  ExternalLink,
  ShieldCheck,
  Key,
  Layers,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge, PriorityBadge } from "@/components/tasks/badges";
import { isOverdue } from "@/lib/task-utils";
import { fmtDate, fmtRelative } from "@/lib/format";
import { toast } from "sonner";
import type { Task, TeamMember, TaskStatus } from "@/types";

interface MemberProfileDrawerProps {
  member: TeamMember | null;
  tasks: Task[];
  open: boolean;
  onClose: () => void;
  onOpenTask: (task: Task) => void;
  onAssignTask?: (member: TeamMember) => void;
}

type TabType = "all" | "in_progress" | "in_review" | "completed" | "overdue";

export function MemberProfileDrawer({
  member,
  tasks,
  open,
  onClose,
  onOpenTask,
  onAssignTask,
}: MemberProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  if (!member) return null;

  // Derive credentials info
  const testUsername = member.email ? member.email.split("@")[0].replace(".", "") : "member";
  const testPassword = "thakkar2912";

  // Match tasks for this member
  const memberTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.isTrash) return false;
      const mid = member.id.toLowerCase();
      const memail = (member.email || "").toLowerCase();
      const mname = (member.name || "").toLowerCase();

      if (t.assigneeId && t.assigneeId.toLowerCase() === mid) return true;
      if (t.assignee?.id && t.assignee.id.toLowerCase() === mid) return true;
      if (t.assignee?.email && memail && t.assignee.email.toLowerCase() === memail) return true;
      if ((t as any).assigneeName && mname && (t as any).assigneeName.toLowerCase() === mname) return true;
      if ((t as any).assignee_id && (t as any).assignee_id.toLowerCase() === mid) return true;
      return false;
    });
  }, [tasks, member]);

  // Task sub-categories
  const completedTasks = useMemo(
    () => memberTasks.filter((t) => t.status === "completed"),
    [memberTasks],
  );

  const inProgressTasks = useMemo(
    () => memberTasks.filter((t) => t.status === "in_progress"),
    [memberTasks],
  );

  const inReviewTasks = useMemo(
    () => memberTasks.filter((t) => t.status === "in_review"),
    [memberTasks],
  );

  const overdueTasks = useMemo(
    () => memberTasks.filter((t) => t.status !== "completed" && isOverdue(t.dueDate)),
    [memberTasks],
  );

  // Filter tasks based on activeTab and searchQuery
  const displayedTasks = useMemo(() => {
    let list: Task[] = [];
    if (activeTab === "all") list = memberTasks;
    else if (activeTab === "in_progress") list = inProgressTasks;
    else if (activeTab === "in_review") list = inReviewTasks;
    else if (activeTab === "completed") list = completedTasks;
    else if (activeTab === "overdue") list = overdueTasks;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.identifier && t.identifier.toLowerCase().includes(q)),
    );
  }, [activeTab, memberTasks, inProgressTasks, inReviewTasks, completedTasks, overdueTasks, searchQuery]);

  const completionRate =
    memberTasks.length > 0 ? Math.round((completedTasks.length / memberTasks.length) * 100) : 0;

  const totalEstimatedHours = memberTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
  const totalActualHours = memberTasks.reduce((acc, t) => acc + (t.actualHours || 0), 0);

  const handleCopyEmail = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(member.email);
      setCopiedEmail(true);
      toast.success("Email address copied to clipboard!");
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleCopyCreds = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`Username: ${testUsername}\nPassword: ${testPassword}`);
      setCopiedCreds(true);
      toast.success("Login credentials copied to clipboard!");
      setTimeout(() => setCopiedCreds(false), 2000);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 overflow-y-auto bg-card border-l border-border flex flex-col shadow-2xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{member.name}'s Profile & Assigned Tasks</SheetTitle>
        </SheetHeader>

        {/* Top Header Card with Profile Info */}
        <div className="relative border-b bg-gradient-to-br from-indigo-950/40 via-background to-background p-6 pb-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-2xl bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-xl ring-2 ring-indigo-500/30 shadow-md">
                {member.initials || member.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">{member.name}</h2>
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-xs">
                    {member.role || "Team Member"}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                    title="Click to copy email"
                  >
                    <Mail className="size-3.5 text-indigo-400" />
                    <span>{member.email}</span>
                    {copiedEmail ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 opacity-60" />}
                  </button>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-slate-400">ID: {member.id}</span>
                </div>
              </div>
            </div>

            {onAssignTask && (
              <Button
                size="sm"
                onClick={() => onAssignTask(member)}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs shrink-0 cursor-pointer"
              >
                <Plus className="size-3.5" /> Assign Task
              </Button>
            )}
          </div>

          {/* Test Login Account Helper Box */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Key className="size-3.5" />
              </div>
              <div>
                <span className="font-semibold text-foreground">Member Login Credentials: </span>
                <span className="text-muted-foreground">
                  Username: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-foreground">{testUsername}</code>
                  {" "}• Password: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-foreground">{testPassword}</code>
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCreds}
              className="h-7 text-[11px] gap-1 shrink-0 border-indigo-500/30 hover:bg-indigo-500/10 cursor-pointer"
            >
              {copiedCreds ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              <span>{copiedCreds ? "Copied" : "Copy Login"}</span>
            </Button>
          </div>

          {/* Assigned Projects Badges */}
          {member.projects && member.projects.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                <FolderKanban className="size-3" /> Projects:
              </span>
              {member.projects.map((pr) => (
                <span
                  key={pr.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted/60 border border-border"
                >
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: pr.color || "#4f46e5" }}
                  />
                  <span>{pr.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Workload & Completion Metrics Cards */}
        <div className="p-6 border-b bg-muted/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Task Delivery & Performance
            </h3>
            <span className="text-xs font-bold text-foreground">
              {completionRate}% Completion Rate ({completedTasks.length} / {memberTasks.length})
            </span>
          </div>

          <Progress value={completionRate} className="h-2" />

          {/* 4 Stat Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === "completed"
                  ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs"
                  : "bg-card border-border hover:border-emerald-500/30"
              }`}
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-semibold">Completed</span>
                <CheckCircle2 className="size-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-500">{completedTasks.length}</div>
              <span className="text-[10px] text-muted-foreground">Finished deliverables</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("in_progress")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === "in_progress"
                  ? "bg-blue-500/10 border-blue-500/40 shadow-xs"
                  : "bg-card border-border hover:border-blue-500/30"
              }`}
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-semibold">In Progress</span>
                <Clock className="size-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-500">{inProgressTasks.length}</div>
              <span className="text-[10px] text-muted-foreground">Active work</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("in_review")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === "in_review"
                  ? "bg-purple-500/10 border-purple-500/40 shadow-xs"
                  : "bg-card border-border hover:border-purple-500/30"
              }`}
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-semibold">In Review</span>
                <Eye className="size-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-purple-500">{inReviewTasks.length}</div>
              <span className="text-[10px] text-muted-foreground">Awaiting sign-off</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("overdue")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === "overdue"
                  ? "bg-rose-500/10 border-rose-500/40 shadow-xs"
                  : "bg-card border-border hover:border-rose-500/30"
              }`}
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-semibold">Overdue</span>
                <AlertTriangle className="size-4 text-rose-500" />
              </div>
              <div className="text-2xl font-bold text-rose-500">{overdueTasks.length}</div>
              <span className="text-[10px] text-muted-foreground">Past deadline</span>
            </button>
          </div>
        </div>

        {/* Task List Section with Filter Tabs */}
        <div className="flex-1 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                All Assigned ({memberTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("completed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "completed"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Completed ({completedTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("in_progress")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "in_progress"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                In Progress ({inProgressTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("in_review")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "in_review"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                In Review ({inReviewTasks.length})
              </button>
              {overdueTasks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("overdue")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === "overdue"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                  }`}
                >
                  Overdue ({overdueTasks.length})
                </button>
              )}
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search member tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-3 text-xs w-full sm:w-44 focus:ring-1 focus:ring-primary focus:outline-hidden"
            />
          </div>

          {/* Task Items List */}
          {displayedTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2 bg-muted/5">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <ListTodo className="size-5" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                {activeTab === "completed"
                  ? "No completed tasks yet"
                  : activeTab === "overdue"
                    ? "No overdue tasks — great job!"
                    : activeTab === "in_progress"
                      ? "No tasks currently in progress"
                      : "No tasks found"}
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {activeTab === "completed"
                  ? "When this member submits tasks and completes them, they will be listed here with completion timestamps."
                  : "All tasks assigned to this member will appear here in real-time."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedTasks.map((task) => {
                const isTaskOverdue = task.status !== "completed" && isOverdue(task.dueDate);
                return (
                  <div
                    key={task.id}
                    onClick={() => onOpenTask(task)}
                    className="p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all cursor-pointer shadow-2xs hover:shadow-xs group space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {task.identifier && (
                            <span className="font-mono text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                              {task.identifier}
                            </span>
                          )}
                          {task.projectName && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                              <span
                                className="size-1.5 rounded-full"
                                style={{ backgroundColor: task.projectColor || "#4f46e5" }}
                              />
                              {task.projectName}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-indigo-400 transition-colors line-clamp-1">
                          {task.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Footer Info */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                      <div className="flex items-center gap-3 flex-wrap">
                        {task.status === "completed" && (
                          <span className="flex items-center gap-1 text-emerald-500 font-medium">
                            <CheckCircle2 className="size-3" />
                            {task.completedAt
                              ? `Completed ${fmtRelative(task.completedAt)}`
                              : "Completed"}
                          </span>
                        )}

                        {task.dueDate && task.status !== "completed" && (
                          <span
                            className={`flex items-center gap-1 font-medium ${
                              isTaskOverdue ? "text-rose-500" : "text-muted-foreground"
                            }`}
                          >
                            <Calendar className="size-3" />
                            {isTaskOverdue ? "Overdue: " : "Due: "}
                            {fmtDate(task.dueDate)}
                          </span>
                        )}

                        {task.subtasks && task.subtasks.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Layers className="size-3" />
                            {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtasks
                          </span>
                        )}
                      </div>

                      <span className="inline-flex items-center gap-1 text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                        Details <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
