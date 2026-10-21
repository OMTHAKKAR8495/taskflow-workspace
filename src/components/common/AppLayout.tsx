import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CheckSquare,
  User,
  Settings,
  Menu,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Calendar,
  Clock,
  AlertTriangle,
  Flame,
  Trash2,
  Plus,
  RefreshCw,
  Download,
  CheckCircle2,
  Database,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { isOverdue } from "@/lib/task-utils";
import { NotificationsBell } from "@/components/common/NotificationsBell";
import { CommandPalette } from "@/components/common/CommandPalette";
import { DataExportImportModal } from "@/components/tasks/DataExportImportModal";
import { connectionStatus, type BackendMode } from "@/services/connectionStatus";
import { toast } from "sonner";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumb?: { label: string; href?: string }[];
}

export function AppLayout({ children, title, breadcrumb }: AppLayoutProps) {
  const { profile, tasks, lists, addList, activeFilter, setActiveFilter, reload } = useTasks();
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState("#6366f1");
  const [addingList, setAddingList] = useState(false);
  const [backendMode, setBackendMode] = useState<BackendMode>(connectionStatus.getMode());
  const [testingConnection, setTestingConnection] = useState(false);

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

  // Filter calculations
  const nonTrashTasks = tasks.filter((t) => !t.isTrash);
  const trashTasks = tasks.filter((t) => t.isTrash);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const myDayTasks = nonTrashTasks.filter((t) => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate).toISOString().slice(0, 10) === todayStr;
  });

  const upcomingTasks = nonTrashTasks.filter((t) => {
    if (!t.dueDate || t.status === "completed") return false;
    return new Date(t.dueDate) > now;
  });

  const overdueTasksList = nonTrashTasks.filter(
    (t) => t.status !== "completed" && isOverdue(t.dueDate),
  );

  const smartNav = [
    {
      id: "my-day",
      label: "My Day",
      icon: Sparkles,
      count: myDayTasks.length,
      iconClass: "text-amber-500",
    },
    {
      id: "upcoming",
      label: "Upcoming",
      icon: Clock,
      count: upcomingTasks.length,
      iconClass: "text-blue-500",
    },
    {
      id: "overdue",
      label: "Overdue",
      icon: AlertTriangle,
      count: overdueTasksList.length,
      iconClass: "text-rose-500",
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: Calendar,
      count: undefined,
      iconClass: "text-purple-500",
    },
    {
      id: "all",
      label: "All Tasks",
      icon: CheckSquare,
      count: nonTrashTasks.length,
      iconClass: "text-primary",
    },
  ];

  const handleSmartSelect = (filterId: string) => {
    setActiveFilter(filterId);
    if (pathname !== "/tasks") {
      navigate({ to: "/tasks" });
    }
    setMobileOpen(false);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const isUp = await connectionStatus.checkHealth();
      if (isUp) {
        toast.success("Connected to PostgreSQL API backend successfully!");
        void reload();
      } else {
        toast.warning("API server is offline. Local storage mode is active.");
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    addList(newListName.trim(), newListColor);
    setNewListName("");
    setAddingList(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <CommandPalette />
      <DataExportImportModal open={exportModalOpen} onOpenChange={setExportModalOpen} />

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card/60 backdrop-blur-md lg:flex lg:fixed lg:inset-y-0 z-30">
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <Link to="/tasks" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <Sparkles className="size-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-foreground">TaskFlow</span>
              <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                To-Do & Productivity
              </span>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Smart Views Navigation */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Smart Views
            </div>
            {smartNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith("/tasks") && activeFilter === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleSmartSelect(item.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "size-4",
                        isActive ? "text-primary-foreground" : item.iconClass,
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Dashboard & Insights */}
            <Link
              to="/dashboard"
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all",
                pathname === "/dashboard"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <div className="flex items-center gap-3">
                <Flame
                  className={cn(
                    "size-4",
                    pathname === "/dashboard" ? "text-primary-foreground" : "text-orange-500",
                  )}
                />
                <span>Insights & Streak</span>
              </div>
            </Link>
          </div>

          {/* User Colored Lists Section */}
          <div className="space-y-1 pt-2 border-t">
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>My Lists</span>
              <button
                type="button"
                onClick={() => setAddingList(!addingList)}
                className="text-primary hover:text-primary/80 cursor-pointer"
                aria-label="Add List"
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            {addingList && (
              <form
                onSubmit={handleCreateList}
                className="p-2 bg-muted/30 rounded-lg space-y-2 border"
              >
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name (e.g. Fitness)..."
                  className="w-full text-xs bg-background px-2 py-1 rounded border outline-none"
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899"].map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setNewListColor(c)}
                        className={`size-4 rounded-full ${newListColor === c ? "ring-2 ring-foreground" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button type="submit" size="sm" className="h-6 px-2 text-[10px]">
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddingList(false)}
                      className="h-6 px-1.5 text-[10px]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {lists.map((list) => {
              const count = nonTrashTasks.filter((t) => t.listId === list.id).length;
              const isActive = pathname.startsWith("/tasks") && activeFilter === list.id;
              return (
                <button
                  type="button"
                  key={list.id}
                  onClick={() => handleSmartSelect(list.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: list.color }}
                    />
                    <span className="truncate">{list.name}</span>
                  </div>
                  {count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Trash Section at Bottom */}
          <div className="pt-2 border-t">
            <button
              type="button"
              onClick={() => handleSmartSelect("trash")}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer",
                pathname.startsWith("/tasks") && activeFilter === "trash"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <div className="flex items-center gap-3">
                <Trash2 className="size-4" />
                <span>Trash</span>
              </div>
              {trashTasks.length > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {trashTasks.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="border-t p-3 space-y-2">
          <div className="flex items-center justify-between px-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Settings className="size-4" />
              <span>Settings</span>
            </button>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                backendMode === "connected"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${backendMode === "connected" ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              <span>{backendMode === "connected" ? "API Live" : "Offline"}</span>
            </span>
          </div>

          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
          >
            <Avatar className="size-8 border border-border">
              <AvatarImage src={profile?.avatarUrl} alt={profile?.fullName || "User"} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{displayEmail}</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-card/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
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
                        <Link to={crumb.href} className="hover:text-foreground transition-colors">
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
                <h1 className="text-lg font-semibold tracking-tight text-foreground truncate">
                  {title}
                </h1>
              )}
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Command Palette Trigger Button */}
            <button
              type="button"
              onClick={() => {
                const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                document.dispatchEvent(event);
              }}
              className="hidden sm:flex items-center gap-2 rounded-lg border bg-muted/40 hover:bg-muted px-2.5 py-1.5 text-xs text-muted-foreground transition-colors cursor-pointer"
            >
              <span>Quick Search</span>
              <kbd className="rounded bg-background px-1.5 py-0.5 text-[10px] font-semibold border">
                ⌘K
              </kbd>
            </button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="size-9 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? (
                <Moon className="size-4 text-primary" />
              ) : (
                <Sun className="size-4 text-amber-500" />
              )}
            </Button>

            {/* Notifications Bell */}
            <NotificationsBell />

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative size-9 rounded-full p-0 cursor-pointer">
                  <Avatar className="size-8 border">
                    <AvatarImage src={profile?.avatarUrl} alt={displayName} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
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
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
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
                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="size-4" />
                  <span>Workspace Settings</span>
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

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-card rounded-2xl shadow-xl border">
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
              <Settings className="size-5" />
            </div>
            <DialogTitle className="text-lg font-bold">Workspace Settings</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Manage backend connectivity, database status, and workspace data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Backend Connectivity Status */}
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
                      ? "Connected to PostgreSQL API"
                      : "Offline Mode (Local Storage)"}
                  </span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {backendMode === "connected"
                  ? "Connected to Express + PostgreSQL on http://localhost:4000/api with bcrypt JWT sessions."
                  : "Operating safely in offline mode with client-side persistence in localStorage."}
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

            {/* Quick Export / Import Action */}
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

            <div className="space-y-1 pt-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">Current Account</p>
              <p className="text-sm font-semibold">
                {displayName} ({user?.username || "omthakkar"})
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
