import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  ListTodo,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  PieChart as PieChartIcon,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/common/StatCard";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityFeed } from "@/components/common/ActivityFeed";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/states";
import { TaskStatusBadge, PriorityBadge } from "@/components/tasks/badges";
import { TaskCard } from "@/components/tasks/TaskCard";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { dueSoon, completionSeries, isOverdue } from "@/lib/task-utils";
import { fmtDate, fmtRelative } from "@/lib/format";
import { Progress } from "@/components/ui/progress";

const PRIORITY_COLORS = {
  high: "var(--color-destructive)",
  medium: "var(--color-primary)",
  low: "var(--color-chart-2)",
};

export function DashboardView() {
  const { tasks, stats, profile, activity, state, reload, projects, team } = useTasks();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (state === "loading") {
    return <LoadingState rows={4} />;
  }

  if (state === "error") {
    return <ErrorState onRetry={reload} />;
  }

  const upcomingTasks = dueSoon(tasks, 7).slice(0, 5);
  const recentTasks = [...tasks]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const seriesData = completionSeries(tasks, 7);

  const pieData = [
    { name: "High", value: stats.byPriority.high, color: PRIORITY_COLORS.high },
    { name: "Medium", value: stats.byPriority.medium, color: PRIORITY_COLORS.medium },
    { name: "Low", value: stats.byPriority.low, color: PRIORITY_COLORS.low },
  ].filter((d) => d.value > 0);

  const existingTaskIds = new Set(tasks.map((t) => t.id));

  const displayName = user?.fullName || profile?.fullName || "Om Thakkar";

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card/60 p-6 shadow-card backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome back, {displayName.split(" ")[0]}! 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what is happening with your tasks today. You have{" "}
            <span className="font-semibold text-foreground">{stats.pending + stats.inProgress} active tasks</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate({ to: "/tasks/new" })}
            className="shadow-sm shadow-primary/25"
          >
            <Plus className="size-4" /> Quick Add Task
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Tasks"
          value={stats.total}
          icon={ListTodo}
          hint="All tasks in workspace"
          tone="primary"
        />
        <StatCard
          label="Pending Tasks"
          value={stats.pending}
          icon={Clock}
          hint="Awaiting start"
          tone="warning"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={TrendingUp}
          hint="Currently being worked on"
          tone="info"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          hint={`${stats.completionRate}% completion rate`}
          tone="success"
        />
      </div>

      {/* Progress Indicator */}
      <div className="rounded-xl border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between text-sm">
          <div className="space-y-1">
            <span className="font-semibold text-foreground">Task Completion Overall</span>
            <p className="text-xs text-muted-foreground">
              {stats.completed} of {stats.total} tasks completed
            </p>
          </div>
          <span className="text-xl font-bold text-primary">{stats.completionRate}%</span>
        </div>
        <Progress value={stats.completionRate} className="mt-3 h-2.5" />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly Completion & Creation Chart */}
        <div className="rounded-xl border bg-card p-5 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Task Velocity (Last 7 Days)</h2>
              <p className="text-xs text-muted-foreground">Created vs Completed tasks</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-primary" /> Created
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-success" /> Completed
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                    fontSize: "12px",
                    color: "var(--foreground)",
                  }}
                  itemStyle={{ color: "var(--foreground)" }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Bar dataKey="created" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="completed" fill="var(--color-success)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution Chart */}
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="pb-2">
            <h2 className="text-base font-semibold text-foreground">Priority Distribution</h2>
            <p className="text-xs text-muted-foreground">Breakdown of all workspace tasks</p>
          </div>
          <div className="flex h-52 items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tasks available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                      fontSize: "12px",
                      color: "var(--foreground)",
                    }}
                    itemStyle={{ color: "var(--foreground)" }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex justify-around border-t pt-3 text-xs">
            <div className="text-center">
              <span className="block font-semibold text-destructive">{stats.byPriority.high}</span>
              <span className="text-muted-foreground">High</span>
            </div>
            <div className="text-center">
              <span className="block font-semibold text-primary">{stats.byPriority.medium}</span>
              <span className="text-muted-foreground">Medium</span>
            </div>
            <div className="text-center">
              <span className="block font-semibold text-muted-foreground">{stats.byPriority.low}</span>
              <span className="text-muted-foreground">Low</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Task Management: Project Health & Team Workload */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Project Health & Milestone Progress */}
        <div className="rounded-xl border bg-card p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Project Health & Milestones</h2>
              <p className="text-xs text-muted-foreground">Progress across active initiatives</p>
            </div>
            <Link
              to="/tasks"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              All projects <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="space-y-4">
            {projects.map((proj) => {
              const pTasks = tasks.filter((t) => t.projectId === proj.id);
              const completed = pTasks.filter((t) => t.status === "completed").length;
              const rate = pTasks.length > 0 ? Math.round((completed / pTasks.length) * 100) : 0;

              return (
                <div key={proj.id} className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: proj.color }} />
                      <span className="font-semibold text-foreground text-sm">{proj.name}</span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {proj.key}
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">{rate}% done</span>
                  </div>
                  <Progress value={rate} className="h-2" />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>Lead: {proj.lead}</span>
                    <span>{completed} of {pTasks.length} tasks completed</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Workload */}
        <div className="rounded-xl border bg-card p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Team Workload Distribution</h2>
              <p className="text-xs text-muted-foreground">Active assignments across team members</p>
            </div>
            <span className="text-xs text-muted-foreground">{team.length} members</span>
          </div>

          <div className="space-y-3">
            {team.map((member) => {
              const mTasks = tasks.filter((t) => t.assignee?.id === member.id);
              const inProgress = mTasks.filter((t) => t.status === "in_progress" || t.status === "in_review").length;
              const completed = mTasks.filter((t) => t.status === "completed").length;

              return (
                <div key={member.id} className="flex items-center justify-between rounded-lg border bg-muted/20 p-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {member.initials}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{member.name}</p>
                      <p className="text-[11px] text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="block font-semibold text-blue-600 dark:text-blue-400">{inProgress}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">Active</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-emerald-600 dark:text-emerald-400">{completed}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">Done</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-foreground">{mTasks.length}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">Total</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column Section: Tasks Due Soon & Recent Tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tasks Due Soon */}
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between pb-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Tasks Due Soon</h2>
              <p className="text-xs text-muted-foreground">Deadlines in the next 7 days</p>
            </div>
            <Link
              to="/tasks"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No tasks due in the next 7 days. You are all caught up!
            </div>
          ) : (
            <div className="divide-y">
              {upcomingTasks.map((t) => {
                const overdue = isOverdue(t);
                return (
                  <Link
                    key={t.id}
                    to="/tasks/$id"
                    params={{ id: t.id }}
                    className="flex items-center justify-between py-3 transition-colors hover:bg-muted/40 rounded-lg px-2 -mx-2"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate font-medium text-sm text-foreground">{t.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <TaskStatusBadge status={t.status} />
                        <span
                          className={`text-xs ${
                            overdue ? "font-semibold text-destructive" : "text-muted-foreground"
                          }`}
                        >
                          {overdue ? "Overdue · " : "Due "}
                          {fmtDate(t.dueDate)}
                        </span>
                      </div>
                    </div>
                    <PriorityBadge priority={t.priority} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between pb-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Recently Created Tasks</h2>
              <p className="text-xs text-muted-foreground">Latest additions to your board</p>
            </div>
            <Link
              to="/tasks"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No tasks created yet.
            </div>
          ) : (
            <div className="divide-y">
              {recentTasks.map((t) => (
                <Link
                  key={t.id}
                  to="/tasks/$id"
                  params={{ id: t.id }}
                  className="flex items-center justify-between py-3 transition-colors hover:bg-muted/40 rounded-lg px-2 -mx-2"
                >
                  <div className="min-w-0 pr-3">
                    <p className="truncate font-medium text-sm text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Created {fmtRelative(t.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TaskStatusBadge status={t.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed Section */}
      <div className="rounded-xl border bg-card p-5 shadow-card">
        <div className="pb-4">
          <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
          <p className="text-xs text-muted-foreground">Audit log of task operations in workspace</p>
        </div>
        <ActivityFeed items={activity} existingIds={existingTaskIds} />
      </div>
    </div>
  );
}
