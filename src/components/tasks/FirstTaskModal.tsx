import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, Rocket, Target, FileText, Plus, CheckCircle2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useTasks } from "@/context/TaskContext";
import { toast } from "sonner";
import type { TaskPriority } from "@/types";

export function FirstTaskModal() {
  const { user } = useAuth();
  const { tasks, createTask, state } = useTasks();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("high");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user || state !== "ready") return;

    // Check if the user is a non-default user ID or has 0 tasks
    const isDefaultDemo = user.id === "user-om" || user.username.toLowerCase() === "omthakkar";
    
    // Check flags for new login or first time onboarding
    const newLoginTrigger = typeof window !== "undefined" && sessionStorage.getItem("taskflow:new_login_trigger") === user.id;
    const modalFlag = typeof window !== "undefined" && localStorage.getItem(`taskflow:show_first_task_modal:${user.id}`) === "true";
    const dismissed = typeof window !== "undefined" && localStorage.getItem(`taskflow:first_task_dismissed:${user.id}`) === "true";

    // Show popup when:
    // 1) New login trigger or explicit flag is set AND tasks are empty (or user is new ID)
    // 2) OR it's a non-default user with 0 tasks who hasn't dismissed yet
    if ((newLoginTrigger || modalFlag) || (!isDefaultDemo && tasks.length === 0 && !dismissed)) {
      setOpen(true);
    }
  }, [user, state, tasks.length]);

  const handleClose = () => {
    setOpen(false);
    if (user) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("taskflow:new_login_trigger");
        localStorage.removeItem(`taskflow:show_first_task_modal:${user.id}`);
        localStorage.setItem(`taskflow:first_task_dismissed:${user.id}`, "true");
      }
    }
  };

  const handleCreateQuickTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = taskTitle.trim();
    if (!trimmed) {
      toast.error("Please enter a title for your first task! 🎯");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTask({
        title: trimmed,
        description: "My first task in TaskFlow 🎯 Kickstarting workspace productivity! ✨",
        priority,
        status: "pending",
        dueDate: null,
      });

      toast.success("🎉 Woohoo! Your first task was created! 🚀", {
        description: "Great job! Your workspace is officially up and running ✨",
      });
      handleClose();
    } catch {
      toast.error("Could not create task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToFullForm = () => {
    handleClose();
    navigate({ to: "/tasks/new" });
  };

  if (!user) return null;

  const firstName = user.fullName ? user.fullName.split(" ")[0] : user.username;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-border/60 bg-gradient-to-b from-card to-card/95 shadow-2xl rounded-2xl">
        {/* Glow Header Accent */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary/15 via-primary/10 to-chart-2/15 p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <span className="text-2xl animate-bounce">🚀</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                <span>✨ Welcome Aboard</span>
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-0.5">
                Make Your First Task! 🎯
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Hey <span className="font-semibold text-foreground">{firstName}</span>! 👋 Your workspace is clean and empty with 0 tasks assigned. Let's make your very first task right now to get in flow! 💫
          </DialogDescription>
        </div>

        {/* Quick Task Creation Section */}
        <div className="p-6 space-y-4">
          <form onSubmit={handleCreateQuickTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="first-task-title" className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>📝 Task Title</span>
                <span className="text-[11px] text-muted-foreground font-normal">What's on your agenda?</span>
              </Label>
              <Input
                id="first-task-title"
                placeholder="e.g. Complete project setup 🚀 or Review priorities 🎯"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="h-11 text-sm bg-background border-border/80 focus-visible:ring-primary shadow-inner"
                autoFocus
              />
            </div>

            {/* Priority Selector with Emojis */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                ⚡ Priority Level
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority("high")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    priority === "high"
                      ? "bg-destructive/10 border-destructive text-destructive shadow-sm"
                      : "bg-muted/40 border-transparent hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <span>🔥</span> High
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("medium")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    priority === "medium"
                      ? "bg-primary/10 border-primary text-primary shadow-sm"
                      : "bg-muted/40 border-transparent hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <span>⚡</span> Medium
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("low")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    priority === "low"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "bg-muted/40 border-transparent hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <span>🌱</span> Low
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 font-semibold text-sm shadow-md shadow-primary/25 transition-transform active:scale-[0.99]"
              >
                <Sparkles className="size-4 mr-2" />
                {isSubmitting ? "Creating Task..." : "✨ Create Your First Task 🚀"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoToFullForm}
                className="w-full h-9 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <FileText className="size-3.5 mr-1.5" />
                Open Full Task Creator (Add Due Date & Details)
              </Button>
            </div>
          </form>

          {/* Dismiss button */}
          <div className="text-center pt-1 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
            >
              Maybe later, let me explore the workspace 👋
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
