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
  avatarUrl?: string;
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
  taskCount?: number;
  completedCount?: number;
}

export interface Task {
  id: string;
  userId: string;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  estimate?: string;
  assignee?: TeamMember;
  tags?: string[];
  subtasks?: Subtask[];
  isBookmarked?: boolean;
  comments?: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  projectId?: string;
  assigneeId?: string;
  subtasks?: { title: string; completed?: boolean }[];
  tags?: string[];
  estimate?: string;
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
  inReview?: number;
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
  bookmarkedOnly?: boolean;
}
