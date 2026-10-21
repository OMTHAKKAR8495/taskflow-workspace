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
  NotificationItem,
  Profile,
  ProfileInput,
  Project,
  Task,
  TaskInput,
  TaskList,
  TaskStatus,
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
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  reload: () => Promise<void>;
  createTask: (data: TaskInput) => Promise<Task>;
  updateTask: (id: string, data: Partial<TaskInput & { isBookmarked?: boolean }>) => Promise<Task>;
  updateTaskStatus: (taskId: string, status: TaskStatus, blockedReason?: string) => Promise<Task>;
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
  createProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>;
  archiveProject: (id: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
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

      // Notifications
      if (taskService.getNotifications) {
        try {
          const notifs = await taskService.getNotifications();
          setNotifications(notifs.notifications || []);
          setUnreadNotificationCount(notifs.unreadCount || 0);
        } catch {}
      }

      setState("ready");
    } catch (err) {
      console.error("TaskContext reload error:", err);
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
    [restoreTask, refreshActivity],
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

  const updateTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus, blockedReason?: string) => {
      // Optimistic update
      const previous = tasks.find((t) => t.id === taskId);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status,
                blockedReason: blockedReason || (status !== "blocked" ? "" : t.blockedReason),
                completedAt: status === "completed" ? new Date().toISOString() : null,
              }
            : t,
        ),
      );

      try {
        const updated = await taskService.updateTaskStatus(taskId, status, blockedReason);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        void refreshActivity();
        toast.success(`Task moved to ${status.replace("_", " ")}`);
        return updated;
      } catch (err: any) {
        // Rollback on error
        if (previous) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? previous : t)));
        }
        const errorMsg = err?.data?.error || err?.message || "Failed to update task status";
        toast.error(errorMsg);
        throw err;
      }
    },
    [tasks, refreshActivity],
  );

  const toggleTaskComplete = useCallback(
    async (task: Task) => {
      const nextStatus: TaskStatus = task.status === "completed" ? "ready" : "completed";
      return updateTaskStatus(task.id, nextStatus);
    },
    [updateTaskStatus],
  );

  const updateFocusTime = useCallback(
    async (id: string, seconds: number) => {
      const existing = tasks.find((t) => t.id === id);
      const current = existing?.focusTimeSeconds || 0;
      return updateTask(id, { focusTimeSeconds: current + seconds });
    },
    [tasks, updateTask],
  );

  const createProject = useCallback(async (data: Partial<Project>) => {
    const p = await taskService.createProject(data);
    setProjects((prev) => [...prev, p]);
    toast.success(`Project "${p.name}" created!`);
    return p;
  }, []);

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => {
    const p = await taskService.updateProject(id, data);
    setProjects((prev) => prev.map((x) => (x.id === id ? p : x)));
    toast.success(`Project "${p.name}" updated!`);
    return p;
  }, []);

  const archiveProject = useCallback(async (id: string) => {
    const p = await taskService.archiveProject(id);
    setProjects((prev) => prev.map((x) => (x.id === id ? p : x)));
    toast.success(p.status === "archived" ? "Project archived" : "Project restored");
    return p;
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    await taskService.deleteProject(id);
    setProjects((prev) => prev.filter((x) => x.id !== id));
    toast.success("Project deleted");
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    if (taskService.markNotificationRead) {
      await taskService.markNotificationRead(id);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (taskService.markAllNotificationsRead) {
      await taskService.markAllNotificationsRead();
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadNotificationCount(0);
    toast.success("All notifications marked as read");
  }, []);

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
      notifications,
      unreadNotificationCount,
      reload,
      createTask: async (data) => {
        const t = await taskService.createTask(data);
        setTasks((prev) => [t, ...prev]);
        void refreshActivity();
        toast.success(`Task "${t.title}" created!`);
        return t;
      },
      updateTask,
      updateTaskStatus,
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
        toast.success("Comment added");
        return t;
      },
      toggleSubtask: async (taskId, subtaskId) => {
        const t = await taskService.toggleSubtask(taskId, subtaskId);
        setTasks((prev) => prev.map((x) => (x.id === taskId ? t : x)));
        return t;
      },
      updateFocusTime,
      addList,
      createProject,
      updateProject,
      archiveProject,
      deleteProject,
      markNotificationRead,
      markAllNotificationsRead,
      updateProfile: async (data) => {
        const p = await taskService.updateProfile(data);
        setProfile(p);
        updateCurrentUser({ fullName: p.fullName, email: p.email });
        toast.success("Profile updated!");
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
      notifications,
      unreadNotificationCount,
      reload,
      updateTask,
      updateTaskStatus,
      deleteTask,
      restoreTask,
      permanentDeleteTask,
      emptyTrash,
      toggleTaskComplete,
      updateFocusTime,
      addList,
      createProject,
      updateProject,
      archiveProject,
      deleteProject,
      markNotificationRead,
      markAllNotificationsRead,
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
