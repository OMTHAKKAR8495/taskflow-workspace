import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/common/AppLayout";
import { SettingsView } from "@/components/settings/SettingsView";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · TaskFlow Nexus" },
      {
        name: "description",
        content: "Configure personal preferences, theme appearance, and database diagnostics.",
      },
      { property: "og:title", content: "Settings · TaskFlow Nexus" },
      {
        property: "og:description",
        content: "Configure personal preferences, theme appearance, and database diagnostics.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppLayout title="Settings" breadcrumb={[{ label: "Workspace" }, { label: "Settings" }]}>
      <SettingsView />
    </AppLayout>
  );
}
