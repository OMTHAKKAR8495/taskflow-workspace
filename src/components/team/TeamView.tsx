import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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
  MoreVertical,
  Copy,
  Send,
  RefreshCw,
  XCircle,
  Check,
  Info,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { taskService } from "@/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge, PriorityBadge } from "@/components/tasks/badges";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { MemberProfileDrawer } from "./MemberProfileDrawer";
import { toast } from "sonner";
import type { Task, TeamMember, ProjectInvitation, CreateInvitationResponse } from "@/types";

export function TeamView() {
  const { team, tasks, projects, addTeamMember } = useTasks();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [inspectingMember, setInspectingMember] = useState<TeamMember | null>(null);
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);

  // Invite Member modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteProjectId, setInviteProjectId] = useState("");
  const [inviteRole, setInviteRole] = useState("developer");
  const [inviteSkills, setInviteSkills] = useState("");
  const [inviteDesignation, setInviteDesignation] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // Invite Result Modal state (matching ProjectWorkspaceView pattern)
  const [inviteResult, setInviteResult] = useState<CreateInvitationResponse | null>(null);
  const [inviteResultModalOpen, setInviteResultModalOpen] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Secondary "Add member without invite" modal state
  const [addDirectMemberOpen, setAddDirectMemberOpen] = useState(false);
  const [directName, setDirectName] = useState("");
  const [directEmail, setDirectEmail] = useState("");
  const [directRole, setDirectRole] = useState("Software Engineer");
  const [isSubmittingDirect, setIsSubmittingDirect] = useState(false);

  // Pending Invitations list state
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  // Check invitation permissions: owners, leads, or workspace admins
  const canInvite = useMemo(() => {
    if (!user) return true;
    const r = (user.role || "").toLowerCase();
    if (!r || r === "admin" || r === "owner" || r === "lead" || user.id === "user-om") return true;
    return projects.some(
      (p) =>
        p.owner_id === user.id ||
        (p as any).ownerId === user.id ||
        (p.members || []).some(
          (m: any) =>
            (m.userId === user.id || m.id === user.id) &&
            ["owner", "lead", "admin"].includes((m.role || "").toLowerCase()),
        ),
    );
  }, [user, projects]);

  // Set default project ID when projects load
  useEffect(() => {
    if (projects.length > 0 && !inviteProjectId) {
      setInviteProjectId(projects[0].id);
    }
  }, [projects, inviteProjectId]);

  // Load all invitations across projects
  const loadInvitations = async () => {
    try {
      if (invitations.length === 0) {
        setLoadingInvitations(true);
      }
      if (taskService.getAllInvitations) {
        const list = await taskService.getAllInvitations();
        setInvitations(list || []);
      } else if (taskService.getProjectInvitations && projects.length > 0) {
        const lists = await Promise.all(
          projects.map((p) => taskService.getProjectInvitations!(p.id).catch(() => [])),
        );
        const combined = lists.flat();
        setInvitations(combined);
      }
    } catch (err) {
      console.error("Error loading team invitations:", err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    void loadInvitations();
  }, [projects.length]);

  const pendingInvitations = useMemo(() => {
    return invitations.filter((inv) => inv.status === "pending");
  }, [invitations]);

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
      const mid = m.id.toLowerCase();
      const memail = (m.email || "").toLowerCase();
      const mname = (m.name || "").toLowerCase();

      map[m.id] = nonTrash.filter(
        (t) =>
          (t.assigneeId && t.assigneeId.toLowerCase() === mid) ||
          (t.assignee?.id && t.assignee.id.toLowerCase() === mid) ||
          (t.assignee?.email && memail && t.assignee.email.toLowerCase() === memail) ||
          (t.assigneeName && mname && t.assigneeName.toLowerCase() === mname) ||
          ((t as any).assignee_id && (t as any).assignee_id.toLowerCase() === mid),
      );
    }
    return map;
  }, [team, nonTrash]);

  // Handle Send Invitation
  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteProjectId) {
      toast.error("Please enter a valid email and select a target project");
      return;
    }

    const cleanEmail = inviteEmail.trim().toLowerCase();

    // Check if duplicate pending invite exists
    const hasPending = pendingInvitations.some(
      (inv) => inv.recipientEmail.toLowerCase() === cleanEmail && inv.projectId === inviteProjectId,
    );
    if (hasPending) {
      toast.error(`A pending invitation for ${cleanEmail} already exists on this project.`);
      return;
    }

    setIsInviting(true);
    try {
      if (!taskService.createProjectInvitation) throw new Error("Invitation service unavailable");

      const res = await taskService.createProjectInvitation(inviteProjectId, {
        email: cleanEmail,
        fullName: inviteFullName.trim() || undefined,
        role: inviteRole,
        skills: inviteSkills.trim() || undefined,
        designation: inviteDesignation.trim() || undefined,
        message: inviteMessage.trim() || undefined,
      });

      setInviteResult(res);
      setInviteModalOpen(false);
      setInviteResultModalOpen(true);
      setInviteFullName("");
      setInviteEmail("");
      setInviteSkills("");
      setInviteDesignation("");
      setInviteMessage("");
      void loadInvitations();

      if (res.emailSent) {
        toast.success(`Invitation emailed to ${cleanEmail}`);
      } else {
        toast.info("Invitation created! Shareable link generated.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyInviteLink = (url: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      toast.success("Invitation link copied to clipboard!");
    } else {
      toast.info("Could not access clipboard. Please copy manually.");
    }
  };

  const handleCopyText = (text: string, successMsg = "Copied to clipboard!") => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      toast.success(successMsg);
    } else {
      toast.info(text);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setActionInProgressId(invitationId);
    try {
      if (!taskService.resendProjectInvitation) throw new Error("Service unavailable");
      const res = await taskService.resendProjectInvitation(invitationId);
      void loadInvitations();

      if (res.emailSent) {
        toast.success("Invitation resent via email with a rotated security token!");
      } else {
        toast.info("Token rotated! Copy the updated single-use link.");
        const matched = invitations.find((i) => i.id === invitationId);
        setInviteResult({
          success: true,
          invitation: matched as any,
          rawToken: res.rawToken,
          invitationUrl: res.invitationUrl,
          emailSent: false,
          emailError: res.emailError,
        });
        setInviteResultModalOpen(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to resend invitation");
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    if (
      !confirm(
        `Are you sure you want to revoke the invitation for ${email}? The link will immediately stop working.`,
      )
    ) {
      return;
    }
    setActionInProgressId(invitationId);
    try {
      if (!taskService.revokeProjectInvitation) throw new Error("Service unavailable");
      await taskService.revokeProjectInvitation(invitationId);
      toast.success("Invitation revoked successfully");
      void loadInvitations();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke invitation");
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleInviteSpecificMember = (memberEmail: string) => {
    setInviteEmail(memberEmail);
    setInviteModalOpen(true);
  };

  const handleCopyMemberInviteLink = async (memberEmail: string) => {
    const clean = memberEmail.toLowerCase().trim();
    const existing = pendingInvitations.find((i) => i.recipientEmail.toLowerCase() === clean);
    if (existing) {
      // Rotate token and show link
      await handleResendInvitation(existing.id);
    } else {
      // Pre-fill invite dialog so owner can choose project and generate link
      setInviteEmail(memberEmail);
      setInviteModalOpen(true);
      toast.info(`Choose a project to generate an invitation link for ${memberEmail}`);
    }
  };

  // Secondary Direct Add Member (without sending an invite link)
  const handleAddDirectMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directName.trim() || !directEmail.trim()) return;

    setIsSubmittingDirect(true);
    try {
      await addTeamMember({
        name: directName.trim(),
        email: directEmail.trim(),
        role: directRole.trim(),
      });
      setAddDirectMemberOpen(false);
      setDirectName("");
      setDirectEmail("");
      toast.success(`${directName} added to the team directory`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add member");
    } finally {
      setIsSubmittingDirect(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Team Directory & Workload
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              {team.length} Members
            </Badge>
            {pendingInvitations.length > 0 && (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs"
              >
                {pendingInvitations.length} Pending Invites
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage engineering capacity, invite members to active projects, and oversee workload
            distribution.
          </p>
        </div>

        {canInvite && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setInviteEmail("");
                setInviteModalOpen(true);
              }}
              className="gap-2 cursor-pointer shadow-sm shadow-indigo-600/25 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <UserPlus className="size-4" /> Invite Member
            </Button>
          </div>
        )}
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
              className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs hover:shadow-md transition-all relative group"
            >
              <div>
                {/* Profile Header (Clickable to view member profile & tasks) */}
                <div className="flex items-start justify-between">
                  <div
                    onClick={() => {
                      setInspectingMember(member);
                      setMemberDrawerOpen(true);
                    }}
                    className="flex items-center gap-3 cursor-pointer group/header hover:opacity-90 transition-opacity"
                    title="Click to view assigned & completed tasks"
                  >
                    <div className="size-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shadow-2xs group-hover/header:ring-2 group-hover/header:ring-primary/40 transition-all">
                      {member.initials}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground group-hover/header:text-primary transition-colors flex items-center gap-1.5">
                        {member.name}
                        <ExternalLink className="size-3 opacity-0 group-hover/header:opacity-100 transition-opacity text-primary" />
                      </h3>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Briefcase className="size-3" /> {member.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
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

                    {/* Member Action Menu (⋯) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 text-xs">
                        <DropdownMenuItem
                          onClick={() => {
                            setInspectingMember(member);
                            setMemberDrawerOpen(true);
                          }}
                          className="cursor-pointer gap-2 font-medium text-primary"
                        >
                          <ListTodo className="size-3.5" /> View Profile & Tasks
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {canInvite && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleInviteSpecificMember(member.email)}
                              className="cursor-pointer gap-2"
                            >
                              <UserPlus className="size-3.5" /> Invite to Project
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCopyMemberInviteLink(member.email)}
                              className="cursor-pointer gap-2"
                            >
                              <Copy className="size-3.5" /> Share / Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleCopyText(member.email, "Email address copied!")}
                          className="cursor-pointer gap-2"
                        >
                          <Mail className="size-3.5" /> Copy Email Address
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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

                {/* Workload Progress Bar (Clickable) */}
                <div
                  onClick={() => {
                    setInspectingMember(member);
                    setMemberDrawerOpen(true);
                  }}
                  className="mt-4 space-y-1.5 cursor-pointer hover:opacity-85 transition-opacity"
                  title="Click to view full workload & tasks"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Sprint Capacity</span>
                    <span className="font-semibold text-foreground">
                      {activeTasks.length} active ({totalHours}h estimated)
                    </span>
                  </div>
                  <Progress value={Math.min(capacityPercent, 100)} className="h-1.5" />
                </div>

                {/* Task Breakdown Chips (Clickable) */}
                <div className="mt-4 grid grid-cols-4 gap-1.5 text-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingMember(member);
                      setMemberDrawerOpen(true);
                    }}
                    className="rounded-lg bg-muted/40 p-1.5 hover:bg-muted/70 transition-colors cursor-pointer text-left"
                    title="View In Progress tasks"
                  >
                    <span className="text-[10px] text-muted-foreground block text-center">Progress</span>
                    <span className="font-bold text-primary block text-center">{inProgressTasks.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingMember(member);
                      setMemberDrawerOpen(true);
                    }}
                    className="rounded-lg bg-muted/40 p-1.5 hover:bg-muted/70 transition-colors cursor-pointer text-left"
                    title="View In Review tasks"
                  >
                    <span className="text-[10px] text-muted-foreground block text-center">Review</span>
                    <span className="font-bold text-purple-600 block text-center">{inReviewTasks.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingMember(member);
                      setMemberDrawerOpen(true);
                    }}
                    className="rounded-lg bg-muted/40 p-1.5 hover:bg-muted/70 transition-colors cursor-pointer text-left ring-1 ring-emerald-500/20"
                    title="View Completed tasks"
                  >
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block text-center">Done</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-center">{completedTasks.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingMember(member);
                      setMemberDrawerOpen(true);
                    }}
                    className="rounded-lg bg-muted/40 p-1.5 hover:bg-muted/70 transition-colors cursor-pointer text-left"
                    title="View Overdue tasks"
                  >
                    <span className="text-[10px] text-muted-foreground block text-center">Overdue</span>
                    <span className="font-bold text-rose-600 block text-center">{overdueTasks.length}</span>
                  </button>
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

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingMember(member);
                      setMemberDrawerOpen(true);
                    }}
                    className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    View profile & all tasks <ArrowRight className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Invitations Section */}
      <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-4">
          <div className="flex items-center gap-2">
            <Mail className="size-5 text-indigo-500" />
            <h2 className="text-base font-bold text-foreground">Pending Invitations</h2>
            <Badge variant="outline" className="text-xs">
              {pendingInvitations.length} Active
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            Single-use cryptographic links awaiting acceptance
          </span>
        </div>

        {loadingInvitations ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <RefreshCw className="size-4 animate-spin text-primary" /> Loading pending invitations...
          </div>
        ) : pendingInvitations.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="size-8 mx-auto mb-2 text-emerald-500/70" />
            <p className="font-semibold text-foreground">No pending invitations</p>
            <p className="mt-1">
              All invited teammates have accepted and joined their assigned projects.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border overflow-hidden">
            {pendingInvitations.map((inv) => {
              const targetProject = projects.find((p) => p.id === inv.projectId);
              const projectName = inv.projectName || targetProject?.name || "Workspace Project";
              const projectColor = inv.projectColor || targetProject?.color || "#6366f1";
              const isBusy = actionInProgressId === inv.id;

              const isExpired = new Date(inv.expiresAt) <= new Date();

              return (
                <div
                  key={inv.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card hover:bg-muted/30 transition-colors text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-sm">
                        {inv.recipientEmail}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold capitalize flex items-center gap-1"
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: projectColor }}
                        />
                        {projectName}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {inv.role}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          isExpired
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        }`}
                      >
                        {isExpired ? "Expired" : "Pending Acceptance"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                      <span>
                        Expires:{" "}
                        <strong className="text-foreground">
                          {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </strong>
                      </span>
                      {inv.inviterName && (
                        <span>
                          Invited by: <strong>{inv.inviterName}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleResendInvitation(inv.id)}
                      className="gap-1.5 h-8 text-xs cursor-pointer"
                      title="Resend email or rotate security token"
                    >
                      <RefreshCw className={`size-3.5 ${isBusy ? "animate-spin" : ""}`} />
                      Resend / Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleRevokeInvitation(inv.id, inv.recipientEmail)}
                      className="gap-1.5 h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                      title="Revoke invitation link"
                    >
                      <XCircle className="size-3.5" />
                      Revoke
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Member Profile & Assigned Tasks Drawer */}
      <MemberProfileDrawer
        member={inspectingMember}
        tasks={tasks}
        open={memberDrawerOpen}
        onClose={() => setMemberDrawerOpen(false)}
        onOpenTask={(task) => setSelectedTask(task)}
        onAssignTask={(m) => {
          setMemberDrawerOpen(false);
          navigate({ to: "/tasks/new", search: { assigneeId: m.id } as any });
        }}
      />

      {/* 1. Primary "Invite Member" Dialog */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-5 text-indigo-500" /> Invite Team Member
            </DialogTitle>
            <DialogDescription>
              Invite someone to a project via email and generate a secure single-use acceptance link.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendInvitation} className="space-y-4 pt-2">
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
              <label className="text-xs font-semibold text-foreground">Email Address *</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
            </div>

            {/* Target Project Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Project *</label>
              <select
                required
                value={inviteProjectId}
                onChange={(e) => setInviteProjectId(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.key || "PRJ"})
                  </option>
                ))}
              </select>
            </div>

            {/* Role Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Role or Responsibility *</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
              >
                <option value="developer">Developer</option>
                <option value="designer">Designer</option>
                <option value="lead">Lead / Scrum Master</option>
                <option value="reviewer">Reviewer</option>
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
              </select>
            </div>

            {/* Skills & Designation */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Skills (Optional)</label>
                <input
                  type="text"
                  value={inviteSkills}
                  onChange={(e) => setInviteSkills(e.target.value)}
                  placeholder="e.g. React, Node.js"
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Designation (Optional)</label>
                <input
                  type="text"
                  value={inviteDesignation}
                  onChange={(e) => setInviteDesignation(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
                />
              </div>
            </div>

            {/* Optional Personal Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Personal Message (Optional)
              </label>
              <textarea
                rows={2}
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Welcome! Join us on TaskFlow to review sprint tasks and project roadmap."
                className="w-full rounded-lg border border-input bg-card p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setInviteModalOpen(false);
                  setAddDirectMemberOpen(true);
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Add without sending invite
              </button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInviteModalOpen(false)}
                  disabled={isInviting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isInviting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs shadow-indigo-600/30"
                >
                  <Send className="size-3.5" />
                  {isInviting ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Invitation Ready & Shareable Link Modal (Reusing ProjectWorkspaceView pattern) */}
      {inviteResult && (
        <Dialog open={inviteResultModalOpen} onOpenChange={setInviteResultModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Check className="size-4 text-emerald-500 stroke-[3]" /> Invitation Ready
              </DialogTitle>
              <DialogDescription>
                Review invitation details and share the secure single-use acceptance link.
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
                      An invitation email has been sent to{" "}
                      <strong>{inviteResult.invitation.recipientEmail}</strong>.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
                  <Info className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-bold block">Email Service Not Configured</span>
                    <span>
                      {inviteResult.emailError || "SMTP / Resend provider is not active."} You can
                      copy the generated secure acceptance link below and share it directly.
                    </span>
                  </div>
                </div>
              )}

              {/* Metadata summary */}
              <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-lg bg-muted/40 border">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Recipient
                  </span>
                  <span className="font-semibold text-foreground">
                    {inviteResult.invitation.recipientEmail}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Role Offered
                  </span>
                  <Badge variant="outline" className="text-[10px] capitalize font-semibold mt-0.5">
                    {inviteResult.invitation.role}
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
                  <span className="text-muted-foreground">
                    {new Date(inviteResult.invitation.expiresAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Shareable Link Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Secure Shareable Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteResult.invitationUrl}
                    className="flex-1 h-9 rounded-lg border border-input bg-card px-3 text-xs font-mono text-muted-foreground select-all"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleCopyInviteLink(inviteResult.invitationUrl)}
                    className="gap-1.5 shrink-0 bg-primary cursor-pointer text-xs"
                  >
                    <Copy className="size-3.5" /> Copy Link
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The recipient must accept this link using an account matching{" "}
                  <strong>{inviteResult.invitation.recipientEmail}</strong>.
                </p>
              </div>

              <div className="flex justify-end pt-3 border-t">
                <Button size="sm" onClick={() => setInviteResultModalOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 3. Secondary Direct Add Member Dialog (no email/token dispatch) */}
      <Dialog open={addDirectMemberOpen} onOpenChange={setAddDirectMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member Directly</DialogTitle>
            <DialogDescription>
              Create a team directory record without sending an invitation email or link.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddDirectMember} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Full Name *</label>
              <input
                type="text"
                required
                value={directName}
                onChange={(e) => setDirectName(e.target.value)}
                placeholder="e.g. David Kumar"
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email Address *</label>
              <input
                type="email"
                required
                value={directEmail}
                onChange={(e) => setDirectEmail(e.target.value)}
                placeholder="david.k@example.com"
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Role / Title *</label>
              <input
                type="text"
                required
                value={directRole}
                onChange={(e) => setDirectRole(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddDirectMemberOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmittingDirect}>
                {isSubmittingDirect ? "Adding..." : "Add Directly"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
