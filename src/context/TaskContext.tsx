import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  ProjectInvitation,
  ProjectInvitationInput,
  Task,
  TaskInput,
  TaskList,
  TaskProgressUpdate,
  TaskProgressUpdateInput,
  TaskReview,
  TaskReviewInput,
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
  reviewQueue: Task[];
  loadReviewQueue: () => Promise<Task[]>;
  reload: () => Promise<void>;
  createTask: (data: TaskInput) => Promise<Task>;
  updateTask: (id: string, data: Partial<TaskInput & { isBookmarked?: boolean }>) => Promise<Task>;
  updateTaskStatus: (taskId: string, status: TaskStatus, blockedReason?: string) => Promise<Task>;
  submitProgressUpdate: (taskId: string, data: TaskProgressUpdateInput) => Promise<{ task: Task; progressUpdate: TaskProgressUpdate }>;
  getTaskProgressUpdates: (taskId: string) => Promise<TaskProgressUpdate[]>;
  submitTaskReview: (taskId: string, data: TaskReviewInput) => Promise<{ task: Task; review: TaskReview }>;
  getTaskReviews: (taskId: string) => Promise<TaskReview[]>;
  createInvitation: (projectId: string, data: ProjectInvitationInput) => Promise<any>;
  resendInvitation: (invitationId: string) => Promise<any>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  getProjectInvitations: (projectId: string) => Promise<ProjectInvitation[]>;
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
  addTeamMember: (data: { name: string; email: string; role: string; avatarUrl?: string }) => Promise<TeamMember>;
  updateProfile: (data: ProfileInput) => Promise<Profile>;
}

const TaskContext = createContext<TaskContextValue | null>(null);

