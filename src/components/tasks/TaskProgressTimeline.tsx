import { useState, useEffect } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskStatusBadge } from "./badges";
import { ProgressUpdateModal } from "./ProgressUpdateModal";
import { TaskReviewModal } from "./TaskReviewModal";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import type { Task, TaskProgressUpdate, TaskReview } from "@/types";

interface TaskProgressTimelineProps {
  task: Task;
  onRefresh?: () => void;
  showActions?: boolean;
}

export function TaskProgressTimeline({
  task,
  onRefresh,
  showActions = true,
}: TaskProgressTimelineProps) {
  const { getTaskProgressUpdates, getTaskReviews } = useTasks();
  const { user } = useAuth();

  const [progressUpdates, setProgressUpdates] = useState<TaskProgressUpdate[]>(task.progressUpdates || []);
  const [reviews, setReviews] = useState<TaskReview[]>(task.reviews || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      setIsLoading(true);
      try {
        const [updates, revs] = await Promise.all([
          getTaskProgressUpdates(task.id),
          getTaskReviews(task.id),
        ]);
        if (isMounted) {
          setProgressUpdates(updates);
          setReviews(revs);
        }
      } catch (err) {
        console.error("Failed to load task history", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [task.id, task.progressPercent, task.status, getTaskProgressUpdates, getTaskReviews]);

  // Determine latest review
  const latestReview = reviews.length > 0 ? reviews[0] : null;

  // Permissions
  const isAssignee = user && (user.id === task.assignee?.id || user.id === task.assigneeId);
  const isLeaderOrAdmin = user?.role === "leader" || user?.role === "admin" || user?.id === "user-om";
  const canUpdateProgress = isAssignee || isLeaderOrAdmin;
  const canReview = isLeaderOrAdmin || (task.reviewerId && user?.id === task.reviewerId);

  return (
    <div className="space-y-4">
      {/* Latest Review Feedback Banner (if changes requested or approved) */}
      {latestReview && (
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            latestReview.decision === "changes_requested"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
          }`}
        >
          {latestReview.decision === "changes_requested" ? (
            <RotateCcw className="size-5 text-amber-600 mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 className="size-5 text-emerald-600 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold">
                {latestReview.decision === "changes_requested"
                  ? "Leader Feedback: Changes Requested"
                  : "Leader Approval"}
              </span>
              <span className="text-[10px] opacity-75">
                {new Date(latestReview.createdAt).toLocaleDateString()}
              </span>
            </div>
            {latestReview.feedback && (
              <p className="leading-relaxed opacity-90">{latestReview.feedback}</p>
            )}
            <div className="text-[11px] opacity-75 flex items-center gap-1 font-medium">
              <User className="size-3" /> Reviewed by {latestReview.reviewerName || "Team Leader"}
            </div>
          </div>
        </div>
      )}

      {/* Progress Metric & Action Bar */}
      <div className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Current Completion</span>
            <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
              {task.progressPercent ?? (task.status === "completed" ? 100 : 0)}%
            </span>
          </div>
          <TaskStatusBadge status={task.status} />
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              task.status === "completed"
                ? "bg-emerald-500"
                : task.status === "blocked"
                ? "bg-rose-500"
                : "bg-primary"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, task.progressPercent ?? 0))}%` }}
          />
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {canUpdateProgress && (
              <Button
                size="sm"
                variant="default"
                onClick={() => setIsUpdateModalOpen(true)}
                className="h-8 text-xs font-semibold cursor-pointer gap-1.5"
              >
                <TrendingUp className="size-3.5" />
                Update Daily Progress
              </Button>
            )}

            {canReview && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsReviewModalOpen(true)}
                className="h-8 text-xs font-semibold cursor-pointer gap-1.5 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
              >
                <ShieldCheck className="size-3.5" />
                Review Submission
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Timeline Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
            <History className="size-3.5" /> Progress & Review History
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">
            {progressUpdates.length} updates · {reviews.length} reviews
          </span>
        </div>

        {progressUpdates.length === 0 && reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground space-y-2">
            <p>No progress reports submitted yet for this task.</p>
            {canUpdateProgress && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUpdateModalOpen(true)}
                className="text-xs cursor-pointer"
              >
                Submit First Daily Progress
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-border/60">
            {progressUpdates.map((item) => (
              <div
                key={item.id}
                className="relative pl-8 text-xs space-y-1.5 group"
              >
                <div className="absolute left-1.5 top-1 size-3.5 rounded-full bg-primary/20 border-2 border-primary group-hover:scale-110 transition-transform" />
                <div className="rounded-xl border bg-card p-3 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <User className="size-3 text-muted-foreground" />
                      <span>{item.userName || "Team Member"}</span>
                      <span className="text-primary font-mono font-bold">
                        ({item.progressPercent}%)
                      </span>
                    </div>
                    <span className="text-[10px]">
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Completed */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Work Completed:
                    </span>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {item.workCompleted}
                    </p>
                  </div>

                  {/* Remaining */}
                  {item.workRemaining && (
                    <div className="space-y-0.5 pt-1 border-t border-border/40">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        Work Remaining:
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.workRemaining}
                      </p>
                    </div>
                  )}

                  {/* Blockers */}
                  {item.blockers && (
                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase flex items-center gap-1">
                        <AlertTriangle className="size-3" /> Reported Blocker:
                      </span>
                      <p className="leading-relaxed">{item.blockers}</p>
                    </div>
                  )}

                  {/* Next Steps & Time Spent & Evidence */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                    {item.timeSpentHours ? (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {item.timeSpentHours} hrs logged
                      </span>
                    ) : null}

                    {item.nextSteps && (
                      <span className="flex items-center gap-1">
                        <ArrowRight className="size-3 text-primary" /> Next: {item.nextSteps}
                      </span>
                    )}

                    {item.evidenceUrl && (
                      <a
                        href={item.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline font-mono ml-auto"
                      >
                        <ExternalLink className="size-3" /> View Evidence
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ProgressUpdateModal
        task={task}
        open={isUpdateModalOpen}
        onOpenChange={setIsUpdateModalOpen}
        onSuccess={() => {
          onRefresh?.();
        }}
      />

      <TaskReviewModal
        task={task}
        open={isReviewModalOpen}
        onOpenChange={setIsReviewModalOpen}
        onSuccess={() => {
          onRefresh?.();
        }}
      />
    </div>
  );
}
