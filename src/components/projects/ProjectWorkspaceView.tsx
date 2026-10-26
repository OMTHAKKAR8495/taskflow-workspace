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
  Mail,
  Link2,
  MessageCircle,
  Copy,
  Send,
  RefreshCw,
  XCircle,
  Info,
  ShieldAlert,
  ExternalLink,
  Eye,
  Paperclip,
  ShieldCheck,
  History,
  Sparkles,
  Github,
  Globe,
  Search,
  FileText,
} from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { taskService } from "@/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge, PriorityBadge } from "@/components/tasks/badges";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { AssignTaskModal } from "@/components/tasks/AssignTaskModal";
import { TaskReviewModal } from "@/components/tasks/TaskReviewModal";
import { toast } from "sonner";
import type {
  Milestone,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  ProjectInvitation,
  CreateInvitationResponse,
  ProjectSubmission,
} from "@/types";

interface ProjectWorkspaceViewProps {
  projectId: string;
}

export function ProjectWorkspaceView({ projectId }: ProjectWorkspaceViewProps) {
  const { tasks, projects, team, updateTask, updateProject, deleteProject, archiveProject, reload } =
    useTasks();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addMilestoneModalOpen, setAddMilestoneModalOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");

  // Assign Task modal state
  const [assignTaskModalOpen, setAssignTaskModalOpen] = useState(false);
  const [presetAssigneeId, setPresetAssigneeId] = useState<string | undefined>(undefined);

  // Task review modal state
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Project details from API
  const [projectDetail, setProjectDetail] = useState<Project | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // New Milestone form state
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [milestoneDesc, setMilestoneDesc] = useState("");

  // Add Member Multi-select state
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState("developer");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  // Submissions state
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Activities state
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Project Settings form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("medium");
  const [editColor, setEditColor] = useState("#4f46e5");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "planning" | "completed" | "archived">(
    "active",
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Project Invitations state
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("developer");
  const [inviteSkills, setInviteSkills] = useState("");
  const [inviteDesignation, setInviteDesignation] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteDeliveryMethod, setInviteDeliveryMethod] = useState<"link" | "email">("link");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<CreateInvitationResponse | null>(null);
  const [inviteResultModalOpen, setInviteResultModalOpen] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [hasCopiedTemplate, setHasCopiedTemplate] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Task view mode inside Tasks tab
  const [taskViewMode, setTaskViewMode] = useState<"list" | "board">("list");
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>("all");

  const project = useMemo(() => {
    return projects.find((p) => p.id === projectId) || projectDetail;
  }, [projects, projectId, projectDetail]);

  const loadProjectDetail = async () => {
    try {
      setLoadingDetail(true);
      const res = await taskService.getProjectById(projectId);
      if (res) {
        setProjectDetail(res);
        setEditName(res.name || "");
        setEditDescription(res.description || "");
        setEditPriority((res.priority as TaskPriority) || "medium");
        setEditColor(res.color || "#4f46e5");
        setEditStartDate(res.startDate ? new Date(res.startDate).toISOString().slice(0, 10) : "");
        setEditDeadline(res.deadline ? new Date(res.deadline).toISOString().slice(0, 10) : "");
        setEditStatus(res.status || "active");
      }
    } catch (err) {
      console.error("Error loading project detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadInvitations = async () => {
    try {
      setLoadingInvitations(true);
      if (taskService.getProjectInvitations) {
        const list = await taskService.getProjectInvitations(projectId);
        setInvitations(list || []);
      }
    } catch (err) {
      console.error("Error loading project invitations:", err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const loadSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      if (taskService.getProjectSubmissions) {
        const list = await taskService.getProjectSubmissions(projectId);
        setSubmissions(list || []);
      }
    } catch (err) {
      console.error("Error loading project submissions:", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const loadActivities = async () => {
    try {
      setLoadingActivities(true);
      if (taskService.getProjectActivity) {
        const list = await taskService.getProjectActivity(projectId);
        setActivities(list || []);
      }
    } catch (err) {
      console.error("Error loading project activities:", err);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    void loadProjectDetail();
    void loadInvitations();
    void loadSubmissions();
    void loadActivities();
  }, [projectId]);

  // Sync settings when project updates
  useEffect(() => {
    if (project) {
      setEditName(project.name || "");
      setEditDescription(project.description || "");
      setEditPriority((project.priority as TaskPriority) || "medium");
      setEditColor(project.color || "#4f46e5");
      setEditStartDate(
        project.startDate ? new Date(project.startDate).toISOString().slice(0, 10) : "",
      );
      setEditDeadline(
        project.deadline ? new Date(project.deadline).toISOString().slice(0, 10) : "",
      );
      setEditStatus(project.status || "active");
    }
  }, [project]);

  // Tasks belonging to this project
  const projectTasks = useMemo(() => {
    return tasks.filter((t) => t.projectId === projectId && !t.isTrash);
  }, [tasks, projectId]);

  const completedCount = useMemo(() => {
    return projectTasks.filter((t) => t.status === "completed").length;
  }, [projectTasks]);

  const inProgressCount = useMemo(() => {
    return projectTasks.filter((t) => t.status === "in_progress" || t.status === "in_review").length;
  }, [projectTasks]);

  const blockedTasks = useMemo(() => {
    return projectTasks.filter((t) => t.status === "blocked");
  }, [projectTasks]);

  const calculatedProgress =
    projectTasks.length > 0
      ? Math.round((completedCount / projectTasks.length) * 100)
      : project?.progress || 0;

  // Filtered tasks for Tasks tab
  const filteredProjectTasks = useMemo(() => {
    if (taskFilterStatus === "all") return projectTasks;
    return projectTasks.filter((t) => t.status === taskFilterStatus);
  }, [projectTasks, taskFilterStatus]);

  // Check if current user is owner or leader
  const isLeader =
    user?.role === "leader" ||
    user?.role === "admin" ||
    user?.id === "user-om" ||
    (project && project.ownerId && project.ownerId === user?.id);

  // Handler for Quick Add Task
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

  // Handler for Milestone Creation
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

  // Handler for Milestone Toggle
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

  // Handler for Adding Existing Members (Multi-select)
  const handleAddMembersSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberIds.length === 0) {
      toast.error("Please select at least one team member.");
      return;
    }
    setIsAddingMembers(true);
    try {
      if (taskService.addProjectMember) {
        await taskService.addProjectMember(projectId, selectedMemberIds, selectedRole);
      }
      toast.success(
        `Added ${selectedMemberIds.length} member${selectedMemberIds.length > 1 ? "s" : ""} to project.`,
      );
      setSelectedMemberIds([]);
      setAddMemberModalOpen(false);
      void loadProjectDetail();
      void loadActivities();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add member(s) to project");
    } finally {
      setIsAddingMembers(false);
    }
  };

  // Toggle member selection checkbox
  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id],
    );
  };

  // Handler for Sending / Generating Invitation
  const handleSendInvitation = async (
    e?: React.FormEvent,
    overrideMethod?: "link" | "email",
  ) => {
    if (e) e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error("Please enter a recipient email address.");
      return;
    }

    const cleanEmail = inviteEmail.trim().toLowerCase();
    const isAlreadyMember = (projectDetail?.members || []).some(
      (m) => m.email && m.email.toLowerCase() === cleanEmail,
    );
    if (isAlreadyMember) {
      toast.error(`${cleanEmail} is already an active member of this project.`);
      return;
    }

    const hasPendingInvite = invitations.some(
      (inv) => inv.recipientEmail.toLowerCase() === cleanEmail && inv.status === "pending",
    );
    if (hasPendingInvite) {
      toast.error(`A pending invitation already exists for ${cleanEmail}.`);
      return;
    }

    const methodToUse = overrideMethod || inviteDeliveryMethod;
    setIsInviting(true);
    try {
      const skillsArray = inviteSkills
        ? inviteSkills.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      const res = await taskService.createProjectInvitation(projectId, {
        recipientEmail: cleanEmail,
        recipientName: inviteFullName.trim() || undefined,
        role: inviteRole,
        designation: inviteDesignation.trim() || undefined,
        skills: skillsArray.length > 0 ? skillsArray : undefined,
        message: inviteMessage.trim() || undefined,
        deliveryMethod: methodToUse,
      });

      setInviteResult(res);
      setInviteResultModalOpen(true);
      setInviteModalOpen(false);

      if (methodToUse === "link" && res.invitationUrl) {
        try {
          await navigator.clipboard.writeText(res.invitationUrl);
          setHasCopiedLink(true);
          toast.success("Invitation link generated & copied to clipboard!");
          setTimeout(() => setHasCopiedLink(false), 3000);
        } catch {
          toast.success("Invitation link generated successfully!");
        }
      } else if (res.emailSent) {
        toast.success(`Invitation email dispatched to ${cleanEmail}`);
      } else {
        toast.success("Invitation created! You can now send it via Gmail or mail client.");
      }

      setInviteEmail("");
      setInviteFullName("");
      setInviteSkills("");
      setInviteDesignation("");
      setInviteMessage("");
      void loadInvitations();
      void loadActivities();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleResendInvitation = async (invitationId: string, method: "link" | "email" = "link") => {
    try {
      setActionInProgressId(invitationId);
      const res = await taskService.resendProjectInvitation(invitationId, { deliveryMethod: method });
      setInviteResult(res as any);
      setInviteResultModalOpen(true);
      void loadInvitations();
      toast.success(res.emailSent ? "Invitation email resent!" : "Invitation link regenerated!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend invitation");
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Revoke pending invitation for ${email}?`)) return;
    try {
      setActionInProgressId(invitationId);
      await taskService.revokeProjectInvitation(projectId, invitationId);
      void loadInvitations();
      toast.success(`Invitation for ${email} revoked.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to revoke invitation");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handler for Saving Project Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Project name cannot be empty.");
      return;
    }
    setIsSavingSettings(true);
    try {
      await updateProject(projectId, {
        name: editName.trim(),
        description: editDescription.trim(),
        priority: editPriority,
        color: editColor,
        startDate: editStartDate ? new Date(editStartDate).toISOString() : null,
        deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
        status: editStatus,
      });
      toast.success("Project settings saved successfully!");
      void loadProjectDetail();
      void reload();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update project settings");
    } finally {
      setIsSavingSettings(false);
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
              <h1 className="text-xl font-bold tracking-tight text-foreground">{project.name}</h1>
              <Badge variant="outline" className="capitalize text-xs font-semibold">
                {project.status || "active"}
              </Badge>
              <Badge variant="secondary" className="capitalize text-xs font-medium">
                {project.priority || "medium"}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              {project.description || "No project description provided."}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isLeader && (
              <Button
                size="sm"
                onClick={() => {
                  setPresetAssigneeId(undefined);
                  setAssignTaskModalOpen(true);
                }}
                className="text-xs gap-1.5 cursor-pointer bg-primary text-primary-foreground shadow-2xs font-semibold"
              >
                <Plus className="size-3.5" /> Assign Task
              </Button>
            )}

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
              <span className="font-medium text-foreground">{project.lead || "Unassigned"}</span>
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
        <TabsList className="h-auto bg-muted/60 p-1 w-full justify-start overflow-x-auto no-scrollbar -mx-2 sm:mx-0 px-2 sm:px-0 flex-nowrap sm:flex-wrap">
          <TabsTrigger value="overview" className="gap-2 text-xs shrink-0">
            <FolderKanban className="size-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2 text-xs shrink-0">
            <Users className="size-3.5" />
            Members ({(projectDetail?.members || []).length})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2 text-xs shrink-0">
            <ListTodo className="size-3.5" />
            Tasks ({projectTasks.length})
          </TabsTrigger>
          <TabsTrigger value="submissions" className="gap-2 text-xs shrink-0">
            <FileCheck2 className="size-3.5" />
            Submissions ({submissions.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2 text-xs shrink-0">
            <History className="size-3.5" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 text-xs shrink-0">
            <Settings className="size-3.5" />
            Settings
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
                    <span className="font-medium text-foreground">
                      {bt.identifier}: {bt.title}
                    </span>
                    <span className="text-rose-500 text-[11px]">
                      {bt.blockedReason || "Blocked"}
                    </span>
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
                {isLeader && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAddMilestoneModalOpen(true)}
                    className="size-7 p-0 cursor-pointer text-xs"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                )}
              </div>

              {(projectDetail?.milestones || []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No roadmap milestones defined yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {projectDetail?.milestones?.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleMilestone(m)}
                          className={`size-4 rounded-sm border flex items-center justify-center cursor-pointer ${
                            m.status === "completed"
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-input"
                          }`}
                        >
                          {m.status === "completed" && <Check className="size-3 stroke-[3]" />}
                        </button>
                        <span
                          className={`font-medium ${
                            m.status === "completed"
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {m.title}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {new Date(m.targetDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Badge>
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
                {isLeader && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAddMemberModalOpen(true)}
                    className="size-7 p-0 cursor-pointer text-xs"
                  >
                    <UserPlus className="size-3.5" />
                  </Button>
                )}
              </div>

              {(projectDetail?.members || []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No assigned members yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {projectDetail?.members?.map((mem) => {
                    const memberTaskCount = projectTasks.filter(
                      (t) => t.assigneeId === mem.id || t.assignee?.id === mem.id,
                    ).length;

                    return (
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
                            <span className="text-[10px] text-muted-foreground block">
                              {mem.email}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {memberTaskCount} tasks
                          </span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {mem.role}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Members & Invitations */}
        <TabsContent value="members" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Project Collaborators</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage active project memberships, assign tasks directly to collaborators, and track
                pending invitations.
              </p>
            </div>
            {isLeader && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setInviteModalOpen(true)}
                  className="text-xs gap-1.5 cursor-pointer bg-primary text-primary-foreground shadow-2xs font-semibold"
                >
                  <Mail className="size-3.5" /> Invite Member
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddMemberModalOpen(true)}
                  className="text-xs gap-1.5 cursor-pointer font-semibold"
                >
                  <UserPlus className="size-3.5" /> Add Existing
                </Button>
              </div>
            )}
          </div>

          {/* Active Members Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Active Project Members
                </span>
                <Badge variant="outline" className="text-[10px] bg-muted">
                  {(projectDetail?.members || []).length}
                </Badge>
              </div>
            </div>

            <div className="divide-y rounded-xl border bg-card shadow-xs">
              {(projectDetail?.members || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No active members assigned yet. Click "Add Existing" or "Invite Member" above.
                </div>
              ) : (
                (projectDetail?.members || []).map((mem) => {
                  const memberTasks = projectTasks.filter(
                    (t) => t.assigneeId === mem.id || t.assignee?.id === mem.id,
                  );
                  const memberCompleted = memberTasks.filter(
                    (t) => t.status === "completed",
                  ).length;
                  const memberProgress =
                    memberTasks.length > 0
                      ? Math.round((memberCompleted / memberTasks.length) * 100)
                      : 0;

                  return (
                    <div
                      key={mem.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shadow-2xs">
                          {mem.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-foreground">{mem.name}</h4>
                            {isLeader && mem.role !== "owner" ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  const nextRole = (mem.role || "").toLowerCase() === "lead" ? "developer" : "lead";
                                  try {
                                    if (taskService.addProjectMember) {
                                      await taskService.addProjectMember(projectId, [mem.id], nextRole);
                                      void loadProjectDetail();
                                      toast.success(`Role updated to ${nextRole === "lead" ? "Project Lead" : "Team Member"}`);
                                    }
                                  } catch (e: any) {
                                    toast.error(e?.message || "Failed to update project role");
                                  }
                                }}
                                className="inline-flex items-center gap-1 cursor-pointer hover:opacity-85 transition-opacity"
                                title="Click to toggle between Lead and Member"
                              >
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] capitalize font-semibold cursor-pointer ${
                                    (mem.role || "").toLowerCase() === "lead"
                                      ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                      : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                                  }`}
                                >
                                  {mem.role === "lead" ? "👑 Project Lead" : `👤 ${mem.role}`}
                                </Badge>
                              </button>
                            ) : (
                              <Badge variant="outline" className="text-[10px] capitalize font-medium">
                                {mem.role === "owner" ? "👑 Project Owner" : mem.role}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">{mem.email}</span>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                            <span className="font-medium text-foreground">
                              {memberCompleted} / {memberTasks.length} tasks completed
                            </span>
                            <span>•</span>
                            <span>{memberProgress}% velocity</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isLeader && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPresetAssigneeId(mem.id);
                              setAssignTaskModalOpen(true);
                            }}
                            className="text-xs h-8 gap-1.5 cursor-pointer font-semibold"
                          >
                            <Plus className="size-3 text-primary" /> Assign Task
                          </Button>
                        )}
                        {isLeader && mem.role !== "owner" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              if (confirm(`Remove ${mem.name} from this project?`)) {
                                if (taskService.removeProjectMember) {
                                  await taskService.removeProjectMember(projectId, mem.id);
                                  void loadProjectDetail();
                                  void loadActivities();
                                  toast.success("Member removed");
                                }
                              }
                            }}
                            className="text-rose-500 hover:text-rose-600 size-8 p-0 cursor-pointer"
                            title="Remove from project"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pending Invitations Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Pending & Recent Project Invitations
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    invitations.filter((i) => i.status === "pending").length > 0
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      : "bg-muted"
                  }`}
                >
                  {invitations.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void loadInvitations()}
                disabled={loadingInvitations}
                className="text-[11px] h-7 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RefreshCw className={`size-3 ${loadingInvitations ? "animate-spin" : ""}`} />{" "}
                Refresh
              </Button>
            </div>

            <div className="divide-y rounded-xl border bg-card shadow-xs">
              {invitations.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No project invitations sent yet. Click "Invite Member" above to invite
                  collaborators via email or secure shareable link.
                </div>
              ) : (
                invitations.map((inv) => {
                  const isPending = inv.status === "pending";
                  const isExpired =
                    inv.status === "expired" ||
                    (isPending && new Date(inv.expiresAt) <= new Date());
                  const isRevoked = inv.status === "revoked";
                  const isAccepted = inv.status === "accepted";
                  const isDeclined = inv.status === "declined";

                  return (
                    <div
                      key={inv.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                          <Mail className="size-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground">
                              {inv.recipientEmail}
                            </span>
                            <Badge variant="outline" className="text-[10px] capitalize font-medium">
                              {inv.role}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${
                                isPending && !isExpired
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                  : isAccepted
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  : isRevoked
                                  ? "bg-slate-500/15 text-slate-500 border-slate-500/30"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                              }`}
                            >
                              {isPending && !isExpired
                                ? "Pending"
                                : isAccepted
                                ? "Accepted"
                                : isRevoked
                                ? "Revoked"
                                : isDeclined
                                ? "Declined"
                                : "Expired"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
                            <span>
                              Invited by{" "}
                              <strong className="text-foreground">
                                {inv.inviterName || "Project Lead"}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Expires{" "}
                              {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Invitation Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isPending && !isExpired && isLeader && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionInProgressId === inv.id}
                              onClick={() => void handleResendInvitation(inv.id)}
                              className="text-xs h-8 gap-1.5 cursor-pointer text-primary hover:text-primary"
                            >
                              <RefreshCw
                                className={`size-3.5 ${
                                  actionInProgressId === inv.id ? "animate-spin" : ""
                                }`}
                              />{" "}
                              Resend
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={actionInProgressId === inv.id}
                              onClick={() =>
                                void handleRevokeInvitation(inv.id, inv.recipientEmail)
                              }
                              className="text-xs h-8 gap-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                            >
                              <XCircle className="size-3.5" /> Revoke
                            </Button>
                          </>
                        )}
                        {(isExpired || isRevoked) && isLeader && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionInProgressId === inv.id}
                            onClick={() => void handleResendInvitation(inv.id)}
                            className="text-xs h-8 gap-1.5 text-primary hover:text-primary cursor-pointer"
                          >
                            <RefreshCw
                              className={`size-3.5 ${
                                actionInProgressId === inv.id ? "animate-spin" : ""
                              }`}
                            />{" "}
                            Reinstate & Resend
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Tasks & Backlog */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={taskViewMode === "list" ? "default" : "outline"}
                onClick={() => setTaskViewMode("list")}
                className="text-xs gap-1.5 cursor-pointer h-8"
              >
                <ListTodo className="size-3.5" /> List View
              </Button>
              <Button
                size="sm"
                variant={taskViewMode === "board" ? "default" : "outline"}
                onClick={() => setTaskViewMode("board")}
                className="text-xs gap-1.5 cursor-pointer h-8"
              >
                <Columns className="size-3.5" /> Kanban Board
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={taskFilterStatus}
                onChange={(e) => setTaskFilterStatus(e.target.value)}
                className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-medium"
              >
                <option value="all">All Statuses ({projectTasks.length})</option>
                <option value="backlog">Backlog</option>
                <option value="ready">Ready</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
              </select>

              {isLeader && (
                <Button
                  size="sm"
                  onClick={() => {
                    setPresetAssigneeId(undefined);
                    setAssignTaskModalOpen(true);
                  }}
                  className="text-xs h-8 gap-1.5 cursor-pointer bg-primary font-semibold"
                >
                  <Plus className="size-3.5" /> Assign Task
                </Button>
              )}
            </div>
          </div>

          {/* Quick Add Form */}
          {isLeader && (
            <form onSubmit={handleQuickAddTask} className="flex gap-2">
              <input
                type="text"
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                placeholder={`Quickly add a task to ${project.name}... (press Enter)`}
                className="flex-1 h-9 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
              <Button type="submit" size="sm" className="h-9 text-xs gap-1 cursor-pointer">
                <Plus className="size-3.5" /> Add Task
              </Button>
            </form>
          )}

          {taskViewMode === "list" ? (
            filteredProjectTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-xs text-muted-foreground">
                No tasks match the filter criteria. Use "Assign Task" or the input above to add
                deliverables.
              </div>
            ) : (
              <div className="divide-y rounded-xl border bg-card shadow-xs">
                {filteredProjectTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-muted/40 cursor-pointer transition-colors gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {t.identifier}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-foreground">{t.title}</span>
                        {t.assignee && (
                          <span className="text-[11px] text-muted-foreground block">
                            Assigned to: {t.assignee.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center">
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
            )
          ) : (
            <div className="rounded-xl border bg-muted/10 p-4">
              <KanbanBoard tasks={filteredProjectTasks} onTaskClick={(t) => setSelectedTask(t)} />
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Submissions & Deliverables */}
        <TabsContent value="submissions" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Project Deliverables & Submissions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review work submissions, verified attachments, GitHub commits, and live deployments
                from project members.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadSubmissions()}
              disabled={loadingSubmissions}
              className="text-xs h-8 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${loadingSubmissions ? "animate-spin" : ""}`} />{" "}
              Refresh
            </Button>
          </div>

          {submissions.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-xs text-muted-foreground space-y-2">
              <FileCheck2 className="mx-auto size-10 text-muted-foreground/40 mb-2" />
              <p className="font-medium text-foreground">No work submitted for review yet</p>
              <p className="max-w-md mx-auto">
                When assigned members complete tasks and submit work for review, their deliverables,
                live links, and files will appear here for leader sign-off.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => {
                const subTask = projectTasks.find((t) => t.id === sub.taskId);

                return (
                  <div
                    key={sub.id}
                    className="rounded-xl border bg-card p-5 shadow-xs space-y-3.5 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {sub.taskIdentifier}
                        </span>
                        <h4
                          onClick={() => {
                            if (subTask) setSelectedTask(subTask);
                          }}
                          className="text-sm font-bold text-foreground hover:text-primary cursor-pointer"
                        >
                          {sub.taskTitle}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                            sub.submissionStatus === "approved"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : sub.submissionStatus === "changes_requested"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                          }`}
                        >
                          {sub.submissionStatus === "changes_requested"
                            ? "Changes Requested"
                            : sub.submissionStatus}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(sub.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Member & Work Details */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="font-medium text-foreground">Submitted by:</span>
                        <span className="font-semibold text-foreground">{sub.userName}</span>
                        {sub.timeSpentHours ? (
                          <>
                            <span>•</span>
                            <span>{sub.timeSpentHours} hrs logged</span>
                          </>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Completion Notes / Summary:
                        </span>
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border">
                          {sub.workCompleted}
                        </p>
                      </div>

                      {/* Links and Attachments */}
                      {(sub.githubUrl ||
                        sub.deploymentUrl ||
                        (sub.attachments && sub.attachments.length > 0)) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {sub.githubUrl && (
                            <a
                              href={sub.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted/50 border text-foreground hover:bg-muted font-mono transition-colors"
                            >
                              <Github className="size-3 text-primary" />
                              GitHub Repo / PR
                            </a>
                          )}
                          {sub.deploymentUrl && (
                            <a
                              href={sub.deploymentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted/50 border text-foreground hover:bg-muted font-mono transition-colors"
                            >
                              <Globe className="size-3 text-emerald-500" />
                              Live Demo
                            </a>
                          )}
                          {sub.attachments &&
                            sub.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.url}
                                download={att.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-card border text-foreground hover:border-primary transition-colors"
                              >
                                <Paperclip className="size-3 text-muted-foreground" />
                                {att.name}
                              </a>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Review Decision Buttons for Leader */}
                    {isLeader && (
                      <div className="pt-2 border-t flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (subTask) {
                              setReviewingTask(subTask);
                              setReviewModalOpen(true);
                            }
                          }}
                          className="text-xs h-8 gap-1.5 cursor-pointer font-semibold"
                        >
                          <ShieldCheck className="size-3.5 text-primary" />
                          Review & Decision
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 5: Activity Log */}
        <TabsContent value="activity" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Project Activity History</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete chronological audit log of all project updates, task creations, reviews, and
                membership actions.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadActivities()}
              disabled={loadingActivities}
              className="text-xs h-8 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${loadingActivities ? "animate-spin" : ""}`} />{" "}
              Refresh
            </Button>
          </div>

          {activities.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-xs text-muted-foreground">
              No recorded activity events for this project yet.
            </div>
          ) : (
            <div className="divide-y rounded-xl border bg-card shadow-xs">
              {activities.map((act) => (
                <div key={act.id} className="p-3.5 flex items-start gap-3 text-xs">
                  <div className="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5">
                    <History className="size-4" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground capitalize">
                        {(act.type || "Event").replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(act.timestamp || act.at).toLocaleString()}
                      </span>
                    </div>
                    {act.taskTitle && (
                      <p className="text-muted-foreground font-medium">Task: {act.taskTitle}</p>
                    )}
                    {act.details && (
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {typeof act.details === "string"
                          ? act.details
                          : JSON.stringify(act.details)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 6: Settings */}
        <TabsContent value="settings" className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-xs space-y-6 max-w-2xl">
            <div>
              <h3 className="text-sm font-bold text-foreground">Project Workspace Settings</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update project title, description, priority, dates, and color theme.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Project Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Project Key / Prefix</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={project.key}
                  className="w-full h-9 rounded-lg border border-input bg-muted px-3 text-xs font-mono text-muted-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card p-3 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs capitalize"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs capitalize"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Start Date</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Due Date</label>
                  <input
                    type="date"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
                  />
                </div>
              </div>

              {/* Color Theme */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Color Theme</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="size-9 rounded-lg border border-input bg-card p-1 cursor-pointer"
                  />
                  <span className="font-mono text-xs text-muted-foreground uppercase">
                    {editColor}
                  </span>
                </div>
              </div>

              {isLeader && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (
                        confirm(
                          `Are you sure you want to delete "${project.name}"? This cannot be undone.`,
                        )
                      ) {
                        try {
                          await deleteProject(projectId);
                          toast.success("Project deleted successfully");
                          navigate({ to: "/projects" });
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to delete project");
                        }
                      }
                    }}
                    className="cursor-pointer text-xs gap-1.5"
                  >
                    <Trash2 className="size-3.5" /> Delete Project
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSavingSettings}
                    className="cursor-pointer text-xs font-semibold"
                  >
                    {isSavingSettings ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </form>
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

      {/* Assign Task Modal */}
      <AssignTaskModal
        open={assignTaskModalOpen}
        onOpenChange={setAssignTaskModalOpen}
        presetProjectId={projectId}
        presetAssigneeId={presetAssigneeId}
        onTaskCreated={() => {
          void reload();
          void loadProjectDetail();
          void loadActivities();
        }}
      />

      {/* Task Review Modal */}
      {reviewingTask && (
        <TaskReviewModal
          task={reviewingTask}
          open={reviewModalOpen}
          onOpenChange={(op) => {
            setReviewModalOpen(op);
            if (!op) setReviewingTask(null);
          }}
          onSuccess={() => {
            void reload();
            void loadProjectDetail();
            void loadSubmissions();
            void loadActivities();
          }}
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddMilestoneModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Create Milestone
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Existing Member Modal (Multi-select) */}
      <Dialog open={addMemberModalOpen} onOpenChange={setAddMemberModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Workspace Members to Project</DialogTitle>
            <DialogDescription>
              Select one or multiple existing team members to add to this project.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddMembersSubmit} className="space-y-4 pt-2 flex-1 overflow-hidden flex flex-col">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search team members by name or email..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card pl-8 pr-3 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
            </div>

            {/* Role dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Role in Project</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs capitalize"
              >
                <option value="developer">Developer</option>
                <option value="designer">Designer</option>
                <option value="reviewer">Reviewer</option>
                <option value="lead">Lead</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {/* Member Checkboxes List */}
            <div className="flex-1 overflow-y-auto divide-y rounded-lg border bg-muted/20 p-1 space-y-1 max-h-60">
              {team
                .filter((m) => {
                  if (!memberSearchQuery.trim()) return true;
                  const q = memberSearchQuery.toLowerCase();
                  return (
                    m.name.toLowerCase().includes(q) ||
                    (m.email && m.email.toLowerCase().includes(q))
                  );
                })
                .map((m) => {
                  const isAlreadyMember = (projectDetail?.members || []).some(
                    (pm) => pm.id === m.id || (pm.email && pm.email === m.email),
                  );
                  const isSelected = selectedMemberIds.includes(m.id);

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (!isAlreadyMember) toggleMemberSelection(m.id);
                      }}
                      className={`flex items-center justify-between p-2 rounded-md text-xs transition-colors ${
                        isAlreadyMember
                          ? "opacity-50 cursor-not-allowed bg-muted/40"
                          : isSelected
                          ? "bg-primary/10 border-primary cursor-pointer"
                          : "hover:bg-card cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isAlreadyMember}
                          onChange={() => {
                            if (!isAlreadyMember) toggleMemberSelection(m.id);
                          }}
                          className="size-3.5 accent-primary cursor-pointer"
                        />
                        <div className="size-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                          {m.initials}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground block">{m.name}</span>
                          <span className="text-[10px] text-muted-foreground">{m.email}</span>
                        </div>
                      </div>

                      {isAlreadyMember ? (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Already Added
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {m.role}
                        </Badge>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-xs">
              <span className="text-muted-foreground">
                {selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddMemberModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={selectedMemberIds.length === 0 || isAddingMembers}
                  className="font-semibold"
                >
                  {isAddingMembers ? "Adding..." : "Add to Project"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Member Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-4 text-primary" /> Invite Collaborator to Project
            </DialogTitle>
            <DialogDescription>
              Choose how to share this invitation: via instant shareable link or email.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => handleSendInvitation(e)} className="space-y-4 pt-2">
            {/* Project Context */}
            <div className="p-3 rounded-lg bg-muted/40 border flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Project Workspace
                </span>
                <span className="text-xs font-bold text-foreground">
                  {project?.name || "Current Project"}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {project?.key || "KEY"}
              </Badge>
            </div>

            {/* Delivery Method Selection: Link vs Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Invitation Method *</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Choose delivery option
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setInviteDeliveryMethod("link")}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                    inviteDeliveryMethod === "link"
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                      : "border-border/80 bg-card/60 hover:bg-muted/40 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <Link2 className="size-3.5 text-primary" />
                      <span>Shareable Link</span>
                    </div>
                    {inviteDeliveryMethod === "link" && (
                      <Check className="size-3.5 text-primary font-bold" />
                    )}
                  </div>
                  <p className="text-[10.5px] text-muted-foreground leading-snug">
                    Generate an instant link to copy or share via chat / Slack.
                  </p>
                  <span className="mt-1.5 inline-flex items-center text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                    ⚡ Instant • No SMTP Needed
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setInviteDeliveryMethod("email")}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                    inviteDeliveryMethod === "email"
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                      : "border-border/80 bg-card/60 hover:bg-muted/40 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <Mail className="size-3.5 text-primary" />
                      <span>Send via Email</span>
                    </div>
                    {inviteDeliveryMethod === "email" && (
                      <Check className="size-3.5 text-primary font-bold" />
                    )}
                  </div>
                  <p className="text-[10.5px] text-muted-foreground leading-snug">
                    Send directly from your own Gmail or default email client.
                  </p>
                  <span className="mt-1.5 inline-flex items-center text-[9.5px] font-semibold text-primary">
                    ✉️ 1-Click Gmail / Mail Client
                  </span>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Full Name (Optional)</label>
              <input
                type="text"
                value={inviteFullName}
                onChange={(e) => setInviteFullName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
            </div>

            {/* Recipient Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Recipient Email Address *</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Must match recipient account
                </span>
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Offered Project Role or Responsibility *
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary capitalize"
              >
                <option value="developer">Developer</option>
                <option value="designer">Designer</option>
                <option value="reviewer">Reviewer / Lead</option>
                <option value="product_manager">Product Manager</option>
                <option value="qa_engineer">QA Engineer</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {/* Designation & Skills Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Designation / Title</label>
                <input
                  type="text"
                  value={inviteDesignation}
                  onChange={(e) => setInviteDesignation(e.target.value)}
                  placeholder="e.g. Senior Frontend Eng"
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Key Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={inviteSkills}
                  onChange={(e) => setInviteSkills(e.target.value)}
                  placeholder="React, TypeScript, UI"
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
                />
              </div>
            </div>

            {/* Invitation Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Personal Note / Welcome Message
              </label>
              <textarea
                rows={2}
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Looking forward to building this together..."
                className="w-full rounded-lg border border-input bg-card p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
            </div>

            {/* Form Footer with dual actions */}
            <div className="flex items-center justify-between pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInviteModalOpen(false)}
                disabled={isInviting}
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isInviting}
                  onClick={() => handleSendInvitation(undefined, "link")}
                  className="gap-1.5 border-primary/30 hover:bg-primary/5 hover:border-primary text-xs"
                >
                  <Link2 className="size-3.5 text-primary" />
                  Generate Link
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={isInviting}
                  onClick={() => handleSendInvitation(undefined, "email")}
                  className="gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs"
                >
                  <Send className="size-3.5" />
                  {isInviting ? "Processing..." : "Send via Email"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invitation Created & Shareable Link Modal */}
      {inviteResult && (() => {
        const recipientEmail = inviteResult.invitation.recipientEmail;
        const recipientName = inviteResult.invitation.recipientName || "";
        const projectName = inviteResult.invitation.projectName || project?.name || "TaskFlow Project";
        const role = inviteResult.invitation.role;
        const invitationUrl = inviteResult.invitationUrl;
        const message = inviteResult.invitation.message;
        const expiresAt = new Date(inviteResult.invitation.expiresAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        const emailSubject = `Invitation to collaborate on "${projectName}" on TaskFlow`;
        const emailBody = `Hi ${recipientName || "there"},\n\nYou've been invited to join the project "${projectName}" on TaskFlow as a ${role}.\n\nClick here to accept your invitation:\n${invitationUrl}\n\n${message ? `Note from inviter: "${message}"\n\n` : ""}This invitation expires on ${expiresAt}.\n\nBest regards,\n${inviteResult.invitation.inviterName || user?.fullName || "TaskFlow Team"}`;

        const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${emailSubject}\n\nAccept invitation here: ${invitationUrl}`)}`;

        return (
          <Dialog open={inviteResultModalOpen} onOpenChange={setInviteResultModalOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <Check className="size-4 text-emerald-500 stroke-[3]" /> Invitation Ready
                </DialogTitle>
                <DialogDescription>
                  Share the invitation via link or send directly from your personal email.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Delivery Notification Banner */}
                {inviteResult.emailSent ? (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Email Invitation Dispatched</span>
                      <span>
                        An invitation email has been delivered to <strong>{recipientEmail}</strong>.
                      </span>
                    </div>
                  </div>
                ) : inviteResult.deliveryMethod === "link" || inviteResult.emailSkipped ? (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs flex items-start gap-2.5">
                    <Link2 className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Shareable Link Ready (No SMTP Needed)</span>
                      <span className="text-muted-foreground">
                        Your secure link is generated. Copy it below or click to send it directly from your own Gmail / email app.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
                    <Info className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <span className="font-bold block">Send from Your Own Email</span>
                      <span>
                        Server SMTP is not configured. Click the <strong>Open in Gmail</strong> or <strong>Default Email App</strong> button below to send this invitation from your own email account!
                      </span>
                    </div>
                  </div>
                )}

                {/* 1-Click Send via User's Own Email Client */}
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Mail className="size-4 text-primary" /> Send Using Your Email Account
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-background">
                      Direct & Reliable
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Send directly from your email to <strong>{recipientEmail}</strong> with pre-filled link:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs font-semibold"
                      onClick={() => window.open(gmailComposeUrl, "_blank", "noopener,noreferrer")}
                    >
                      <Mail className="size-3.5" /> Open in Gmail
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs cursor-pointer border-input hover:bg-card font-medium"
                      onClick={() => {
                        window.location.href = mailtoUrl;
                      }}
                    >
                      <ExternalLink className="size-3.5" /> Default Email App
                    </Button>
                  </div>
                </div>

                {/* Secure Shareable Link Box */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Secure Shareable Link</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Valid for 7 days</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={invitationUrl}
                      className="flex-1 h-9 rounded-lg border border-input bg-card px-3 text-xs font-mono text-muted-foreground select-all"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(invitationUrl);
                        setHasCopiedLink(true);
                        toast.success("Invitation link copied to clipboard!");
                        setTimeout(() => setHasCopiedLink(false), 2500);
                      }}
                      className="gap-1.5 shrink-0 bg-primary cursor-pointer text-xs"
                    >
                      {hasCopiedLink ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      {hasCopiedLink ? "Copied!" : "Copy Link"}
                    </Button>
                  </div>
                </div>

                {/* Additional Quick Share Options */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs cursor-pointer text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                    onClick={() => window.open(whatsappUrl, "_blank", "noopener,noreferrer")}
                  >
                    <MessageCircle className="size-3.5" /> Share via WhatsApp
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs cursor-pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(emailBody);
                      setHasCopiedTemplate(true);
                      toast.success("Full email message copied to clipboard!");
                      setTimeout(() => setHasCopiedTemplate(false), 2500);
                    }}
                  >
                    {hasCopiedTemplate ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {hasCopiedTemplate ? "Copied Message!" : "Copy Full Message"}
                  </Button>
                </div>

                {/* Metadata summary */}
                <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-lg bg-muted/40 border">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Recipient
                    </span>
                    <span className="font-semibold text-foreground">
                      {recipientEmail}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Role Offered
                    </span>
                    <Badge variant="outline" className="text-[10px] capitalize font-semibold mt-0.5">
                      {role}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Status
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 font-semibold mt-0.5"
                    >
                      Pending Acceptance
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Expires
                    </span>
                    <span className="text-muted-foreground">{expiresAt}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t">
                  <Button size="sm" onClick={() => setInviteResultModalOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
