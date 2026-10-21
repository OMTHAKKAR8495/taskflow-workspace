import { Kanban, LayoutGrid, List, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTasks } from "@/context/TaskContext";
import type { SortKey, TaskFilterState, TaskPriority, TaskStatus } from "@/types";

export type ViewMode = "kanban" | "list" | "grid";

export function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1 sm:min-w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        aria-label="Search tasks"
        placeholder="Search title, description, project, assignee…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 bg-card pl-9"
      />
    </div>
  );
}

export function TaskFilters({
  filters,
  onChange,
  onClear,
  view,
  onViewChange,
}: {
  filters: TaskFilterState;
  onChange: (f: TaskFilterState) => void;
  onClear: () => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
}) {
  const { projects, team } = useTasks();

  const active =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.projectId !== "all" ||
    filters.assigneeId !== "all" ||
    Boolean(filters.bookmarkedOnly);

  return (
    <div className="mb-5 flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput value={filters.search} onChange={(search) => onChange({ ...filters, search })} />

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && onViewChange(v as ViewMode)}
            className="rounded-md border bg-card p-0.5 shadow-2xs"
          >
            <ToggleGroupItem value="kanban" aria-label="Kanban board view" className="flex items-center gap-1.5 px-2.5 h-8 text-xs font-medium">
              <Kanban className="size-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List table view" className="flex items-center gap-1.5 px-2.5 h-8 text-xs font-medium">
              <List className="size-3.5" />
              <span className="hidden sm:inline">List</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view" className="flex items-center gap-1.5 px-2.5 h-8 text-xs font-medium">
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </ToggleGroupItem>
          </ToggleGroup>

          {active && (
            <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground text-xs h-9">
              <X className="size-3.5" /> Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Filter Selectors Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Project Filter */}
        <Select
          value={filters.projectId || "all"}
          onValueChange={(v) => onChange({ ...filters, projectId: v })}
        >
          <SelectTrigger className="h-9 bg-card sm:w-44 text-xs font-medium" aria-label="Filter by project">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📁 All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assignee Filter */}
        <Select
          value={filters.assigneeId || "all"}
          onValueChange={(v) => onChange({ ...filters, assigneeId: v })}
        >
          <SelectTrigger className="h-9 bg-card sm:w-40 text-xs font-medium" aria-label="Filter by assignee">
            <SelectValue placeholder="All Assignees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">👥 All Assignees</SelectItem>
            <SelectItem value="unassigned">👤 Unassigned</SelectItem>
            {team.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(v) => onChange({ ...filters, status: v as TaskStatus | "all" })}
        >
          <SelectTrigger className="h-9 bg-card sm:w-36 text-xs font-medium" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Backlog / To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select
          value={filters.priority}
          onValueChange={(v) => onChange({ ...filters, priority: v as TaskPriority | "all" })}
        >
          <SelectTrigger className="h-9 bg-card sm:w-32 text-xs font-medium" aria-label="Filter by priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Filter */}
        <Select
          value={filters.sort}
          onValueChange={(v) => onChange({ ...filters, sort: v as SortKey })}
        >
          <SelectTrigger className="h-9 bg-card sm:w-36 text-xs font-medium" aria-label="Sort tasks">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dueDate">Due date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="createdAt">Newest</SelectItem>
          </SelectContent>
        </Select>

        {/* Bookmarked Filter */}
        <Button
          type="button"
          variant={filters.bookmarkedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ ...filters, bookmarkedOnly: !filters.bookmarkedOnly })}
          className="h-9 text-xs font-medium"
        >
          ★ Bookmarked
        </Button>
      </div>
    </div>
  );
}
