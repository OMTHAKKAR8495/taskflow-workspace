import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/common/AppLayout";
import { TasksListView } from "@/components/tasks/TasksListView";
import { useAuth } from "@/context/AuthContext";

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
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "member") {
      navigate({ to: "/dashboard" });
    }
  }, [user?.role, navigate]);

  if (user?.role === "member") {
    return null;
  }

  return (
    <AppLayout title="All Tasks" breadcrumb={[{ label: "Workspace" }, { label: "Tasks" }]}>
      <TasksListView />
    </AppLayout>
  );
}
