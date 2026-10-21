import { CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Activity } from "@/types";

const meta = {
  created: { icon: Plus, label: "Created", cls: "bg-primary-soft text-primary" },
  updated: { icon: Pencil, label: "Updated", cls: "bg-info-soft text-info" },
  completed: { icon: CheckCircle2, label: "Completed", cls: "bg-success-soft text-success" },
  deleted: { icon: Trash2, label: "Deleted", cls: "bg-danger-soft text-destructive" },
};

export function ActivityFeed({
  items,
  existingIds,
}: {
  items: Activity[];
  existingIds: Set<string>;
}) {
  if (!items.length)
    return <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>;
  return (
    <ol className="space-y-4">
      {items.map((a) => {
        const m = meta[a.type];
        return (
          <li key={a.id} className="flex gap-3">
            <div
              className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", m.cls)}
            >
              <m.icon className="size-3.5" aria-hidden />
            </div>
            <div className="min-w-0 text-sm">
              <p className="truncate">
                <span className="text-muted-foreground">{m.label} </span>
                {existingIds.has(a.taskId) ? (
                  <Link
                    to="/tasks/$id"
                    params={{ id: a.taskId }}
                    className="font-medium hover:text-primary"
                  >
                    {a.taskTitle}
                  </Link>
                ) : (
                  <span className="font-medium">{a.taskTitle}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{fmtRelative(a.at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
