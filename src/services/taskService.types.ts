import type { Activity, DashboardStats, Profile, ProfileInput, Task, TaskInput } from "@/types";

/**
 * Contract shared by the mock (localStorage) service and the future HTTP API service.
 * Swap implementations in src/services/index.ts.
 */
export interface TaskService {
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
  createTask(data: TaskInput): Promise<Task>;
  updateTask(id: string, data: Partial<TaskInput & { isBookmarked?: boolean }>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  toggleBookmark(id: string): Promise<Task>;
  addComment(id: string, content: string, author?: string): Promise<Task>;
  getDashboardStats(): Promise<DashboardStats>;
  getProfile(): Promise<Profile>;
  updateProfile(data: ProfileInput): Promise<Profile>;
  getActivity(): Promise<Activity[]>;
}
