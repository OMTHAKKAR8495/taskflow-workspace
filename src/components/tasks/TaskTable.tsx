import { useNavigate } from "@tanstack/react-router";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { fmtDate, fmtRelative } from "@/lib/format";
import { isOverdue } from "@/lib/task-utils";
import type { Task } from "@/types";
import { PriorityBadge, TaskStatusBadge } from "./badges";
import { TaskCard } from "./TaskCard";

export function TaskTable({ tasks }: { tasks: Task[] }) {
  const navigate = useNavigate();
  const open = (id: string) => navigate({ to: "/tasks/$id", params: { id } });
  return (
    <>
      {/* Cards on small screens */}
      <div className="grid gap-3 md:hidden">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[45%]">Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => (
              <TableRow
                key={t.id}
                tabIndex={0}
                role="link"
                aria-label={`Open ${t.title}`}
                onClick={() => open(t.id)}
                onKeyDown={(e) => e.key === "Enter" && open(t.id)}
                className="cursor-pointer focus-visible:bg-accent focus-visible:outline-none"
              >
                <TableCell className="max-w-0">
                  <p className={cn("truncate font-medium", t.status === "completed" && "text-muted-foreground line-through")}>{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.description || "No description"}</p>
                </TableCell>
                <TableCell><TaskStatusBadge status={t.status} /></TableCell>
                <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                <TableCell className={cn("whitespace-nowrap text-sm", isOverdue(t) ? "font-medium text-destructive" : "text-muted-foreground")}>
                  {fmtDate(t.dueDate, "—")}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-sm text-muted-foreground">{fmtRelative(t.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
