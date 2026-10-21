import {
  CheckCircle2,
  Clock,
  FolderPlus,
  GitPullRequest,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Activity } from "@/types";

const defaultMeta = { icon: Clock, label: "Updated", cls: "bg-muted text-muted-foreground" };

const meta: Record<string, { icon: typeof Plus; label: string; cls: string }> = {
  created: { icon: Plus, label: "Created", cls: "bg-primary-soft text-primary" },
  task_created: { icon: Plus, label: "Task created", cls: "bg-primary-soft text-primary" },
  updated: { icon: Pencil, label: "Updated", cls: "bg-info-soft text-info" },
  completed: { icon: CheckCircle2, label: "Completed", cls: "bg-success-soft text-success" },
  task_completed: { icon: CheckCircle2, label: "Task completed", cls: "bg-success-soft text-success" },
  deleted: { icon: Trash2, label: "Deleted", cls: "bg-danger-soft text-destructive" },
  status_changed: { icon: RefreshCw, label: "Status updated", cls: "bg-amber-500/10 text-amber-600" },
  review_requested: { icon: GitPullRequest, label: "Review requested", cls: "bg-purple-500/10 text-purple-600" },
  project_created: { icon: FolderPlus, label: "Project created", cls: "bg-emerald-500/10 text-emerald-600" },
  project_updated: { icon: Pencil, label: "Project updated", cls: "bg-info-soft text-info" },
};

export function ActivityFeed({
  items,
  activities,
  existingIds,
}: {
  items?: Activity[];
  activities?: Activity[];
  existingIds?: Set<string>;
}) {
  const list = items || activities || [];
  if (!list.length)
    return <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>;

  return (
    <ol className="space-y-4">
      {list.map((a) => {
        const m = meta[a.type] || defaultMeta;
        const hasId = existingIds ? existingIds.has(a.taskId) : !!a.taskId;
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
                {hasId ? (
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
