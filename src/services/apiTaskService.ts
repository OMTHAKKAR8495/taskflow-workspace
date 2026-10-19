import type { TaskService } from "./taskService.types";

/**
 * FUTURE: HTTP implementation for the Node.js + Express + PostgreSQL backend.
 * Not used yet — switch to it in src/services/index.ts once the API exists.
 * Set VITE_API_URL (e.g. http://localhost:4000/api).
 */
const BASE = import.meta.env['VITE_API_URL'] ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
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
