import { apiTaskService, ApiError } from "./apiTaskService";
import { mockTaskService } from "./mockTaskService";
import { connectionStatus } from "./connectionStatus";
import type { TaskService } from "./taskService.types";
import type { TaskStatus } from "@/types";

export { connectionStatus };

/**
 * TaskFlow Nexus Service Layer
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

  getTasks(filters?: any) {
    return this.execute(
      () => apiTaskService.getTasks(filters),
      () => mockTaskService.getTasks(filters),
    );
  }

  getTaskById(id: string) {
    return this.execute(
      () => apiTaskService.getTaskById(id),
      () => mockTaskService.getTaskById(id),
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

  updateTaskStatus(taskId: string, status: TaskStatus, blockedReason?: string) {
    return this.execute(
      () => apiTaskService.updateTaskStatus(taskId, status, blockedReason),
      () => mockTaskService.updateTaskStatus(taskId, status, blockedReason),
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

  submitProgressUpdate(taskId: string, data: any) {
    return this.execute(
      () => apiTaskService.submitProgressUpdate!(taskId, data),
      () => mockTaskService.submitProgressUpdate!(taskId, data),
    );
  }

  getTaskProgressUpdates(taskId: string) {
    return this.execute(
      () => apiTaskService.getTaskProgressUpdates!(taskId),
      () => mockTaskService.getTaskProgressUpdates!(taskId),
    );
  }

  submitTaskReview(taskId: string, data: any) {
    return this.execute(
      () => apiTaskService.submitTaskReview!(taskId, data),
      () => mockTaskService.submitTaskReview!(taskId, data),
    );
  }

  getTaskReviews(taskId: string) {
    return this.execute(
      () => apiTaskService.getTaskReviews!(taskId),
      () => mockTaskService.getTaskReviews!(taskId),
    );
  }

  getReviewQueue() {
    return this.execute(
      () => apiTaskService.getReviewQueue!(),
      () => mockTaskService.getReviewQueue!(),
    );
  }

  // Projects
  getProjects(params?: any) {
    return this.execute(
      () => apiTaskService.getProjects(params),
      () => mockTaskService.getProjects(params),
    );
  }

  getProjectById(id: string) {
    return this.execute(
      () => apiTaskService.getProjectById(id),
      () => mockTaskService.getProjectById(id),
    );
  }

  createProject(data: any) {
    return this.execute(
      () => apiTaskService.createProject(data),
      () => mockTaskService.createProject(data),
    );
  }

  updateProject(id: string, data: any) {
    return this.execute(
      () => apiTaskService.updateProject(id, data),
      () => mockTaskService.updateProject(id, data),
    );
  }

  archiveProject(id: string) {
    return this.execute(
      () => apiTaskService.archiveProject(id),
      () => mockTaskService.archiveProject(id),
    );
  }

  deleteProject(id: string) {
    return this.execute(
      () => apiTaskService.deleteProject(id),
      () => mockTaskService.deleteProject(id),
    );
  }

  addProjectMember(projectId: string, userId: string | string[], role = "member") {
    return this.execute(
      () => apiTaskService.addProjectMember!(projectId, userId, role),
      () => mockTaskService.addProjectMember!(projectId, userId, role),
    );
  }

  removeProjectMember(projectId: string, userId: string) {
    return this.execute(
      () => apiTaskService.removeProjectMember!(projectId, userId),
      () => mockTaskService.removeProjectMember!(projectId, userId),
    );
  }

  getProjectSubmissions(projectId: string) {
    return this.execute(
      () => apiTaskService.getProjectSubmissions!(projectId),
      () => mockTaskService.getProjectSubmissions!(projectId),
    );
  }

  getProjectActivity(projectId: string) {
    return this.execute(
      () => apiTaskService.getProjectActivity!(projectId),
      () => mockTaskService.getProjectActivity!(projectId),
    );
  }

  // Invitations
  getAllInvitations(params?: { status?: string }) {
    return this.execute(
      () => apiTaskService.getAllInvitations!(),
      () => mockTaskService.getAllInvitations!(),
    );
  }

  getEmailStatus() {
    return this.execute(
      () => apiTaskService.getEmailStatus!(),
      () => mockTaskService.getEmailStatus!(),
    );
  }

  getProjectInvitations(projectId: string) {
    return this.execute(
      () => apiTaskService.getProjectInvitations!(projectId),
      () => mockTaskService.getProjectInvitations!(projectId),
    );
  }

  createProjectInvitation(projectId: string, data: any) {
    return this.execute(
      () => apiTaskService.createProjectInvitation!(projectId, data),
      () => mockTaskService.createProjectInvitation!(projectId, data),
    );
  }

  resendProjectInvitation(invitationId: string) {
    return this.execute(
      () => apiTaskService.resendProjectInvitation!(invitationId),
      () => mockTaskService.resendProjectInvitation!(invitationId),
    );
  }

  revokeProjectInvitation(invitationId: string) {
    return this.execute(
      () => apiTaskService.revokeProjectInvitation!(invitationId),
      () => mockTaskService.revokeProjectInvitation!(invitationId),
    );
  }

  validateInvitationToken(token: string) {
    return this.execute(
      () => apiTaskService.validateInvitationToken!(token),
      () => mockTaskService.validateInvitationToken!(token),
    );
  }

  acceptProjectInvitation(token: string) {
    return this.execute(
      () => apiTaskService.acceptProjectInvitation!(token),
      () => mockTaskService.acceptProjectInvitation!(token),
    );
  }

  declineProjectInvitation(token: string) {
    return this.execute(
      () => apiTaskService.declineProjectInvitation!(token),
      () => mockTaskService.declineProjectInvitation!(token),
    );
  }

  createMilestone(projectId: string, data: any) {
    return this.execute(
      () => apiTaskService.createMilestone!(projectId, data),
      async () => ({ id: `ms-${Date.now()}`, projectId, ...data } as any),
    );
  }

  updateMilestone(projectId: string, milestoneId: string, data: any) {
    return this.execute(
      () => apiTaskService.updateMilestone!(projectId, milestoneId, data),
      async () => ({ id: milestoneId, projectId, ...data } as any),
    );
  }

  deleteMilestone(projectId: string, milestoneId: string) {
    return this.execute(
      () => apiTaskService.deleteMilestone!(projectId, milestoneId),
      async () => {},
    );
  }

  addTaskDependency(taskId: string, dependsOnTaskId: string, dependencyType: string) {
    return this.execute(
      () => apiTaskService.addTaskDependency!(taskId, dependsOnTaskId, dependencyType),
      async () => {},
    );
  }

  removeTaskDependency(taskId: string, depId: string) {
    return this.execute(
      () => apiTaskService.removeTaskDependency!(taskId, depId),
      async () => {},
    );
  }

  // Team & Cockpit
  getTeamMembers() {
    return this.execute(
      () => apiTaskService.getTeamMembers(),
      () => mockTaskService.getTeamMembers(),
    );
  }

  addTeamMember(data: { name: string; email: string; role: string; avatarUrl?: string }) {
    return this.execute(
      () =>
        apiTaskService.addTeamMember
          ? apiTaskService.addTeamMember(data)
          : mockTaskService.addTeamMember!(data),
      () => mockTaskService.addTeamMember!(data),
    );
  }

  getMyWorkTasks() {
    return this.execute(
      () => apiTaskService.getMyWorkTasks!(),
      () => mockTaskService.getMyWorkTasks!(),
    );
  }

  // Notifications
  getNotifications(unreadOnly?: boolean, type?: string) {
    return this.execute(
      () => apiTaskService.getNotifications!(unreadOnly, type),
      () => mockTaskService.getNotifications!(unreadOnly, type),
    );
  }

  markNotificationRead(id: string) {
    return this.execute(
      () => apiTaskService.markNotificationRead!(id),
      () => mockTaskService.markNotificationRead!(id),
    );
  }

  markAllNotificationsRead() {
    return this.execute(
      () => apiTaskService.markAllNotificationsRead!(),
      () => mockTaskService.markAllNotificationsRead!(),
    );
  }

  getDashboardStats(projectId?: string) {
    return this.execute(
      () => apiTaskService.getDashboardStats(projectId),
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
