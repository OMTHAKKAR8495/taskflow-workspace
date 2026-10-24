import { computeStats } from "@/lib/task-utils";
import type {
  Activity,
  ActivityType,
  Profile,
  Project,
  Task,
  TaskInput,
  TeamMember,
} from "@/types";
import {
  buildSeedActivity,
  buildSeedProfile,
  buildSeedProjects,
  buildSeedTasks,
  buildTeamMembers,
  buildNewUserTasks,
  SEED_PROJECTS,
  SEED_TEAM_MEMBERS,
} from "./mockData";
import type { TaskService } from "./taskService.types";

interface Store {
  tasks: Task[];
  projects: Project[];
  team: TeamMember[];
  profile: Profile;
  activity: Activity[];
  invitations?: any[];
  rawTokens?: Record<string, string>;
}

const LATENCY_MS = 100;
const memoryStores: Record<string, Store> = {};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getActiveUser(): {
  id: string;
  fullName: string;
  email: string;
  username?: string;
} | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem("taskflow:auth_user");
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function getStorageKey(): string {
  const user = getActiveUser();
  if (user?.id) {
    return `taskflow:store:${user.id}`;
  }
  return "taskflow:store:user-om";
}

function load(): Store {
  const key = getStorageKey();
  const activeUser = getActiveUser();
  const isDefaultUser =
    !activeUser || activeUser.id === "user-om" || activeUser.username === "omthakkar";

  if (isBrowser()) {
    try {
      const raw = window.localStorage.getItem(key);

      if (raw) {
        const parsed = JSON.parse(raw) as Store;
        if (parsed && Array.isArray(parsed.tasks)) {
          // Ensure projects and team exist in parsed store
          if (!parsed.projects || parsed.projects.length === 0) {
            parsed.projects = buildSeedProjects();
          } else {
            parsed.projects = parsed.projects.map((p) => ({
              ...p,
              health: p.health || "on_track",
              priority: p.priority || "medium",
              progress: typeof p.progress === "number" ? p.progress : 0,
            }));
          }
          if (!parsed.team || parsed.team.length === 0) {
            parsed.team = buildTeamMembers();
          }

          // Backfill projects and assignees on tasks if missing
          parsed.tasks = parsed.tasks.map((t, idx) => {
            if (!t.projectId) {
              const proj = parsed.projects[idx % parsed.projects.length];
              if (proj) {
                t.projectId = proj.id;
                t.projectName = proj.name;
                t.projectColor = proj.color;
              }
            }
            if (!t.assignee) {
              const mem = parsed.team[idx % parsed.team.length];
              if (mem) {
                t.assignee = mem;
              }
            }
            if (!t.subtasks) {
              t.subtasks = [
                {
                  id: `sub-${t.id}-1`,
                  title: "Define specifications and scope",
                  completed: t.status === "completed",
                },
                {
                  id: `sub-${t.id}-2`,
                  title: "Implement core solution",
                  completed: t.status === "completed",
                },
              ];
            }
            return t;
          });

          memoryStores[key] = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read from localStorage, using memory/seed:", e);
    }
  }

  if (memoryStores[key]) {
    return memoryStores[key];
  }

  const userId = activeUser?.id || "user-om";
  const userFullName = activeUser?.fullName || "Om Thakkar";
  const userEmail = activeUser?.email || "omthakkar@example.com";

  const tasks = isDefaultUser ? buildSeedTasks(userId) : buildNewUserTasks(userId);
  const initialStore: Store = {
    tasks,
    projects: buildSeedProjects(),
    team: buildTeamMembers(),
    profile: buildSeedProfile(userFullName, userEmail, userId),
    activity: buildSeedActivity(tasks),
  };
  memoryStores[key] = initialStore;

  if (isBrowser()) {
    try {
      window.localStorage.setItem(key, JSON.stringify(initialStore));
    } catch (e) {
      console.warn("Could not write to localStorage:", e);
    }
  }

  return initialStore;
}

function save(store: Store) {
  const key = getStorageKey();
  memoryStores[key] = store;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(key, JSON.stringify(store));
    } catch (e) {
      console.error("Failed to persist tasks to localStorage:", e);
    }
  }
}

