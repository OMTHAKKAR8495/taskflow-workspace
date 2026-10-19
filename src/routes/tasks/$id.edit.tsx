import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppLayout } from "@/components/common/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { TaskForm } from "@/components/tasks/TaskForm";
import { EmptyState, LoadingState, ErrorState } from "@/components/common/states";
import { useTasks } from "@/context/TaskContext";
import { FileQuestion } from "lucide-react";
import type { TaskInput } from "@/types";

export const Route = createFileRoute("/tasks/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Task · TaskFlow" },
      { name: "description", content: "Edit task details in TaskFlow." },
      { property: "og:title", content: "Edit Task · TaskFlow" },
      { property: "og:description", content: "Edit task details in TaskFlow." },
    ],
  }),
  component: EditTaskPage,
});

function EditTaskPage() {
  const { id } = Route.useParams();
  const { tasks, state, reload, updateTask } = useTasks();
  const navigate = useNavigate();

  if (state === "loading") {
    return (
      <AppLayout title="Edit Task">
        <LoadingState rows={3} />
      </AppLayout>
    );
  }

  if (state === "error") {
    return (
      <AppLayout title="Edit Task">
        <ErrorState onRetry={reload} />
      </AppLayout>
    );
  }

  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return (
      <AppLayout title="Edit Task">
        <EmptyState
          icon={FileQuestion}
          title="Task not found"
          description="The task you are trying to edit does not exist or has been removed."
        />
      </AppLayout>
    );
  }

  const handleSubmit = async (data: TaskInput) => {
    try {
      await updateTask(task.id, data);
      toast.success("Task updated successfully!");
      navigate({ to: "/tasks/$id", params: { id: task.id } });
    } catch {
      toast.error("Failed to update task.");
    }
  };

  return (
    <AppLayout
      title="Edit Task"
      breadcrumb={[
        { label: "Workspace" },
        { label: "Tasks", href: "/tasks" },
        { label: task.title, href: `/tasks/${task.id}` },
        { label: "Edit" },
      ]}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Edit Task"
          description={`Update details, priority, or deadline for "${task.title}".`}
        />
        <TaskForm
          initial={task}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
          onCancel={() => navigate({ to: "/tasks/$id", params: { id: task.id } })}
        />
      </div>
    </AppLayout>
  );
}
