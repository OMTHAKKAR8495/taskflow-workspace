import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/common/AppLayout";
import { TeamView } from "@/components/team/TeamView";
import { useAuth } from "@/context/AuthContext";

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
    <AppLayout title="Team" breadcrumb={[{ label: "Workspace" }, { label: "Team" }]}>
      <TeamView />
    </AppLayout>
  );
}
