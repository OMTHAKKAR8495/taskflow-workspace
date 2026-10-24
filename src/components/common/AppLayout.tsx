import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users,
  Calendar,
  BarChart3,
  Bell,
  Settings,
  Menu,
  Sparkles,
  Sun,
  Moon,
  Clock,
  AlertTriangle,
  Flame,
  Trash2,
  Plus,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronRight,
  User,
  ListTodo,
  ShieldCheck,
  Search,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { isOverdue } from "@/lib/task-utils";
import { NotificationsBell } from "@/components/common/NotificationsBell";
import { CommandPalette } from "@/components/common/CommandPalette";
import { DataExportImportModal } from "@/components/tasks/DataExportImportModal";
import { connectionStatus, type BackendMode } from "@/services/connectionStatus";
import { toast } from "sonner";
import type { TaskPriority } from "@/types";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumb?: { label: string; href?: string }[];
}

export function AppLayout({ children, title, breadcrumb }: AppLayoutProps) {
  const {
    profile,
    tasks,
    projects,
    team,
    lists,
    addList,
    activeFilter,
    setActiveFilter,
    reload,
    unreadNotificationCount,
    createProject,
  } = useTasks();
  const { user, logout, switchRole } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [taskViewsCollapsed, setTaskViewsCollapsed] = useState(false);
  const [backendMode, setBackendMode] = useState<BackendMode>(connectionStatus.getMode());
  const [testingConnection, setTestingConnection] = useState(false);

  // New Project Form State
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectColor, setProjectColor] = useState("#6366f1");
  const [projectPriority, setProjectPriority] = useState<TaskPriority>("medium");
  const [projectStatus, setProjectStatus] = useState<"active" | "planning" | "completed">("active");
  const [projectStartDate, setProjectStartDate] = useState("");
  const [projectDueDate, setProjectDueDate] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // User list creation state
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState("#6366f1");
  const [addingList, setAddingList] = useState(false);

  const routerState = useRouterState();
  const navigate = useNavigate();
  const pathname = routerState.location.pathname;

  useEffect(() => {
    return connectionStatus.subscribe((m) => setBackendMode(m));
  }, []);

  const displayName = user?.fullName || profile?.fullName || "Om Thakkar";
  const displayEmail = user?.email || profile?.email || "omthakkar@example.com";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Overdue / Review counts for badges
  const overdueCount = useMemo(() => {
    return tasks.filter((t) => !t.isTrash && t.status !== "completed" && isOverdue(t.dueDate)).length;
  }, [tasks]);

  const needsReviewCount = useMemo(() => {
    return tasks.filter((t) => !t.isTrash && t.status === "in_review").length;
  }, [tasks]);

  const activeProjectsCount = useMemo(() => {
    return projects.filter((p) => p.status === "active").length;
  }, [projects]);

  const isLeader = user?.role === "leader" || user?.role === "admin";
  const searchStr = typeof window !== "undefined" ? window.location.search : "";

  // Team Member navigation:
  // My Dashboard · My Tasks · My Updates · My Feedback · Notifications · My Profile
  const memberNav = [
    {
      id: "my-dashboard",
      label: "My Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard" && (!searchStr || searchStr.includes("tab=overview") || searchStr === ""),
    },
    {
      id: "my-tasks",
      label: "My Tasks",
      href: "/dashboard?tab=tasks",
      icon: CheckSquare,
      active: (pathname === "/dashboard" && searchStr.includes("tab=tasks")) || pathname === "/my-work",
      badge: overdueCount > 0 ? `${overdueCount} due` : undefined,
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    },
    {
      id: "my-updates",
      label: "My Updates",
      href: "/dashboard?tab=updates",
      icon: Clock,
      active: pathname === "/dashboard" && searchStr.includes("tab=updates"),
    },
    {
      id: "my-feedback",
      label: "My Feedback",
      href: "/dashboard?tab=feedback",
      icon: AlertTriangle,
      active: pathname === "/dashboard" && searchStr.includes("tab=feedback"),
    },
    {
      id: "notifications",
      label: "Notifications",
      href: "/notifications",
      icon: Bell,
      active: pathname.startsWith("/notifications"),
      badge: unreadNotificationCount > 0 ? `${unreadNotificationCount}` : undefined,
      badgeColor: "bg-indigo-500 text-white font-bold",
    },
    {
      id: "my-profile",
      label: "My Profile",
      href: "/profile",
      icon: User,
      active: pathname.startsWith("/profile"),
    },
  ];

  // Team Leader navigation:
  // Overview · Projects · All Tasks · Team Members · Reviews · Activity · Reports · Settings
  const leaderNav = [
    {
      id: "overview",
      label: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard" || pathname === "/",
    },
    {
      id: "projects",
      label: "Projects",
      href: "/projects",
      icon: FolderKanban,
      active: pathname.startsWith("/projects"),
      badge: activeProjectsCount > 0 ? `${activeProjectsCount}` : undefined,
    },
    {
      id: "all-tasks",
      label: "All Tasks",
      href: "/tasks",
      icon: ListTodo,
      active: pathname.startsWith("/tasks"),
    },
    {
      id: "team",
      label: "Team Members",
      href: "/team",
      icon: Users,
      active: pathname.startsWith("/team"),
      badge: team.length > 0 ? `${team.length}` : undefined,
    },
    {
      id: "reviews",
      label: "Reviews",
      href: "/my-work?tab=reviews",
      icon: CheckSquare,
      active: pathname.startsWith("/my-work"),
      badge: needsReviewCount > 0 ? `${needsReviewCount}` : undefined,
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    },
    {
      id: "activity",
      label: "Activity",
      href: "/dashboard#activity",
      icon: Clock,
      active: false,
    },
    {
      id: "reports",
      label: "Reports",
      href: "/reports",
      icon: BarChart3,
      active: pathname.startsWith("/reports"),
    },
    {
      id: "settings",
      label: "Settings",
      href: "/settings",
      icon: Settings,
      active: pathname.startsWith("/settings"),
    },
  ];

  const currentNav = isLeader ? leaderNav : memberNav;

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const isUp = await connectionStatus.checkHealth();
      if (isUp) {
        toast.success("PostgreSQL API backend is healthy and connected!");
        void reload();
      } else {
        toast.warning("API server is offline. Local storage mode is active.");
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setIsCreatingProject(true);
    try {
      const genKey = projectKey.trim().toUpperCase() || projectName.slice(0, 3).toUpperCase();
      const newProj = await createProject({
        name: projectName.trim(),
        key: genKey,
        description: projectDesc.trim(),
        color: projectColor,
        priority: projectPriority,
        status: projectStatus,
        startDate: projectStartDate ? new Date(projectStartDate).toISOString() : null,
        deadline: projectDueDate ? new Date(projectDueDate).toISOString() : null,
        health: "on_track",
        progress: 0,
      });
      setCreateProjectModalOpen(false);
      setProjectName("");
      setProjectKey("");
      setProjectDesc("");
      setProjectStartDate("");
      setProjectDueDate("");
      navigate({ to: "/projects/$id", params: { id: newProj.id } });
    } catch (err: any) {
      toast.error(err?.message || "Failed to create project");
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    addList(newListName.trim(), newListColor);
    setNewListName("");
    setAddingList(false);
  };

  const handleSmartSelect = (filterId: string) => {
    setActiveFilter(filterId);
    if (!pathname.startsWith("/tasks")) {
      navigate({ to: "/tasks" });
    }
    setMobileOpen(false);
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-950 text-slate-300">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-5">
        <Link to="/dashboard" preload="intent" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-md shadow-indigo-600/30">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white">TaskFlow</span>
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300 border border-indigo-500/30">
                Nexus
              </span>
            </div>
            <span className="block text-[10px] font-medium tracking-wide text-slate-400">
              Enterprise PM Platform
            </span>
          </div>
        </Link>
      </div>

      {/* Nav Body */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {/* Core Workspace Routes */}
        <div className="space-y-1">
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isLeader ? "Team Leader Navigation" : "My Workspace"}
          </div>
          {currentNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.href}
                preload="intent"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-all group",
                  item.active
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-bold"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-transform group-hover:scale-105",
                      item.active ? "text-white" : "text-slate-400 group-hover:text-slate-200",
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                      item.badgeColor
                        ? item.badgeColor
                        : item.active
                          ? "bg-white/20 text-white border-white/20"
                          : "bg-slate-800 text-slate-300 border-slate-700",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Team Leader Only Management Sections */}
        {isLeader && (
          <>
            {/* Active Projects Quick Access */}
            <div className="space-y-1 border-t border-slate-800/80 pt-4">
              <div className="flex items-center justify-between px-3 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Active Projects
                </span>
                <button
                  type="button"
                  onClick={() => setCreateProjectModalOpen(true)}
                  className="text-slate-400 hover:text-indigo-400 cursor-pointer p-0.5"
                  title="Create new project"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              <div className="space-y-0.5">
                {projects.slice(0, 6).map((proj) => {
                  const isCurrent = pathname === `/projects/${proj.id}`;
                  return (
                    <Link
                      key={proj.id}
                      to="/projects/$id"
                      params={{ id: proj.id }}
                      preload="intent"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium transition-all group",
                        isCurrent
                          ? "bg-slate-800 text-white font-semibold"
                          : "text-slate-300 hover:bg-slate-900 hover:text-white",
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span
                          className="size-2 rounded-full shrink-0 ring-1 ring-white/20"
                          style={{ backgroundColor: proj.color || "#6366f1" }}
                        />
                        <span className="truncate">{proj.name}</span>
                      </div>
                      {proj.key && (
                        <span className="text-[10px] text-slate-400 font-mono group-hover:text-slate-300">
                          {proj.key}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {projects.length > 6 && (
                  <Link
                    to="/projects"
                    preload="intent"
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-1 text-[11px] font-medium text-indigo-400 hover:underline"
                  >
                    + {projects.length - 6} more projects
                  </Link>
                )}
              </div>
            </div>

            {/* Task Views & Custom Lists */}
            <div className="space-y-1 border-t border-slate-800/80 pt-4">
              <button
                type="button"
                onClick={() => setTaskViewsCollapsed(!taskViewsCollapsed)}
                className="flex w-full items-center justify-between px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <span>Task Backlog & Lists</span>
                {taskViewsCollapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
              </button>

              {!taskViewsCollapsed && (
                <div className="space-y-0.5">
                  <Link
                    to="/tasks"
                    preload="intent"
                    onClick={() => {
                      setActiveFilter("all");
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      pathname === "/tasks" && activeFilter === "all"
                        ? "bg-slate-800 text-white"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <ListTodo className="size-3.5 text-slate-400" />
                      <span>All Tasks Board</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{tasks.filter((t) => !t.isTrash).length}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleSmartSelect("overdue")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                      pathname.startsWith("/tasks") && activeFilter === "overdue"
                        ? "bg-rose-500/20 text-rose-300"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-3.5 text-rose-400" />
                      <span>Overdue Tasks</span>
                    </div>
                    {overdueCount > 0 && (
                      <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-rose-300">
                        {overdueCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSmartSelect("trash")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                      pathname.startsWith("/tasks") && activeFilter === "trash"
                        ? "bg-slate-800 text-rose-400"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 className="size-3.5 text-slate-400" />
                      <span>Trash</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Sidebar Footer with PostgreSQL Live Status & Profile */}
      <div className="border-t border-slate-800/80 p-3 space-y-2 bg-slate-950/80">
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
          >
            <ShieldCheck className="size-3.5 text-indigo-400" />
            <span>Database Node</span>
          </button>
          <span
            className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
              backendMode === "connected"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${backendMode === "connected" ? "bg-emerald-400" : "bg-amber-400"}`}
            />
            <span>{backendMode === "connected" ? "PostgreSQL Active" : "Local Mode"}</span>
          </span>
        </div>

        <Link
          to="/profile"
          preload="intent"
          className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-900"
        >
          <Avatar className="size-8 border border-slate-700">
            <AvatarImage src={profile?.avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-indigo-600/30 text-indigo-300 font-bold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{displayName}</p>
            <p className="truncate text-[10px] text-slate-400">{displayEmail}</p>
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <CommandPalette />
      <DataExportImportModal open={exportModalOpen} onOpenChange={setExportModalOpen} />

      {/* Desktop Sidebar (Deep Charcoal / Navy #0f172a) */}
      <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-950 lg:flex lg:fixed lg:inset-y-0 z-30 shadow-xl">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 border-r border-slate-800 bg-slate-950">
          {renderSidebarContent()}
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-card/85 px-4 backdrop-blur-md sm:px-6 lg:px-8 shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>

            <div className="min-w-0">
              {breadcrumb && breadcrumb.length > 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {breadcrumb.map((crumb, idx) => (
                    <span key={crumb.label} className="flex items-center gap-1.5">
                      {idx > 0 && <span>/</span>}
                      {crumb.href ? (
                        <Link to={crumb.href} preload="intent" className="hover:text-foreground transition-colors font-medium">
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="font-semibold text-foreground">{crumb.label}</span>
                      )}
                    </span>
                  ))}
                </div>
              ) : null}
              {title && (
                <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
                  {title}
                </h1>
              )}
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Command Palette Trigger */}
            <button
              type="button"
              onClick={() => {
                const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                document.dispatchEvent(event);
              }}
              className="hidden sm:flex items-center gap-2 rounded-lg border bg-muted/40 hover:bg-muted px-2.5 py-1.5 text-xs text-muted-foreground transition-colors cursor-pointer"
            >
              <Search className="size-3.5" />
              <span>Search</span>
              <kbd className="rounded bg-background px-1.5 py-0.5 text-[10px] font-semibold border">
                ⌘K
              </kbd>
            </button>

            {/* Quick Create Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/30">
                  <Plus className="size-3.5" />
                  <span className="hidden sm:inline">Create</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 shadow-xl">
                <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
                  Quick Create
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/tasks/new" })}
                  className="flex items-center gap-2 cursor-pointer font-medium"
                >
                  <CheckSquare className="size-4 text-indigo-500" />
                  <span>New Task</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setCreateProjectModalOpen(true)}
                  className="flex items-center gap-2 cursor-pointer font-medium"
                >
                  <FolderKanban className="size-4 text-emerald-500" />
                  <span>New Project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Role Switcher Toggle */}
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  void switchRole("leader");
                  toast.success("Switched to Team Leader View");
                }}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1",
                  user?.role !== "member"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Switch view & permissions to Team Leader"
              >
                <span>👑 Leader</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void switchRole("member");
                  toast.success("Switched to Team Member View");
                }}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1",
                  user?.role === "member"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Switch view & permissions to Team Member"
              >
                <span>👤 Member</span>
              </button>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="size-9 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? (
                <Moon className="size-4 text-indigo-400" />
              ) : (
                <Sun className="size-4 text-amber-500" />
              )}
            </Button>

            {/* Live Notifications Bell */}
            <NotificationsBell />

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative size-9 rounded-full p-0 cursor-pointer">
                  <Avatar className="size-8 border">
                    <AvatarImage src={profile?.avatarUrl} alt={displayName} />
                    <AvatarFallback className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 shadow-xl">
                <DropdownMenuLabel>
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" preload="intent" className="flex items-center gap-2 cursor-pointer">
                    <User className="size-4" />
                    <span>My Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setExportModalOpen(true)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Download className="size-4" />
                  <span>Export & Import Data</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" preload="intent" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="size-4" />
                    <span>Workspace Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-rose-600 focus:text-rose-600 flex items-center gap-2 cursor-pointer"
                >
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Quick Create Project Modal */}
      <Dialog open={createProjectModalOpen} onOpenChange={setCreateProjectModalOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-card rounded-2xl shadow-xl border">
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 mb-2">
              <FolderKanban className="size-5" />
            </div>
            <DialogTitle className="text-lg font-bold">Create New Project</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define a new initiative, roadmap, or client workspace with deliverables and milestones.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProjectSubmit} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Project Name *</label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Mobile Banking App v2"
                className="w-full text-sm bg-background px-3 py-2 rounded-lg border outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Key Prefix</label>
                <input
                  type="text"
                  maxLength={5}
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                  placeholder="e.g. BNK"
                  className="w-full text-sm bg-background px-3 py-2 rounded-lg border outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Priority</label>
                <select
                  value={projectPriority}
                  onChange={(e) => setProjectPriority(e.target.value as TaskPriority)}
                  className="w-full text-sm bg-background px-3 py-2 rounded-lg border outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Status</label>
                <select
                  value={projectStatus}
                  onChange={(e) => setProjectStatus(e.target.value as any)}
                  className="w-full text-sm bg-background px-3 py-2 rounded-lg border outline-none"
                >
                  <option value="active">Active</option>
                  <option value="planning">Planning</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Start Date</label>
                <input
                  type="date"
                  value={projectStartDate}
                  onChange={(e) => setProjectStartDate(e.target.value)}
                  className="w-full text-xs bg-background px-3 py-2 rounded-lg border outline-none"
                >
                </input>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Due Date</label>
                <input
                  type="date"
                  value={projectDueDate}
                  onChange={(e) => setProjectDueDate(e.target.value)}
                  className="w-full text-xs bg-background px-3 py-2 rounded-lg border outline-none"
                >
                </input>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Color Theme</label>
              <div className="flex gap-2">
                {["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444"].map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setProjectColor(c)}
                    className={`size-6 rounded-full cursor-pointer transition-transform ${
                      projectColor === c ? "ring-2 ring-foreground scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Description</label>
              <textarea
                rows={2}
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="High-level goal and scope..."
                className="w-full text-xs bg-background px-3 py-2 rounded-lg border outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateProjectModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingProject}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {isCreatingProject ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Backend Diagnostics Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-card rounded-2xl shadow-xl border">
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 mb-2">
              <ShieldCheck className="size-5" />
            </div>
            <DialogTitle className="text-lg font-bold">PostgreSQL Engine Status</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Monitor real-time Express and PostgreSQL connection diagnostics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Backend API Engine
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    backendMode === "connected"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      backendMode === "connected" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  <span>
                    {backendMode === "connected"
                      ? "Connected to PostgreSQL"
                      : "Offline Fallback Mode"}
                  </span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {backendMode === "connected"
                  ? "Connected to live PostgreSQL database with authenticated JWT sessions."
                  : "Operating in safe offline mode with client-side persistence in localStorage."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="w-full gap-2 text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className={`size-3.5 ${testingConnection ? "animate-spin" : ""}`} />
                <span>{testingConnection ? "Testing..." : "Test Backend Connection"}</span>
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
              <div>
                <p className="text-xs font-semibold text-foreground">Data Backup & Migration</p>
                <p className="text-[11px] text-muted-foreground">Download or import JSON / CSV</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSettingsOpen(false);
                  setExportModalOpen(true);
                }}
                className="text-xs font-semibold"
              >
                Export / Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
