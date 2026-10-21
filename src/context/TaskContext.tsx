import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { taskService } from "@/services";
import { computeStats } from "@/lib/task-utils";
import { useAuth } from "@/context/AuthContext";
import type {
  Activity,
  DashboardStats,
  Profile,
  ProfileInput,
  Project,
  Task,
  TaskInput,
  TaskList,
  TeamMember,
} from "@/types";

type LoadState = "loading" | "ready" | "error";

const DEFAULT_LISTS: TaskList[] = [
  { id: "list-personal", name: "Personal", color: "#3b82f6", icon: "user" },
  { id: "list-work", name: "Work", color: "#8b5cf6", icon: "briefcase" },
  { id: "list-study", name: "Study", color: "#10b981", icon: "book-open" },
  { id: "list-fitness", name: "Fitness", color: "#f59e0b", icon: "activity" },
];

interface TaskContextValue {
  tasks: Task[];
  projects: Project[];
  team: TeamMember[];
  lists: TaskList[];
  profile: Profile | null;
  activity: Activity[];
  stats: DashboardStats;
  state: LoadState;
  selectedProjectId: string | "all";
  setSelectedProjectId: (id: string | "all") => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  reload: () => Promise<void>;
  createTask: (data: TaskInput) => Promise<Task>;
  updateTask: (id: string, data: Partial<TaskInput & { isBookmarked?: boolean }>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  restoreTask: (id: string) => Promise<Task>;
  permanentDeleteTask: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  toggleTaskComplete: (task: Task) => Promise<Task>;
  toggleBookmark: (id: string) => Promise<Task>;
  addComment: (id: string, content: string, author?: string) => Promise<Task>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<Task>;
  updateFocusTime: (id: string, seconds: number) => Promise<Task>;
  addList: (name: string, color: string) => void;
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
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const [lists, setLists] = useState<TaskList[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("taskflow:lists");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return DEFAULT_LISTS;
  });

  const addList = useCallback((name: string, color: string) => {
    const newList: TaskList = {
      id: `list-${Date.now()}`,
      name: name.trim(),
      color,
      icon: "list",
    };
    setLists((prev) => {
      const next = [...prev, newList];
      if (typeof window !== "undefined") {
        localStorage.setItem("taskflow:lists", JSON.stringify(next));
      }
      return next;
    });
    toast.success(`List "${name}" created!`);
  }, []);

  // Read URL query parameter on load if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const p = params.get("projectId") || params.get("project");
      if (p) setSelectedProjectIdState(p);
      const f = params.get("filter");
      if (f) setActiveFilter(f);
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

  const refreshActivity = useCallback(async () => {
    try {
      setActivity(await taskService.getActivity());
    } catch {}
  }, []);

  const restoreTask = useCallback(
    async (id: string) => {
      let t: Task;
      if (taskService.restoreTask) {
        t = await taskService.restoreTask(id);
      } else {
        t = await taskService.updateTask(id, { isTrash: false, deletedAt: null });
      }
      setTasks((prev) =>
        prev.map((x) => (x.id === id ? { ...x, isTrash: false, deletedAt: null } : x)),
      );
      void refreshActivity();
      toast.success("Task restored from Trash");
      return t;
    },
    [refreshActivity],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const taskToDelete = tasks.find((t) => t.id === id);
      await taskService.deleteTask(id);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, isTrash: true, deletedAt: new Date().toISOString() } : t,
        ),
      );
      void refreshActivity();
      toast("Task moved to Trash", {
        action: {
          label: "Undo",
          onClick: () => {
            void restoreTask(id);
          },
        },
      });
    },
    [tasks, restoreTask, refreshActivity],
  );

  const permanentDeleteTask = useCallback(async (id: string) => {
    if (taskService.permanentDeleteTask) {
      await taskService.permanentDeleteTask(id);
    } else {
      await taskService.deleteTask(id);
    }
    setTasks((prev) => prev.filter((x) => x.id !== id));
    toast.success("Task permanently removed");
  }, []);

  const emptyTrash = useCallback(async () => {
    if (taskService.emptyTrash) {
      await taskService.emptyTrash();
    }
    setTasks((prev) => prev.filter((x) => !x.isTrash));
    toast.success("Trash emptied");
  }, []);

  const updateTask = useCallback(
    async (id: string, data: Partial<TaskInput & { isBookmarked?: boolean }>) => {
      const t = await taskService.updateTask(id, data);
      setTasks((prev) => prev.map((x) => (x.id === id ? t : x)));
      void refreshActivity();
      return t;
    },
    [refreshActivity],
  );

  const toggleTaskComplete = useCallback(
    async (task: Task) => {
      const nextStatus = task.status === "completed" ? "pending" : "completed";
      const updated = await updateTask(task.id, {
        status: nextStatus,
        completedAt: nextStatus === "completed" ? new Date().toISOString() : null,
      });

      toast(nextStatus === "completed" ? "Task marked completed!" : "Task reopened", {
        action: {
          label: "Undo",
          onClick: () => {
            void updateTask(task.id, {
              status: task.status,
              completedAt: task.completedAt || null,
            });
          },
        },
      });
      return updated;
    },
    [updateTask],
  );

  const updateFocusTime = useCallback(
    async (id: string, seconds: number) => {
      const existing = tasks.find((t) => t.id === id);
      const current = existing?.focusTimeSeconds || 0;
      return updateTask(id, { focusTimeSeconds: current + seconds });
    },
    [tasks, updateTask],
  );

  const value = useMemo<TaskContextValue>(
    () => ({
      tasks,
      projects,
      team,
      lists,
      profile,
      activity,
      state,
      stats: computeStats(tasks.filter((t) => !t.isTrash)),
      selectedProjectId,
      setSelectedProjectId,
      activeFilter,
      setActiveFilter,
      reload,
      createTask: async (data) => {
        const t = await taskService.createTask(data);
        setTasks((prev) => [t, ...prev]);
        void refreshActivity();
        return t;
      },
      updateTask,
      deleteTask,
      restoreTask,
      permanentDeleteTask,
      emptyTrash,
      toggleTaskComplete,
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
      updateFocusTime,
      addList,
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
      lists,
      profile,
      activity,
      state,
      selectedProjectId,
      setSelectedProjectId,
      activeFilter,
      setActiveFilter,
      reload,
      updateTask,
      deleteTask,
      restoreTask,
      permanentDeleteTask,
      emptyTrash,
      toggleTaskComplete,
      updateFocusTime,
      addList,
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
