import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  CalendarIcon,
  CheckCircle2,
  Circle,
  Eye,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  Timer,
  Trash2,
  X,
  CheckSquare,
  Users,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTasks } from "@/context/TaskContext";
import { cn } from "@/lib/utils";
import type { Task, TaskInput, TaskPriority, TaskStatus } from "@/types";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 1000;

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`),
  status: z.enum(["pending", "in_progress", "in_review", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.date().nullable(),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  estimate: z.string().optional(),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof taskSchema>;

export function TaskForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial?: Task;
  submitLabel: string;
  onSubmit: (data: TaskInput) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const { projects, team } = useTasks();
  const [dateOpen, setDateOpen] = useState(false);
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>(
    initial?.subtasks || []
  );
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(taskSchema),
    values: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      status: initial?.status ?? "pending",
      priority: initial?.priority ?? "medium",
      dueDate: initial?.dueDate ? new Date(initial.dueDate) : null,
      projectId: initial?.projectId ?? (projects[0]?.id || "proj-core"),
      assigneeId: initial?.assignee?.id ?? (team[0]?.id || "team-om"),
      estimate: initial?.estimate ?? "3 pts",
      tags: initial?.tags ? initial.tags.join(", ") : "Frontend, API",
    },
  });

  const submitting = form.formState.isSubmitting;
  const desc = form.watch("description") || "";

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        title: newSubtaskTitle.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskTitle("");
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(subtasks.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)));
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handle = form.handleSubmit(async (v) => {
    let due: string | null = null;
    if (v.dueDate) {
      const d = new Date(v.dueDate);
      d.setHours(12, 0, 0, 0);
      due = d.toISOString();
    }

    const parsedTags = v.tags
      ? v.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    await onSubmit({
      title: v.title,
      description: v.description,
      status: v.status,
      priority: v.priority,
      dueDate: due,
      projectId: v.projectId,
      assigneeId: v.assigneeId,
      estimate: v.estimate,
      tags: parsedTags,
      subtasks,
    });
  });

  const setRelativeDate = (daysFromToday: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    form.setValue("dueDate", d, { shouldDirty: true });
    setDateOpen(false);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={handle}
        className="space-y-6 rounded-xl border bg-card p-5 shadow-card sm:p-6"
        noValidate
      >
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Task Title <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Design onboarding flow for new users"
                  maxLength={TITLE_MAX + 20}
                  className="h-10 text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Project & Assignee Selection (Task Management Core) */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Project Select */}
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <FolderKanban className="size-4 text-primary" />
                  <span>Project / Initiative</span>
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-10 bg-card">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground">({p.key})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Assignee Select */}
          <FormField
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Users className="size-4 text-primary" />
                  <span>Assignee</span>
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-10 bg-card">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {team.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {m.initials}
                          </span>
                          <span className="font-medium">{m.name}</span>
                          <span className="text-xs text-muted-foreground">({m.role})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Description & Acceptance Criteria</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Detail the scope of work, technical requirements, and completion criteria…"
                  {...field}
                />
              </FormControl>
              <div className="flex justify-between gap-2">
                <FormMessage />
                <FormDescription
                  className={cn("ml-auto text-xs", desc.length > DESCRIPTION_MAX && "text-destructive")}
                >
                  {desc.length}/{DESCRIPTION_MAX}
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* Subtasks / Checklist Builder */}
        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <CheckSquare className="size-4 text-primary" />
              Subtasks Checklist
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {subtasks.filter((s) => s.completed).length}/{subtasks.length} completed
            </span>
          </div>

          <div className="space-y-2">
            {subtasks.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-xs shadow-2xs"
              >
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={s.completed}
                    onChange={() => handleToggleSubtask(s.id)}
                    className="size-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className={cn("text-foreground font-medium", s.completed && "line-through text-muted-foreground")}>
                    {s.title}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveSubtask(s.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2 pt-1">
              <Input
                placeholder="Add subtask (e.g. Write integration test)…"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="h-9 text-xs bg-card"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddSubtask} className="h-9 text-xs">
                <Plus className="size-3.5" /> Add
              </Button>
            </div>
          </div>
        </div>

        {/* Status, Priority & Estimate */}
        <div className="space-y-5 rounded-xl border border-border/80 bg-muted/20 p-4">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Status Option */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <span>Task Status</span>
                    <span className="text-[11px] font-normal text-muted-foreground capitalize">
                      {field.value.replace("_", " ")}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          { value: "pending", label: "To Do", icon: Circle, activeCls: "border-warning bg-warning-soft text-warning ring-1 ring-warning" },
                          { value: "in_progress", label: "In Progress", icon: Timer, activeCls: "border-info bg-info-soft text-info ring-1 ring-info" },
                          { value: "in_review", label: "In Review", icon: Eye, activeCls: "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-400 ring-1 ring-purple-500" },
                          { value: "completed", label: "Done", icon: CheckCircle2, activeCls: "border-success bg-success-soft text-success ring-1 ring-success" },
                        ] as const
                      ).map((s) => {
                        const Icon = s.icon;
                        const isSelected = field.value === s.value;
                        return (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => field.onChange(s.value as TaskStatus)}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 rounded-lg border py-2 px-1 text-xs font-semibold transition-all cursor-pointer",
                              isSelected
                                ? cn(s.activeCls, "shadow-sm")
                                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <Icon className="size-3.5" />
                            <span className="truncate text-[11px]">{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority Option */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <span>Priority Level</span>
                    <span className="text-[11px] font-normal text-muted-foreground capitalize">
                      {field.value}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { value: "low", label: "Low", icon: ArrowDown, activeCls: "border-border bg-muted text-foreground ring-1 ring-border" },
                          { value: "medium", label: "Medium", icon: Minus, activeCls: "border-primary bg-primary-soft text-primary ring-1 ring-primary" },
                          { value: "high", label: "High", icon: ArrowUp, activeCls: "border-destructive bg-danger-soft text-destructive ring-1 ring-destructive" },
                        ] as const
                      ).map((p) => {
                        const Icon = p.icon;
                        const isSelected = field.value === p.value;
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => field.onChange(p.value as TaskPriority)}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 rounded-lg border py-2 px-1 text-xs font-semibold transition-all cursor-pointer",
                              isSelected
                                ? cn(p.activeCls, "shadow-sm")
                                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <Icon className="size-3.5" />
                            <span className="truncate text-[11px]">{p.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Estimate & Tags */}
          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/60">
            <FormField
              control={form.control}
              name="estimate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Estimate (Points / Hours)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 3 pts, 4h, 1d" className="h-9 text-xs bg-card" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Tags (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Frontend, API, Bug, Security" className="h-9 text-xs bg-card" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Due Date Option */}
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="border-t border-border/60 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FormLabel className="flex items-center gap-1.5 text-xs">
                    <CalendarIcon className="size-4 text-primary" />
                    <span>Target Due Date</span>
                  </FormLabel>
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setRelativeDate(0)}
                      className="rounded-md border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeDate(1)}
                      className="rounded-md border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeDate(7)}
                      className="rounded-md border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      +1 Week
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "h-10 flex-1 justify-start font-normal text-left text-xs bg-card",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="size-4 text-muted-foreground" />
                          {field.value ? (
                            <span className="font-medium text-foreground">
                              {format(field.value, "EEEE, MMMM d, yyyy")}
                            </span>
                          ) : (
                            <span>Pick a date from calendar</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={(d) => {
                          field.onChange(d ?? null);
                          setDateOpen(false);
                        }}
                        initialFocus
                        className="pointer-events-auto p-3"
                      />
                    </PopoverContent>
                  </Popover>

                  {field.value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-10 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Clear due date"
                      onClick={() => field.onChange(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {onDelete && initial && (
              <DeleteConfirmationDialog
                taskTitle={initial.title}
                onConfirm={onDelete}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-destructive hover:bg-danger-soft sm:w-auto"
                  >
                    <Trash2 className="size-4" /> Delete Task
                  </Button>
                }
              />
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="shadow-sm shadow-primary/25">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "Saving changes…" : submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
