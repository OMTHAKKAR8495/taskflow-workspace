import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/common/AppLayout";
import { ReportsView } from "@/components/reports/ReportsView";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Project Intelligence · TaskFlow Nexus" },
      {
        name: "description",
        content: "Track planned vs completed work, lead times, cycle times, and export delivery reports.",
      },
      { property: "og:title", content: "Reports & Project Intelligence · TaskFlow Nexus" },
      {
        property: "og:description",
        content: "Track planned vs completed work, lead times, cycle times, and export delivery reports.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
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
      title="Reports & Analytics"
      breadcrumb={[{ label: "Workspace" }, { label: "Reports & Analytics" }]}
    >
      <ReportsView />
    </AppLayout>
  );
}
