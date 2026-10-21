import { apiTaskService, ApiError } from "./apiTaskService";
import { mockTaskService } from "./mockTaskService";
import { connectionStatus } from "./connectionStatus";
import type { TaskService } from "./taskService.types";

export { connectionStatus };

/**
 * TaskFlow Service Layer
 * Connects to the Node.js + Express + PostgreSQL backend (http://localhost:4000/api),
 * with graceful fallback to mockTaskService if the API server is unreachable.
 * Never silently swallows 4xx validation or client errors.
 */
class ResilientTaskService implements TaskService {
  private async execute<T>(apiCall: () => Promise<T>, mockCall: () => Promise<T>): Promise<T> {
    try {
      const res = await apiCall();
      connectionStatus.setMode("connected");
      return res;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        // Do NOT silently switch to mock if the server returned a valid 4xx client/validation error!
        throw err;
      }
      console.warn("Backend API unavailable, operating in offline local mode:", err);
      connectionStatus.setMode("offline");
      return await mockCall();
    }
  }

  getTasks() {
    return this.execute(
      () => apiTaskService.getTasks(),
      () => mockTaskService.getTasks(),
    );
  }

  getTaskById(id: string) {
    return this.execute(
      () => apiTaskService.getTaskById(id),
      () => mockTaskService.getTaskById(id),
    );
  }

  getProjects() {
    return this.execute(
      () => apiTaskService.getProjects(),
      () => mockTaskService.getProjects(),
    );
  }

  getTeamMembers() {
    return this.execute(
      () => apiTaskService.getTeamMembers(),
      () => mockTaskService.getTeamMembers(),
    );
  }

  createTask(data: any) {
    return this.execute(
      () => apiTaskService.createTask(data),
      () => mockTaskService.createTask(data),
    );
  }

  updateTask(id: string, data: any) {
    return this.execute(
      () => apiTaskService.updateTask(id, data),
      () => mockTaskService.updateTask(id, data),
    );
  }

  deleteTask(id: string) {
    return this.execute(
      () => apiTaskService.deleteTask(id),
      () => mockTaskService.deleteTask(id),
    );
  }

  restoreTask(id: string) {
    return this.execute(
      () =>
        apiTaskService.restoreTask
          ? apiTaskService.restoreTask(id)
          : mockTaskService.restoreTask!(id),
      () => mockTaskService.restoreTask!(id),
    );
  }

  permanentDeleteTask(id: string) {
    return this.execute(
      () =>
        apiTaskService.permanentDeleteTask
          ? apiTaskService.permanentDeleteTask(id)
          : mockTaskService.permanentDeleteTask!(id),
      () => mockTaskService.permanentDeleteTask!(id),
    );
  }

  emptyTrash() {
    return this.execute(
      () =>
        apiTaskService.emptyTrash ? apiTaskService.emptyTrash() : mockTaskService.emptyTrash!(),
      () => mockTaskService.emptyTrash!(),
    );
  }

  toggleBookmark(id: string) {
    return this.execute(
      () => apiTaskService.toggleBookmark(id),
      () => mockTaskService.toggleBookmark(id),
    );
  }

  addComment(id: string, content: string, author?: string) {
    return this.execute(
      () => apiTaskService.addComment(id, content, author),
      () => mockTaskService.addComment(id, content, author),
    );
  }

  toggleSubtask(taskId: string, subtaskId: string) {
    return this.execute(
      () => apiTaskService.toggleSubtask(taskId, subtaskId),
      () => mockTaskService.toggleSubtask(taskId, subtaskId),
    );
  }

  getDashboardStats() {
    return this.execute(
      () => apiTaskService.getDashboardStats(),
      () => mockTaskService.getDashboardStats(),
    );
  }

  getProfile() {
    return this.execute(
      () => apiTaskService.getProfile(),
      () => mockTaskService.getProfile(),
    );
  }

  updateProfile(data: any) {
    return this.execute(
      () => apiTaskService.updateProfile(data),
      () => mockTaskService.updateProfile(data),
    );
  }

  getActivity() {
    return this.execute(
      () => apiTaskService.getActivity(),
      () => mockTaskService.getActivity(),
    );
  }
}

export const taskService: TaskService = new ResilientTaskService();
export { apiTaskService, mockTaskService };
export type { TaskService };
