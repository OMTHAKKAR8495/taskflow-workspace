import { useState, useMemo } from "react";
import {
  TrendingUp,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  BarChart3,
  PieChart,
  ShieldAlert,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { useTasks } from "@/context/TaskContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { Task, Project, TeamMember } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  backlog: "#94a3b8",
  ready: "#60a5fa",
  in_progress: "#3b82f6",
  in_review: "#a855f7",
  blocked: "#f43f5e",
  completed: "#10b981",
  pending: "#60a5fa",
};

export function ReportsView() {
  const { tasks, projects, team } = useTasks();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  const nonTrashTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.isTrash) return false;
      if (selectedProjectId !== "all" && t.projectId !== selectedProjectId) return false;
      return true;
    });
  }, [tasks, selectedProjectId]);

  const completedTasks = useMemo(() => {
    return nonTrashTasks.filter((t) => t.status === "completed");
  }, [nonTrashTasks]);

  const blockedTasks = useMemo(() => {
    return nonTrashTasks.filter((t) => t.status === "blocked");
  }, [nonTrashTasks]);

  // 1. On-Time Delivery Rate
  const onTimeDeliveryStats = useMemo(() => {
    if (completedTasks.length === 0) return { rate: 100, onTime: 0, late: 0 };
    let onTime = 0;
    let late = 0;
    for (const t of completedTasks) {
      if (!t.dueDate || !t.completedAt) {
        onTime++;
        continue;
      }
      const due = new Date(t.dueDate).getTime();
      const done = new Date(t.completedAt).getTime();
      if (done <= due) onTime++;
      else late++;
    }
    const rate = Math.round((onTime / completedTasks.length) * 100);
    return { rate, onTime, late };
  }, [completedTasks]);

  // 2. Cycle Time and Lead Time
  const timingMetrics = useMemo(() => {
    if (completedTasks.length === 0) return { avgLeadDays: 0, avgCycleDays: 0 };
    let totalLeadMs = 0;
    let totalCycleMs = 0;
    let cycleCount = 0;

    for (const t of completedTasks) {
      const created = new Date(t.createdAt).getTime();
      const completed = t.completedAt ? new Date(t.completedAt).getTime() : Date.now();
      totalLeadMs += Math.max(0, completed - created);

      if (t.startDate) {
        const started = new Date(t.startDate).getTime();
        totalCycleMs += Math.max(0, completed - started);
        cycleCount++;
      }
    }

    const avgLeadDays = Math.round((totalLeadMs / completedTasks.length / 86400000) * 10) / 10;
    const avgCycleDays =
      cycleCount > 0 ? Math.round((totalCycleMs / cycleCount / 86400000) * 10) / 10 : avgLeadDays;

    return { avgLeadDays, avgCycleDays };
  }, [completedTasks]);

  // 3. Planned vs Completed Work by Project
  const projectComparisonData = useMemo(() => {
    return projects
      .filter((p) => p.status !== "archived")
      .map((p) => {
        const pTasks = tasks.filter((t) => t.projectId === p.id && !t.isTrash);
        const plannedHours = pTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
        const completedHours = pTasks
          .filter((t) => t.status === "completed")
          .reduce((acc, t) => acc + (t.actualHours || t.estimatedHours || 0), 0);

        return {
          name: p.key || p.name.slice(0, 10),
          fullName: p.name,
          plannedHours: Math.round(plannedHours),
          completedHours: Math.round(completedHours),
          taskCount: pTasks.length,
          completedCount: pTasks.filter((t) => t.status === "completed").length,
        };
      });
  }, [projects, tasks]);

  // 4. Workload by Team Member
  const memberWorkloadData = useMemo(() => {
    return team.map((m) => {
      const mTasks = nonTrashTasks.filter((t) => t.assignee?.id === m.id || t.assigneeId === m.id);
      const active = mTasks.filter((t) => t.status !== "completed").length;
      const completed = mTasks.filter((t) => t.status === "completed").length;
      const hours = mTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);

      return {
        name: m.name.split(" ")[0] || m.name,
        fullName: m.name,
        role: m.role,
        activeTasks: active,
        completedTasks: completed,
        totalHours: Math.round(hours),
      };
    });
  }, [team, nonTrashTasks]);

  // 5. Status Breakdown Data
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {
      backlog: 0,
      ready: 0,
      in_progress: 0,
      in_review: 0,
      blocked: 0,
      completed: 0,
    };

    for (const t of nonTrashTasks) {
      const s = t.status === "pending" ? "ready" : t.status;
      if (counts[s] !== undefined) counts[s]++;
      else counts.backlog++;
    }

    return Object.entries(counts)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => ({
        name: k.replace("_", " ").toUpperCase(),
        value: v,
        color: STATUS_COLORS[k] || "#94a3b8",
      }));
  }, [nonTrashTasks]);

  // CSV Export Handlers
  const handleExportTasksCSV = () => {
    const headers = [
      "Task ID",
      "Identifier",
      "Title",
      "Project",
      "Assignee",
      "Status",
      "Priority",
      "Start Date",
      "Due Date",
      "Completed At",
      "Estimated Hours",
      "Actual Hours",
      "Estimate Points",
    ];

    const rows = nonTrashTasks.map((t) => [
      t.id,
      t.identifier || "",
      `"${t.title.replace(/"/g, '""')}"`,
      t.projectName || "",
      t.assignee?.name || "",
      t.status,
      t.priority,
      t.startDate ? t.startDate.slice(0, 10) : "",
      t.dueDate ? t.dueDate.slice(0, 10) : "",
      t.completedAt ? t.completedAt.slice(0, 10) : "",
      t.estimatedHours || 0,
      t.actualHours || 0,
      t.estimate || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `taskflow_nexus_tasks_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Tasks CSV exported successfully!");
  };

  const handleExportSummaryCSV = () => {
    const headers = [
      "Project Key",
      "Project Name",
      "Lead",
      "Status",
      "Health",
      "Priority",
      "Total Tasks",
      "Completed Tasks",
      "Progress %",
    ];

    const rows = projects.map((p) => {
      const pTasks = tasks.filter((t) => t.projectId === p.id && !t.isTrash);
      const done = pTasks.filter((t) => t.status === "completed").length;
      const prog = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;
      return [
        p.key,
        `"${p.name.replace(/"/g, '""')}"`,
        p.lead,
        p.status,
        p.health,
        p.priority,
        pTasks.length,
        done,
        `${prog}%`,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `taskflow_nexus_project_summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Project Summary CSV exported successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Reports & Project Intelligence
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              Derived from Live Database
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Honest mathematical metrics calculated from PostgreSQL task execution data and cycle times.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full sm:w-auto h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium shadow-xs focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.key})
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportTasksCSV}
            className="flex-1 sm:flex-initial h-9 text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="size-3.5" /> Tasks CSV
          </Button>

          <Button
            size="sm"
            onClick={handleExportSummaryCSV}
            className="flex-1 sm:flex-initial h-9 text-xs gap-1.5 cursor-pointer shadow-xs shadow-primary/25"
          >
            <FileSpreadsheet className="size-3.5" /> Project Summary CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* On-Time Delivery Rate */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>On-Time Delivery</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {onTimeDeliveryStats.rate}%
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {onTimeDeliveryStats.onTime} on time, {onTimeDeliveryStats.late} delayed
          </p>
        </div>

        {/* Average Lead Time */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Avg Lead Time</span>
            <Clock className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {timingMetrics.avgLeadDays} <span className="text-sm font-normal text-muted-foreground">days</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Creation to completion</p>
        </div>

        {/* Average Cycle Time */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Avg Cycle Time</span>
            <TrendingUp className="size-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {timingMetrics.avgCycleDays} <span className="text-sm font-normal text-muted-foreground">days</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Active work to completion</p>
        </div>

        {/* Outstanding Risks */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Blocked Risks</span>
            <AlertTriangle className="size-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {blockedTasks.length}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Tasks currently impeded</p>
        </div>
      </div>

      {/* Chart Section 1: Planned vs Completed & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Planned vs Completed Bar Chart */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Planned vs Completed Work</h3>
              <p className="text-xs text-muted-foreground">
                Estimated effort hours versus actual delivered hours per project initiative.
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              Effort Hours
            </Badge>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="plannedHours" name="Planned (Est. Hours)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completedHours" name="Delivered Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workflow Status Distribution Pie */}
        <div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Workflow Distribution</h3>
            <p className="text-xs text-muted-foreground">Task status breakdown across the project.</p>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
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
                <Legend wrapperStyle={{ fontSize: "10px", bottom: 0 }} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart Section 2: Team Member Workload */}
      <div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Team Member Workload Balance</h3>
          <p className="text-xs text-muted-foreground">
            Distribution of active assignments and completed tasks across all team members.
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={memberWorkloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Bar dataKey="activeTasks" name="Active Tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completedTasks" name="Completed Tasks" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Project Summary Table */}
      <div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Weekly Project Execution Summary</h3>
            <p className="text-xs text-muted-foreground">
              Current progress, task completion ratio, and risk state per project.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-3 font-semibold">Project</th>
                <th className="pb-3 font-semibold">Lead</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Health</th>
                <th className="pb-3 font-semibold">Completion</th>
                <th className="pb-3 font-semibold">Deliverables</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.map((p) => {
                const pTasks = tasks.filter((t) => t.projectId === p.id && !t.isTrash);
                const done = pTasks.filter((t) => t.status === "completed").length;
                const prog = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;

                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="py-3 font-semibold text-foreground flex items-center gap-2">
                      <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {p.key}
                      </span>
                      <span>{p.name}</span>
                    </td>
                    <td className="py-3 text-muted-foreground">{p.lead}</td>
                    <td className="py-3">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-semibold ${
                          p.health === "at_risk"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            : p.health === "delayed"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        }`}
                      >
                        {(p.health || "on_track").replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3 w-40">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{prog}%</span>
                        </div>
                        <Progress value={prog} className="h-1.5" />
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {done} / {pTasks.length} tasks
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
