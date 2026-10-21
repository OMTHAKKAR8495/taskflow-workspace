import { useState, useMemo } from "react";
import { Plus, Calendar, AlertCircle, Tag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/context/TaskContext";
import { toast } from "sonner";
import type { TaskPriority } from "@/types";

interface ParsedTokens {
  cleanTitle: string;
  priority: TaskPriority;
  dueDate: string | null;
  dateLabel: string | null;
  listName: string | null;
  tags: string[];
}

export function parseQuickInput(input: string): ParsedTokens {
  let text = input;
  let priority: TaskPriority = "medium";
  let dueDate: string | null = null;
  let dateLabel: string | null = null;
  let listName: string | null = null;
  const tags: string[] = [];

  // Parse priority: !high, !medium, !low, !urgent
  const prioMatch = text.match(/!(high|urgent|medium|low)\b/i);
  if (prioMatch && prioMatch[1]) {
    const p = prioMatch[1].toLowerCase();
    if (p === "high" || p === "urgent") priority = "high";
    else if (p === "low") priority = "low";
    else priority = "medium";
    text = text.replace(prioMatch[0], "");
  }

  // Parse tag/list: #list or #tag
  const tagMatches = text.matchAll(/#([a-zA-Z0-9_-]+)/g);
  for (const m of tagMatches) {
    if (m[1]) {
      if (!listName) listName = m[1];
      tags.push(m[1]);
    }
  }
  text = text.replace(/#([a-zA-Z0-9_-]+)/g, "");

  // Parse relative date keywords
  const lower = text.toLowerCase();
  const now = new Date();

  if (/\b(today|tonight)\b/i.test(lower)) {
    const d = new Date(now);
    d.setHours(18, 0, 0, 0);
    dueDate = d.toISOString();
    dateLabel = "Today";
    text = text.replace(/\b(today|tonight)\b/i, "");
  } else if (/\btomorrow\b/i.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(12, 0, 0, 0);
    dueDate = d.toISOString();
    dateLabel = "Tomorrow";
    text = text.replace(/\btomorrow\b/i, "");
  } else if (/\bnext week\b/i.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    d.setHours(12, 0, 0, 0);
    dueDate = d.toISOString();
    dateLabel = "Next Week";
    text = text.replace(/\bnext week\b/i, "");
  } else if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(lower)) {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const match = lower.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    if (match && match[1]) {
      const targetDay = days.indexOf(match[1].toLowerCase());
      const currentDay = now.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7;
      const d = new Date(now);
      d.setDate(d.getDate() + diff);
      d.setHours(12, 0, 0, 0);
      dueDate = d.toISOString();
      dateLabel = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      text = text.replace(new RegExp(`\\b${match[1]}\\b`, "i"), "");
    }
  }

  // Parse time like 5pm, 10am
  const timeMatch = text.match(/\b([1-9]|1[0-2])(am|pm)\b/i);
  if (timeMatch && timeMatch[1] && timeMatch[2]) {
    let hour = parseInt(timeMatch[1], 10);
    const meridiem = timeMatch[2].toLowerCase();
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    const d = dueDate ? new Date(dueDate) : new Date(now);
    d.setHours(hour, 0, 0, 0);
    dueDate = d.toISOString();
    if (!dateLabel) dateLabel = `${timeMatch[0].toUpperCase()}`;
    else dateLabel += ` at ${timeMatch[0].toUpperCase()}`;
    text = text.replace(timeMatch[0], "");
  }

  return {
    cleanTitle: text.trim().replace(/\s+/g, " "),
    priority,
    dueDate,
    dateLabel,
    listName,
    tags,
  };
}

export function SmartQuickAdd() {
  const { createTask, lists } = useTasks();
  const [rawText, setRawText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsed = useMemo(() => parseQuickInput(rawText), [rawText]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!parsed.cleanTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Find matching list
      let matchedListId: string | undefined = undefined;
      let matchedListName: string | undefined = undefined;
      let matchedListColor: string | undefined = undefined;

      if (parsed.listName) {
        const found = lists.find((l) => l.name.toLowerCase() === parsed.listName?.toLowerCase());
        if (found) {
          matchedListId = found.id;
          matchedListName = found.name;
          matchedListColor = found.color;
        } else {
          matchedListName = parsed.listName;
          matchedListColor = "#6366f1";
        }
      }

      await createTask({
        title: parsed.cleanTitle,
        description: "",
        status: "pending",
        priority: parsed.priority,
        dueDate: parsed.dueDate,
        listId: matchedListId,
        listName: matchedListName,
        listColor: matchedListColor,
        tags: parsed.tags.length > 0 ? parsed.tags : ["General"],
        estimate: "1 pt",
      });

      toast.success("Task created!", {
        description: parsed.cleanTitle,
      });
      setRawText("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasTokens =
    parsed.dateLabel || parsed.priority !== "medium" || parsed.listName || parsed.tags.length > 0;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 bg-card shadow-sm ${
        isFocused
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "border-border hover:border-primary/50"
      }`}
    >
      <form onSubmit={handleSubmit} className="p-2 sm:p-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Plus className="size-4" />
          </div>
          <input
            type="text"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Smart Quick-Add: 'Buy milk tomorrow 5pm !high #groceries'..."
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground outline-none text-foreground font-medium"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!parsed.cleanTitle.trim() || isSubmitting}
            className="h-8 gap-1.5 px-3 text-xs font-semibold rounded-lg shrink-0 cursor-pointer shadow-sm"
          >
            <Sparkles className="size-3.5" />
            <span>Add</span>
          </Button>
        </div>

        {/* Live NLP Chip Row Preview */}
        {rawText.trim() && hasTokens && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 mt-2 border-t border-border/50 text-[11px] animate-in fade-in-50 duration-200">
            <span className="text-muted-foreground font-medium mr-1">Preview:</span>
            {parsed.cleanTitle && (
              <span className="font-semibold text-foreground truncate max-w-[200px]">
                "{parsed.cleanTitle}"
              </span>
            )}
            {parsed.dateLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 font-medium border border-blue-500/20">
                <Calendar className="size-3" />
                <span>{parsed.dateLabel}</span>
              </span>
            )}
            {parsed.priority && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium border capitalize ${
                  parsed.priority === "high"
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                    : parsed.priority === "low"
                      ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                }`}
              >
                <AlertCircle className="size-3" />
                <span>{parsed.priority} priority</span>
              </span>
            )}
            {parsed.listName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2 py-0.5 font-medium border border-purple-500/20">
                <Tag className="size-3" />
                <span>#{parsed.listName}</span>
              </span>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
