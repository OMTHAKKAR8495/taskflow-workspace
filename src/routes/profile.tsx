import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/common/AppLayout";
import { ProfileView } from "@/components/profile/ProfileView";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "User Profile · TaskFlow" },
      {
        name: "description",
        content: "View and edit your TaskFlow profile and workspace statistics.",
      },
      { property: "og:title", content: "User Profile · TaskFlow" },
      {
        property: "og:description",
        content: "View and edit your TaskFlow profile and workspace statistics.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <AppLayout title="User Profile" breadcrumb={[{ label: "Workspace" }, { label: "Profile" }]}>
      <ProfileView />
    </AppLayout>
  );
}
