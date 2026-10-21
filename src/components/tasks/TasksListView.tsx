import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, ListTodo, X, FolderKanban, CheckCircle2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, LoadingState, ErrorState } from "@/components/common/states";
import { TaskFilters, type ViewMode } from "@/components/tasks/TaskFilters";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskCard } from "@/components/tasks/TaskCard";
import { useTasks } from "@/context/TaskContext";
import { filterAndSortTasks } from "@/lib/task-utils";
import type { TaskFilterState } from "@/types";

const INITIAL_FILTERS: TaskFilterState = {
  search: "",
  status: "all",
  priority: "all",
  projectId: "all",
  assigneeId: "all",
  tag: "all",
  sort: "dueDate",
};

export function TasksListView() {
  const { tasks, projects, state, reload, selectedProjectId, setSelectedProjectId } = useTasks();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TaskFilterState>(() => ({
    ...INITIAL_FILTERS,
    projectId: selectedProjectId,
  }));
  const [view, setView] = useState<ViewMode>("kanban");

  // Keep filters.projectId synced when sidebar or URL selects a project
  useEffect(() => {
    setFilters((prev) => (prev.projectId === selectedProjectId ? prev : { ...prev, projectId: selectedProjectId }));
  }, [selectedProjectId]);

  const handleFilterChange = (newFilters: TaskFilterState) => {
    setFilters(newFilters);
    if (newFilters.projectId !== selectedProjectId) {
      setSelectedProjectId(newFilters.projectId || "all");
    }
  };

  const handleClear = () => {
    setFilters(INITIAL_FILTERS);
    setSelectedProjectId("all");
  };

  const filteredTasks = useMemo(() => {
    return filterAndSortTasks(tasks, filters);
  }, [tasks, filters]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === "all") return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const projectTasks = useMemo(() => {
    if (!selectedProject) return [];
    return tasks.filter((t) => t.projectId === selectedProject.id);
  }, [tasks, selectedProject]);

  const projectCompleted = useMemo(() => {
    return projectTasks.filter((t) => t.status === "completed").length;
  }, [projectTasks]);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.projectId !== "all" ||
    filters.assigneeId !== "all" ||
    Boolean(filters.bookmarkedOnly);

  if (state === "loading") {
    return <LoadingState rows={5} />;
  }

  if (state === "error") {
    return <ErrorState onRetry={reload} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-2.5">
            {selectedProject ? (
              <div className="flex items-center gap-2.5">
                <span className="size-3.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: selectedProject.color }} />
                <span>{selectedProject.name}</span>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary uppercase">
                  {selectedProject.key}
                </span>
              </div>
            ) : (
              <span>All Tasks & Workflows</span>
            )}
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
            </span>
          </div>
        }
        description={
          selectedProject
            ? selectedProject.description
            : "Comprehensive task management board with project milestones, assignees, and real-time status tracking."
        }
        actions={
          <Button onClick={() => navigate({ to: "/tasks/new" })} className="shadow-sm shadow-primary/25">
            <Plus className="size-4" /> Add Task
          </Button>
        }
      />

      {/* Selected Project Highlight Banner */}
      {selectedProject && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-lg text-white shadow-xs font-bold shrink-0"
              style={{ backgroundColor: selectedProject.color }}
            >
              <FolderKanban className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-foreground text-sm">{selectedProject.name}</h2>
                <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-bold text-muted-foreground uppercase">
                  Key: {selectedProject.key}
                </span>
                <span className="text-xs text-muted-foreground">Lead: {selectedProject.lead}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {projectCompleted} of {projectTasks.length} tasks completed ({projectTasks.length > 0 ? Math.round((projectCompleted / projectTasks.length) * 100) : 0}%)
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="text-xs shrink-0 h-8 self-start sm:self-auto cursor-pointer"
          >
            <X className="size-3.5 mr-1" /> View All Projects
          </Button>
        </div>
      )}

      <TaskFilters
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClear}
        view={view}
        onViewChange={setView}
      />

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={hasActiveFilters ? "No matching tasks found" : "No tasks yet"}
          description={
            hasActiveFilters
              ? "Try adjusting your search criteria, project, or assignee filters."
              : "Create your first task to start organizing your projects and workflows."
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={() => setFilters(INITIAL_FILTERS)}>
                Clear all filters
              </Button>
            ) : (
              <Button onClick={() => navigate({ to: "/tasks/new" })}>
                <Plus className="size-4" /> Create first task
              </Button>
            )
          }
        />
      ) : view === "kanban" ? (
        <KanbanBoard tasks={filteredTasks} />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <TaskTable tasks={filteredTasks} />
      )}
    </div>
  );
}
