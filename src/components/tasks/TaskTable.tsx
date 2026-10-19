import { useNavigate } from "@tanstack/react-router";
import { Bookmark, Edit, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtDate, fmtRelative } from "@/lib/format";
import { isOverdue } from "@/lib/task-utils";
import { useTasks } from "@/context/TaskContext";
import { toast } from "sonner";
import type { Task } from "@/types";
import { PriorityBadge, TaskStatusBadge } from "./badges";
import { TaskCard } from "./TaskCard";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

export function TaskTable({ tasks }: { tasks: Task[] }) {
  const navigate = useNavigate();
  const { toggleBookmark, deleteTask } = useTasks();
  const open = (id: string) => navigate({ to: "/tasks/$id", params: { id } });

  const handleBookmark = async (e: React.MouseEvent, id: string, wasBookmarked?: boolean) => {
    e.stopPropagation();
    try {
      await toggleBookmark(id);
      toast.success(wasBookmarked ? "Removed bookmark" : "Bookmarked task");
    } catch {
      toast.error("Failed to update bookmark");
    }
  };

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
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-[38%]">Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                <TableCell className="w-10 pr-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => handleBookmark(e, t.id, t.isBookmarked)}
                    aria-label={t.isBookmarked ? "Remove bookmark" : "Bookmark task"}
                    className={cn(
                      "rounded p-1 transition-colors hover:bg-muted",
                      t.isBookmarked ? "text-amber-500 fill-amber-500" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Bookmark className={cn("size-4", t.isBookmarked && "fill-amber-500")} />
                  </button>
                </TableCell>
                <TableCell className="max-w-0">
                  <p className={cn("truncate font-medium", t.status === "completed" && "text-muted-foreground line-through")}>{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.description || "No description"}</p>
                </TableCell>
                <TableCell><TaskStatusBadge status={t.status} /></TableCell>
                <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                <TableCell className={cn("whitespace-nowrap text-sm", isOverdue(t) ? "font-medium text-destructive" : "text-muted-foreground")}>
                  {fmtDate(t.dueDate, "—")}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtRelative(t.updatedAt)}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      onClick={() => navigate({ to: "/tasks/$id/edit", params: { id: t.id } })}
                      aria-label="Edit task"
                    >
                      <Edit className="size-3.5" />
                    </Button>
                    <DeleteConfirmationDialog
                      taskTitle={t.title}
                      onConfirm={async () => {
                        await deleteTask(t.id);
                        toast.success("Task deleted");
                      }}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          aria-label="Delete task"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
