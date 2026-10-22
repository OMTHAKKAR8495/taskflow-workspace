import type { TaskService } from "./taskService.types";
import type { Milestone, NotificationItem, Project, Task, TaskStatus } from "@/types";
import { getApiBaseUrl } from "@/lib/api-config";

const BASE = getApiBaseUrl();

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getActiveUserId(): string {
  if (typeof window === "undefined" || !window.localStorage) return "user-om";
  try {
    const raw = window.localStorage.getItem("taskflow:auth_user");
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.id) return user.id;
    }
  } catch {}
  return "user-om";
}

function getStoredToken(): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage.getItem("taskflow:jwt_token");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const userId = getActiveUserId();
  const token = getStoredToken();

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
      credentials: "include",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server unreachable";
    const netErr = new Error(`Network failure: ${message}`);
    (netErr as unknown as { isNetworkError: boolean }).isNetworkError = true;
    throw netErr;
  }

  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    let data: unknown = null;
    try {
      data = await res.json();
      if (
        data &&
        typeof data === "object" &&
        "error" in data &&
        typeof (data as { error: string }).error === "string"
      ) {
        msg = (data as { error: string }).error;
      }
    } catch {}
    throw new ApiError(msg, res.status, data);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const apiTaskService: TaskService = {
  getTasks: (filters) => {
    const params = new URLSearchParams();
    if (filters?.projectId && filters.projectId !== "all") params.append("projectId", filters.projectId);
    if (filters?.status && filters.status !== "all") params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(`/tasks${qs}`);
  },
  getTaskById: async (id) => {
    try {
      return await request(`/tasks/${id}`);
    } catch {
      return null;
    }
  },
  createTask: (data) => request("/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id, data) =>
    request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  updateTaskStatus: (taskId, status, blockedReason) =>
    request(`/tasks/${taskId}/status`, {
      method: "POST",
      body: JSON.stringify({ status, blockedReason }),
    }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
  restoreTask: (id) => request(`/tasks/${id}/restore`, { method: "POST" }),
  permanentDeleteTask: (id) => request(`/tasks/${id}/permanent`, { method: "DELETE" }),
  emptyTrash: () => request("/tasks/trash/empty", { method: "DELETE" }),
  toggleBookmark: (id) => request(`/tasks/${id}/bookmark`, { method: "POST" }),
  addComment: (id, content, author) =>
    request(`/tasks/${id}/comments`, { method: "POST", body: JSON.stringify({ content, author }) }),
  toggleSubtask: (taskId, subtaskId) =>
    request(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`, { method: "POST" }),

  // Projects
  getProjects: (params) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append("status", params.status);
    if (params?.search) sp.append("search", params.search);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return request(`/projects${qs}`);
  },
  getProjectById: async (id) => {
    try {
      return await request(`/projects/${id}`);
    } catch {
      return null;
    }
  },
  createProject: (data) => request("/projects", { method: "POST", body: JSON.stringify(data) }),
  updateProject: (id, data) =>
    request(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  archiveProject: (id) => request(`/projects/${id}/archive`, { method: "POST" }),
  deleteProject: (id) => request(`/projects/${id}`, { method: "DELETE" }),
  addProjectMember: (projectId, userId, role) =>
    request(`/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify({ userId, role }),
    }),
  removeProjectMember: (projectId, userId) =>
    request(`/projects/${projectId}/members/${userId}`, { method: "DELETE" }),

  // Project Invitations
  getProjectInvitations: (projectId) => request(`/projects/${projectId}/invitations`),
  createProjectInvitation: (projectId, data) =>
    request(`/projects/${projectId}/invitations`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  resendProjectInvitation: (invitationId) =>
    request(`/invitations/${invitationId}/resend`, { method: "POST" }),
  revokeProjectInvitation: (invitationId) =>
    request(`/invitations/${invitationId}/revoke`, { method: "POST" }),
  validateInvitationToken: (token) =>
    request(`/invitations/validate?token=${encodeURIComponent(token)}`),
  acceptProjectInvitation: (token) =>
    request("/invitations/accept", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  declineProjectInvitation: (token) =>
    request("/invitations/decline", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  // Milestones & Dependencies
  createMilestone: (projectId, data) =>
    request(`/projects/${projectId}/milestones`, { method: "POST", body: JSON.stringify(data) }),
  updateMilestone: (projectId, milestoneId, data) =>
    request(`/projects/${projectId}/milestones/${milestoneId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteMilestone: (projectId, milestoneId) =>
    request(`/projects/${projectId}/milestones/${milestoneId}`, { method: "DELETE" }),
  addTaskDependency: (taskId, dependsOnTaskId, dependencyType) =>
    request(`/tasks/${taskId}/dependencies`, {
      method: "POST",
      body: JSON.stringify({ dependsOnTaskId, dependencyType }),
    }),
  removeTaskDependency: (taskId, depId) =>
    request(`/tasks/${taskId}/dependencies/${depId}`, { method: "DELETE" }),

  // Team & Personal Cockpit
  getTeamMembers: () => request("/team"),
  getMyWorkTasks: () => request("/tasks/my-work"),

  // Notifications
  getNotifications: (unreadOnly, type) => {
    const sp = new URLSearchParams();
    if (unreadOnly) sp.append("unreadOnly", "true");
    if (type && type !== "all") sp.append("type", type);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return request(`/notifications${qs}`);
  },
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "POST" }),

  getDashboardStats: (projectId) => {
    const qs = projectId && projectId !== "all" ? `?projectId=${projectId}` : "";
    return request(`/tasks/stats${qs}`);
  },
  getProfile: () => request("/profile"),
  updateProfile: (data) => request("/profile", { method: "PUT", body: JSON.stringify(data) }),
  getActivity: () => request("/activity"),
};
