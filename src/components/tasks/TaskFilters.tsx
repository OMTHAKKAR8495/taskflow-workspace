import { LayoutGrid, List, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SortKey, TaskFilterState, TaskPriority, TaskStatus } from "@/types";

export type ViewMode = "list" | "grid";

export function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1 sm:min-w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        aria-label="Search tasks"
        placeholder="Search title or description…"
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
  const active = filters.search !== "" || filters.status !== "all" || filters.priority !== "all";
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
      <SearchInput value={filters.search} onChange={(search) => onChange({ ...filters, search })} />
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v as TaskStatus | "all" })}>
          <SelectTrigger className="h-10 bg-card sm:w-36" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.priority} onValueChange={(v) => onChange({ ...filters, priority: v as TaskPriority | "all" })}>
          <SelectTrigger className="h-10 bg-card sm:w-36" aria-label="Filter by priority"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.sort} onValueChange={(v) => onChange({ ...filters, sort: v as SortKey })}>
          <SelectTrigger className="h-10 bg-card sm:w-44" aria-label="Sort tasks"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dueDate">Sort: Due date</SelectItem>
            <SelectItem value="priority">Sort: Priority</SelectItem>
            <SelectItem value="createdAt">Sort: Newest</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && onViewChange(v as ViewMode)} className="rounded-md border bg-card p-0.5">
            <ToggleGroupItem value="list" aria-label="List view" className="size-8"><List className="size-4" /></ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view" className="size-8"><LayoutGrid className="size-4" /></ToggleGroupItem>
          </ToggleGroup>
          {active && (
            <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
              <X className="size-4" /> Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
