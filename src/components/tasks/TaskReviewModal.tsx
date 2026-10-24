import { useState } from "react";
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
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  User,
} from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Task, TaskReviewInput } from "@/types";

interface TaskReviewModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TaskReviewModal({
  task,
  open,
  onOpenChange,
  onSuccess,
}: TaskReviewModalProps) {
  const { submitTaskReview } = useTasks();
  const { user } = useAuth();

  const [decision, setDecision] = useState<"approved" | "changes_requested">("approved");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!task) return null;

  const latestUpdate = task.latestProgress || (task.progressUpdates && task.progressUpdates[0]);

  // Self-approval restriction check
  const isAssignee = user && (user.id === task.assignee?.id || user.id === task.assigneeId);
  const isWorkspaceLeaderOrAdmin = user?.role === "leader" || user?.role === "admin" || user?.id === "user-om";

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (decision === "changes_requested" && !feedback.trim()) {
      setError("Please provide written feedback explaining what changes or clarifications are needed.");
      return;
    }

    if (isAssignee && !isWorkspaceLeaderOrAdmin && decision === "approved") {
      setError("Self-approval is not permitted. An independent team leader or reviewer must approve this submission.");
      return;
    }

    setIsSubmitting(true);
    try {
      const input: TaskReviewInput = {
        decision,
        feedback: feedback.trim() || undefined,
        progressUpdateId: latestUpdate?.id,
      };

      await submitTaskReview(task.id, input);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Task review failed:", err);
      setError(err?.message || "Failed to submit review decision.");
      toast.error(err?.message || "Review submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-mono text-xs">
            <ShieldCheck className="size-4" />
            <span>{task.identifier || `TASK-${task.id.slice(0, 8)}`}</span>
            {task.projectName && (
              <span className="text-muted-foreground">· {task.projectName}</span>
            )}
          </div>
          <DialogTitle className="text-lg font-bold">Review Task Submission</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Evaluate completed deliverables, inspect submitted evidence, and approve the task or
            request specific revisions.
          </DialogDescription>
        </DialogHeader>

        {/* Task & Assignee Summary Box */}
        <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2.5 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold text-foreground text-sm block">{task.title}</span>
              <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <User className="size-3" /> Assignee: {task.assignee?.name || "Team Member"}
                </span>
                {task.dueDate && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> Due: {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 font-mono font-bold text-primary text-sm">
                <TrendingUp className="size-3.5" />
                {task.progressPercent ?? 100}%
              </span>
            </div>
          </div>

          {/* Submission inspection */}
          {latestUpdate ? (
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Latest Submitted Work:</span>
                <span>{new Date(latestUpdate.createdAt).toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-card border border-input text-xs space-y-1.5">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {latestUpdate.workCompleted}
                </p>
                {latestUpdate.workRemaining && (
                  <div className="pt-1 border-t text-[11px] text-muted-foreground">
                    <span className="font-semibold">Remaining: </span>
                    {latestUpdate.workRemaining}
                  </div>
                )}
                {latestUpdate.evidenceUrl && (
                  <div className="pt-1 border-t text-[11px]">
                    <a
                      href={latestUpdate.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-mono"
                    >
                      <ExternalLink className="size-3" /> View Work Evidence / PR
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-card border border-input text-xs text-muted-foreground">
              No formal progress submission recorded. Reviewing current task state.
            </div>
          )}
        </div>

        <form onSubmit={handleDecisionSubmit} className="space-y-4 py-1">
          {/* Decision Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Review Decision</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision("approved")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${
                  decision === "approved"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/30 font-semibold"
                    : "border-input bg-card/60 text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <CheckCircle2 className="size-5 text-emerald-600" />
                <span className="text-xs font-bold">Approve Task</span>
                <span className="text-[10px] opacity-80">Marks task completed & verified</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision("changes_requested")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${
                  decision === "changes_requested"
                    ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/30 font-semibold"
                    : "border-input bg-card/60 text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <RotateCcw className="size-5 text-amber-600" />
                <span className="text-xs font-bold">Request Changes</span>
                <span className="text-[10px] opacity-80">Sends back to In Progress with notes</span>
              </button>
            </div>
          </div>

          {/* Feedback Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="reviewFeedback" className="text-xs font-semibold">
                Written Reviewer Feedback {decision === "changes_requested" && <span className="text-rose-500">*</span>}
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {decision === "changes_requested" ? "Required" : "Optional comments / congratulations"}
              </span>
            </div>
            <textarea
              id="reviewFeedback"
              rows={3}
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (error) setError("");
              }}
              placeholder={
                decision === "changes_requested"
                  ? "Describe precisely what changes, tests, or clarifications are required before approval..."
                  : "Great work! Meets all acceptance criteria..."
              }
              className={`w-full text-xs rounded-xl border p-2.5 bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden ${
                error ? "border-rose-500 ring-rose-500" : "border-input"
              }`}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
              className={`cursor-pointer text-xs font-semibold gap-1.5 ${
                decision === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
            >
              {isSubmitting ? (
                "Submitting Review..."
              ) : decision === "approved" ? (
                <>
                  <CheckCircle2 className="size-3.5" /> Approve & Mark Complete
                </>
              ) : (
                <>
                  <RotateCcw className="size-3.5" /> Request Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
