import { useState, useEffect } from "react";
import {
  Settings,
  Database,
  Moon,
  Sun,
  Laptop,
  Shield,
  User,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Server,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useTasks } from "@/context/TaskContext";
import { connectionStatus, type BackendMode } from "@/services/connectionStatus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/api-config";

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { profile, updateProfile, reload } = useTasks();

  const [fullName, setFullName] = useState(user?.fullName || profile?.fullName || "Om Thakkar");
  const [email, setEmail] = useState(user?.email || profile?.email || "omthakkar@example.com");
  const [isUpdating, setIsUpdating] = useState(false);

  const [backendMode, setBackendMode] = useState<BackendMode>(connectionStatus.getMode());
  const [healthInfo, setHealthInfo] = useState<any>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    return connectionStatus.subscribe((m) => setBackendMode(m));
  }, []);

  const handleCheckHealth = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthInfo(data);
        connectionStatus.setMode("connected");
        toast.success("PostgreSQL backend is connected and healthy!");
        void reload();
      } else {
        throw new Error("API returned non-200");
      }
    } catch (err: any) {
      setHealthInfo({ status: "disconnected", message: err.message });
      connectionStatus.setMode("offline");
      toast.warning("API server unreachable, fallback mode active.");
    } finally {
      setTestingConnection(false);
    }
  };

  useEffect(() => {
    void handleCheckHealth();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        avatarUrl: profile?.avatarUrl || "",
      });
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Workspace Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure profile details, theme appearance, and monitor PostgreSQL server connectivity.
        </p>
      </div>

      {/* 1. Profile Information */}
      <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <User className="size-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Personal Information</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs"
            />
          </div>

          <Button type="submit" size="sm" disabled={isUpdating} className="text-xs cursor-pointer">
            {isUpdating ? "Saving..." : "Save Profile Changes"}
          </Button>
        </form>
      </div>

      {/* 2. Theme & Appearance */}
      <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <Laptop className="size-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Appearance & Theme</h2>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-md pt-1">
          {[
            { id: "light", label: "Light Mode", icon: Sun },
            { id: "dark", label: "Dark Mode", icon: Moon },
            { id: "system", label: "System Default", icon: Laptop },
          ].map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id as any)}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                    : "border-input bg-card hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <Icon className="size-5" />
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Database & Architecture Diagnostics */}
      <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Backend & Database Diagnostics</h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckHealth}
            disabled={testingConnection}
            className="text-xs gap-1.5 cursor-pointer h-8"
          >
            <RefreshCw className={`size-3 ${testingConnection ? "animate-spin" : ""}`} /> Test Health
          </Button>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/20 text-xs">
            <div className="flex items-center gap-2.5">
              <div
                className={`size-2.5 rounded-full ${
                  backendMode === "connected" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <div>
                <span className="font-semibold text-foreground">Connection State: </span>
                <span className="capitalize">{backendMode}</span>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-bold ${
                backendMode === "connected"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }`}
            >
              {backendMode === "connected" ? "PostgreSQL Active" : "Local Mock Mode"}
            </Badge>
          </div>

          {healthInfo && (
            <div className="rounded-lg border bg-muted/30 p-3 font-mono text-[11px] text-muted-foreground overflow-x-auto">
              <pre>{JSON.stringify(healthInfo, null, 2)}</pre>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1 pt-1">
            <p>
              • <strong>Backend Endpoint:</strong> <code>{getApiBaseUrl()}</code>
            </p>
            <p>
              • <strong>Database Engine:</strong> PostgreSQL 14+ with pg connection pool
            </p>
            <p>
              • <strong>Resilience Mode:</strong> Transparently switches between PostgreSQL and in-memory mock store on server downtime without data loss.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
