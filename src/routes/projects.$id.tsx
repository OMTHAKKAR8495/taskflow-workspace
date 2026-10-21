import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/common/AppLayout";
import { ProjectWorkspaceView } from "@/components/projects/ProjectWorkspaceView";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project Workspace · TaskFlow Nexus" },
      {
        name: "description",
        content: "Dedicated workspace for project backlog, kanban board, timeline, and team collaboration.",
      },
      { property: "og:title", content: "Project Workspace · TaskFlow Nexus" },
      {
        property: "og:description",
        content: "Dedicated workspace for project backlog, kanban board, timeline, and team collaboration.",
      },
    ],
  }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { id } = Route.useParams();

  return (
    <AppLayout
      title="Project Workspace"
      breadcrumb={[
        { label: "Workspace" },
        { label: "Projects", href: "/projects" },
        { label: "Workspace" },
      ]}
    >
      <ProjectWorkspaceView projectId={id} />
    </AppLayout>
  );
}
