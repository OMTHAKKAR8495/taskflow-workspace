import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { taskService } from "@/services";
import { computeStats } from "@/lib/task-utils";
import type { Activity, DashboardStats, Profile, ProfileInput, Task, TaskInput } from "@/types";

type LoadState = "loading" | "ready" | "error";

interface TaskContextValue {
  tasks: Task[];
  profile: Profile | null;
  activity: Activity[];
  stats: DashboardStats;
  state: LoadState;
  reload: () => Promise<void>;
  createTask: (data: TaskInput) => Promise<Task>;
  updateTask: (id: string, data: Partial<TaskInput & { isBookmarked?: boolean }>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  toggleBookmark: (id: string) => Promise<Task>;
  addComment: (id: string, content: string, author?: string) => Promise<Task>;
  updateProfile: (data: ProfileInput) => Promise<Profile>;
}

const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("taskflow:v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.tasks)) return parsed.tasks;
        }
      } catch {}
    }
    return [];
  });
  const [profile, setProfile] = useState<Profile | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("taskflow:v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.profile) return parsed.profile;
        }
      } catch {}
    }
    return null;
  });
  const [activity, setActivity] = useState<Activity[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("taskflow:v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.activity)) return parsed.activity;
        }
      } catch {}
    }
    return [];
  });
  const [state, setState] = useState<LoadState>(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem("taskflow:v1")) {
      return "ready";
    }
    return "loading";
  });

  const reload = useCallback(async () => {
    setState("loading");
    try {
      const [t, p, a] = await Promise.all([
        taskService.getTasks(),
        taskService.getProfile(),
        taskService.getActivity(),
      ]);
      setTasks(t);
      setProfile(p);
      setActivity(a);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const refreshActivity = useCallback(async () => setActivity(await taskService.getActivity()), []);

  const value = useMemo<TaskContextValue>(
    () => ({
      tasks,
      profile,
      activity,
      state,
      stats: computeStats(tasks),
      reload,
      createTask: async (data) => {
        const t = await taskService.createTask(data);
        setTasks((prev) => [t, ...prev]);
        void refreshActivity();
        return t;
      },
      updateTask: async (id, data) => {
        const t = await taskService.updateTask(id, data);
        setTasks((prev) => prev.map((x) => (x.id === id ? t : x)));
        void refreshActivity();
        return t;
      },
      deleteTask: async (id) => {
        await taskService.deleteTask(id);
        setTasks((prev) => prev.filter((x) => x.id !== id));
        void refreshActivity();
      },
      toggleBookmark: async (id) => {
        const t = await taskService.toggleBookmark(id);
        setTasks((prev) => prev.map((x) => (x.id === id ? t : x)));
        return t;
      },
      addComment: async (id, content, author) => {
        const t = await taskService.addComment(id, content, author);
        setTasks((prev) => prev.map((x) => (x.id === id ? t : x)));
        return t;
      },
      updateProfile: async (data) => {
        const p = await taskService.updateProfile(data);
        setProfile(p);
        return p;
      },
    }),
    [tasks, profile, activity, state, reload, refreshActivity],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used within TaskProvider");
  return ctx;
}
