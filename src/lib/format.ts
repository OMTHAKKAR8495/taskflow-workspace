import { format, formatDistanceToNow } from "date-fns";

export const fmtDate = (iso: string | null, fallback = "No due date") =>
  iso ? format(new Date(iso), "MMM d, yyyy") : fallback;

export const fmtRelative = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";
