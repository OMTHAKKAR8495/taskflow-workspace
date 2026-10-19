import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/common/AppLayout";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · TaskFlow" },
      { name: "description", content: "Overview of your tasks, velocity, and priority metrics in TaskFlow." },
      { property: "og:title", content: "Dashboard · TaskFlow" },
      { property: "og:description", content: "Overview of your tasks, velocity, and priority metrics in TaskFlow." },
    ],
  }),
  component: DashboardRoutePage,
});

function DashboardRoutePage() {
  return (
    <AppLayout title="Dashboard" breadcrumb={[{ label: "Workspace" }, { label: "Dashboard" }]}>
      <DashboardView />
    </AppLayout>
  );
}
