import { computeStats } from "@/lib/task-utils";
import type { Activity, ActivityType, Profile, Project, Task, TaskInput, TeamMember } from "@/types";
import {
  buildSeedActivity,
  buildSeedProfile,
  buildSeedProjects,
  buildSeedTasks,
  buildTeamMembers,
  buildNewUserTasks,
  SEED_PROJECTS,
  SEED_TEAM_MEMBERS,
} from "./mockData";
import type { TaskService } from "./taskService.types";

interface Store {
  tasks: Task[];
  projects: Project[];
  team: TeamMember[];
  profile: Profile;
  activity: Activity[];
}

const LATENCY_MS = 100;
const memoryStores: Record<string, Store> = {};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getActiveUser(): { id: string; fullName: string; email: string; username?: string } | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem("taskflow:auth_user");
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function getStorageKey(): string {
  const user = getActiveUser();
  if (user?.id) {
    return `taskflow:store:${user.id}`;
  }
  return "taskflow:store:user-om";
}

function load(): Store {
  const key = getStorageKey();
  const activeUser = getActiveUser();
  const isDefaultUser = !activeUser || activeUser.id === "user-om" || activeUser.username === "omthakkar";

  if (isBrowser()) {
    try {
      let raw = window.localStorage.getItem(key);

      if (raw) {
        const parsed = JSON.parse(raw) as Store;
        if (parsed && Array.isArray(parsed.tasks)) {
          // Ensure projects and team exist in parsed store
          if (!parsed.projects || parsed.projects.length === 0) {
            parsed.projects = buildSeedProjects();
          }
          if (!parsed.team || parsed.team.length === 0) {
            parsed.team = buildTeamMembers();
          }

          // Backfill projects and assignees on tasks if missing
          parsed.tasks = parsed.tasks.map((t, idx) => {
            if (!t.projectId) {
              const proj = parsed.projects[idx % parsed.projects.length];
              t.projectId = proj.id;
              t.projectName = proj.name;
              t.projectColor = proj.color;
            }
            if (!t.assignee) {
              t.assignee = parsed.team[idx % parsed.team.length];
            }
            if (!t.subtasks) {
              t.subtasks = [
                { id: `sub-${t.id}-1`, title: "Define specifications and scope", completed: t.status === "completed" },
                { id: `sub-${t.id}-2`, title: "Implement core solution", completed: t.status === "completed" },
              ];
            }
            return t;
          });

          memoryStores[key] = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read from localStorage, using memory/seed:", e);
    }
  }

  if (memoryStores[key]) {
    return memoryStores[key];
  }

  const userId = activeUser?.id || "user-om";
  const userFullName = activeUser?.fullName || "Om Thakkar";
  const userEmail = activeUser?.email || "omthakkar@example.com";

  const tasks = isDefaultUser ? buildSeedTasks(userId) : buildNewUserTasks(userId);
  const initialStore: Store = {
    tasks,
    projects: buildSeedProjects(),
    team: buildTeamMembers(),
    profile: buildSeedProfile(userFullName, userEmail, userId),
    activity: buildSeedActivity(tasks),
  };
  memoryStores[key] = initialStore;

  if (isBrowser()) {
    try {
      window.localStorage.setItem(key, JSON.stringify(initialStore));
    } catch (e) {
      console.warn("Could not write to localStorage:", e);
    }
  }

  return initialStore;
}

function save(store: Store) {
  const key = getStorageKey();
  memoryStores[key] = store;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(key, JSON.stringify(store));
    } catch (e) {
      console.error("Failed to persist tasks to localStorage:", e);
    }
  }
}

const wait = () => new Promise((r) => setTimeout(r, LATENCY_MS));
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function log(store: Store, type: ActivityType, task: Task) {
  store.activity = [
    { id: uid("act"), type, taskId: task.id, taskTitle: task.title, at: new Date().toISOString() },
    ...store.activity,
  ].slice(0, 30);
}

