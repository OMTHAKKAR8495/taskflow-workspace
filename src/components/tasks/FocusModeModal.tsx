import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { toast } from "sonner";
import type { Task } from "@/types";

interface FocusModeModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FocusModeModal({ task, open, onOpenChange }: FocusModeModalProps) {
  const { updateFocusTime, toggleTaskComplete } = useTasks();
  const [totalDuration, setTotalDuration] = useState(25 * 60); // 25 min default
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");
  const elapsedRef = useRef(0);

  useEffect(() => {
    setTimeLeft(totalDuration);
    setIsRunning(false);
    elapsedRef.current = 0;
  }, [totalDuration, open]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        if (mode === "work") {
          elapsedRef.current += 1;
        }
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (mode === "work") {
        toast.success("Pomodoro session completed! Take a 5-minute break.");
        if (task) {
          void updateFocusTime(task.id, elapsedRef.current);
          elapsedRef.current = 0;
        }
        setMode("break");
        setTotalDuration(5 * 60);
      } else {
        toast.info("Break ended! Ready to focus again?");
        setMode("work");
        setTotalDuration(25 * 60);
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, timeLeft, mode, task, updateFocusTime]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && task && elapsedRef.current > 0) {
      void updateFocusTime(task.id, elapsedRef.current);
      toast.info(`Logged ${Math.round(elapsedRef.current / 60)} minutes of focus time.`);
      elapsedRef.current = 0;
    }
    onOpenChange(nextOpen);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md text-center p-8 bg-card rounded-2xl shadow-2xl border">
        <DialogHeader className="items-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2 shadow-sm">
            <Clock className="size-6" />
          </div>
          <DialogTitle className="text-xl font-bold">Focus Mode (Pomodoro)</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground truncate max-w-xs">
            Focused on: <strong className="text-foreground">{task.title}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Mode selector */}
        <div className="flex justify-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => {
              setMode("work");
              setTotalDuration(25 * 60);
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              mode === "work"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            25m Focus
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("work");
              setTotalDuration(50 * 60);
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              totalDuration === 50 * 60 && mode === "work"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            50m Deep Focus
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("break");
              setTotalDuration(5 * 60);
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              mode === "break"
                ? "bg-emerald-600 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            5m Short Break
          </button>
        </div>

        {/* Circular Timer Display */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="relative flex size-44 items-center justify-center rounded-full border-4 border-muted/50 bg-background/50 shadow-inner">
            <div className="text-center">
              <span className="text-4xl font-extrabold tracking-tight tabular-nums text-foreground">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                {mode === "work" ? "Focusing" : "Resting"}
              </span>
            </div>
          </div>
        </div>

        {/* Timer controls */}
        <div className="flex justify-center items-center gap-3">
          <Button
            size="lg"
            onClick={() => setIsRunning(!isRunning)}
            className="h-12 w-32 gap-2 text-sm font-semibold rounded-xl shadow-md cursor-pointer"
          >
            {isRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
            <span>{isRunning ? "Pause" : "Start"}</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setIsRunning(false);
              setTimeLeft(totalDuration);
            }}
            className="size-12 rounded-xl cursor-pointer"
            aria-label="Reset timer"
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>

        {/* Mark Done button */}
        <div className="mt-6 pt-4 border-t flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (task) {
                await toggleTaskComplete(task);
                handleClose(false);
              }
            }}
            className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="size-4" />
            <span>Mark Task Complete & Close</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
