import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  CheckSquare,
  Clock,
  Flame,
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  User,
  Sparkles,
} from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { useTheme } from "@/context/ThemeContext";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { tasks, lists, setActiveFilter } = useTasks();
  const { setTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (cmd: () => void) => {
    cmd();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-background/80 backdrop-blur-sm p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full">
          <div className="flex items-center border-b px-4 py-3 gap-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Type a command or search tasks..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground border">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 text-sm">
            <Command.Empty className="p-4 text-center text-xs text-muted-foreground">
              No matching tasks or commands found.
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group
              heading="Actions"
              className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
            >
              <Command.Item
                onSelect={() => runCommand(() => navigate({ to: "/tasks/new" }))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted text-foreground aria-selected:bg-muted"
              >
                <Plus className="size-4 text-primary" />
                <span>Create New Task</span>
              </Command.Item>
            </Command.Group>

            {/* Navigation & Smart Views */}
            <Command.Group
              heading="Views"
              className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
            >
              <Command.Item
                onSelect={() =>
                  runCommand(() => {
                    setActiveFilter("my-day");
                    navigate({ to: "/tasks" });
                  })
                }
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted text-foreground aria-selected:bg-muted"
              >
                <Sparkles className="size-4 text-amber-500" />
                <span>My Day</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runCommand(() => {
                    setActiveFilter("upcoming");
                    navigate({ to: "/tasks" });
                  })
                }
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted text-foreground aria-selected:bg-muted"
              >
                <Clock className="size-4 text-blue-500" />
                <span>Upcoming</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runCommand(() => {
                    setActiveFilter("overdue");
                    navigate({ to: "/tasks" });
                  })
                }
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted text-foreground aria-selected:bg-muted"
              >
                <Clock className="size-4 text-rose-500" />
                <span>Overdue</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runCommand(() => {
                    setActiveFilter("calendar");
                    navigate({ to: "/tasks" });
                  })
                }
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted text-foreground aria-selected:bg-muted"
              >
                <Calendar className="size-4 text-purple-500" />
                <span>Calendar View</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runCommand(() => {
                    setActiveFilter("all");
                    navigate({ to: "/tasks" });
                  })
                }
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted text-foreground aria-selected:bg-muted"
              >
                <CheckSquare className="size-4 text-primary" />
                <span>All Tasks</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate({ to: "/dashboard" }))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted text-foreground aria-selected:bg-muted"
              >
                <LayoutDashboard className="size-4 text-emerald-500" />
                <span>Dashboard & Insights</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runCommand(() => {
                    setActiveFilter("trash");
                    navigate({ to: "/tasks" });
                  })
                }
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted text-foreground aria-selected:bg-muted"
              >
                <Trash2 className="size-4 text-rose-400" />
                <span>Trash</span>
              </Command.Item>
            </Command.Group>

            {/* Task Lists */}
            {lists.length > 0 && (
              <Command.Group
                heading="Lists"
                className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {lists.map((list) => (
                  <Command.Item
                    key={list.id}
                    onSelect={() =>
                      runCommand(() => {
                        setActiveFilter(list.id);
                        navigate({ to: "/tasks" });
                      })
                    }
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted text-foreground aria-selected:bg-muted"
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: list.color }}
                    />
                    <span>{list.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Tasks search results */}
            <Command.Group
              heading="Tasks"
              className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
            >
              {tasks
                .filter((t) => !t.isTrash)
                .slice(0, 15)
                .map((task) => (
                  <Command.Item
                    key={task.id}
                    value={task.title}
                    onSelect={() =>
                      runCommand(() =>
                        navigate({
                          to: "/tasks/$id",
                          params: { id: task.id },
                        }),
                      )
                    }
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted text-foreground aria-selected:bg-muted"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`size-2 rounded-full shrink-0 ${
                          task.status === "completed"
                            ? "bg-emerald-500"
                            : task.priority === "high"
                              ? "bg-rose-500"
                              : "bg-amber-500"
                        }`}
                      />
                      <span className="truncate">{task.title}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold shrink-0">
                      {task.status.replace("_", " ")}
                    </span>
                  </Command.Item>
                ))}
            </Command.Group>

            {/* Preferences */}
            <Command.Group
              heading="Preferences"
              className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
            >
              <Command.Item
                onSelect={() => runCommand(() => setTheme("light"))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted text-foreground aria-selected:bg-muted"
              >
                <Sun className="size-4 text-amber-500" />
                <span>Set Light Theme</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => setTheme("dark"))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted text-foreground aria-selected:bg-muted"
              >
                <Moon className="size-4 text-primary" />
                <span>Set Dark Theme</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
