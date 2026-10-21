import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/context/TaskContext";
import { toast } from "sonner";
import type { Task } from "@/types";

export function CalendarView({ tasks }: { tasks: Task[] }) {
  const { updateTask } = useTasks();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Days matrix for the current month
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      cells.push({ date: d, isCurrentMonth: false, key: d.toISOString().slice(0, 10) });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      cells.push({ date: d, isCurrentMonth: true, key: d.toISOString().slice(0, 10) });
    }

    // Next month padding to fill grid to 35 or 42 cells
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({ date: d, isCurrentMonth: false, key: d.toISOString().slice(0, 10) });
    }

    return cells;
  }, [year, month]);

  // Map tasks by date ISO string (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (t.isTrash || !t.dueDate) continue;
      const key = new Date(t.dueDate).toISOString().slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key]!.push(t);
    }
    return map;
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newDue = new Date(targetDate);
    newDue.setHours(12, 0, 0, 0);

    try {
      await updateTask(task.id, { dueDate: newDue.toISOString() });
      toast.success(`Rescheduled "${task.title}" to ${targetDate.toLocaleDateString()}`);
    } catch {
      toast.error("Failed to reschedule task");
    } finally {
      setDraggedTaskId(null);
    }
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between bg-card p-4 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarIcon className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {monthNames[month]} {year}
            </h2>
            <p className="text-xs text-muted-foreground">Drag chips to reschedule tasks</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="text-xs font-semibold h-8 cursor-pointer"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="size-8 cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="size-8 cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5">
          {daysOfWeek.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Month Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border">
          {calendarCells.map(({ date, isCurrentMonth, key }) => {
            const dayTasks = tasksByDate[key] || [];
            const today = isToday(date);

            return (
              <div
                key={key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, date)}
                className={`min-h-[110px] p-2 transition-colors flex flex-col ${
                  isCurrentMonth ? "bg-card hover:bg-muted/30" : "bg-muted/15 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                      today
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                        : "text-foreground"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                {/* Task Chips */}
                <div className="space-y-1 flex-1 overflow-y-auto max-h-24">
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      className={`group flex items-center justify-between rounded px-2 py-1 text-[11px] font-medium border shadow-xs transition-all cursor-grab active:cursor-grabbing hover:scale-[1.02] ${
                        t.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 line-through opacity-75"
                          : t.priority === "high"
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                            : "bg-primary/10 text-primary border-primary/20"
                      }`}
                    >
                      <Link
                        to="/tasks/$id"
                        params={{ id: t.id }}
                        className="truncate hover:underline flex-1"
                      >
                        {t.title}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
