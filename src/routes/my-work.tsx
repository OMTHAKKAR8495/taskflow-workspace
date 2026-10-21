import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/common/AppLayout";
import { MyWorkView } from "@/components/my-work/MyWorkView";

export const Route = createFileRoute("/my-work")({
  head: () => ({
    meta: [
      { title: "My Work · TaskFlow Nexus" },
      {
        name: "description",
        content: "Personal cockpit for tasks assigned to you, pending your review, and active deliverables.",
      },
      { property: "og:title", content: "My Work · TaskFlow Nexus" },
      {
        property: "og:description",
        content: "Personal cockpit for tasks assigned to you, pending your review, and active deliverables.",
      },
    ],
  }),
  component: MyWorkPage,
});

function MyWorkPage() {
  return (
    <AppLayout title="My Work" breadcrumb={[{ label: "Workspace" }, { label: "My Work" }]}>
      <MyWorkView />
    </AppLayout>
  );
}
