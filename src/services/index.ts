import { apiTaskService } from "./apiTaskService";
import { mockTaskService } from "./mockTaskService";
import type { TaskService } from "./taskService.types";

/**
 * TaskFlow Service Layer
 * Connects to the Node.js + Express + PostgreSQL backend (http://localhost:4000/api),
 * with graceful fallback to mockTaskService if the API server is unavailable.
 */
class ResilientTaskService implements TaskService {
  private async execute<T>(
    apiCall: () => Promise<T>,
    mockCall: () => Promise<T>
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (err) {
      console.warn("Backend API unavailable, falling back to local service:", err);
      return await mockCall();
    }
  }

  getTasks() {
    return this.execute(
      () => apiTaskService.getTasks(),
      () => mockTaskService.getTasks()
    );
  }

  getTaskById(id: string) {
    return this.execute(
      () => apiTaskService.getTaskById(id),
      () => mockTaskService.getTaskById(id)
    );
  }

  createTask(data: any) {
    return this.execute(
      () => apiTaskService.createTask(data),
      () => mockTaskService.createTask(data)
    );
  }

  updateTask(id: string, data: any) {
    return this.execute(
      () => apiTaskService.updateTask(id, data),
      () => mockTaskService.updateTask(id, data)
    );
  }

  deleteTask(id: string) {
    return this.execute(
      () => apiTaskService.deleteTask(id),
      () => mockTaskService.deleteTask(id)
    );
  }

  toggleBookmark(id: string) {
    return this.execute(
      () => apiTaskService.toggleBookmark(id),
      () => mockTaskService.toggleBookmark(id)
    );
  }

  addComment(id: string, content: string, author?: string) {
    return this.execute(
      () => apiTaskService.addComment(id, content, author),
      () => mockTaskService.addComment(id, content, author)
    );
  }

  getDashboardStats() {
    return this.execute(
      () => apiTaskService.getDashboardStats(),
      () => mockTaskService.getDashboardStats()
    );
  }

  getProfile() {
    return this.execute(
      () => apiTaskService.getProfile(),
      () => mockTaskService.getProfile()
    );
  }

  updateProfile(data: any) {
    return this.execute(
      () => apiTaskService.updateProfile(data),
      () => mockTaskService.updateProfile(data)
    );
  }

  getActivity() {
    return this.execute(
      () => apiTaskService.getActivity(),
      () => mockTaskService.getActivity()
    );
  }
}

export const taskService: TaskService = new ResilientTaskService();
export { apiTaskService, mockTaskService };
export type { TaskService };
