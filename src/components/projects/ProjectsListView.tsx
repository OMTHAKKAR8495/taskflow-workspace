import { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Archive,
  MoreVertical,
  Calendar,
  Users,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project, TaskPriority } from "@/types";

export function ProjectsListView() {
  const { projects, createProject, archiveProject, deleteProject } = useTasks();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#4f46e5");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [lead, setLead] = useState("Om Thakkar");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter === "archived") {
        if (p.status !== "archived") return false;
      } else if (statusFilter !== "all") {
        if (p.status === "archived") return false;
        if (p.status !== statusFilter && statusFilter !== "active") return false;
      } else {
        if (p.status === "archived") return false;
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.key.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.lead.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projects, statusFilter, search]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!key || key.length <= 4) {
      const generated = val
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 5);
      if (generated) setKey(generated);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;

    setIsSubmitting(true);
    try {
      const p = await createProject({
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim(),
        color,
        priority,
        health: "on_track",
        lead: lead.trim(),
        startDate: startDate ? new Date(startDate).toISOString() : null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      setCreateModalOpen(false);
      setName("");
      setKey("");
      setDescription("");
      navigate({ to: "/projects/$id", params: { id: p.id } });
    } catch {
      // Error handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = projects.filter((p) => p.status !== "archived" && p.status !== "completed").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;
  const atRiskCount = projects.filter((p) => p.health === "at_risk" || p.health === "delayed").length;

  return (
    <div className="space-y-6">
      {/* Portfolio Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects Portfolio</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              {projects.length} Total
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your organization's projects, roadmaps, deliverables, and team allocation.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="gap-2 cursor-pointer shadow-sm shadow-primary/25"
        >
          <Plus className="size-4" /> New Project
        </Button>
      </div>

      {/* Portfolio KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Active Projects</span>
            <FolderKanban className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{activeCount}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">Currently in flight</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Projects at Risk</span>
            <AlertTriangle className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {atRiskCount}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Require attention</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Completed Projects</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {completedCount}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Successfully delivered</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects by name, key, or lead..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-card pl-9 pr-3 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1 text-xs">
            {["active", "completed", "archived", "all"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1 font-medium capitalize transition-all cursor-pointer ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center bg-card/40">
          <FolderKanban className="mx-auto size-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No projects found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            {search
              ? "No projects match your search criteria. Try a different query."
              : "Create your first project to organize tasks, assign members, and track delivery milestones."}
          </p>
          {!search && (
            <Button onClick={() => setCreateModalOpen(true)} className="mt-4 gap-2 text-xs">
              <Plus className="size-3.5" /> Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((p) => {
            const isAtRisk = p.health === "at_risk" || p.health === "delayed";
            const progress = p.progress || 0;

            return (
              <div
                key={p.id}
                className="group flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="size-3 rounded-full shrink-0"
                        style={{ backgroundColor: p.color || "#4f46e5" }}
                      />
                      <span className="font-mono text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {p.key}
                      </span>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        <Link to="/projects/$id" params={{ id: p.id }}>
                          {p.name}
                        </Link>
                      </h3>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7 cursor-pointer">
                          <MoreVertical className="size-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem asChild>
                          <Link to="/projects/$id" params={{ id: p.id }} className="cursor-pointer">
                            Open Workspace
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => archiveProject(p.id)} className="cursor-pointer">
                          {p.status === "archived" ? "Restore Project" : "Archive Project"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm(`Delete project "${p.name}"?`)) deleteProject(p.id);
                          }}
                          className="text-rose-500 cursor-pointer"
                        >
                          Delete Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="mt-2.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {p.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-5 space-y-3.5 pt-3 border-t">
                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Progress</span>
                      <span className="font-semibold text-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>

                  {/* Metadata pills */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-semibold ${
                          p.health === "at_risk"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : p.health === "delayed"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        }`}
                      >
                        {(p.health || "on_track").replace("_", " ")}
                      </Badge>
                      <span className="text-muted-foreground text-[11px]">
                        {p.taskCount || 0} tasks
                      </span>
                    </div>

                    <Link
                      to="/projects/$id"
                      params={{ id: p.id }}
                      className="inline-flex items-center text-xs font-medium text-primary hover:underline gap-1 cursor-pointer"
                    >
                      Workspace <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Project Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new project to your workspace with a unique key, lead, and delivery timeline.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProject} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Project Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. NextGen Microservices"
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Project Key *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  placeholder="e.g. NEX"
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 font-mono text-xs uppercase focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Core objectives and scope of this initiative..."
                className="w-full rounded-lg border border-input bg-card p-2 text-xs focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Project Lead</label>
                <input
                  type="text"
                  value={lead}
                  onChange={(e) => setLead(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Theme Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="size-9 rounded-lg border border-input p-1 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{color}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="cursor-pointer text-xs">
                {isSubmitting ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
