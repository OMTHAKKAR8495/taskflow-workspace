import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CheckSquare,
  User,
  Settings,
  Bell,
  Menu,
  X,
  CheckCircle2,
  Sparkles,
  Search,
  ExternalLink,
  Sun,
  Moon,
  Laptop,
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
import { fmtRelative } from "@/lib/format";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumb?: { label: string; href?: string }[];
}

export function AppLayout({ children, title, breadcrumb }: AppLayoutProps) {
  const { profile, activity, tasks } = useTasks();
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const displayName = user?.fullName || profile?.fullName || "Om Thakkar";
  const displayEmail = user?.email || profile?.email || "omthakkar@example.com";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "All Tasks", href: "/tasks", icon: CheckSquare, count: tasks.length },
    { label: "Profile", href: "/profile", icon: User },
  ];

  const unreadActivity = activity.slice(0, 5);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card/60 backdrop-blur-md lg:flex lg:fixed lg:inset-y-0 z-30">
        <div className="flex h-16 items-center gap-3 px-6 border-b">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <Sparkles className="size-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-foreground">TaskFlow</span>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Workspace</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Menu
          </div>
          {navItems.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/" || pathname === "/dashboard"
                : pathname === item.href || (item.href === "/tasks" && pathname.startsWith("/tasks"));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Preferences
          </div>
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          >
            <div className="flex items-center gap-3">
              {resolvedTheme === "dark" ? <Moon className="size-4 text-primary" /> : <Sun className="size-4 text-amber-500" />}
              <span>Theme</span>
            </div>
            <span className="text-xs uppercase font-semibold text-muted-foreground">{resolvedTheme}</span>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          >
            <Settings className="size-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="border-t p-4">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
          >
            <Avatar className="size-9 border border-border">
              <AvatarImage src={profile?.avatarUrl} alt={profile?.fullName || "User"} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="h-16 flex-row items-center gap-3 border-b px-6">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <SheetTitle className="text-lg font-bold">TaskFlow</SheetTitle>
          </SheetHeader>
          <div className="flex-1 px-4 py-5 space-y-1">
            {navItems.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/" || pathname === "/dashboard"
                  : pathname === item.href || (item.href === "/tasks" && pathname.startsWith("/tasks"));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              onClick={() => {
                toggleTheme();
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <div className="flex items-center gap-3">
                {resolvedTheme === "dark" ? <Moon className="size-4 text-primary" /> : <Sun className="size-4 text-amber-500" />}
                <span>Toggle Theme</span>
              </div>
              <span className="text-xs uppercase font-semibold text-muted-foreground">{resolvedTheme}</span>
            </button>
            <button
              onClick={() => {
                setMobileOpen(false);
                setSettingsOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <Settings className="size-4" />
              <span>Settings</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

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
              {title && <h1 className="text-lg font-semibold tracking-tight text-foreground truncate">{title}</h1>}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-foreground" aria-label="Toggle theme">
                  {resolvedTheme === "dark" ? (
                    <Moon className="size-4 text-primary" />
                  ) : (
                    <Sun className="size-4 text-amber-500" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center gap-2 cursor-pointer">
                  <Sun className="size-4" />
                  <span>Light</span>
                  {theme === "light" && <span className="ml-auto text-xs text-primary font-bold">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center gap-2 cursor-pointer">
                  <Moon className="size-4" />
                  <span>Dark</span>
                  {theme === "dark" && <span className="ml-auto text-xs text-primary font-bold">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center gap-2 cursor-pointer">
                  <Laptop className="size-4" />
                  <span>System</span>
                  {theme === "system" && <span className="ml-auto text-xs text-primary font-bold">✓</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative size-9" aria-label="Notifications">
                  <Bell className="size-4 text-muted-foreground" />
                  {unreadActivity.length > 0 && (
                    <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-2">
                <DropdownMenuLabel className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Notifications
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {unreadActivity.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No recent notifications</div>
                ) : (
                  unreadActivity.map((act) => (
                    <DropdownMenuItem key={act.id} className="flex flex-col items-start gap-1 p-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium capitalize text-foreground">{act.type}:</span>
                        <span className="truncate max-w-[180px] text-muted-foreground">{act.taskTitle}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{fmtRelative(act.at)}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative size-9 rounded-full p-0">
                  <Avatar className="size-8 border">
                    <AvatarImage src={profile?.avatarUrl} alt={profile?.fullName || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="size-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="flex items-center gap-2 cursor-pointer">
                  <Settings className="size-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                  }}
                  className="text-destructive flex items-center gap-2 cursor-pointer"
                >
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Workspace Settings</DialogTitle>
            <DialogDescription>
              TaskFlow is configured with a modular service layer and mock data storage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">Backend Mode</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  Local Mock / Demo Service
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Task changes persist in your browser's localStorage. Ready to seamlessly point to Node.js + Express + PostgreSQL.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">Current Workspace</p>
              <p className="text-sm font-semibold">{displayName}'s Workspace</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
