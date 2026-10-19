import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Task, TaskInput } from "@/types";

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 1000;

export const taskSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`),
  description: z.string().trim().max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`),
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
}: {
  initial?: Task;
  submitLabel: string;
  onSubmit: (data: TaskInput) => Promise<void>;
  onCancel: () => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
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
    await onSubmit({ title: v.title, description: v.description, status: v.status, priority: v.priority, dueDate: due });
  });

  return (
    <Form {...form}>
      <form onSubmit={handle} className="space-y-6 rounded-xl border bg-card p-5 shadow-card sm:p-6" noValidate>
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
            <FormControl><Input placeholder="e.g. Write API documentation" maxLength={TITLE_MAX + 20} className="h-10" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl><Textarea rows={5} placeholder="Add details, context or acceptance criteria…" {...field} /></FormControl>
            <div className="flex justify-between gap-2">
              <FormMessage />
              <FormDescription className={cn("ml-auto text-xs", desc.length > DESCRIPTION_MAX && "text-destructive")}>
                {desc.length}/{DESCRIPTION_MAX}
              </FormDescription>
            </div>
          </FormItem>
        )} />
        <div className="grid gap-6 sm:grid-cols-3">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="priority" render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="dueDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Due date</FormLabel>
              <div className="flex gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn("h-10 flex-1 justify-start font-normal", !field.value && "text-muted-foreground")}>
                        <CalendarIcon className="size-4" />
                        {field.value ? format(field.value, "MMM d, yyyy") : "Pick a date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value ?? undefined} onSelect={(d) => field.onChange(d ?? null)} initialFocus className="pointer-events-auto p-3" />
                  </PopoverContent>
                </Popover>
                {field.value && (
                  <Button type="button" variant="ghost" size="icon" className="size-10" aria-label="Clear due date" onClick={() => field.onChange(null)}>
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
