import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, AlertTriangle, Clock, CheckCircle2, BellRing, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTasks } from "@/context/TaskContext";
import { fmtRelative } from "@/lib/format";
import { isOverdue } from "@/lib/task-utils";
import { toast } from "sonner";
import { checkAndNotifyDeadlines } from "./DeadlineReminderNotifier";

export function NotificationsBell() {
  const { tasks, activity, toggleTaskComplete } = useTasks();
  const navigate = useNavigate();
  const [hasPermission, setHasPermission] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission === "granted";
    }
    return false;
  });

  // Calculate overdue tasks
  const overdueTasks = tasks.filter(
    (t) => !t.isTrash && t.status !== "completed" && isOverdue(t.dueDate),
  );

  // Calculate tasks due today / within 24h
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dueSoonTasks = tasks.filter((t) => {
    if (t.isTrash || t.status === "completed" || !t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d >= now && d <= tomorrow;
  });

  const totalUrgent = overdueTasks.length + dueSoonTasks.length;

  const requestBrowserNotification = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser notifications are not supported in your browser.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setHasPermission(true);
        new Notification("TaskFlow Reminders Active", {
          body: `You will now receive alerts for overdue and scheduled tasks.`,
          icon: "/favicon.ico",
        });
        toast.success("Browser notifications enabled!");
      } else {
        toast.error("Notification permission was denied.");
      }
    } catch {
      toast.error("Failed to request notification permission.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Notifications & Reminders"
        >
          <Bell className="size-4" />
          {totalUrgent > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-background">
              {totalUrgent > 9 ? "9+" : totalUrgent}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 p-2 shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
            Reminders & Alerts
          </DropdownMenuLabel>
          {!hasPermission && (
            <button
              type="button"
              onClick={requestBrowserNotification}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
            >
              <BellRing className="size-3" />
              <span>Enable Browser Alerts</span>
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        <div className="max-h-80 overflow-y-auto space-y-1 py-1">
          {/* Overdue Alerts */}
          {overdueTasks.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="size-3" />
                <span>Overdue ({overdueTasks.length})</span>
              </div>
              {overdueTasks.slice(0, 3).map((task) => (
                <DropdownMenuItem asChild key={task.id}>
                  <Link
                    to="/tasks/$id"
                    params={{ id: task.id }}
                    className="flex flex-col items-start gap-0.5 rounded-lg p-2 text-xs hover:bg-rose-500/10 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-foreground truncate">{task.title}</span>
                      <ExternalLink className="size-3 text-muted-foreground shrink-0" />
                    </div>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                      Overdue since {task.dueDate ? fmtRelative(task.dueDate) : "earlier"}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          )}

          {/* Due Soon */}
          {dueSoonTasks.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="px-2 py-1 text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="size-3" />
                <span>Due Today / Soon ({dueSoonTasks.length})</span>
              </div>
              {dueSoonTasks.slice(0, 3).map((task) => (
                <DropdownMenuItem asChild key={task.id}>
                  <Link
                    to="/tasks/$id"
                    params={{ id: task.id }}
                    className="flex flex-col items-start gap-0.5 rounded-lg p-2 text-xs hover:bg-blue-500/10 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-foreground truncate">{task.title}</span>
                      <ExternalLink className="size-3 text-muted-foreground shrink-0" />
                    </div>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      Due {task.dueDate ? fmtRelative(task.dueDate) : "soon"}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          )}

          {/* Recent Activity */}
          <div className="space-y-1 pt-1 border-t mt-1">
            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Recent Updates
            </div>
            {activity.slice(0, 3).map((act) => (
              <DropdownMenuItem
                key={act.id}
                className="flex flex-col items-start gap-0.5 p-2 text-xs"
              >
                <div className="flex items-center gap-1.5 w-full">
                  <span className="font-medium capitalize text-foreground">{act.type}:</span>
                  <span className="truncate text-muted-foreground flex-1">{act.taskTitle}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{fmtRelative(act.at)}</span>
              </DropdownMenuItem>
            ))}
          </div>

          {totalUrgent === 0 && activity.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="size-6 mx-auto text-emerald-500 mb-2" />
              <span>All caught up! No tasks overdue or pending soon.</span>
            </div>
          )}
        </div>

        <div className="p-1.5 border-t bg-muted/30 rounded-b-lg">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => checkAndNotifyDeadlines(tasks, navigate, toggleTaskComplete, true)}
            className="w-full h-8 text-[11px] font-semibold flex items-center justify-center gap-1.5 text-primary hover:bg-primary/10 cursor-pointer"
          >
            <BellRing className="size-3.5" />
            <span>Show Deadline Pop-up Alerts</span>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