function getInitialCache<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`taskflow:cache:${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed !== null && parsed !== undefined) return parsed;
    }
  } catch {}
  return fallback;
}

function setLocalCache(key: string, value: any): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`taskflow:cache:${key}`, JSON.stringify(value));
  } catch {}
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user, updateCurrentUser } = useAuth();
  const [tasks, setTasksState] = useState<Task[]>(() => getInitialCache("tasks", []));
  const [projects, setProjectsState] = useState<Project[]>(() => getInitialCache("projects", []));
  const [team, setTeamState] = useState<TeamMember[]>(() => getInitialCache("team", []));
  const [profile, setProfileState] = useState<Profile | null>(() => getInitialCache("profile", null));
  const [activity, setActivityState] = useState<Activity[]>(() => getInitialCache("activity", []));
  const [notifications, setNotificationsState] = useState<NotificationItem[]>(() => getInitialCache("notifications", []));
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [reviewQueue, setReviewQueue] = useState<Task[]>([]);

  // Instant render: If cached tasks exist, start in "ready" state immediately (0ms wait)
  const [state, setState] = useState<LoadState>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("taskflow:cache:tasks");
        if (cached && JSON.parse(cached)?.length > 0) return "ready";
      } catch {}
    }
    return "loading";
  });

  const [selectedProjectId, setSelectedProjectIdState] = useState<string | "all">("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const setTasks = useCallback((valOrFn: React.SetStateAction<Task[]>) => {
    setTasksState((prev) => {
      const next = typeof valOrFn === "function" ? (valOrFn as (prev: Task[]) => Task[])(prev) : valOrFn;
      setLocalCache("tasks", next);
      return next;
    });
  }, []);

  const setProjects = useCallback((valOrFn: React.SetStateAction<Project[]>) => {
    setProjectsState((prev) => {
      const next = typeof valOrFn === "function" ? (valOrFn as (prev: Project[]) => Project[])(prev) : valOrFn;
      setLocalCache("projects", next);
      return next;
    });
  }, []);

  const setTeam = useCallback((valOrFn: React.SetStateAction<TeamMember[]>) => {
    setTeamState((prev) => {
      const next = typeof valOrFn === "function" ? (valOrFn as (prev: TeamMember[]) => TeamMember[])(prev) : valOrFn;
      setLocalCache("team", next);
      return next;
    });
  }, []);

  const setProfile = useCallback((valOrFn: React.SetStateAction<Profile | null>) => {
    setProfileState((prev) => {
      const next = typeof valOrFn === "function" ? (valOrFn as (prev: Profile | null) => Profile | null)(prev) : valOrFn;
      setLocalCache("profile", next);
      return next;
    });
  }, []);

  const setActivity = useCallback((valOrFn: React.SetStateAction<Activity[]>) => {
    setActivityState((prev) => {
      const next = typeof valOrFn === "function" ? (valOrFn as (prev: Activity[]) => Activity[])(prev) : valOrFn;
      setLocalCache("activity", next);
      return next;
    });
  }, []);

  const setNotifications = useCallback((valOrFn: React.SetStateAction<NotificationItem[]>) => {
    setNotificationsState((prev) => {
      const next = typeof valOrFn === "function" ? (valOrFn as (prev: NotificationItem[]) => NotificationItem[])(prev) : valOrFn;
      setLocalCache("notifications", next);
      return next;
    });
  }, []);

  const [lists, setLists] = useState<TaskList[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("taskflow:lists");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return DEFAULT_LISTS;
  });

  const loadReviewQueue = useCallback(async () => {
    if (taskService.getReviewQueue) {
      try {
        const queue = await taskService.getReviewQueue();
        setReviewQueue(queue);
        return queue;
      } catch (err) {
        console.error("Failed to load review queue", err);
      }
    }
    return [];
  }, []);

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

  const inFlightReload = useRef<Promise<void> | null>(null);

  const reload = useCallback(async () => {
    if (inFlightReload.current) {
      return inFlightReload.current;
    }

    // Never flip back to loading state if data is already visible
    setState((prev) => (tasks.length > 0 || projects.length > 0 ? "ready" : prev));

    const promise = (async () => {
      try {
        // Parallelize all 7 initial queries concurrently
        const [
          tasksRes,
          profileRes,
          actRes,
          projsRes,
          teamRes,
          notifsRes,
          reviewRes,
        ] = await Promise.allSettled([
          taskService.getTasks(),
          taskService.getProfile(),
          taskService.getActivity(),
          taskService.getProjects(),
          taskService.getTeamMembers(),
          taskService.getNotifications ? taskService.getNotifications() : Promise.resolve(null),
          taskService.getReviewQueue ? taskService.getReviewQueue() : Promise.resolve([]),
        ]);

        if (tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value)) {
          setTasks(tasksRes.value);
        }
        if (profileRes.status === "fulfilled" && profileRes.value) {
          setProfile(profileRes.value);
        }
        if (actRes.status === "fulfilled" && Array.isArray(actRes.value)) {
          setActivity(actRes.value);
        }
        if (projsRes.status === "fulfilled" && Array.isArray(projsRes.value)) {
          setProjects(projsRes.value);
        }
        if (teamRes.status === "fulfilled" && Array.isArray(teamRes.value)) {
          setTeam(teamRes.value);
        }

        if (notifsRes.status === "fulfilled" && notifsRes.value) {
          setNotifications(notifsRes.value.notifications || []);
          setUnreadNotificationCount(notifsRes.value.unreadCount || 0);
        }

        if (reviewRes.status === "fulfilled" && Array.isArray(reviewRes.value)) {
          setReviewQueue(reviewRes.value);
        }

        setState("ready");
      } catch (err) {
        console.error("TaskContext reload error:", err);
        setState((prev) => (tasks.length > 0 || projects.length > 0 ? "ready" : "error"));
      } finally {
        inFlightReload.current = null;
      }
    })();

    inFlightReload.current = promise;
    return promise;
  }, [tasks.length, projects.length, setTasks, setProfile, setActivity, setProjects, setTeam, setNotifications]);

  const lastLoadedUserId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (lastLoadedUserId.current !== user?.id) {
      lastLoadedUserId.current = user?.id;
      void reload();
    }
  }, [user?.id, reload]);

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

  const addTeamMember = useCallback(
    async (data: { name: string; email: string; role: string; avatarUrl?: string }) => {
      if (!taskService.addTeamMember) {
        throw new Error("Add team member is not supported");
      }
      const member = await taskService.addTeamMember(data);
      setTeam((prev) => [...prev, member]);
      toast.success(`Team member "${member.name}" added!`);
      return member;
    },
    [],
  );

  const submitProgressUpdate = useCallback(
    async (taskId: string, data: TaskProgressUpdateInput) => {
      if (!taskService.submitProgressUpdate) throw new Error("Progress updates not supported");
      const result = await taskService.submitProgressUpdate(taskId, data);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? result.task : t)));
      void refreshActivity();
      void loadReviewQueue();
      toast.success("Progress update submitted");
      return result;
    },
    [refreshActivity, loadReviewQueue],
  );

  const getTaskProgressUpdates = useCallback(async (taskId: string) => {
    if (!taskService.getTaskProgressUpdates) return [];
    return await taskService.getTaskProgressUpdates(taskId);
  }, []);

  const submitTaskReview = useCallback(
    async (taskId: string, data: TaskReviewInput) => {
      if (!taskService.submitTaskReview) throw new Error("Task review not supported");
      const result = await taskService.submitTaskReview(taskId, data);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? result.task : t)));
      void refreshActivity();
      void loadReviewQueue();
      if (data.decision === "approved") {
        toast.success("Task approved & completed!");
      } else {
        toast.info("Changes requested. Assignee has been notified.");
      }
      return result;
    },
    [refreshActivity, loadReviewQueue],
  );

  const getTaskReviews = useCallback(async (taskId: string) => {
    if (!taskService.getTaskReviews) return [];
    return await taskService.getTaskReviews(taskId);
  }, []);

  const createInvitation = useCallback(
    async (projectId: string, data: ProjectInvitationInput) => {
      if (!taskService.createProjectInvitation) throw new Error("Invitations not supported");
      const res = await taskService.createProjectInvitation(projectId, data);
      if (res.emailSent) {
        toast.success(`Invitation email sent to ${data.email}`);
      } else {
        toast.info(`Invitation created! You can copy the invitation link.`);
      }
      return res;
    },
    [],
  );

  const resendInvitation = useCallback(async (invitationId: string) => {
    if (!taskService.resendProjectInvitation) throw new Error("Resend invitation not supported");
    const res = await taskService.resendProjectInvitation(invitationId);
    if (res.emailSent) {
      toast.success("Invitation email resent!");
    } else {
      toast.info("New invitation link generated.");
    }
    return res;
  }, []);

  const revokeInvitation = useCallback(async (invitationId: string) => {
    if (!taskService.revokeProjectInvitation) throw new Error("Revoke invitation not supported");
    await taskService.revokeProjectInvitation(invitationId);
    toast.success("Invitation revoked");
  }, []);

  const getProjectInvitations = useCallback(async (projectId: string) => {
    if (!taskService.getProjectInvitations) return [];
    return await taskService.getProjectInvitations(projectId);
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
      reviewQueue,
      loadReviewQueue,
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
      submitProgressUpdate,
      getTaskProgressUpdates,
      submitTaskReview,
      getTaskReviews,
      createInvitation,
      resendInvitation,
      revokeInvitation,
      getProjectInvitations,
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
      addTeamMember,
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
      reviewQueue,
      loadReviewQueue,
      reload,
      updateTask,
      updateTaskStatus,
      submitProgressUpdate,
      getTaskProgressUpdates,
      submitTaskReview,
      getTaskReviews,
      createInvitation,
      resendInvitation,
      revokeInvitation,
      getProjectInvitations,
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
      addTeamMember,
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
