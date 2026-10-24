import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parses any date representation (ISO YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, timestamp)
 * into an ISO 8601 string without ever throwing RangeError: Invalid time value.
 */
export function parseSafeDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Check if DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
    if (dmyMatch) {
      const p1 = parseInt(dmyMatch[1], 10);
      const p2 = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);
      if (p2 <= 12 && p1 <= 31) {
        // DD/MM/YYYY
        const d = new Date(Date.UTC(year, p2 - 1, p1));
        if (!isNaN(d.getTime())) return d.toISOString();
      } else if (p1 <= 12 && p2 <= 31) {
        // MM/DD/YYYY
        const d = new Date(Date.UTC(year, p1 - 1, p2));
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }

    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d.toISOString();
    } catch {}
    return null;
  }

  try {
    const d = new Date(val as any);
    return !isNaN(d.getTime()) ? d.toISOString() : null;
  } catch {
    return null;
  }
}