const wait = () => new Promise((r) => setTimeout(r, LATENCY_MS));
const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function log(store: Store, type: ActivityType, task: Task) {
  store.activity = [
    { id: uid("act"), type, taskId: task.id, taskTitle: task.title, at: new Date().toISOString() },
    ...store.activity,
  ].slice(0, 30);
}

export const mockTaskService: TaskService = {
  async getTasks() {
    await wait();
    return load().tasks;
  },

  async getTaskById(id) {
    await wait();
    return load().tasks.find((t) => t.id === id) ?? null;
  },

  async getProjects() {
    await wait();
    const store = load();
    return store.projects.map((p) => {
      const pTasks = store.tasks.filter((t) => t.projectId === p.id);
      const completed = pTasks.filter((t) => t.status === "completed").length;
      return {
        ...p,
        taskCount: pTasks.length,
        completedCount: completed,
      };
    });
  },

  async getTeamMembers() {
    await wait();
    return load().team;
  },

  async addTeamMember(data: { name: string; email: string; role: string; avatarUrl?: string }) {
    await wait();
    const store = load();
    const cleanName = data.name.trim();
    const cleanEmail = data.email.trim();
    const cleanRole = data.role.trim() || "Software Engineer";
    const initials =
      cleanName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "TM";

    const newMember: TeamMember = {
      id: uid("team"),
      name: cleanName,
      email: cleanEmail,
      role: cleanRole,
      avatarUrl: data.avatarUrl || "",
      initials,
      workload: {
        activeTasks: 0,
        inProgressTasks: 0,
        inReviewTasks: 0,
        blockedTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        capacityPercent: 0,
        totalEstimatedHours: 0,
      },
      projects: [],
    };

    store.team.push(newMember);
    save(store);
    return newMember;
  },

  async createTask(data: TaskInput) {
    await wait();
    const store = load();
    const user = getActiveUser();
    const userId = user?.id || "user-om";
    const now = new Date().toISOString();

    const proj = store.projects.find((p) => p.id === data.projectId) || store.projects[0];
    const assignee = store.team.find((m) => m.id === data.assigneeId) || store.team[0];

    const subtasks =
      data.subtasks && data.subtasks.length > 0
        ? data.subtasks.map((s, idx) => ({
            id: uid(`sub-${idx}`),
            title: s.title,
            completed: Boolean(s.completed),
          }))
        : [];

    const task: Task = {
      ...data,
      id: uid("task"),
      userId,
      projectId: proj?.id,
      projectName: proj?.name,
      projectColor: proj?.color,
      assignee,
      tags: data.tags || ["General"],
      estimate: data.estimate || "3 pts",
      subtasks,
      createdAt: now,
      updatedAt: now,
    };

    store.tasks = [task, ...store.tasks];
    log(store, "created", task);
    save(store);
    return task;
  },

  async updateTask(id, data) {
    await wait();
    const store = load();
    const existing = store.tasks.find((t) => t.id === id);
    if (!existing) throw new Error("Task not found");

    let projectName = existing.projectName;
    let projectColor = existing.projectColor;
    if (data.projectId !== undefined) {
      if (!data.projectId) {
        projectName = undefined;
        projectColor = undefined;
      } else {
        const proj = store.projects.find((p) => p.id === data.projectId);
        if (proj) {
          projectName = proj.name;
          projectColor = proj.color;
        }
      }
    }

    let assignee = existing.assignee;
    if (data.assigneeId !== undefined) {
      if (!data.assigneeId) {
        assignee = undefined;
      } else {
        const found = store.team.find((m) => m.id === data.assigneeId);
        if (found) assignee = found;
      }
    }

    let subtasks = existing.subtasks;
    if (data.subtasks !== undefined) {
      subtasks = data.subtasks.map((s, idx) => ({
        id: `sub-${id}-${idx}`,
        title: s.title,
        completed: Boolean(s.completed),
      }));
    }

    const { subtasks: _s, ...restData } = data;
    const updated: Task = {
      ...existing,
      ...restData,
      projectName,
      projectColor,
      assignee,
      subtasks,
      completedAt:
        data.status === "completed" ||
        (data.status === undefined && existing.status === "completed")
          ? existing.completedAt || new Date().toISOString()
          : null,
      updatedAt: new Date().toISOString(),
    };

    store.tasks = store.tasks.map((t) => (t.id === id ? updated : t));
    const becameDone = existing.status !== "completed" && updated.status === "completed";

    // Auto-schedule next recurrence if recurring task became done
    if (becameDone && updated.recurrence && updated.recurrence !== "none") {
      const baseDate = updated.dueDate ? new Date(updated.dueDate) : new Date();
      const nextDue = new Date(baseDate);
      if (updated.recurrence === "daily") {
        nextDue.setDate(nextDue.getDate() + 1);
      } else if (updated.recurrence === "weekly") {
        nextDue.setDate(nextDue.getDate() + 7);
      } else if (updated.recurrence === "monthly") {
        nextDue.setMonth(nextDue.getMonth() + 1);
      } else if (updated.recurrence === "weekdays") {
        do {
          nextDue.setDate(nextDue.getDate() + 1);
        } while (nextDue.getDay() === 0 || nextDue.getDay() === 6);
      }

      const nextTask: Task = {
        ...updated,
        id: uid("task"),
        status: "pending",
        dueDate: nextDue.toISOString(),
        completedAt: null,
        subtasks: updated.subtasks?.map((s, idx) => ({
          ...s,
          id: `sub-${Date.now()}-${idx}`,
          completed: false,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.tasks = [nextTask, ...store.tasks];
      log(store, "created", nextTask);
    }

    log(store, becameDone ? "completed" : "updated", updated);
    save(store);
    return updated;
  },

  async toggleSubtask(taskId: string, subtaskId: string) {
    await wait();
    const store = load();
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("Task not found");

    const updatedSubtasks = (task.subtasks || []).map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s,
    );

    // Auto-update task status if all subtasks completed
    const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.completed);
    const newStatus = allDone
      ? "completed"
      : task.status === "completed"
        ? "in_progress"
        : task.status;

    const updated: Task = {
      ...task,
      status: newStatus,
      subtasks: updatedSubtasks,
      completedAt: newStatus === "completed" ? task.completedAt || new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };

    store.tasks = store.tasks.map((t) => (t.id === taskId ? updated : t));
    log(store, allDone ? "completed" : "updated", updated);
    save(store);
    return updated;
  },

  async deleteTask(id) {
    await wait();
    const store = load();
    const existing = store.tasks.find((t) => t.id === id);
    if (!existing) throw new Error("Task not found");
    // Soft delete into Trash
    existing.isTrash = true;
    existing.deletedAt = new Date().toISOString();
    log(store, "deleted", existing);
    save(store);
  },

  async restoreTask(id: string) {
    await wait();
    const store = load();
    const existing = store.tasks.find((t) => t.id === id);
    if (!existing) throw new Error("Task not found");
    existing.isTrash = false;
    existing.deletedAt = null;
    existing.updatedAt = new Date().toISOString();
    log(store, "updated", existing);
    save(store);
    return existing;
  },

  async permanentDeleteTask(id: string) {
    await wait();
    const store = load();
    store.tasks = store.tasks.filter((t) => t.id !== id);
    save(store);
  },

  async emptyTrash() {
    await wait();
    const store = load();
    store.tasks = store.tasks.filter((t) => !t.isTrash);
    save(store);
  },

  async toggleBookmark(id) {
    await wait();
    const store = load();
    const existing = store.tasks.find((t) => t.id === id);
    if (!existing) throw new Error("Task not found");
    const updated: Task = {
      ...existing,
      isBookmarked: !existing.isBookmarked,
      updatedAt: new Date().toISOString(),
    };
    store.tasks = store.tasks.map((t) => (t.id === id ? updated : t));
    log(store, "updated", updated);
    save(store);
    return updated;
  },

  async addComment(id, content, author) {
    await wait();
    const store = load();
    const existing = store.tasks.find((t) => t.id === id);
    if (!existing) throw new Error("Task not found");
    const user = getActiveUser();
    const finalAuthor = author || user?.fullName || "Om Thakkar";
    const newComment = {
      id: uid("comment"),
      author: finalAuthor,
      content,
      createdAt: new Date().toISOString(),
    };
    const updated: Task = {
      ...existing,
      comments: [...(existing.comments || []), newComment],
      updatedAt: new Date().toISOString(),
    };
    store.tasks = store.tasks.map((t) => (t.id === id ? updated : t));
    save(store);
    return updated;
  },

  async updateTaskStatus(taskId, status, blockedReason) {
    await wait();
    const store = load();
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("Task not found");
    const updated: Task = {
      ...task,
      status,
      blockedReason: blockedReason || (status === "blocked" ? task.blockedReason : ""),
      completedAt: status === "completed" ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
    store.tasks = store.tasks.map((t) => (t.id === taskId ? updated : t));
    log(store, status === "completed" ? "completed" : "updated", updated);
    save(store);
    return updated;
  },

  async getProjectById(id: string) {
    await wait();
    const store = load();
    return store.projects.find((p) => p.id === id) || null;
  },

  async createProject(data: Partial<Project>) {
    await wait();
    const store = load();
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: data.name || "Untitled Project",
      key: data.key || "NEX",
      description: data.description || "",
      color: data.color || "#4f46e5",
      status: (data.status as any) || "active",
      priority: data.priority || "medium",
      health: data.health || "on_track",
      lead: data.lead || "Om Thakkar",
      progress: 0,
      taskCount: 0,
      completedCount: 0,
      startDate: data.startDate || null,
      deadline: data.deadline || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.projects.push(newProj);
    save(store);
    return newProj;
  },

  async updateProject(id: string, data: Partial<Project>) {
    await wait();
    const store = load();
    const idx = store.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Project not found");
    const updated = { ...store.projects[idx], ...data, updatedAt: new Date().toISOString() };
    store.projects[idx] = updated;
    save(store);
    return updated;
  },

  async archiveProject(id: string) {
    await wait();
    const store = load();
    const idx = store.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Project not found");
    const isArchived = store.projects[idx].status === "archived";
    const updated = {
      ...store.projects[idx],
      status: isArchived ? ("active" as const) : ("archived" as const),
      archivedAt: isArchived ? null : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.projects[idx] = updated;
    save(store);
    return updated;
  },

  async deleteProject(id: string) {
    await wait();
    const store = load();
    store.projects = store.projects.filter((p) => p.id !== id);
    save(store);
  },

  async addProjectMember(projectId: string, userId: string | string[], role = "member") {
    await wait();
    const store = load();
    const proj = store.projects.find((p) => p.id === projectId);
    if (!proj) throw new Error("Project not found");
    if (!proj.members) proj.members = [];
    const ids = Array.isArray(userId) ? userId : [userId];
    for (const uid of ids) {
      if (!proj.members.some((m) => m.id === uid)) {
        const teamMember = store.team.find((t) => t.id === uid);
        proj.members.push({
          id: uid,
          membershipId: `pm-${Date.now()}-${uid}`,
          name: teamMember?.name || `Member ${uid}`,
          email: teamMember?.email || `${uid}@taskflow.local`,
          role,
          initials: teamMember?.initials || uid.slice(0, 2).toUpperCase(),
          joinedAt: new Date().toISOString(),
        });
      }
    }
    save(store);
  },

  async removeProjectMember(projectId: string, userId: string) {
    await wait();
    const store = load();
    const proj = store.projects.find((p) => p.id === projectId);
    if (proj && proj.members) {
      proj.members = proj.members.filter((m) => m.id !== userId);
      save(store);
    }
  },

  async getProjectSubmissions(projectId: string) {
    await wait();
    const store = load();
    const projectTasks = store.tasks.filter((t) => t.projectId === projectId);
    const submissions: any[] = [];
    for (const t of projectTasks) {
      if (t.progressUpdates) {
        for (const pu of t.progressUpdates) {
          submissions.push({
            id: pu.id,
            taskId: t.id,
            taskTitle: t.title,
            taskIdentifier: t.identifier || "NEX-000",
            userId: pu.userId,
            userName: pu.userName,
            status: pu.status,
            submissionStatus: pu.submissionStatus || (pu.status === "in_review" ? "submitted" : "draft"),
            progressPercent: pu.progressPercent,
            workCompleted: pu.workCompleted,
            workRemaining: pu.workRemaining,
            blockers: pu.blockers,
            nextSteps: pu.nextSteps,
            timeSpentHours: pu.timeSpentHours || 0,
            evidenceUrl: pu.evidenceUrl,
            githubUrl: pu.githubUrl || "",
            deploymentUrl: pu.deploymentUrl || "",
            attachments: pu.attachments || [],
            reviews: t.reviews || [],
            createdAt: pu.createdAt,
          });
        }
      }
    }
    return submissions;
  },

  async getProjectActivity(projectId: string) {
    await wait();
    const store = load();
    const proj = store.projects.find((p) => p.id === projectId);
    return proj?.recentActivity || [];
  },

  async getMyWorkTasks() {
    await wait();
    const store = load();
    const tasks = store.tasks.filter((t) => !t.isTrash);
    const now = new Date();
    return {
      assignedToMe: tasks.filter((t) => t.status !== "completed"),
      reviewing: tasks.filter((t) => t.status === "in_review"),
      createdByMe: tasks.filter((t) => t.status !== "completed"),
      overdue: tasks.filter((t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < now),
      completedRecently: tasks.filter((t) => t.status === "completed"),
      totalActive: tasks.filter((t) => t.status !== "completed").length,
    };
  },

  async getNotifications() {
    await wait();
    return {
      notifications: [
        {
          id: "notif-mock-1",
          userId: "user-om",
          actorName: "Sarah Chen",
          type: "assignment",
          title: "Assigned to CORE-102",
          message: "You have been assigned as lead on task dependency cycle detection.",
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
    };
  },

  async markNotificationRead() {
    await wait();
  },

  async markAllNotificationsRead() {
    await wait();
  },

  async getDashboardStats() {
    await wait();
    return computeStats(load().tasks);
  },

  async getProfile() {
    await wait();
    return load().profile;
  },

  async updateProfile(data) {
    await wait();
    const store = load();
    store.profile = { ...store.profile, ...data };
    save(store);
    return store.profile;
  },

  async getActivity() {
    await wait();
    return load().activity;
  },

  async getAllInvitations(): Promise<any[]> {
    await wait();
    const store = load();
    return store.invitations || [];
  },

  async getEmailStatus(): Promise<{ configured: boolean; provider: string | null; appBaseUrl: string }> {
    return {
      configured: false,
      provider: null,
      appBaseUrl: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
    };
  },

  async getProjectInvitations(projectId: string) {
    await wait();
    const store = load();
    const list = store.invitations || [];
    return list.filter((i) => i.projectId === projectId);
  },

  async createProjectInvitation(projectId: string, data: { email: string; role: string; message?: string }) {
    await wait();
    const store = load();
    if (!store.invitations) store.invitations = [];
    if (!store.rawTokens) store.rawTokens = {};

    const cleanEmail = data.email.trim().toLowerCase();
    const existing = store.invitations.find(
      (i) => i.projectId === projectId && i.recipientEmail.toLowerCase() === cleanEmail && i.status === "pending"
    );
    if (existing) {
      throw new Error("A pending invitation already exists for this email address");
    }

    const project = store.projects.find((p) => p.id === projectId);
    const user = getActiveUser();
    const inviterName = user?.fullName || "Om Thakkar";
    const inviteId = `inv-mock-${Date.now()}`;
    const rawToken = `mock-token-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const invitation = {
      id: inviteId,
      projectId,
      projectName: project?.name || "Project",
      recipientEmail: cleanEmail,
      role: data.role || "member",
      status: "pending" as const,
      message: data.message || "",
      expiresAt,
      createdAt: new Date().toISOString(),
      inviterName,
    };

    store.invitations.push(invitation);
    store.rawTokens[rawToken] = inviteId;
    save(store);

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const invitationUrl = `${baseUrl}/invitations/accept?token=${rawToken}`;

    return {
      success: true,
      invitation,
      rawToken,
      invitationUrl,
      emailSent: false,
      emailError: "Local development mode: Shareable link generated. Email dispatch unavailable.",
    };
  },

  async resendProjectInvitation(invitationId: string) {
    await wait();
    const store = load();
    if (!store.invitations) store.invitations = [];
    if (!store.rawTokens) store.rawTokens = {};

    const inv = store.invitations.find((i) => i.id === invitationId);
    if (!inv) throw new Error("Invitation not found");

    const rawToken = `mock-token-rotated-${Date.now()}`;
    inv.status = "pending";
    inv.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    store.rawTokens[rawToken] = invitationId;
    save(store);

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const invitationUrl = `${baseUrl}/invitations/accept?token=${rawToken}`;

    return {
      success: true,
      rawToken,
      invitationUrl,
      expiresAt: inv.expiresAt,
      emailSent: false,
      emailError: "Local development mode: Shareable link generated.",
    };
  },

  async revokeProjectInvitation(invitationId: string) {
    await wait();
    const store = load();
    if (!store.invitations) return;
    const inv = store.invitations.find((i) => i.id === invitationId);
    if (inv) {
      inv.status = "revoked";
      inv.revokedAt = new Date().toISOString();
      save(store);
    }
  },

  async validateInvitationToken(token: string) {
    await wait();
    const store = load();
    const inviteId = store.rawTokens?.[token];
    if (!inviteId) {
      return { valid: false, reason: "not_found", error: "Invitation not found or invalid token." };
    }
    const inv = (store.invitations || []).find((i) => i.id === inviteId);
    if (!inv) {
      return { valid: false, reason: "not_found", error: "Invitation not found." };
    }
    if (inv.status === "accepted") {
      return { valid: false, reason: "already_accepted", error: "This invitation has already been accepted." };
    }
    if (inv.status === "revoked") {
      return { valid: false, reason: "revoked", error: "This invitation has been revoked." };
    }
    if (new Date(inv.expiresAt) <= new Date()) {
      inv.status = "expired";
      save(store);
      return { valid: false, reason: "expired", error: "This invitation has expired." };
    }
    const proj = store.projects.find((p) => p.id === inv.projectId);
    return {
      valid: true,
      invitation: {
        id: inv.id,
        projectId: inv.projectId,
        projectName: proj?.name || inv.projectName || "Project",
        projectKey: proj?.key || "PRJ",
        projectDescription: proj?.description || "",
        projectColor: proj?.color || "#4f46e5",
        recipientEmail: inv.recipientEmail,
        role: inv.role,
        message: inv.message || "",
        expiresAt: inv.expiresAt,
        inviterName: inv.inviterName || "A Project Manager",
      },
    };
  },

  async acceptProjectInvitation(token: string) {
    await wait();
    const store = load();
    const inviteId = store.rawTokens?.[token];
    if (!inviteId) throw new Error("Invalid token");
    const inv = (store.invitations || []).find((i) => i.id === inviteId);
    if (!inv || inv.status !== "pending") throw new Error("Invitation is not valid or already used");

    const user = getActiveUser();
    if (user && user.email.toLowerCase() !== inv.recipientEmail.toLowerCase()) {
      throw new Error(`Email mismatch: signed in as ${user.email}, but invite is for ${inv.recipientEmail}`);
    }

    inv.status = "accepted";
    inv.acceptedAt = new Date().toISOString();

    const proj = store.projects.find((p) => p.id === inv.projectId);
    if (proj) {
      if (!proj.members) proj.members = [];
      const memId = user?.id || `user-${Date.now()}`;
      if (!proj.members.some((m) => m.id === memId)) {
        proj.members.push({
          id: memId,
          membershipId: `pm-${Date.now()}`,
          name: user?.fullName || "New Member",
          email: inv.recipientEmail,
          role: inv.role,
          initials: (user?.fullName || "NM").slice(0, 2).toUpperCase(),
          joinedAt: new Date().toISOString(),
        });
      }
    }
    save(store);
    return {
      success: true,
      projectId: inv.projectId,
      projectName: proj?.name || "Project",
      role: inv.role,
    };
  },

  async declineProjectInvitation(token: string) {
    await wait();
    const store = load();
    const inviteId = store.rawTokens?.[token];
    if (!inviteId) throw new Error("Invalid token");
    const inv = (store.invitations || []).find((i) => i.id === inviteId);
    if (inv) {
      inv.status = "declined";
      save(store);
    }
    return { success: true, message: "Invitation declined" };
  },

  async submitProgressUpdate(taskId: string, data: any) {
    await wait();
    const store = load();
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("Task not found");
    const user = getActiveUser();
    const updateId = `prog-${Date.now()}`;
    const newUpdate = {
      id: updateId,
      taskId,
      userId: user?.id || "user-om",
      userName: user?.fullName || "Om Thakkar",
      status: data.status || task.status,
      progressPercent: data.progressPercent || 0,
      workCompleted: data.workCompleted,
      workRemaining: data.workRemaining || "",
      blockers: data.blockers || "",
      nextSteps: data.nextSteps || "",
      timeSpentHours: data.timeSpentHours || 0,
      evidenceUrl: data.evidenceUrl || "",
      createdAt: new Date().toISOString(),
    };

    if (!(store as any).progressUpdates) (store as any).progressUpdates = [];
    (store as any).progressUpdates.push(newUpdate);

    task.status = data.status || task.status;
    task.progressPercent = data.progressPercent;
    task.lastProgressUpdateAt = new Date().toISOString();
    if (data.blockers) task.blockedReason = data.blockers;
    if (task.status === "completed") task.completedAt = new Date().toISOString();

    save(store);
    return { success: true, task, progressUpdate: newUpdate };
  },

  async getTaskProgressUpdates(taskId: string) {
    await wait();
    const store = load();
    return ((store as any).progressUpdates || []).filter((p: any) => p.taskId === taskId);
  },

  async submitTaskReview(taskId: string, data: any) {
    await wait();
    const store = load();
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("Task not found");
    const user = getActiveUser();
    const reviewId = `rev-${Date.now()}`;
    const newReview = {
      id: reviewId,
      taskId,
      reviewerId: user?.id || "user-om",
      reviewerName: user?.fullName || "Team Leader",
      progressUpdateId: data.progressUpdateId,
      decision: data.decision,
      feedback: data.feedback,
      createdAt: new Date().toISOString(),
    };

    if (!(store as any).reviews) (store as any).reviews = [];
    (store as any).reviews.push(newReview);

    if (data.decision === "approved") {
      task.status = "completed";
      task.progressPercent = 100;
      task.completedAt = new Date().toISOString();
    } else {
      task.status = "in_progress";
      task.completedAt = undefined;
    }

    save(store);
    return { success: true, task, review: newReview };
  },

  async getTaskReviews(taskId: string) {
    await wait();
    const store = load();
    return ((store as any).reviews || []).filter((r: any) => r.taskId === taskId);
  },

  async getReviewQueue() {
    await wait();
    const store = load();
    return store.tasks.filter((t) => !t.isTrash && t.status === "in_review");
  },
};

export function resetMockData() {
  const key = getStorageKey();
  delete memoryStores[key];
  if (isBrowser()) {
    localStorage.removeItem(key);
  }
}
