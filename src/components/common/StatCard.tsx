import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "primary",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  tone?: "primary" | "warning" | "info" | "success";
}) {
  const toneCls = {
    primary: "bg-primary-soft text-primary",
    warning: "bg-warning-soft text-warning",
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
  }[tone];
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={cn("flex size-9 items-center justify-center rounded-lg", toneCls)}>
          <Icon className="size-4" aria-hidden />
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
