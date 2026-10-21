import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Plus,
  Calendar,
  Settings,
  MoreVertical,
  Check,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  ListTodo,
  Columns,
  Share2,
  Trash2,
  UserPlus,
  Flag,
} from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { taskService } from "@/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, PriorityBadge } from "@/components/tasks/badges";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { toast } from "sonner";
import type { Milestone, Project, Task, TaskPriority, TaskStatus } from "@/types";

interface ProjectWorkspaceViewProps {
  projectId: string;
}

export function ProjectWorkspaceView({ projectId }: ProjectWorkspaceViewProps) {
  const { tasks, projects, team, updateTask, updateProject, archiveProject, reload } = useTasks();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [addMilestoneModalOpen, setAddMilestoneModalOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");

  // Project details from API
  const [projectDetail, setProjectDetail] = useState<Project | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // New Milestone form state
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [milestoneDesc, setMilestoneDesc] = useState("");

  // Add Member state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("developer");

  const project = useMemo(() => {
    return projects.find((p) => p.id === projectId) || projectDetail;
  }, [projects, projectId, projectDetail]);

  const loadProjectDetail = async () => {
    try {
      setLoadingDetail(true);
      const res = await taskService.getProjectById(projectId);
      if (res) setProjectDetail(res);
    } catch (err) {
      console.error("Error loading project detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    void loadProjectDetail();
  }, [projectId]);

  const projectTasks = useMemo(() => {
    return tasks.filter((t) => t.projectId === projectId && !t.isTrash);
  }, [tasks, projectId]);

  const completedCount = projectTasks.filter((t) => t.status === "completed").length;
  const inProgressCount = projectTasks.filter((t) => t.status === "in_progress").length;
  const blockedTasks = projectTasks.filter((t) => t.status === "blocked");
  const calculatedProgress =
    projectTasks.length > 0
      ? Math.round((completedCount / projectTasks.length) * 100)
      : project?.progress || 0;

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim() || !project) return;
    try {
      await taskService.createTask({
        title: quickTaskTitle.trim(),
        description: "",
        status: "backlog",
        priority: "medium",
        projectId: project.id,
        dueDate: null,
      });
      setQuickTaskTitle("");
      void reload();
      toast.success("Task added to project backlog");
    } catch {
      toast.error("Failed to add task");
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim() || !milestoneDate) return;
    try {
      if (taskService.createMilestone) {
        await taskService.createMilestone(projectId, {
          title: milestoneTitle.trim(),
          description: milestoneDesc.trim(),
          targetDate: new Date(milestoneDate).toISOString(),
          status: "pending",
        });
      }
      toast.success("Milestone created");
      setMilestoneTitle("");
      setMilestoneDate("");
      setMilestoneDesc("");
      setAddMilestoneModalOpen(false);
      void loadProjectDetail();
    } catch {
      toast.error("Failed to create milestone");
    }
  };

  const handleToggleMilestone = async (m: Milestone) => {
    try {
      const nextStatus = m.status === "completed" ? "pending" : "completed";
      if (taskService.updateMilestone) {
        await taskService.updateMilestone(projectId, m.id, { status: nextStatus });
      }
      toast.success(nextStatus === "completed" ? "Milestone completed!" : "Milestone reopened");
      void loadProjectDetail();
    } catch {
      toast.error("Failed to update milestone");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    try {
      if (taskService.addProjectMember) {
        await taskService.addProjectMember(projectId, selectedUserId, selectedRole);
      }
      toast.success("Member assigned to project");
      setAddMemberModalOpen(false);
      void loadProjectDetail();
    } catch {
      toast.error("Failed to add member");
    }
  };

  if (!project) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <FolderKanban className="mx-auto size-12 text-muted-foreground/40 mb-3" />
        <h3 className="text-base font-semibold text-foreground">Project Not Found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The requested project does not exist or has been removed.
        </p>
        <Button onClick={() => navigate({ to: "/projects" })} className="mt-4 gap-2 text-xs">
          Return to Projects Portfolio
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Workspace Header Banner */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs relative overflow-hidden">
        <div
          className="absolute top-0 left-0 bottom-0 w-2"
          style={{ backgroundColor: project.color || "#4f46e5" }}
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5 pl-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                {project.key}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
              <Badge
                variant="outline"
                className={`text-[10px] uppercase font-semibold ${
                  project.health === "at_risk"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : project.health === "delayed"
                      ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                }`}
              >
                {(project.health || "on_track").replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase font-medium">
                {project.priority || "medium"} priority
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {project.description || "No description provided."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 pl-2 lg:pl-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Project workspace link copied");
              }}
              className="text-xs gap-1.5 cursor-pointer"
            >
              <Share2 className="size-3.5" /> Share
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => archiveProject(project.id)}
              className="text-xs gap-1.5 cursor-pointer"
            >
              {project.status === "archived" ? "Restore" : "Archive"}
            </Button>
          </div>
        </div>

        {/* Progress & Milestone Overview Bar */}
        <div className="mt-6 pt-4 border-t grid grid-cols-1 sm:grid-cols-4 gap-4 pl-2 text-xs">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Overall Progress</span>
              <span className="font-semibold text-foreground">{calculatedProgress}%</span>
            </div>
            <Progress value={calculatedProgress} className="h-1.5" />
          </div>

          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <div>
              <span className="text-muted-foreground block text-[11px]">Project Lead</span>
              <span className="font-medium text-foreground">{project.lead}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <div>
              <span className="text-muted-foreground block text-[11px]">Deadline</span>
              <span className="font-medium text-foreground">
                {project.deadline
                  ? new Date(project.deadline).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "No deadline set"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ListTodo className="size-4 text-muted-foreground" />
            <div>
              <span className="text-muted-foreground block text-[11px]">Task Velocity</span>
              <span className="font-medium text-foreground">
                {completedCount} / {projectTasks.length} tasks completed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="overview" className="gap-2 text-xs">
            <FolderKanban className="size-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="backlog" className="gap-2 text-xs">
            <ListTodo className="size-3.5" />
            Backlog & Tasks ({projectTasks.length})
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-2 text-xs">
            <Columns className="size-3.5" />
            Kanban Board
          </TabsTrigger>
          <TabsTrigger value="milestones" className="gap-2 text-xs">
            <Flag className="size-3.5" />
            Milestones ({(projectDetail?.milestones || []).length})
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2 text-xs">
            <Users className="size-3.5" />
            Team & Roles ({(projectDetail?.members || []).length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <span className="text-xs text-muted-foreground font-medium">Total Tasks</span>
              <div className="text-2xl font-bold mt-1 text-foreground">{projectTasks.length}</div>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <span className="text-xs text-muted-foreground font-medium">In Progress</span>
              <div className="text-2xl font-bold mt-1 text-primary">{inProgressCount}</div>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <span className="text-xs text-muted-foreground font-medium">Blocked Items</span>
              <div className="text-2xl font-bold mt-1 text-rose-500">{blockedTasks.length}</div>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <span className="text-xs text-muted-foreground font-medium">Completed</span>
              <div className="text-2xl font-bold mt-1 text-emerald-500">{completedCount}</div>
            </div>
          </div>

          {/* Blocked Tasks Alert if any */}
          {blockedTasks.length > 0 && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
                <AlertTriangle className="size-4" />
                <span>Outstanding Project Risks ({blockedTasks.length} blocked items)</span>
              </div>
              <div className="divide-y divide-rose-500/10 text-xs">
                {blockedTasks.map((bt) => (
                  <div
                    key={bt.id}
                    onClick={() => setSelectedTask(bt)}
                    className="py-2 flex items-center justify-between cursor-pointer hover:underline"
                  >
                    <span className="font-medium text-foreground">{bt.identifier}: {bt.title}</span>
                    <span className="text-rose-500 text-[11px]">{bt.blockedReason || "Blocked"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestones & Team preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Milestones preview */}
            <div className="rounded-xl border bg-card p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Flag className="size-3.5 text-primary" /> Key Milestones
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddMilestoneModalOpen(true)}
                  className="size-7 p-0 cursor-pointer text-xs"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>

              {(projectDetail?.milestones || []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No milestones defined yet. Click + to add one.
                </p>
              ) : (
                <div className="space-y-2">
                  {projectDetail?.milestones?.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleToggleMilestone(m)}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`size-4 rounded-sm border flex items-center justify-center ${
                            m.status === "completed"
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-input"
                          }`}
                        >
                          {m.status === "completed" && <Check className="size-3 stroke-[3]" />}
                        </div>
                        <span
                          className={`font-medium ${
                            m.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {m.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(m.targetDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Team Members preview */}
            <div className="rounded-xl border bg-card p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" /> Project Members
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddMemberModalOpen(true)}
                  className="size-7 p-0 cursor-pointer text-xs"
                >
                  <UserPlus className="size-3.5" />
                </Button>
              </div>

              {(projectDetail?.members || []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No assigned members yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {projectDetail?.members?.map((mem) => (
                    <div
                      key={mem.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="size-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                          {mem.initials}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">{mem.name}</span>
                          <span className="text-[10px] text-muted-foreground block">{mem.email}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {mem.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Backlog & List */}
        <TabsContent value="backlog" className="space-y-4">
          {/* Quick Add input */}
          <form onSubmit={handleQuickAddTask} className="flex gap-2">
            <input
              type="text"
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              placeholder={`Add a new task to ${project.name} backlog... (press Enter)`}
              className="flex-1 h-9 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
            />
            <Button type="submit" size="sm" className="h-9 text-xs gap-1 cursor-pointer">
              <Plus className="size-3.5" /> Add Task
            </Button>
          </form>

          {/* Task list */}
          {projectTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-xs text-muted-foreground">
              No tasks in this project yet. Use the input above to quickly add deliverables to the backlog.
            </div>
          ) : (
            <div className="divide-y rounded-xl border bg-card shadow-xs">
              {projectTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className="flex items-center justify-between p-3.5 hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-primary">{t.identifier}</span>
                    <span className="text-sm font-medium text-foreground">{t.title}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />
                    {t.dueDate && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(t.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Kanban Board */}
        <TabsContent value="board">
          <div className="rounded-xl border bg-muted/10 p-4">
            <KanbanBoard tasks={projectTasks} onTaskClick={(t) => setSelectedTask(t)} />
          </div>
        </TabsContent>

        {/* Tab 4: Milestones */}
        <TabsContent value="milestones" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Milestones represent critical delivery checkpoints and key dates on the project roadmap.
            </p>
            <Button size="sm" onClick={() => setAddMilestoneModalOpen(true)} className="text-xs gap-1.5 cursor-pointer">
              <Plus className="size-3.5" /> New Milestone
            </Button>
          </div>

          <div className="space-y-3">
            {(projectDetail?.milestones || []).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleMilestone(m)}
                    className={`size-5 rounded-md border flex items-center justify-center mt-0.5 cursor-pointer ${
                      m.status === "completed"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-input"
                    }`}
                  >
                    {m.status === "completed" && <Check className="size-3.5 stroke-[3]" />}
                  </button>
                  <div>
                    <h4
                      className={`text-sm font-bold ${
                        m.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {m.title}
                    </h4>
                    {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    Target: {new Date(m.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <Badge variant="outline" className={`capitalize text-[10px] ${m.status === "completed" ? "bg-emerald-500/10 text-emerald-600" : ""}`}>
                    {m.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab 5: Team & Roles */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Project members collaborate on tasks, review code, and track progress.
            </p>
            <Button size="sm" onClick={() => setAddMemberModalOpen(true)} className="text-xs gap-1.5 cursor-pointer">
              <UserPlus className="size-3.5" /> Add Member
            </Button>
          </div>

          <div className="divide-y rounded-xl border bg-card shadow-xs">
            {(projectDetail?.members || []).map((mem) => (
              <div key={mem.id} className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                    {mem.initials}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">{mem.name}</h4>
                    <span className="text-[11px] text-muted-foreground">{mem.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs capitalize font-medium">
                    {mem.role}
                  </Badge>
                  {mem.role !== "owner" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (confirm(`Remove ${mem.name} from this project?`)) {
                          if (taskService.removeProjectMember) {
                            await taskService.removeProjectMember(projectId, mem.id);
                            void loadProjectDetail();
                            toast.success("Member removed");
                          }
                        }
                      }}
                      className="text-rose-500 hover:text-rose-600 size-7 p-0 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Add Milestone Modal */}
      <Dialog open={addMilestoneModalOpen} onOpenChange={setAddMilestoneModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Project Milestone</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateMilestone} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Milestone Title *</label>
              <input
                type="text"
                required
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="e.g. Beta API Release"
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Date *</label>
              <input
                type="date"
                required
                value={milestoneDate}
                onChange={(e) => setMilestoneDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description</label>
              <textarea
                rows={2}
                value={milestoneDesc}
                onChange={(e) => setMilestoneDesc(e.target.value)}
                placeholder="Scope of deliverables required for this milestone..."
                className="w-full rounded-lg border border-input bg-card p-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddMilestoneModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">Create Milestone</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Member Modal */}
      <Dialog open={addMemberModalOpen} onOpenChange={setAddMemberModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Member to Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Select Team Member</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
              >
                <option value="">-- Choose member --</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Project Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs capitalize"
              >
                <option value="owner">Owner</option>
                <option value="lead">Lead</option>
                <option value="developer">Developer</option>
                <option value="designer">Designer</option>
                <option value="reviewer">Reviewer</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddMemberModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">Add to Project</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
