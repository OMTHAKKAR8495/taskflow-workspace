import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppLayout } from "@/components/common/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { TaskForm } from "@/components/tasks/TaskForm";
import { useTasks } from "@/context/TaskContext";
import type { TaskInput } from "@/types";

export const Route = createFileRoute("/tasks/new")({
  head: () => ({
    meta: [
      { title: "Create Task · TaskFlow" },
      { name: "description", content: "Create a new task in TaskFlow." },
      { property: "og:title", content: "Create Task · TaskFlow" },
      { property: "og:description", content: "Create a new task in TaskFlow." },
    ],
  }),
  component: CreateTaskPage,
});

function CreateTaskPage() {
  const { createTask } = useTasks();
  const navigate = useNavigate();

  const handleSubmit = async (data: TaskInput) => {
    try {
      const newTask = await createTask(data);
      toast.success("Task created successfully!");
      navigate({ to: "/tasks/$id", params: { id: newTask.id } });
    } catch {
      toast.error("Failed to create task.");
    }
  };

  return (
    <AppLayout
      title="Create New Task"
      breadcrumb={[
        { label: "Workspace" },
        { label: "Tasks", href: "/tasks" },
        { label: "New Task" },
      ]}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Create New Task"
          description="Add a task with status, priority, and optional deadline to keep your project organized."
        />
        <TaskForm
          submitLabel="Create Task"
          onSubmit={handleSubmit}
          onCancel={() => navigate({ to: "/tasks" })}
        />
      </div>
    </AppLayout>
  );
}
