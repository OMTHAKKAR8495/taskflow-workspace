import type { TaskService } from "./taskService.types";

const BASE = import.meta.env["VITE_API_URL"] ?? "http://localhost:4000/api";

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const userId = getActiveUserId();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
      ...init?.headers,
    },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
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
  updateTask: (id, data) => request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
  toggleBookmark: (id) => request(`/tasks/${id}/bookmark`, { method: "POST" }),
  addComment: (id, content, author) =>
    request(`/tasks/${id}/comments`, { method: "POST", body: JSON.stringify({ content, author }) }),
  getDashboardStats: () => request("/tasks/stats"),
  getProfile: () => request("/profile"),
  updateProfile: (data) => request("/profile", { method: "PUT", body: JSON.stringify(data) }),
  getActivity: () => request("/activity"),
};
