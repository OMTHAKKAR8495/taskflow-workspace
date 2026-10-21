import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/common/AppLayout";
import { CalendarView } from "@/components/tasks/CalendarView";
import { useTasks } from "@/context/TaskContext";
import { Badge } from "@/components/ui/badge";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import type { Task } from "@/types";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar · TaskFlow Nexus" },
      {
        name: "description",
        content: "Schedule, reschedule, and track task deadlines and project milestones interactively.",
      },
      { property: "og:title", content: "Calendar · TaskFlow Nexus" },
      {
        property: "og:description",
        content: "Schedule, reschedule, and track task deadlines and project milestones interactively.",
      },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { tasks, projects } = useTasks();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.isTrash) return false;
      if (selectedProjectId !== "all" && t.projectId !== selectedProjectId) return false;
      return true;
    });
  }, [tasks, selectedProjectId]);

  return (
    <AppLayout title="Calendar" breadcrumb={[{ label: "Workspace" }, { label: "Calendar" }]}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Interactive Calendar</h1>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                Drag & Drop Scheduling
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag tasks between dates to reschedule due dates with immediate backend synchronization.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium shadow-xs focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
          </div>
        </div>

        <CalendarView tasks={filteredTasks} />

        {selectedTask && (
          <TaskDrawer
            task={selectedTask}
            open={!!selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}
