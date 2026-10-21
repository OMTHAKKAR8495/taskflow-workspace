import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { taskService } from "@/services";
import { computeStats } from "@/lib/task-utils";
import { useAuth } from "@/context/AuthContext";
import type { Activity, DashboardStats, Profile, ProfileInput, Project, Task, TaskInput, TeamMember } from "@/types";

type LoadState = "loading" | "ready" | "error";

interface TaskContextValue {
  tasks: Task[];
  projects: Project[];
  team: TeamMember[];
  profile: Profile | null;
  activity: Activity[];
  stats: DashboardStats;
  state: LoadState;
  selectedProjectId: string | "all";
  setSelectedProjectId: (id: string | "all") => void;
  reload: () => Promise<void>;
  createTask: (data: TaskInput) => Promise<Task>;
  updateTask: (id: string, data: Partial<TaskInput & { isBookmarked?: boolean }>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  toggleBookmark: (id: string) => Promise<Task>;
  addComment: (id: string, content: string, author?: string) => Promise<Task>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<Task>;
  updateProfile: (data: ProfileInput) => Promise<Profile>;
}

const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user, updateCurrentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | "all">("all");

  // Read URL query parameter on load if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const p = params.get("projectId") || params.get("project");
      if (p) setSelectedProjectIdState(p);
    }
  }, []);

  const setSelectedProjectId = useCallback((id: string | "all") => {
    setSelectedProjectIdState(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (id === "all") {
        url.searchParams.delete("project");
        url.searchParams.delete("projectId");
      } else {
        url.searchParams.set("project", id);
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const reload = useCallback(async () => {
    setState("loading");
    try {
      const [t, p, a, projs, members] = await Promise.all([
        taskService.getTasks(),
        taskService.getProfile(),
        taskService.getActivity(),
        taskService.getProjects(),
        taskService.getTeamMembers(),
      ]);
      setTasks(t);
      setProfile(p);
      setActivity(a);
      setProjects(projs);
      setTeam(members);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, user?.id]);

  const refreshActivity = useCallback(async () => setActivity(await taskService.getActivity()), []);

  const value = useMemo<TaskContextValue>(
    () => ({
      tasks,
      projects,
      team,
      profile,
      activity,
      state,
      stats: computeStats(tasks),
      selectedProjectId,
      setSelectedProjectId,
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
      toggleSubtask: async (taskId, subtaskId) => {
        const t = await taskService.toggleSubtask(taskId, subtaskId);
        setTasks((prev) => prev.map((x) => (x.id === taskId ? t : x)));
        return t;
      },
      updateProfile: async (data) => {
        const p = await taskService.updateProfile(data);
        setProfile(p);
        updateCurrentUser({ fullName: p.fullName, email: p.email });
        return p;
      },
    }),
    [
      tasks,
      projects,
      team,
      profile,
      activity,
      state,
      selectedProjectId,
      reload,
      refreshActivity,
      updateCurrentUser,
    ],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used within TaskProvider");
  return ctx;
}
