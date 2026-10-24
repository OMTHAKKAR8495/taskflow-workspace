import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  Link2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { toast } from "sonner";
import type { Task, TaskProgressUpdateInput, TaskStatus } from "@/types";

interface ProgressUpdateModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProgressUpdateModal({
  task,
  open,
  onOpenChange,
  onSuccess,
}: ProgressUpdateModalProps) {
  const { submitProgressUpdate } = useTasks();

  const [status, setStatus] = useState<TaskStatus>("in_progress");
  const [progressPercent, setProgressPercent] = useState<number>(50);
  const [workCompleted, setWorkCompleted] = useState("");
  const [workRemaining, setWorkRemaining] = useState("");
  const [blockers, setBlockers] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [timeSpentHours, setTimeSpentHours] = useState<string>("1.0");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (task && open) {
      setStatus(task.status === "completed" ? "completed" : task.status || "in_progress");
      setProgressPercent(
        typeof task.progressPercent === "number"
          ? task.progressPercent
          : task.status === "completed"
          ? 100
          : 50,
      );
      setWorkCompleted("");
      setWorkRemaining("");
      setBlockers(task.blockedReason || "");
      setNextSteps("");
      setTimeSpentHours("1.0");
      setEvidenceUrl("");
      setErrors({});
    }
  }, [task, open]);

  // Adjust progress automatically when status changes
  const handleStatusChange = (newStatus: TaskStatus) => {
    setStatus(newStatus);
    if (newStatus === "completed") {
      setProgressPercent(100);
    } else if (newStatus === "in_review" && progressPercent < 80) {
      setProgressPercent(95);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!workCompleted.trim()) {
      newErrors.workCompleted = "Please describe the work you completed.";
    }
    if (status === "blocked" && !blockers.trim()) {
      newErrors.blockers = "Please specify the blocker or issue preventing progress.";
    }
    if (progressPercent < 0 || progressPercent > 100) {
      newErrors.progressPercent = "Progress percentage must be between 0% and 100%.";
    }
    const hoursNum = parseFloat(timeSpentHours);
    if (isNaN(hoursNum) || hoursNum < 0) {
      newErrors.timeSpentHours = "Please enter valid hours spent.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    if (!validate()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const input: TaskProgressUpdateInput = {
        status,
        progressPercent,
        workCompleted: workCompleted.trim(),
        workRemaining: workRemaining.trim() || undefined,
        blockers: blockers.trim() || undefined,
        nextSteps: nextSteps.trim() || undefined,
        timeSpentHours: parseFloat(timeSpentHours) || 0,
        evidenceUrl: evidenceUrl.trim() || undefined,
      };

      await submitProgressUpdate(task.id, input);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Progress update submission failed:", err);
      toast.error(err?.message || "Failed to submit progress update.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-mono text-xs">
            <TrendingUp className="size-4" />
            <span>{task.identifier || `TASK-${task.id.slice(0, 8)}`}</span>
            {task.projectName && (
              <span className="text-muted-foreground">· {task.projectName}</span>
            )}
          </div>
          <DialogTitle className="text-lg font-bold">Update Daily Progress</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground line-clamp-2">
            Record what you accomplished, what remains, and report any blockers. All updates
            are logged to the immutable task activity history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Status Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Current Status</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {[
                { val: "in_progress", label: "In Progress", color: "border-blue-500/30 text-blue-600 bg-blue-500/5" },
                { val: "in_review", label: "Submit Review", color: "border-purple-500/30 text-purple-600 bg-purple-500/5" },
                { val: "blocked", label: "Blocked", color: "border-rose-500/30 text-rose-600 bg-rose-500/5" },
                { val: "completed", label: "Completed", color: "border-emerald-500/30 text-emerald-600 bg-emerald-500/5" },
                { val: "pending", label: "To Do / Ready", color: "border-amber-500/30 text-amber-600 bg-amber-500/5" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => handleStatusChange(opt.val as TaskStatus)}
                  className={`text-xs font-medium py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                    status === opt.val
                      ? `${opt.color} ring-2 ring-primary/40 font-semibold shadow-xs`
                      : "border-input bg-card/60 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Progress Percentage Slider & Number */}
          <div className="space-y-2 rounded-xl border bg-muted/20 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-primary" />
                Progress Completion:
              </span>
              <span className="font-bold font-mono text-sm text-primary">
                {progressPercent}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progressPercent}
                onChange={(e) => setProgressPercent(parseInt(e.target.value, 10))}
                className="flex-1 accent-primary cursor-pointer"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={progressPercent}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setProgressPercent(Math.min(100, Math.max(0, val)));
                }}
                className="w-16 h-8 text-center text-xs font-mono rounded-lg border border-input bg-card"
              />
            </div>

            {/* Quick buttons */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-muted-foreground">Presets:</span>
              {[25, 50, 75, 90, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setProgressPercent(preset)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    progressPercent === preset
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-input hover:bg-muted"
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>

          {/* Work Completed (Required) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="workCompleted" className="text-xs font-semibold">
                What have you completed? <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[10px] text-muted-foreground">Required</span>
            </div>
            <textarea
              id="workCompleted"
              rows={3}
              value={workCompleted}
              onChange={(e) => {
                setWorkCompleted(e.target.value);
                if (errors.workCompleted) setErrors((prev) => ({ ...prev, workCompleted: "" }));
              }}
              placeholder="e.g. Implemented the responsive layout, added data validation tests, and connected the API endpoints..."
              className={`w-full text-xs rounded-xl border p-2.5 bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden ${
                errors.workCompleted ? "border-rose-500 ring-rose-500" : "border-input"
              }`}
            />
            {errors.workCompleted && (
              <p className="text-[11px] text-rose-500 font-medium">{errors.workCompleted}</p>
            )}
          </div>

          {/* Work Remaining */}
          <div className="space-y-1.5">
            <Label htmlFor="workRemaining" className="text-xs font-semibold">
              What remains to be done?
            </Label>
            <textarea
              id="workRemaining"
              rows={2}
              value={workRemaining}
              onChange={(e) => setWorkRemaining(e.target.value)}
              placeholder="e.g. Write edge case unit tests, verify dark mode contrast, prepare PR for review..."
              className="w-full text-xs rounded-xl border border-input p-2.5 bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
            />
          </div>

          {/* Blocker or Issue (Required if status is 'blocked') */}
          <div
            className={`space-y-1.5 p-3 rounded-xl border transition-all ${
              status === "blocked"
                ? "bg-rose-500/10 border-rose-500/30 ring-1 ring-rose-500/20"
                : "bg-muted/10 border-input"
            }`}
          >
            <div className="flex items-center justify-between">
              <Label
                htmlFor="blockers"
                className={`text-xs font-semibold flex items-center gap-1.5 ${
                  status === "blocked" ? "text-rose-600 dark:text-rose-400" : ""
                }`}
              >
                <AlertTriangle className="size-3.5" />
                Blockers or Difficulties {status === "blocked" && <span className="text-rose-500">*</span>}
              </Label>
              {status === "blocked" && (
                <span className="text-[10px] text-rose-600 font-semibold">Required for Blocked</span>
              )}
            </div>
            <textarea
              id="blockers"
              rows={2}
              value={blockers}
              onChange={(e) => {
                setBlockers(e.target.value);
                if (errors.blockers) setErrors((prev) => ({ ...prev, blockers: "" }));
              }}
              placeholder={
                status === "blocked"
                  ? "Describe specifically what is blocking you (e.g. waiting for API credentials, dependency failure, design clarification)..."
                  : "Optional: mention any potential issues or dependency delays..."
              }
              className={`w-full text-xs rounded-xl border p-2.5 bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden ${
                errors.blockers ? "border-rose-500" : "border-input"
              }`}
            />
            {errors.blockers && (
              <p className="text-[11px] text-rose-500 font-medium">{errors.blockers}</p>
            )}
          </div>

          {/* Next Steps & Time Spent Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nextSteps" className="text-xs font-semibold">
                Next Planned Steps
              </Label>
              <input
                id="nextSteps"
                type="text"
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                placeholder="e.g. Conduct integration testing"
                className="w-full h-9 text-xs rounded-lg border border-input px-3 bg-card text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timeSpentHours" className="text-xs font-semibold flex items-center gap-1">
                <Clock className="size-3 text-muted-foreground" />
                Time Spent on this update (Hours)
              </Label>
              <input
                id="timeSpentHours"
                type="number"
                step="0.5"
                min="0"
                value={timeSpentHours}
                onChange={(e) => setTimeSpentHours(e.target.value)}
                className="w-full h-9 text-xs font-mono rounded-lg border border-input px-3 bg-card text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Evidence / Work Link */}
          <div className="space-y-1.5">
            <Label htmlFor="evidenceUrl" className="text-xs font-semibold flex items-center gap-1.5">
              <Link2 className="size-3.5 text-muted-foreground" />
              Work Evidence or Deliverable Link (Optional)
            </Label>
            <input
              id="evidenceUrl"
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://github.com/.../pull/12 or Figma / Docs URL"
              className="w-full h-9 text-xs rounded-lg border border-input px-3 bg-card text-foreground font-mono focus:ring-1 focus:ring-primary"
            />
            <p className="text-[10px] text-muted-foreground">
              Provide a verifiable pull request, branch commit, design mockup, or staging preview.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="cursor-pointer text-xs font-semibold gap-1.5"
            >
              {isSubmitting ? (
                "Submitting..."
              ) : status === "in_review" ? (
                <>
                  <Eye className="size-3.5" /> Submit for Leader Review
                </>
              ) : (
                <>
                  <FileCheck2 className="size-3.5" /> Submit Progress Update
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
