import type { Activity, DashboardStats, Profile, ProfileInput, Project, Task, TaskInput, TeamMember } from "@/types";

/**
 * Contract shared by the mock service and the backend API service.
 */
export interface TaskService {
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
  createTask(data: TaskInput): Promise<Task>;
  updateTask(id: string, data: Partial<TaskInput & { isBookmarked?: boolean }>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  toggleBookmark(id: string): Promise<Task>;
  addComment(id: string, content: string, author?: string): Promise<Task>;
  toggleSubtask(taskId: string, subtaskId: string): Promise<Task>;
  getProjects(): Promise<Project[]>;
  getTeamMembers(): Promise<TeamMember[]>;
  getDashboardStats(): Promise<DashboardStats>;
  getProfile(): Promise<Profile>;
  updateProfile(data: ProfileInput): Promise<Profile>;
  getActivity(): Promise<Activity[]>;
}
