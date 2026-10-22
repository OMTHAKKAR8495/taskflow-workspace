/**
 * Centralized API configuration for TaskFlow Nexus.
 * Seamlessly resolves API base URL across local dev, staging, and production environments (such as Vercel).
 */
export function getApiBaseUrl(): string {
  // 1. Vercel Service Binding: Injected by Vercel at runtime in functions/SSR
  if (typeof process !== "undefined" && process.env?.SERVER_URL) {
    return `${process.env.SERVER_URL.replace(/\/$/, "")}/api`;
  }

  // 2. Explicit Environment Variable (e.g. VITE_API_URL)
  const envUrl = import.meta.env["VITE_API_URL"];
  if (envUrl && typeof envUrl === "string" && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/$/, "");
  }

  // 3. Client-side browser on deployed domain: use relative /api routed to 'server' service
  if (
    typeof window !== "undefined" &&
    window.location.hostname &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "/api";
  }

  // 4. Local development default
  return "http://localhost:4000/api";
}
