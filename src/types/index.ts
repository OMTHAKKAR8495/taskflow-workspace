export type TaskStatus =
  | "backlog"
  | "ready"
  | "in_progress"
  | "in_review"
  | "blocked"
  | "completed"
  | "pending"; // backwards compatibility

export type TaskPriority = "critical" | "high" | "medium" | "low";

export type TaskType = "task" | "feature" | "bug" | "improvement";

export interface TaskComment {
  id: string;
  userId?: string | undefined;
  author: string;
  content: string;
  mentions?: string[] | undefined;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface AcceptanceCriteria {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependsOnTaskTitle?: string | undefined;
  dependsOnTaskIdentifier?: string | undefined;
  dependsOnTaskStatus?: string | undefined;
  dependencyType: "blocks" | "blocked_by" | "related";
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | undefined;
  initials: string;
  workload?: {
    activeTasks: number;
    inProgressTasks: number;
    inReviewTasks: number;
    blockedTasks: number;
    completedTasks: number;
    overdueTasks: number;
    capacityPercent: number;
    totalEstimatedHours: number;
  } | undefined;
  projects?: {
    id: string;
    name: string;
    color: string;
    role: string;
  }[] | undefined;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  targetDate: string;
  status: "pending" | "completed";
  createdAt?: string | undefined;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string;
  color: string;
  status: "active" | "planning" | "completed" | "archived" | "planned";
  priority: TaskPriority;
  health: "on_track" | "at_risk" | "delayed";
  lead: string;
  ownerId?: string | undefined;
  startDate?: string | null | undefined;
  deadline?: string | null | undefined;
  progress: number;
  archivedAt?: string | null | undefined;
  taskCount?: number | undefined;
  completedCount?: number | undefined;
  inProgressCount?: number | undefined;
  blockedCount?: number | undefined;
  overdueCount?: number | undefined;
  memberCount?: number | undefined;
  milestones?: { total: number; completed: number } | undefined;
  members?: {
    id: string;
    membershipId: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
    initials: string;
    joinedAt: string;
  }[] | undefined;
  recentActivity?: {
    id: string;
    type: string;
    taskTitle: string;
    userName: string;
    details?: any;
    at: string;
  }[] | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface TaskList {
  id: string;
  name: string;
  color: string;
  icon?: string | undefined;
  taskCount?: number | undefined;
}

export type RecurrencePattern = "none" | "daily" | "weekly" | "monthly" | "weekdays";

export interface Task {
  id: string;
  identifier?: string | undefined;
  userId: string;
  projectId?: string | undefined;
  projectName?: string | undefined;
  projectColor?: string | undefined;
  listId?: string | undefined;
  listName?: string | undefined;
  listColor?: string | undefined;
  title: string;
  description: string;
  type?: TaskType | undefined;
  status: TaskStatus;
  priority: TaskPriority;
  blockedReason?: string | undefined;
  startDate?: string | null | undefined;
  dueDate: string | null;
  estimatedHours?: number | undefined;
  actualHours?: number | undefined;
  estimate?: string | undefined;
  assignee?: TeamMember | undefined;
  assigneeId?: string | undefined;
  reviewer?: { id: string; name: string } | undefined;
  reviewerId?: string | undefined;
  milestoneId?: string | undefined;
  tags?: string[] | undefined;
  subtasks?: Subtask[] | undefined;
  acceptanceCriteria?: AcceptanceCriteria[] | undefined;
  dependencies?: TaskDependency[] | undefined;
  isBookmarked?: boolean | undefined;
  isTrash?: boolean | undefined;
  deletedAt?: string | null | undefined;
  recurrence?: RecurrencePattern | undefined;
  focusTimeSeconds?: number | undefined;
  completedAt?: string | null | undefined;
  comments?: TaskComment[] | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description?: string | undefined;
  type?: TaskType | undefined;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  blockedReason?: string | undefined;
  startDate?: string | null | undefined;
  dueDate?: string | null | undefined;
  estimatedHours?: number | undefined;
  actualHours?: number | undefined;
  projectId?: string | undefined;
  assigneeId?: string | undefined;
  reviewerId?: string | undefined;
  milestoneId?: string | undefined;
  listId?: string | undefined;
  listName?: string | undefined;
  listColor?: string | undefined;
  recurrence?: RecurrencePattern | undefined;
  isTrash?: boolean | undefined;
  deletedAt?: string | null | undefined;
  focusTimeSeconds?: number | undefined;
  completedAt?: string | null | undefined;
  subtasks?: { id?: string; title: string; completed?: boolean | undefined }[] | undefined;
  acceptanceCriteria?: { id?: string; text: string; completed?: boolean | undefined }[] | undefined;
  tags?: string[] | undefined;
  estimate?: string | undefined;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actorId?: string | undefined;
  actorName: string;
  type: "assignment" | "mention" | "review" | "deadline" | "system";
  title: string;
  message: string;
  entityType?: "task" | "project" | "milestone" | undefined;
  entityId?: string | undefined;
  isRead: boolean;
  createdAt: string;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  createdAt: string;
}

export type ProfileInput = Pick<Profile, "fullName" | "email" | "avatarUrl">;

export type ActivityType =
  | "created"
  | "updated"
  | "completed"
  | "deleted"
  | "task_created"
  | "task_completed"
  | "status_changed"
  | "review_requested"
  | "project_created"
  | "project_updated";

export interface Activity {
  id: string;
  type: ActivityType;
  taskId: string;
  taskTitle: string;
  userName?: string | undefined;
  details?: any | undefined;
  at: string;
}

export interface DashboardStats {
  total: number;
  backlog?: number | undefined;
  ready?: number | undefined;
  pending: number;
  inProgress: number;
  inReview?: number | undefined;
  blocked?: number | undefined;
  completed: number;
  completionRate: number;
  overdue: number;
  dueThisWeek?: number | undefined;
  byPriority: Record<TaskPriority, number>;
}

export type SortKey = "dueDate" | "priority" | "createdAt" | "title" | "estimate";

export interface TaskFilterState {
  search: string;
  status: TaskStatus | "all";
  priority: TaskPriority | "all";
  projectId: string | "all";
  assigneeId: string | "all";
  tag: string | "all";
  sort: SortKey;
  bookmarkedOnly?: boolean | undefined;
}
