/**
 * Centralized API configuration for TaskFlow Nexus.
 * Seamlessly resolves API base URL across local dev, staging, and production environments (such as Vercel).
 */
export function getApiBaseUrl(): string {
  // If explicitly configured in environment (e.g. Vercel Project Environment Variable)
  const envUrl = import.meta.env["VITE_API_URL"];
  if (envUrl && typeof envUrl === "string" && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/$/, "");
  }

  // If running in browser on a deployed production/preview domain (e.g. *.vercel.app)
  if (
    typeof window !== "undefined" &&
    window.location.hostname &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    // Relative /api allows same-origin or reverse-proxied deployments without CORS issues
    return "/api";
  }

  // Local development default
  return "http://localhost:4000/api";
}
