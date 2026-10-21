import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/common/AppLayout";
import { NotificationsView } from "@/components/notifications/NotificationsView";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications Center · TaskFlow Nexus" },
      {
        name: "description",
        content: "Track assignments, code review requests, mentions, and deadline alerts in TaskFlow Nexus.",
      },
      { property: "og:title", content: "Notifications Center · TaskFlow Nexus" },
      {
        property: "og:description",
        content: "Track assignments, code review requests, mentions, and deadline alerts in TaskFlow Nexus.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <AppLayout
      title="Notifications"
      breadcrumb={[{ label: "Workspace" }, { label: "Notifications" }]}
    >
      <NotificationsView />
    </AppLayout>
  );
}
