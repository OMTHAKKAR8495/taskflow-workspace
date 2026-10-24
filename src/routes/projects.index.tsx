import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/common/AppLayout";
import { ProjectsListView } from "@/components/projects/ProjectsListView";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects Portfolio · TaskFlow Nexus" },
      {
        name: "description",
        content: "Portfolio view of all initiatives, health scores, and deliverables in TaskFlow Nexus.",
      },
      { property: "og:title", content: "Projects Portfolio · TaskFlow Nexus" },
      {
        property: "og:description",
        content: "Portfolio view of all initiatives, health scores, and deliverables in TaskFlow Nexus.",
      },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
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
    <AppLayout
      title="Projects"
      breadcrumb={[{ label: "Workspace" }, { label: "Projects" }]}
    >
      <ProjectsListView />
    </AppLayout>
  );
}
