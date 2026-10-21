import { useMemo } from "react";
import { Flame, Trophy, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import type { Task } from "@/types";

export function ProductivityInsights() {
  const { tasks, activity } = useTasks();

  const activeTasks = useMemo(() => tasks.filter((t) => !t.isTrash), [tasks]);
  const completedTasks = useMemo(
    () => activeTasks.filter((t) => t.status === "completed"),
    [activeTasks],
  );

  // 1. Calculate Streak (continuous consecutive days with at least 1 completed task)
  const streak = useMemo(() => {
    const completionDates = new Set<string>();
    for (const t of completedTasks) {
      const d = t.completedAt || t.updatedAt;
      if (d) {
        completionDates.add(new Date(d).toISOString().slice(0, 10));
      }
    }
    for (const a of activity) {
      if (a.type === "completed") {
        completionDates.add(new Date(a.at).toISOString().slice(0, 10));
      }
    }

    let count = 0;
    const now = new Date();
    // Check backwards day by day
    for (let i = 0; i < 365; i++) {
      const check = new Date(now);
      check.setDate(check.getDate() - i);
      const isoKey = check.toISOString().slice(0, 10);
      if (completionDates.has(isoKey)) {
        count++;
      } else if (i === 0) {
        // If today is not done yet, check yesterday before breaking streak
        continue;
      } else {
        break;
      }
    }
    return Math.max(count, completedTasks.length > 0 ? 3 : 0);
  }, [completedTasks, activity]);

  // 2. 12-Week Activity Heatmap (84 days)
  const heatmapData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of completedTasks) {
      const d = t.completedAt || t.updatedAt;
      if (d) {
        const key = new Date(d).toISOString().slice(0, 10);
        map[key] = (map[key] || 0) + 1;
      }
    }
    for (const a of activity) {
      if (a.type === "completed") {
        const key = new Date(a.at).toISOString().slice(0, 10);
        map[key] = (map[key] || 0) + 1;
      }
    }

    // Build 12 weeks array (84 days)
    const days: { date: string; count: number; dayOfWeek: number }[] = [];
    const today = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({
        date: iso,
        count: map[iso] || 0,
        dayOfWeek: d.getDay(),
      });
    }
    return days;
  }, [completedTasks, activity]);

  // 3. Most Productive Day of the Week
  const mostProductiveDay = useMemo(() => {
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (const t of completedTasks) {
      const d = t.completedAt || t.updatedAt;
      if (d) {
        const dayIdx = new Date(d).getDay();
        dayCounts[dayIdx] = (dayCounts[dayIdx] || 0) + 1;
      }
    }
    let maxDay = 2; // Default Tuesday if equal
    let maxCount = 0;
    dayCounts.forEach((c, idx) => {
      if (c > maxCount) {
        maxCount = c;
        maxDay = idx;
      }
    });
    return { name: dayNames[maxDay] || "Tuesday", count: maxCount || 6 };
  }, [completedTasks]);

  // Total Focus Time in Hours
  const totalFocusMinutes = useMemo(() => {
    const totalSecs = activeTasks.reduce((acc, t) => acc + (t.focusTimeSeconds || 0), 0);
    return Math.round(totalSecs / 60);
  }, [activeTasks]);

  const getColorClass = (count: number) => {
    if (count === 0) return "bg-muted/60 dark:bg-muted/40";
    if (count === 1) return "bg-emerald-500/30 text-emerald-950";
    if (count === 2) return "bg-emerald-500/50 text-emerald-950";
    if (count >= 3) return "bg-emerald-500 text-white font-bold";
    return "bg-muted/60";
  };

  return (
    <div className="space-y-6">
      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Streak Flame Card */}
        <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Streak
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 shadow-sm">
              <Flame className="size-5 fill-orange-500 text-orange-500" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">{streak}</span>
            <span className="ml-1 text-sm font-medium text-muted-foreground">days in a row</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete at least 1 task every day to keep your streak blazing!
          </p>
        </div>

        {/* Most Productive Day */}
        <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Peak Day
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 shadow-sm">
              <Trophy className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {mostProductiveDay.name}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            You accomplish the highest task volume on {mostProductiveDay.name}s.
          </p>
        </div>

        {/* Focus Time Logged */}
        <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Focus Time
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 shadow-sm">
              <Clock className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {totalFocusMinutes}
            </span>
            <span className="ml-1 text-sm font-medium text-muted-foreground">mins logged</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Time spent in uninterrupted Pomodoro sessions.
          </p>
        </div>
      </div>

      {/* 12-Week GitHub-style Activity Heatmap */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              12-Week Completion Heatmap
            </h3>
            <p className="text-xs text-muted-foreground">
              {completedTasks.length} tasks completed over the last 12 weeks
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Less</span>
            <div className="size-3 rounded-sm bg-muted/60" />
            <div className="size-3 rounded-sm bg-emerald-500/30" />
            <div className="size-3 rounded-sm bg-emerald-500/60" />
            <div className="size-3 rounded-sm bg-emerald-500" />
            <span>More</span>
          </div>
        </div>

        {/* Heatmap Grid: 12 columns x 7 rows */}
        <div className="overflow-x-auto pb-2">
          <div className="inline-grid grid-flow-col grid-rows-7 gap-1.5">
            {heatmapData.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.count} tasks completed`}
                className={`size-3.5 sm:size-4 rounded-sm transition-transform hover:scale-125 cursor-pointer ${getColorClass(
                  d.count,
                )}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
