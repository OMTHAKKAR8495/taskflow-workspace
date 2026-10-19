import { computeStats } from "@/lib/task-utils";
import type { Activity, ActivityType, Profile, Task } from "@/types";
import { buildSeedActivity, buildSeedProfile, buildSeedTasks, DEMO_USER_ID } from "./mockData";
import type { TaskService } from "./taskService.types";

/**
 * DEMO ONLY: data lives in this browser's localStorage. No real backend,
 * authentication or database is involved.
 */
const STORAGE_KEY = "taskflow:v1";
const LATENCY_MS = 250;

interface Store {
  tasks: Task[];
  profile: Profile;
  activity: Activity[];
}

function load(): Store {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as Store;
    } catch {
      /* fall through to reseed */
    }
  }
  const tasks = buildSeedTasks();
  const store = { tasks, profile: buildSeedProfile(), activity: buildSeedActivity(tasks) };
  save(store);
  return store;
}

function save(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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
    const now = new Date().toISOString();
    const task: Task = { ...data, id: uid("task"), userId: DEMO_USER_ID, createdAt: now, updatedAt: now };
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
  localStorage.removeItem(STORAGE_KEY);
}
