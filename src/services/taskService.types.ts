import type {
  Activity,
  DashboardStats,
  Milestone,
  NotificationItem,
  Profile,
  ProfileInput,
  Project,
  ProjectInvitation,
  ProjectInvitationInput,
  CreateInvitationResponse,
  Task,
  TaskInput,
  TaskStatus,
  TeamMember,
  TaskProgressUpdate,
  TaskProgressUpdateInput,
  TaskReview,
  TaskReviewInput,
  ProjectSubmission,
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
  addProjectMember?(projectId: string, userId: string | string[], role?: string): Promise<any>;
  removeProjectMember?(projectId: string, userId: string): Promise<void>;
  getProjectSubmissions?(projectId: string): Promise<ProjectSubmission[]>;
  getProjectActivity?(projectId: string): Promise<any[]>;

  // Project Invitations
  getAllInvitations?(params?: { status?: string }): Promise<ProjectInvitation[]>;
  getEmailStatus?(): Promise<{ configured: boolean; provider: string | null; appBaseUrl: string }>;
  getProjectInvitations?(projectId: string): Promise<ProjectInvitation[]>;
  createProjectInvitation?(
    projectId: string,
    data: ProjectInvitationInput,
  ): Promise<CreateInvitationResponse>;
  resendProjectInvitation?(
    invitationId: string,
    data?: { deliveryMethod?: "link" | "email" },
  ): Promise<{
    success: boolean;
    rawToken: string;
    invitationUrl: string;
    expiresAt: string;
    deliveryMethod?: "link" | "email";
    emailSent: boolean;
    emailSkipped?: boolean;
    emailError?: string;
    invitation?: any;
  }>;
  revokeProjectInvitation?(invitationId: string): Promise<void>;
  validateInvitationToken?(token: string): Promise<{
    valid: boolean;
    reason?: string;
    error?: string;
    invitation?: any;
  }>;
  acceptProjectInvitation?(token: string): Promise<{
    success: boolean;
    projectId: string;
    projectName: string;
    role: string;
  }>;
  declineProjectInvitation?(token: string): Promise<{ success: boolean; message?: string }>;

  // Milestones & Dependencies
  createMilestone?(projectId: string, data: Partial<Milestone>): Promise<Milestone>;
  updateMilestone?(projectId: string, milestoneId: string, data: Partial<Milestone>): Promise<Milestone>;
  deleteMilestone?(projectId: string, milestoneId: string): Promise<void>;
  addTaskDependency?(taskId: string, dependsOnTaskId: string, dependencyType: string): Promise<void>;
  removeTaskDependency?(taskId: string, depId: string): Promise<void>;

  // Progress updates & Reviews
  submitProgressUpdate?(
    taskId: string,
    data: TaskProgressUpdateInput,
  ): Promise<{ success: boolean; task: Task; progressUpdate: TaskProgressUpdate }>;
  getTaskProgressUpdates?(taskId: string): Promise<TaskProgressUpdate[]>;
  submitTaskReview?(
    taskId: string,
    data: TaskReviewInput,
  ): Promise<{ success: boolean; task: Task; review: TaskReview }>;
  getTaskReviews?(taskId: string): Promise<TaskReview[]>;
  getReviewQueue?(): Promise<Task[]>;

  getTeamMembers(): Promise<TeamMember[]>;
  addTeamMember?(data: { name: string; email: string; role: string; avatarUrl?: string }): Promise<TeamMember>;
  updateTeamMember?(id: string, data: Partial<TeamMember>): Promise<TeamMember>;
  getMyWorkTasks?(): Promise<{
    stats?: {
      totalAssigned: number;
      notStarted: number;
      inProgress: number;
      inReview: number;
      blocked: number;
      completed: number;
      overdue: number;
      upcomingCount: number;
    };
    assignedToMe: Task[];
    notStarted?: Task[];
    inProgress?: Task[];
    inReview?: Task[];
    blocked?: Task[];
    reviewing: Task[];
    createdByMe: Task[];
    overdue: Task[];
    upcomingDeadlines?: Task[];
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
