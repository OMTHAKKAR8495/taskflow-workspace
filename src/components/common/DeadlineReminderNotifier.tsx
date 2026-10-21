import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTasks } from "@/context/TaskContext";
import { fmtDate } from "@/lib/format";
import type { Task } from "@/types";

export function checkAndNotifyDeadlines(
  tasks: Task[],
  navigate: (opts: { to: string; params?: Record<string, string> }) => void,
  onCompleteTask?: (task: Task) => Promise<unknown>,
  forceNotifyAll = false,
) {
  if (!tasks || tasks.length === 0) return;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const notifiedKey = "taskflow_notified_deadlines_v1";

  let notifiedSet = new Set<string>();
  try {
    const raw = sessionStorage.getItem(notifiedKey);
    if (raw) notifiedSet = new Set(JSON.parse(raw));
  } catch {}

  const activeTasks = tasks.filter((t) => !t.isTrash && t.status !== "completed" && !!t.dueDate);

  const urgentTasks: { task: Task; diffDays: number; message: string; subtext: string }[] = [];

  for (const task of activeTasks) {
    if (!task.dueDate) continue;
    const due = new Date(task.dueDate);
    const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
    const diffDays = Math.round((dueStart - todayStart) / 86400000);

    // Only notify for Overdue, Today (0), Tomorrow (1), and Day after tomorrow (2)
    if (diffDays > 2) continue;

    const notifyId = `${task.id}-${diffDays}`;
    if (!forceNotifyAll && notifiedSet.has(notifyId)) continue;
    notifiedSet.add(notifyId);

    let message = "";
    let subtext = "";

    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      message = `🚨 Overdue Alert: Submit "${task.title}"`;
      subtext = `This work was due ${daysOverdue === 1 ? "yesterday" : `${daysOverdue} days ago`} (${fmtDate(task.dueDate)}). Please complete and submit it immediately!`;
    } else if (diffDays === 0) {
      message = `⚠️ Due Today: Complete "${task.title}"`;
      subtext = `This work has to be completed by today! Submit it before the end of the day.`;
    } else if (diffDays === 1) {
      message = `⏰ Due Tomorrow: "${task.title}"`;
      subtext = `This work has to be completed by tomorrow (${fmtDate(task.dueDate)}) so you can submit it on time.`;
    } else if (diffDays === 2) {
      message = `📅 Day After Tomorrow: "${task.title}"`;
      subtext = `You have to submit this work by day after tomorrow (${fmtDate(task.dueDate)}). Start wrapping it up!`;
    }

    urgentTasks.push({ task, diffDays, message, subtext });
  }

  try {
    sessionStorage.setItem(notifiedKey, JSON.stringify(Array.from(notifiedSet)));
  } catch {}

  // Trigger popups with staggering so multiple toasts display cleanly
  urgentTasks.slice(0, 4).forEach(({ task, diffDays, message, subtext }, index) => {
    setTimeout(() => {
      // 1. Desktop Browser Web Notification if allowed
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification(message, {
              body: subtext,
              icon: "/favicon.ico",
            });
          } catch {}
        }
      }

      // 2. Interactive Sonner Pop-up Toast
      const toastFn = diffDays < 0 ? toast.error : diffDays === 0 ? toast.warning : toast.info;

      toastFn(message, {
        description: subtext,
        duration: 9000,
        action: {
          label: "View Task",
          onClick: () => navigate({ to: "/tasks/$id", params: { id: task.id } }),
        },
        cancel: onCompleteTask
          ? {
              label: "Mark Done",
              onClick: () => onCompleteTask(task),
            }
          : undefined,
      });
    }, index * 400);
  });
}

export function DeadlineReminderNotifier() {
  const { tasks, toggleTaskComplete } = useTasks();
  const navigate = useNavigate();
  const hasRun = useRef(false);

  useEffect(() => {
    if (tasks.length === 0 || hasRun.current) return;
    hasRun.current = true;

    // Small delay on page load so UI renders first
    const timer = setTimeout(() => {
      checkAndNotifyDeadlines(tasks, navigate, toggleTaskComplete, false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [tasks, navigate, toggleTaskComplete]);

  return null;
}
