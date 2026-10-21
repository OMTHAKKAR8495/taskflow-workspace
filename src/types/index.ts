export type TaskStatus = "pending" | "in_progress" | "in_review" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | undefined;
  initials: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string;
  color: string;
  status: "active" | "planned" | "completed";
  lead: string;
  taskCount?: number | undefined;
  completedCount?: number | undefined;
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
  userId: string;
  projectId?: string | undefined;
  projectName?: string | undefined;
  projectColor?: string | undefined;
  listId?: string | undefined;
  listName?: string | undefined;
  listColor?: string | undefined;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  estimate?: string | undefined;
  assignee?: TeamMember | undefined;
  assigneeId?: string | undefined;
  tags?: string[] | undefined;
  subtasks?: Subtask[] | undefined;
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
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  projectId?: string | undefined;
  assigneeId?: string | undefined;
  listId?: string | undefined;
  listName?: string | undefined;
  listColor?: string | undefined;
  recurrence?: RecurrencePattern | undefined;
  isTrash?: boolean | undefined;
  deletedAt?: string | null | undefined;
  focusTimeSeconds?: number | undefined;
  completedAt?: string | null | undefined;
  subtasks?: { title: string; completed?: boolean | undefined }[] | undefined;
  tags?: string[] | undefined;
  estimate?: string | undefined;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  createdAt: string;
}

export type ProfileInput = Pick<Profile, "fullName" | "email" | "avatarUrl">;

export type ActivityType = "created" | "updated" | "completed" | "deleted";

export interface Activity {
  id: string;
  type: ActivityType;
  taskId: string;
  taskTitle: string;
  at: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  inReview?: number | undefined;
  completed: number;
  completionRate: number;
  overdue: number;
  byPriority: Record<TaskPriority, number>;
}

export type SortKey = "dueDate" | "priority" | "createdAt";

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
