import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileText, CheckCircle2 } from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { toast } from "sonner";
import type { Task, TaskInput } from "@/types";

interface DataExportImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataExportImportModal({ open, onOpenChange }: DataExportImportModalProps) {
  const { tasks, createTask } = useTasks();
  const [importing, setImporting] = useState(false);

  const exportJSON = () => {
    const active = tasks.filter((t) => !t.isTrash);
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taskflow-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Tasks exported to JSON!");
  };

  const exportCSV = () => {
    const active = tasks.filter((t) => !t.isTrash);
    const headers = ["Title", "Status", "Priority", "Due Date", "Tags", "Estimate", "Created At"];
    const rows = active.map((t) => [
      `"${(t.title || "").replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      t.dueDate || "",
      `"${(t.tags || []).join(", ")}"`,
      t.estimate || "",
      t.createdAt,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taskflow-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Tasks exported to CSV!");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            let count = 0;
            for (const item of parsed) {
              if (item.title) {
                await createTask({
                  title: String(item.title).trim(),
                  description: item.description || "",
                  status: item.status || "pending",
                  priority: item.priority || "medium",
                  dueDate: item.dueDate || null,
                  tags: Array.isArray(item.tags) ? item.tags : ["Imported"],
                });
                count++;
              }
            }
            toast.success(`Successfully imported ${count} tasks!`);
            onOpenChange(false);
          } else {
            toast.error("Invalid JSON format: expected array of tasks");
          }
        } else if (file.name.endsWith(".csv")) {
          const lines = content.split("\n").filter(Boolean);
          let count = 0;
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;
            const parts = line.split(",");
            const title = parts[0]?.replace(/^"|"$/g, "").trim();
            if (title) {
              await createTask({
                title,
                description: "",
                status: (parts[1]?.trim() as any) || "pending",
                priority: (parts[2]?.trim() as any) || "medium",
                dueDate: parts[3]?.trim() || null,
                tags: ["CSV Import"],
              });
              count++;
            }
          }
          toast.success(`Successfully imported ${count} tasks from CSV!`);
          onOpenChange(false);
        }
      } catch (err) {
        toast.error("Failed to parse and import file");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 bg-card rounded-2xl shadow-xl border">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            <FileText className="size-5" />
          </div>
          <DialogTitle className="text-lg font-bold">Import & Export Workspace</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Backup your tasks, migrate data between machines, or import existing to-do lists.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Export Options */}
          <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Export Tasks
            </h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportJSON}
                className="flex-1 gap-2 text-xs font-semibold cursor-pointer"
              >
                <Download className="size-3.5" />
                <span>Export JSON</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportCSV}
                className="flex-1 gap-2 text-xs font-semibold cursor-pointer"
              >
                <Download className="size-3.5" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {/* Import Options */}
          <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Import Tasks
            </h4>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/50 transition-colors cursor-pointer bg-background">
              <Upload className="size-6 text-muted-foreground mb-1" />
              <span className="text-xs font-semibold text-foreground">
                {importing ? "Importing tasks..." : "Click to select JSON or CSV file"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Compatible with TaskFlow and Todoist exports
              </span>
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleFileUpload}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
