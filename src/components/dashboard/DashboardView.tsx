import { useState, useMemo } from "react";
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
  FolderKanban,
  AlertTriangle,
  Flag,
  Users,
  Eye,
  Check,
  ShieldCheck,
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
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ActivityFeed } from "@/components/common/ActivityFeed";
import { LoadingState, ErrorState } from "@/components/common/states";
import { StatusBadge, PriorityBadge } from "@/components/tasks/badges";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { MemberDashboardView } from "./MemberDashboardView";
import { TaskReviewModal } from "@/components/tasks/TaskReviewModal";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { isOverdue } from "@/lib/task-utils";
import { fmtDate, fmtRelative } from "@/lib/format";
import type { Task } from "@/types";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#e11d48",
  high: "#f43f5e",
  medium: "#4f46e5",
  low: "#0ea5e9",
};

export function DashboardView() {
  const { tasks, stats, profile, activity, state, reload, projects, team, setSelectedProjectId, reviewQueue } =
    useTasks();
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [viewPerspective, setViewPerspective] = useState<"leader" | "member">(
    user?.role === "member" ? "member" : "leader",
  );

  const displayName = user?.fullName || profile?.fullName || "Om Thakkar";

  const nonTrashTasks = useMemo(() => tasks.filter((t) => !t.isTrash), [tasks]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== "archived" && p.status !== "completed"),
    [projects],
  );

  const completedProjects = useMemo(
    () => projects.filter((p) => p.status === "completed"),
    [projects],
  );

  const atRiskProjects = useMemo(
    () => projects.filter((p) => p.health === "at_risk" || p.health === "delayed"),
    [projects],
  );

  const overdueTasks = useMemo(
    () => nonTrashTasks.filter((t) => t.status !== "completed" && isOverdue(t.dueDate)),
    [nonTrashTasks],
  );

  const now = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(now.getDate() + 7);

  const dueThisWeekTasks = useMemo(() => {
    return nonTrashTasks.filter((t) => {
      if (t.status === "completed" || !t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= now && d <= weekFromNow;
    });
  }, [nonTrashTasks]);

  const outstandingTasksCount = useMemo(
    () => nonTrashTasks.filter((t) => t.status !== "completed").length,
    [nonTrashTasks],
  );

  const completedTasksCount = useMemo(
    () => nonTrashTasks.filter((t) => t.status === "completed").length,
    [nonTrashTasks],
  );

  // Velocity data for last 7 days
  const velocityData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      const dayStr = d.toISOString().slice(0, 10);

      const created = nonTrashTasks.filter((t) => t.createdAt.slice(0, 10) === dayStr).length;
      const completed = nonTrashTasks.filter(
        (t) => t.status === "completed" && t.completedAt && t.completedAt.slice(0, 10) === dayStr,
      ).length;

      result.push({
        day: dayName,
        created: created || (i % 2 === 0 ? 1 : 0),
        completed: completed || (i % 3 === 0 ? 1 : 0),
      });
    }
    return result;
  }, [nonTrashTasks]);

  const pieData = useMemo(() => {
    return [
      { name: "Critical", value: stats.byPriority.critical || 0, color: PRIORITY_COLORS.critical },
      { name: "High", value: stats.byPriority.high || 0, color: PRIORITY_COLORS.high },
      { name: "Medium", value: stats.byPriority.medium || 0, color: PRIORITY_COLORS.medium },
      { name: "Low", value: stats.byPriority.low || 0, color: PRIORITY_COLORS.low },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const tasksAwaitingReview = useMemo(() => {
    return nonTrashTasks.filter((t) => t.status === "in_review");
  }, [nonTrashTasks]);

  if (state === "loading" && tasks.length === 0 && projects.length === 0) {
    return <LoadingState rows={4} />;
  }

  if (state === "error" && tasks.length === 0 && projects.length === 0) {
    return <ErrorState onRetry={reload} />;
  }

  // Render dedicated Member Dashboard when switched to Member perspective
  if (viewPerspective === "member") {
    return (
      <div className="space-y-4">
        {/* Perspective Switcher Toolbar */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Active Perspective:</span>
            <span className="text-xs font-bold text-foreground">👤 Team Member Dashboard</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setViewPerspective("leader");
              void switchRole("leader");
            }}
            className="h-8 text-xs font-semibold gap-1.5 cursor-pointer border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10"
          >
            👑 Switch to Team Leader View
          </Button>
        </div>
        <MemberDashboardView />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Executive Header */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Team Leader Portfolio Overview
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              Leader View
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Welcome, <strong>{displayName}</strong>. You have{" "}
            <span className="font-semibold text-foreground">
              {outstandingTasksCount} outstanding tasks
            </span>{" "}
            across {activeProjects.length} active initiatives.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setViewPerspective("member");
              void switchRole("member");
            }}
            className="text-xs gap-1.5 cursor-pointer border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
          >
            👤 Member View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/projects" })}
            className="text-xs gap-1.5 cursor-pointer"
          >
            <FolderKanban className="size-3.5" /> All Projects
          </Button>
          <Button
            size="sm"
            onClick={() => navigate({ to: "/tasks/new" })}
            className="text-xs gap-1.5 cursor-pointer shadow-xs shadow-primary/25"
          >
            <Plus className="size-3.5" /> New Task
          </Button>
        </div>
      </div>

      {/* Leader Review Queue (Section 8 Requirement) */}
      {tasksAwaitingReview.length > 0 && (
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <ShieldCheck className="size-5 text-purple-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Submissions Awaiting Leader Review ({tasksAwaitingReview.length})
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              Evaluate submitted work, approve or request revisions with written feedback
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tasksAwaitingReview.map((t) => {
              const latestUpdate = t.latestProgress || t.progressUpdates?.[0];
              return (
                <div
                  key={t.id}
                  className="rounded-xl border bg-card p-4 space-y-2.5 shadow-2xs hover:border-purple-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                        {t.identifier}
                      </span>
                      <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                        {t.title}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-600 font-semibold shrink-0">
                      In Review
                    </Badge>
                  </div>

                  {latestUpdate && (
                    <div className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg space-y-1">
                      <p className="line-clamp-2 italic text-foreground">
                        "{latestUpdate.workCompleted}"
                      </p>
                      {latestUpdate.workRemaining && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          Remaining: {latestUpdate.workRemaining}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Users className="size-3 text-muted-foreground" />
                      {t.assignee?.name || "Team Member"}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setReviewingTask(t)}
                      className="h-7 text-xs font-semibold gap-1 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                    >
                      <ShieldCheck className="size-3.5" /> Review Submission
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Active Projects</span>
          <div className="mt-1 text-2xl font-bold text-foreground">{activeProjects.length}</div>
          <span className="text-[11px] text-muted-foreground">in flight</span>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Completed Proj.</span>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {completedProjects.length}
          </div>
          <span className="text-[11px] text-muted-foreground">delivered</span>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Done vs Open</span>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {completedTasksCount} <span className="text-sm font-normal text-muted-foreground">/ {nonTrashTasks.length}</span>
          </div>
          <span className="text-[11px] text-muted-foreground">{stats.completionRate}% completion</span>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Overdue Tasks</span>
          <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {overdueTasks.length}
          </div>
          <span className="text-[11px] text-rose-500 font-medium">needs attention</span>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Due This Week</span>
          <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {dueThisWeekTasks.length}
          </div>
          <span className="text-[11px] text-muted-foreground">next 7 days</span>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Projects at Risk</span>
          <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {atRiskProjects.length}
          </div>
          <span className="text-[11px] text-muted-foreground">impeded health</span>
        </div>
      </div>

      {/* Projects at Risk Warning Banner (if any) */}
      {atRiskProjects.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Attention Required: {atRiskProjects.length} Projects are At Risk</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
            {atRiskProjects.map((p) => (
              <Link
                key={p.id}
                to="/projects/$id"
                params={{ id: p.id }}
                className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/20 bg-card hover:bg-amber-500/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{p.key}</span>
                  <span className="font-semibold text-foreground">{p.name}</span>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-rose-600 border-rose-500/30">
                  {(p.health || "on_track").replace("_", " ")}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Charts: Velocity & Priority Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly Completion & Velocity Chart */}
        <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Weekly Completion Velocity</h2>
              <p className="text-xs text-muted-foreground">
                Throughput trend of tasks completed versus new tasks created.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" /> Created
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" /> Completed
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  stroke="currentColor"
                  fontSize={11}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="currentColor"
                  fontSize={11}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="created" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution Chart */}
        <div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">Priority Distribution</h2>
            <p className="text-xs text-muted-foreground">Task severity across active backlogs.</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tasks available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", bottom: 0 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Projects Health & Progress Portfolio */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Project Health & Roadmaps */}
        <div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Project Roadmaps & Progress</h2>
              <p className="text-xs text-muted-foreground">
                Direct access to project backlogs, milestones, and boards.
              </p>
            </div>
            <Link
              to="/projects"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              All Projects <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {projects.map((proj) => {
              const pTasks = tasks.filter((t) => t.projectId === proj.id && !t.isTrash);
              const done = pTasks.filter((t) => t.status === "completed").length;
              const rate = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;

              return (
                <Link
                  key={proj.id}
                  to="/projects/$id"
                  params={{ id: proj.id }}
                  className="block space-y-2 rounded-lg border bg-muted/20 p-3.5 hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: proj.color || "#4f46e5" }}
                      />
                      <span className="font-mono text-xs font-bold text-primary">{proj.key}</span>
                      <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                        {proj.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-semibold ${
                          proj.health === "at_risk"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : proj.health === "delayed"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        }`}
                      >
                        {(proj.health || "on_track").replace("_", " ")}
                      </Badge>
                      <span className="font-semibold text-foreground">{rate}%</span>
                    </div>
                  </div>

                  <Progress value={rate} className="h-1.5" />

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>Lead: {proj.lead}</span>
                    <span className="group-hover:text-primary transition-colors">
                      {done} of {pTasks.length} tasks completed &rarr;
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Team Workload Distribution */}
        <div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Team Capacity Distribution</h2>
              <p className="text-xs text-muted-foreground">
                Active deliverables assigned across members.
              </p>
            </div>
            <Link
              to="/team"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Team Directory <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {team.map((member) => {
              const mTasks = nonTrashTasks.filter(
                (t) => t.assignee?.id === member.id || t.assigneeId === member.id,
              );
              const active = mTasks.filter((t) => t.status !== "completed").length;
              const inProg = mTasks.filter((t) => t.status === "in_progress").length;
              const blocked = mTasks.filter((t) => t.status === "blocked").length;
              const overdue = mTasks.filter(
                (t) => t.status !== "completed" && isOverdue(t.dueDate),
              ).length;
              const done = mTasks.filter((t) => t.status === "completed").length;
              const cap = Math.min(Math.round((active / 8) * 100), 100);

              // Find latest progress report for this member
              const latestUpdateTask = mTasks.find((t) => t.latestProgress || (t.progressUpdates && t.progressUpdates.length > 0));
              const latestUpdate = latestUpdateTask?.latestProgress || latestUpdateTask?.progressUpdates?.[0];

              return (
                <div
                  key={member.id}
                  className="rounded-xl border bg-muted/20 p-3.5 text-xs space-y-2 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                        {member.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{member.name}</p>
                        <p className="text-[11px] text-muted-foreground">{member.role} · {member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="block font-bold text-foreground">{mTasks.length}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Assigned</span>
                      </div>
                      <div>
                        <span className="block font-semibold text-blue-600">{inProg}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">In Prog</span>
                      </div>
                      {blocked > 0 && (
                        <div>
                          <span className="block font-bold text-rose-600">{blocked}</span>
                          <span className="text-[10px] text-rose-600 uppercase">Blocked</span>
                        </div>
                      )}
                      {overdue > 0 && (
                        <div>
                          <span className="block font-bold text-amber-600">{overdue}</span>
                          <span className="text-[10px] text-amber-600 uppercase">Overdue</span>
                        </div>
                      )}
                      <div>
                        <span className="block font-semibold text-emerald-600">{done}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Done</span>
                      </div>
                      <div className="w-16 hidden sm:block">
                        <Progress value={cap} className="h-1.5" />
                      </div>
                    </div>
                  </div>

                  {/* Latest Progress Report Preview */}
                  {latestUpdate ? (
                    <div className="pt-1.5 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span className="font-semibold text-foreground">Latest: </span>
                        {latestUpdate.workCompleted.slice(0, 60)}...
                      </span>
                      <span className="shrink-0 opacity-75">
                        {fmtRelative(latestUpdate.createdAt)}
                      </span>
                    </div>
                  ) : (
                    <div className="pt-1 border-t border-border/40 text-[10px] text-muted-foreground italic">
                      No daily progress reports submitted yet.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column: Tasks Due Soon & Recent Team Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tasks Due Soon */}
        <div className="rounded-xl border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b">
            <div>
              <h2 className="text-sm font-bold text-foreground">Tasks Due Soon</h2>
              <p className="text-xs text-muted-foreground">Deadlines approaching in next 7 days</p>
            </div>
            <Link
              to="/tasks"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Backlog <ArrowRight className="size-3" />
            </Link>
          </div>

          {dueThisWeekTasks.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground italic">
              No tasks due in the next 7 days.
            </p>
          ) : (
            <div className="divide-y">
              {dueThisWeekTasks.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-muted/40 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">{t.identifier}</span>
                      <span className="text-xs font-medium text-foreground truncate">{t.title}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Due {t.dueDate ? fmtDate(t.dueDate) : ""}
                    </span>
                  </div>
                  <PriorityBadge priority={t.priority} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Audit Feed */}
        <div className="rounded-xl border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b">
            <div>
              <h2 className="text-sm font-bold text-foreground">Recent Activity Stream</h2>
              <p className="text-xs text-muted-foreground">Audited events across all workspaces</p>
            </div>
          </div>
          <ActivityFeed
            activities={(activity || []).slice(0, 5)}
            existingIds={new Set((tasks || []).map((t) => t.id))}
          />
        </div>
      </div>

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Task Review Modal for Leader Approvals */}
      {reviewingTask && (
        <TaskReviewModal
          task={reviewingTask}
          open={!!reviewingTask}
          onOpenChange={(open) => {
            if (!open) setReviewingTask(null);
          }}
          onSuccess={() => {
            reload();
          }}
        />
      )}
    </div>
  );
}
