import { getApiBaseUrl } from "@/lib/api-config";

export type BackendMode = "connected" | "offline";

let currentMode: BackendMode = "offline";
const listeners = new Set<(mode: BackendMode) => void>();

export const connectionStatus = {
  getMode: (): BackendMode => currentMode,
  setMode: (mode: BackendMode) => {
    if (currentMode !== mode) {
      currentMode = mode;
      listeners.forEach((fn) => fn(mode));
    }
  },
  subscribe: (fn: (mode: BackendMode) => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  checkHealth: async (): Promise<boolean> => {
    const base = getApiBaseUrl();
    try {
      const res = await fetch(`${base}/health`, {

        method: "GET",
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        connectionStatus.setMode("connected");
        return true;
      }
    } catch {}
    connectionStatus.setMode("offline");
    return false;
  },
};
