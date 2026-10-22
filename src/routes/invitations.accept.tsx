import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mail,
  UserCheck,
  ArrowRight,
  LogIn,
  UserPlus,
  XCircle,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { taskService } from "@/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/invitations/accept")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [
      { title: "Accept Project Invitation · TaskFlow Nexus" },
      {
        name: "description",
        content: "Join your team on TaskFlow Nexus enterprise workspace.",
      },
    ],
  }),
  component: InvitationAcceptPage,
});

function InvitationAcceptPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const { user, isAuthenticated, isInitialized, login, register, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<any | null>(null);

  // Auth form states
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Accept/Decline action state
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [hasDeclined, setHasDeclined] = useState(false);

  // Validate Token on load
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setLoading(false);
        setErrorReason("missing_token");
        setErrorMessage("No invitation token was provided in the link.");
        return;
      }

      try {
        setLoading(true);
        if (!taskService.validateInvitationToken) {
          throw new Error("Validation service unavailable");
        }
        const res = await taskService.validateInvitationToken(token);

        if (!res.valid) {
          setErrorReason(res.reason || "invalid");
          setErrorMessage(res.error || "This invitation link is not valid.");
          setInvitationData(res.invitation || null);
        } else {
          setInvitationData(res.invitation);
          setAuthEmail(res.invitation.recipientEmail);
          // Suggest username based on email
          const suggestedUser = res.invitation.recipientEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
          setAuthUsername(suggestedUser);
        }
      } catch (err: any) {
        setErrorReason("network_error");
        setErrorMessage(err.message || "Failed to validate invitation token.");
      } finally {
        setLoading(false);
      }
    }

    void validateToken();
  }, [token]);

  // Handle Accept
  const handleAccept = async () => {
    if (!token || !invitationData) return;
    setIsAccepting(true);
    try {
      if (!taskService.acceptProjectInvitation) {
        throw new Error("Acceptance service unavailable");
      }
      const res = await taskService.acceptProjectInvitation(token);
      toast.success(res.projectName ? `Welcome to ${res.projectName}!` : "Invitation accepted successfully!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle Decline
  const handleDecline = async () => {
    if (!token) return;
    if (!confirm("Are you sure you want to decline this invitation?")) return;
    setIsDeclining(true);
    try {
      if (!taskService.declineProjectInvitation) {
        throw new Error("Decline service unavailable");
      }
      await taskService.declineProjectInvitation(token);
      setHasDeclined(true);
      toast.info("Invitation declined.");
    } catch (err: any) {
      toast.error(err.message || "Failed to decline invitation");
    } finally {
      setIsDeclining(false);
    }
  };

  // Handle Auth submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    try {
      if (authMode === "login") {
        const ok = await login(authEmail, authPassword);
        if (ok) {
          toast.success("Signed in successfully!");
          // Auto-accept the invitation and redirect
          await handleAccept();
        } else {
          toast.error("Invalid credentials. Please verify your email/username and password.");
        }
      } else {
        const ok = await register(
          authFullName.trim() || authEmail.split("@")[0],
          authEmail.trim().toLowerCase(),
          authUsername.trim().toLowerCase() || authEmail.split("@")[0],
          authPassword,
        );
        if (ok) {
          toast.success("Account created successfully!");
          // Auto-accept the invitation and redirect
          await handleAccept();
        } else {
          toast.error("Registration failed. Email or username might already be in use.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setAuthSubmitting(false);
    }
  };

  // 1. Loading State
  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 mb-4 animate-pulse">
          <Sparkles className="size-6 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-400">Verifying security token...</p>
      </div>
    );
  }

  // 2. Declined State
  if (hasDeclined) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl">
          <div className="size-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <XCircle className="size-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Invitation Declined</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            You have declined the invitation to join this project. If this was a mistake, please reach out to the project manager for a new link.
          </p>
          <div className="mt-6">
            <Link to="/dashboard">
              <Button variant="outline" className="text-xs w-full">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Error States (Invalid / Expired / Revoked / Already Accepted)
  if (errorReason) {
    const isExpired = errorReason === "expired";
    const isRevoked = errorReason === "revoked";
    const isAccepted = errorReason === "already_accepted";

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl">
          <div
            className={`size-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isAccepted
                ? "bg-emerald-500/15 text-emerald-400"
                : isExpired
                  ? "bg-rose-500/15 text-rose-400"
                  : isRevoked
                    ? "bg-slate-800 text-slate-400"
                    : "bg-amber-500/15 text-amber-400"
            }`}
          >
            {isAccepted ? (
              <CheckCircle2 className="size-6" />
            ) : isExpired ? (
              <Clock className="size-6" />
            ) : isRevoked ? (
              <ShieldAlert className="size-6" />
            ) : (
              <AlertTriangle className="size-6" />
            )}
          </div>

          <h2 className="text-lg font-bold text-white">
            {isAccepted
              ? "Invitation Already Accepted"
              : isExpired
                ? "Invitation Has Expired"
                : isRevoked
                  ? "Invitation Revoked"
                  : "Invalid Invitation Link"}
          </h2>

          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {errorMessage ||
              "This invitation link cannot be used. It may have expired, been revoked, or already consumed."}
          </p>

          {invitationData?.projectName && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Target Project</span>
              <span className="font-semibold text-slate-200">{invitationData.projectName}</span>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <Link to="/dashboard">
              <Button className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                Go to Workspace
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Valid Pending Invitation
  const recipientEmail = invitationData?.recipientEmail || "";
  const projectName = invitationData?.projectName || "Enterprise Project";
  const projectColor = invitationData?.projectColor || "#6366f1";
  const projectKey = invitationData?.projectKey || "KEY";
  const projectDescription = invitationData?.projectDescription || "";
  const inviterName = invitationData?.inviterName || "A project manager";
  const role = invitationData?.role || "member";
  const expiresAt = invitationData?.expiresAt
    ? new Date(invitationData.expiresAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "7 days";

  // Check Email Match
  const userEmail = user?.email || "";
  const isEmailMatching =
    isAuthenticated && userEmail.toLowerCase().trim() === recipientEmail.toLowerCase().trim();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Brand Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-md shadow-indigo-600/30">
          <Sparkles className="size-5" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">TaskFlow Nexus</span>
        <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px]">
          Enterprise
        </Badge>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
        {/* Project Header Banner */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="size-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                style={{ backgroundColor: projectColor }}
              >
                {projectKey.slice(0, 3)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white">{projectName}</h1>
                  <Badge variant="outline" className="text-[10px] border-slate-700 bg-slate-800 text-slate-300">
                    {projectKey}
                  </Badge>
                </div>
                <span className="text-xs text-slate-400 mt-0.5 block">
                  Invited by <strong className="text-slate-200">{inviterName}</strong>
                </span>
              </div>
            </div>

            <Badge
              variant="outline"
              className="capitalize text-xs bg-indigo-500/10 border-indigo-500/30 text-indigo-300 font-semibold"
            >
              {role} Role
            </Badge>
          </div>

          {projectDescription && (
            <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed">
              {projectDescription}
            </p>
          )}

          {invitationData?.message && (
            <div className="mt-3 p-3 rounded-lg bg-indigo-950/40 border border-indigo-900/50 text-indigo-200 text-xs italic">
              "{invitationData.message}"
            </div>
          )}
        </div>

        {/* Invitation Metadata Strip */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Mail className="size-3.5 text-slate-500" />
            <span>
              Sent to <strong className="text-slate-300">{recipientEmail}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <Clock className="size-3.5 text-slate-500" />
            <span>Expires on {expiresAt}</span>
          </div>
        </div>

        {/* Authentication or Acceptance Section */}
        <div className="p-6">
          {!isAuthenticated ? (
            /* Recipient Not Authenticated -> Sign In or Register */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2.5">
                <LogIn className="size-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Sign in required</span>
                  <span>
                    To accept this invitation, sign in or create an account with <strong>{recipientEmail}</strong>.
                  </span>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAuthMode("register")}
                  className={`flex-1 text-xs py-1.5 font-semibold rounded-md transition-all cursor-pointer ${
                    authMode === "register" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className={`flex-1 text-xs py-1.5 font-semibold rounded-md transition-all cursor-pointer ${
                    authMode === "login" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
              </div>

              {/* Auth Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-3 pt-1">
                {authMode === "register" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Full Name</label>
                      <input
                        type="text"
                        required
                        value={authFullName}
                        onChange={(e) => setAuthFullName(e.target.value)}
                        placeholder="e.g. David Kumar"
                        className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Username</label>
                      <input
                        type="text"
                        required
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                        placeholder="e.g. davidk"
                        className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Email Address</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
                >
                  {authSubmitting
                    ? "Authenticating..."
                    : authMode === "register"
                      ? "Create Account & Continue"
                      : "Sign In & Continue"}
                </Button>
              </form>
            </div>
          ) : !isEmailMatching ? (
            /* Authenticated with Wrong Account / Email Mismatch */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
                <AlertTriangle className="size-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <span className="font-bold text-sm block text-amber-200">Account Email Mismatch</span>
                  <p className="mt-1 leading-relaxed">
                    You are currently signed in as <strong>{userEmail}</strong>, but this invitation was sent specifically to <strong>{recipientEmail}</strong>.
                  </p>
                  <p className="mt-2 text-[11px] text-amber-400/80">
                    For enterprise security and role integrity, you must switch to an account matching the invited email address.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    await logout();
                    setAuthEmail(recipientEmail);
                  }}
                  className="w-full text-xs border-slate-700 hover:bg-slate-800 text-slate-200"
                >
                  Switch Account / Sign Out
                </Button>
              </div>
            </div>
          ) : (
            /* Authenticated with Matching Email -> Ready to Accept! */
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
                <ShieldCheck className="size-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-slate-100 block">Verified Account Match</span>
                  <span>
                    Signed in as <strong>{userEmail}</strong>. You are authorized to accept this role.
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  disabled={isAccepting || isDeclining}
                  onClick={() => void handleDecline()}
                  className="flex-1 text-xs border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  {isDeclining ? "Declining..." : "Decline"}
                </Button>
                <Button
                  disabled={isAccepting || isDeclining}
                  onClick={() => void handleAccept()}
                  className="flex-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md shadow-indigo-600/30"
                >
                  {isAccepting ? (
                    "Joining Project..."
                  ) : (
                    <>
                      Accept Invitation & Join <ArrowRight className="size-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
