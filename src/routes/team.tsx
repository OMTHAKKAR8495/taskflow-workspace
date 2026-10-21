import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/common/AppLayout";
import { TeamView } from "@/components/team/TeamView";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team Directory & Workload · TaskFlow Nexus" },
      {
        name: "description",
        content: "Collaborate with your team, monitor member workloads, project assignments, and sprint capacity.",
      },
      { property: "og:title", content: "Team Directory & Workload · TaskFlow Nexus" },
      {
        property: "og:description",
        content: "Collaborate with your team, monitor member workloads, project assignments, and sprint capacity.",
      },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  return (
    <AppLayout title="Team" breadcrumb={[{ label: "Workspace" }, { label: "Team" }]}>
      <TeamView />
    </AppLayout>
  );
}
