import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    google?: any;
  }
}

import { getApiBaseUrl } from "@/lib/api-config";

export function GoogleSignInButton({ label = "Continue with Google" }: { label?: string }) {
  const { loginWithGoogle, getGoogleLoginUrl } = useAuth();
  const [loading, setLoading] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string>(() => {
    return (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeClientId) {
      fetch(`${getApiBaseUrl()}/auth/google/config`)
        .then((res) => res.json())
        .then((data) => {
          if (data.clientId) setActiveClientId(data.clientId);
        })
        .catch(() => {});
    }
  }, [activeClientId]);

  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const initGsi = () => {
      if (typeof window === "undefined" || !window.google?.accounts?.id || !activeClientId) {
        return false;
      }
      try {
        window.google.accounts.id.initialize({
          client_id: activeClientId,
          callback: async (response: { credential?: string }) => {
            if (response.credential) {
              setLoading(true);
              try {
                const ok = await loginWithGoogle(response.credential);
                if (ok) {
                  toast.success("Successfully authenticated with Google!");
                } else {
                  toast.error("Google authentication failed. Please try again.");
                }
              } catch (err) {
                console.error(err);
                toast.error("An error occurred during Google sign-in.");
              } finally {
                setLoading(false);
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(containerRef.current, {
            theme: "outline",
            size: "large",
            width: 380,
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
          });
          setGsiReady(true);
        }
        return true;
      } catch (e) {
        console.warn("GSI initialization error:", e);
        return false;
      }
    };

    if (!initGsi()) {
      checkInterval = setInterval(() => {
        if (initGsi()) {
          clearInterval(checkInterval);
        }
      }, 500);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [activeClientId, loginWithGoogle]);

  const handleManualClick = async () => {
    setLoading(true);
    try {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            getGoogleLoginUrl().then((url) => {
              window.location.href = url;
            });
          }
        });
      } else {
        const url = await getGoogleLoginUrl();
        window.location.href = url;
      }
    } catch (e) {
      console.error(e);
      try {
        const url = await getGoogleLoginUrl();
        window.location.href = url;
      } catch {
        toast.error("Unable to initialize Google Sign-In redirect.");
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Official GSI rendered button if script active */}
      <div
        ref={containerRef}
        className={`w-full flex justify-center [&>div]:w-full transition-opacity duration-200 ${
          gsiReady ? "block" : "hidden"
        }`}
      />

      {/* Styled native button as fallback or standard trigger */}
      {!gsiReady && (
        <button
          type="button"
          onClick={handleManualClick}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-input bg-background/80 hover:bg-accent/60 px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 shadow-sm hover:shadow"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <svg className="size-4.5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{loading ? "Connecting to Google..." : label}</span>
        </button>
      )}
    </div>
  );
}
