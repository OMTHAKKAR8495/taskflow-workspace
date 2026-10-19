export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
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
  sort: SortKey;
}
