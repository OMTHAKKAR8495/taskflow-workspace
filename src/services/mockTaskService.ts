import { computeStats } from "@/lib/task-utils";
import type { Activity, ActivityType, Profile, Task } from "@/types";
import { buildSeedActivity, buildSeedProfile, buildSeedTasks, buildNewUserTasks, DEMO_USER_ID } from "./mockData";
import type { TaskService } from "./taskService.types";

interface Store {
  tasks: Task[];
  profile: Profile;
  activity: Activity[];
}

const LATENCY_MS = 150;
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

      // Migrate legacy "taskflow:v1" if user-scoped key is not yet set for default user
      if (!raw && isDefaultUser) {
        const legacy = window.localStorage.getItem("taskflow:v1");
        if (legacy) {
          raw = legacy;
          window.localStorage.setItem(key, legacy);
        }
      }

      if (raw) {
        const parsed = JSON.parse(raw) as Store;
        if (parsed && Array.isArray(parsed.tasks)) {
          // If profile still has old default name "Alex Morgan", update to active user
          if (activeUser && parsed.profile) {
            if (!parsed.profile.fullName || parsed.profile.fullName === "Alex Morgan") {
              parsed.profile.fullName = activeUser.fullName;
              parsed.profile.email = activeUser.email;
              parsed.profile.id = activeUser.id;
              window.localStorage.setItem(key, JSON.stringify(parsed));
            }
          }
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
  async createTask(data) {
    await wait();
    const store = load();
    const user = getActiveUser();
    const userId = user?.id || "user-om";
    const now = new Date().toISOString();
    const task: Task = { ...data, id: uid("task"), userId, createdAt: now, updatedAt: now };
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
    const updated: Task = { ...existing, ...data, updatedAt: new Date().toISOString() };
    store.tasks = store.tasks.map((t) => (t.id === id ? updated : t));
    const becameDone = existing.status !== "completed" && updated.status === "completed";
    log(store, becameDone ? "completed" : "updated", updated);
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
