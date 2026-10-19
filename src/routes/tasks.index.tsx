import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/common/AppLayout";
import { TasksListView } from "@/components/tasks/TasksListView";

export const Route = createFileRoute("/tasks/")({
  head: () => ({
    meta: [
      { title: "All Tasks · TaskFlow" },
      { name: "description", content: "Filter, search, and manage all workspace tasks." },
      { property: "og:title", content: "All Tasks · TaskFlow" },
      { property: "og:description", content: "Filter, search, and manage all workspace tasks." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  return (
    <AppLayout title="All Tasks" breadcrumb={[{ label: "Workspace" }, { label: "Tasks" }]}>
      <TasksListView />
    </AppLayout>
  );
}
