import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, FileQuestion, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { PriorityBadge, TaskStatusBadge } from "@/components/tasks/badges";
import { DeleteConfirmationDialog } from "@/components/tasks/DeleteConfirmationDialog";
import { useTasks } from "@/context/TaskContext";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/tasks/$id")({
  head: () => ({
    meta: [
      { title: "Task details · TaskFlow" },
      { name: "description", content: "View and manage a task in TaskFlow." },
      { property: "og:title", content: "Task details · TaskFlow" },
      { property: "og:description", content: "View and manage a task in TaskFlow." },
    ],
  }),
  component: TaskDetails,
});

function TaskDetails() {
  const { id } = Route.useParams();
  const { tasks, state, reload, updateTask, deleteTask } = useTasks();
  const navigate = useNavigate();
  const task = tasks.find((t) => t.id === id);

  if (state === "loading") return <div className="mx-auto max-w-3xl p-6"><LoadingState rows={2} /></div>;
  if (state === "error") return <div className="mx-auto max-w-3xl p-6"><ErrorState onRetry={reload} /></div>;
  if (!task)
    return (
      <div className="mx-auto max-w-3xl p-6">
        <EmptyState icon={FileQuestion} title="Task not found" description="This task doesn't exist or was deleted." />
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/" })}>
        <ArrowLeft className="size-4" /> Back
      </Button>
      <div className="rounded-xl border bg-card p-6 shadow-card">
        <div className="flex flex-wrap gap-2">
          <TaskStatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
        <h1 className="mt-3 text-2xl font-semibold">{task.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{task.description || "No description"}</p>
        <dl className="mt-6 grid gap-4 border-t pt-4 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">Due</dt><dd>{fmtDate(task.dueDate)}</dd></div>
          <div><dt className="text-muted-foreground">Created</dt><dd>{fmtDate(task.createdAt)}</dd></div>
          <div><dt className="text-muted-foreground">Updated</dt><dd>{fmtDate(task.updatedAt)}</dd></div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          {task.status !== "completed" && (
            <Button onClick={async () => { await updateTask(task.id, { status: "completed" }); toast.success("Task completed"); }}>
              <CheckCircle2 className="size-4" /> Mark as complete
            </Button>
          )}
          <DeleteConfirmationDialog
            taskTitle={task.title}
            onConfirm={async () => { await deleteTask(task.id); toast.success("Task deleted"); navigate({ to: "/" }); }}
            trigger={<Button variant="outline"><Trash2 className="size-4" /> Delete</Button>}
          />
        </div>
      </div>
      <Link to="/" className="text-sm text-primary">Go home</Link>
    </div>
  );
}
