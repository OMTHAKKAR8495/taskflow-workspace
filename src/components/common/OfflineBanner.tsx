import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import { connectionStatus, type BackendMode } from "@/services/connectionStatus";

export function OfflineBanner() {
  const [mode, setMode] = useState<BackendMode>(connectionStatus.getMode());
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Initial health check
    connectionStatus.checkHealth();
    const unsubscribe = connectionStatus.subscribe((nextMode) => {
      setMode(nextMode);
      if (nextMode === "connected") {
        setDismissed(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleRetry = async () => {
    setChecking(true);
    try {
      await connectionStatus.checkHealth();
    } finally {
      setChecking(false);
    }
  };

  if (mode === "connected" || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs font-medium flex items-center justify-between gap-3 transition-all"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="truncate">
          <strong className="font-semibold">Offline Mode (Local Storage):</strong> Backend API is
          unreachable. Your changes are actively preserved in your browser.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleRetry}
          disabled={checking}
          className="inline-flex items-center gap-1.5 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-900 dark:text-amber-200 px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`size-3 ${checking ? "animate-spin" : ""}`} />
          <span>{checking ? "Checking..." : "Retry API"}</span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-amber-700 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-100 px-1 py-0.5 text-[11px] cursor-pointer"
          aria-label="Dismiss banner"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
