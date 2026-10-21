import type {
  Activity,
  DashboardStats,
  Milestone,
  NotificationItem,
  Profile,
  ProfileInput,
  Project,
  Task,
  TaskInput,
  TaskStatus,
  TeamMember,
} from "@/types";

/**
 * Contract shared by the mock service and the backend API service for TaskFlow Nexus.
 */
export interface TaskService {
  getTasks(filters?: { projectId?: string; status?: string; search?: string }): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
  createTask(data: TaskInput): Promise<Task>;
  updateTask(id: string, data: Partial<TaskInput & { isBookmarked?: boolean }>): Promise<Task>;
  updateTaskStatus(taskId: string, status: TaskStatus, blockedReason?: string): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  restoreTask?(id: string): Promise<Task>;
  permanentDeleteTask?(id: string): Promise<void>;
  emptyTrash?(): Promise<void>;
  toggleBookmark(id: string): Promise<Task>;
  addComment(id: string, content: string, author?: string): Promise<Task>;
  toggleSubtask(taskId: string, subtaskId: string): Promise<Task>;

  // Project management
  getProjects(params?: { status?: string; search?: string }): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | null>;
  createProject(data: Partial<Project>): Promise<Project>;
  updateProject(id: string, data: Partial<Project>): Promise<Project>;
  archiveProject(id: string): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  addProjectMember?(projectId: string, userId: string, role: string): Promise<void>;
  removeProjectMember?(projectId: string, userId: string): Promise<void>;

  // Milestones & Dependencies
  createMilestone?(projectId: string, data: Partial<Milestone>): Promise<Milestone>;
  updateMilestone?(projectId: string, milestoneId: string, data: Partial<Milestone>): Promise<Milestone>;
  deleteMilestone?(projectId: string, milestoneId: string): Promise<void>;
  addTaskDependency?(taskId: string, dependsOnTaskId: string, dependencyType: string): Promise<void>;
  removeTaskDependency?(taskId: string, depId: string): Promise<void>;

  // Team & Personal Cockpit
  getTeamMembers(): Promise<TeamMember[]>;
  getMyWorkTasks?(): Promise<{
    assignedToMe: Task[];
    reviewing: Task[];
    createdByMe: Task[];
    overdue: Task[];
    completedRecently: Task[];
    totalActive: number;
  }>;

  // Notifications
  getNotifications?(unreadOnly?: boolean, type?: string): Promise<{ notifications: NotificationItem[]; unreadCount: number }>;
  markNotificationRead?(id: string): Promise<void>;
  markAllNotificationsRead?(): Promise<void>;

  getDashboardStats(projectId?: string): Promise<DashboardStats>;
  getProfile(): Promise<Profile>;
  updateProfile(data: ProfileInput): Promise<Profile>;
  getActivity(): Promise<Activity[]>;
}
