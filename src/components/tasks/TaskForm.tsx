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
  Loader2,
  Minus,
  Sparkles,
  Timer,
  Trash2,
  X,
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
  status: z.enum(["pending", "in_progress", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.date().nullable(),
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
  const [dateOpen, setDateOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(taskSchema),
    values: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      status: initial?.status ?? "pending",
      priority: initial?.priority ?? "medium",
      dueDate: initial?.dueDate ? new Date(initial.dueDate) : null,
    },
  });

  const submitting = form.formState.isSubmitting;
  const desc = form.watch("description");

  const handle = form.handleSubmit(async (v) => {
    let due: string | null = null;
    if (v.dueDate) {
      const d = new Date(v.dueDate);
      d.setHours(12, 0, 0, 0); // midday avoids timezone day-shift
      due = d.toISOString();
    }
    await onSubmit({
      title: v.title,
      description: v.description,
      status: v.status,
      priority: v.priority,
      dueDate: due,
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
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Title <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Write API documentation"
                  maxLength={TITLE_MAX + 20}
                  className="h-10"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Add details, context, or acceptance criteria…"
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

        {/* Status, Priority & Due Date Options */}
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
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { value: "pending", label: "Pending", icon: Circle, activeCls: "border-warning bg-warning-soft text-warning ring-1 ring-warning" },
                          { value: "in_progress", label: "In Progress", icon: Timer, activeCls: "border-info bg-info-soft text-info ring-1 ring-info" },
                          { value: "completed", label: "Completed", icon: CheckCircle2, activeCls: "border-success bg-success-soft text-success ring-1 ring-success" },
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
                              "flex flex-col items-center justify-center gap-1 rounded-lg border py-2.5 px-2 text-xs font-semibold transition-all",
                              isSelected
                                ? cn(s.activeCls, "shadow-sm")
                                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <Icon className="size-4" />
                            <span className="truncate">{s.label}</span>
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
                              "flex flex-col items-center justify-center gap-1 rounded-lg border py-2.5 px-2 text-xs font-semibold transition-all",
                              isSelected
                                ? cn(p.activeCls, "shadow-sm")
                                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <Icon className="size-4" />
                            <span className="truncate">{p.label}</span>
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

          {/* Pick Up / Due Date Option */}
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="border-t border-border/60 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FormLabel className="flex items-center gap-1.5">
                    <CalendarIcon className="size-4 text-primary" />
                    <span>Pick Due Date</span>
                  </FormLabel>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground hidden sm:inline">Quick presets:</span>
                    <button
                      type="button"
                      onClick={() => setRelativeDate(0)}
                      className="rounded-md border bg-card px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeDate(1)}
                      className="rounded-md border bg-card px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeDate(7)}
                      className="rounded-md border bg-card px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                            "h-10 flex-1 justify-start font-normal text-left",
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
                      <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
                        <span className="font-semibold text-foreground">Select deadline date</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setRelativeDate(0)}
                            className="rounded px-1.5 py-0.5 text-xs text-primary hover:bg-muted"
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => setRelativeDate(1)}
                            className="rounded px-1.5 py-0.5 text-xs text-primary hover:bg-muted"
                          >
                            Tomorrow
                          </button>
                        </div>
                      </div>
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

                <FormDescription className="text-xs">
                  {field.value
                    ? `Deadline set for ${format(field.value, "PPP")}. You can change or clear it anytime.`
                    : "Pick a date when this task needs to be completed."}
                </FormDescription>
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
