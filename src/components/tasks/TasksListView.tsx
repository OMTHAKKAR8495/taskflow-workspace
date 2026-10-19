import { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, LoadingState, ErrorState } from "@/components/common/states";
import { TaskFilters, type ViewMode } from "@/components/tasks/TaskFilters";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskCard } from "@/components/tasks/TaskCard";
import { useTasks } from "@/context/TaskContext";
import { filterAndSortTasks } from "@/lib/task-utils";
import type { TaskFilterState } from "@/types";

const INITIAL_FILTERS: TaskFilterState = {
  search: "",
  status: "all",
  priority: "all",
  sort: "dueDate",
};

export function TasksListView() {
  const { tasks, state, reload } = useTasks();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TaskFilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("list");

  const filteredTasks = useMemo(() => {
    return filterAndSortTasks(tasks, filters);
  }, [tasks, filters]);

  const hasActiveFilters =
    filters.search !== "" || filters.status !== "all" || filters.priority !== "all";

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
            <span>All Tasks</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
            </span>
          </div>
        }
        description="Manage, filter, and track all tasks across your workspace."
        actions={
          <Button onClick={() => navigate({ to: "/tasks/new" })} className="shadow-sm shadow-primary/25">
            <Plus className="size-4" /> Add Task
          </Button>
        }
      />

      <TaskFilters
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(INITIAL_FILTERS)}
        view={view}
        onViewChange={setView}
      />

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={hasActiveFilters ? "No matching tasks found" : "No tasks yet"}
          description={
            hasActiveFilters
              ? "Try adjusting your search criteria or filter options to find what you're looking for."
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