export const mockTaskService: TaskService = {
  async getTasks() {
    await wait();
    return load().tasks;
  },

  async getTaskById(id) {
    await wait();
    return load().tasks.find((t) => t.id === id) ?? null;
  },

  async getProjects() {
    await wait();
    const store = load();
    return store.projects.map((p) => {
      const pTasks = store.tasks.filter((t) => t.projectId === p.id);
      const completed = pTasks.filter((t) => t.status === "completed").length;
      return {
        ...p,
        taskCount: pTasks.length,
        completedCount: completed,
      };
    });
  },

  async getTeamMembers() {
    await wait();
    return load().team;
  },

  async createTask(data: TaskInput) {
    await wait();
    const store = load();
    const user = getActiveUser();
    const userId = user?.id || "user-om";
    const now = new Date().toISOString();

    const proj = store.projects.find((p) => p.id === data.projectId) || store.projects[0];
    const assignee = store.team.find((m) => m.id === data.assigneeId) || store.team[0];

    const subtasks =
      data.subtasks && data.subtasks.length > 0
        ? data.subtasks.map((s, idx) => ({
            id: uid(`sub-${idx}`),
            title: s.title,
            completed: Boolean(s.completed),
          }))
        : [];

    const task: Task = {
      ...data,
      id: uid("task"),
      userId,
      projectId: proj?.id,
      projectName: proj?.name,
      projectColor: proj?.color,
      assignee,
      tags: data.tags || ["General"],
      estimate: data.estimate || "3 pts",
      subtasks,
      createdAt: now,
      updatedAt: now,
    };

    store.tasks = [task, ...store.tasks];
    log(store, "created", task);
    save(store);
    return task;
  },

  async updateTask(id, data) {
    await wait();
    const store = load();
    const existing = store.tasks.find((t) => t.id === id);
    if (!existing) throw new Error("Task not found");

    let projectName = existing.projectName;
    let projectColor = existing.projectColor;
    if (data.projectId && data.projectId !== existing.projectId) {
      const proj = store.projects.find((p) => p.id === data.projectId);
      if (proj) {
        projectName = proj.name;
        projectColor = proj.color;
      }
    }

    let assignee = existing.assignee;
    if (data.assigneeId) {
      const found = store.team.find((m) => m.id === data.assigneeId);
      if (found) assignee = found;
    }

    const updated: Task = {
      ...existing,
      ...data,
      projectName,
      projectColor,
      assignee,
      updatedAt: new Date().toISOString(),
    };

    store.tasks = store.tasks.map((t) => (t.id === id ? updated : t));
    const becameDone = existing.status !== "completed" && updated.status === "completed";
    log(store, becameDone ? "completed" : "updated", updated);
    save(store);
    return updated;
  },

  async toggleSubtask(taskId: string, subtaskId: string) {
    await wait();
    const store = load();
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("Task not found");

    const updatedSubtasks = (task.subtasks || []).map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );

    // Auto-update task status if all subtasks completed
    const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.completed);
    const newStatus = allDone ? "completed" : task.status === "completed" ? "in_progress" : task.status;

    const updated: Task = {
      ...task,
      status: newStatus,
      subtasks: updatedSubtasks,
      updatedAt: new Date().toISOString(),
    };

    store.tasks = store.tasks.map((t) => (t.id === taskId ? updated : t));
    save(store);
    return updated;
  },

  async deleteTask(id) {
    await wait();
    const store = load();
    const existing = store.tasks.find((t) => t.id === id);
    if (!existing) throw new Error("Task not found");
    store.tasks = store.tasks.filter((t) => t.id !== id);
    log(store, "deleted", existing);
    save(store);
  },

  async toggleBookmark(id) {
    await wait();
    const store = load();
    const existing = store.tasks.find((t) => t.id === id);
    if (!existing) throw new Error("Task not found");
    const updated: Task = {
      ...existing,
      isBookmarked: !existing.isBookmarked,
      updatedAt: new Date().toISOString(),
    };
    store.tasks = store.tasks.map((t) => (t.id === id ? updated : t));
    save(store);
    return updated;
  },

  async addComment(id, content, author) {
    await wait();
    const store = load();
    const existing = store.tasks.find((t) => t.id === id);
    if (!existing) throw new Error("Task not found");
    const user = getActiveUser();
    const finalAuthor = author || user?.fullName || "Om Thakkar";
    const newComment = {
      id: uid("comment"),
      author: finalAuthor,
      content,
      createdAt: new Date().toISOString(),
    };
    const updated: Task = {
      ...existing,
      comments: [...(existing.comments || []), newComment],
      updatedAt: new Date().toISOString(),
    };
    store.tasks = store.tasks.map((t) => (t.id === id ? updated : t));
    save(store);
    return updated;
  },

  async getDashboardStats() {
    await wait();
    return computeStats(load().tasks);
  },

  async getProfile() {
    await wait();
    return load().profile;
  },

  async updateProfile(data) {
    await wait();
    const store = load();
    store.profile = { ...store.profile, ...data };
    save(store);
    return store.profile;
  },

  async getActivity() {
    await wait();
    return load().activity;
  },
};

export function resetMockData() {
  const key = getStorageKey();
  delete memoryStores[key];
  if (isBrowser()) {
    localStorage.removeItem(key);
  }
}
