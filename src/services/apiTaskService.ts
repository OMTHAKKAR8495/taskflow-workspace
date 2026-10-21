import type { TaskService } from "./taskService.types";

const BASE = import.meta.env["VITE_API_URL"] ?? "http://localhost:4000/api";

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
  getTasks: () => request("/tasks"),
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
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
  restoreTask: (id) => request(`/tasks/${id}/restore`, { method: "POST" }),
  permanentDeleteTask: (id) => request(`/tasks/${id}/permanent`, { method: "DELETE" }),
  emptyTrash: () => request("/tasks/trash/empty", { method: "DELETE" }),
  toggleBookmark: (id) => request(`/tasks/${id}/bookmark`, { method: "POST" }),
  addComment: (id, content, author) =>
    request(`/tasks/${id}/comments`, { method: "POST", body: JSON.stringify({ content, author }) }),
  toggleSubtask: (taskId, subtaskId) =>
    request(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`, { method: "POST" }),
  getProjects: () => request("/projects"),
  getTeamMembers: () => request("/team"),
  getDashboardStats: () => request("/tasks/stats"),
  getProfile: () => request("/profile"),
  updateProfile: (data) => request("/profile", { method: "PUT", body: JSON.stringify(data) }),
  getActivity: () => request("/activity"),
};
