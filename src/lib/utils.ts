import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* Fixed timezone so server & client render identical strings (no hydration drift) */
const IST = "Asia/Kolkata";

export function fmtDate(d: string | Date, opts?: Intl.DateTimeFormatOptions) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: IST,
    ...opts,
  });
}

export function fmtTime(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: IST,
  });
}

export function fmtDateTime(d: string | Date) {
  return `${fmtDate(d)}, ${fmtTime(d)}`;
}

export function timeAgo(d: string | Date, now = Date.now()): string {
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  const diff = Math.max(0, now - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}

/* ------------------------------ status meta ------------------------------- */

export const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  verified: { label: "Verified", color: "#22c55e", bg: "rgba(34,197,94,.12)", dot: "#22c55e" },
  review: { label: "In Review", color: "#f59e0b", bg: "rgba(245,158,11,.12)", dot: "#f59e0b" },
  pending: { label: "Pending", color: "#94a3b8", bg: "rgba(148,163,184,.12)", dot: "#94a3b8" },
  processing: { label: "Processing", color: "#3b82f6", bg: "rgba(59,130,246,.12)", dot: "#3b82f6" },
  rejected: { label: "Rejected", color: "#ef4444", bg: "rgba(239,68,68,.12)", dot: "#ef4444" },
  flagged: { label: "Flagged", color: "#ff9933", bg: "rgba(255,153,51,.14)", dot: "#ff9933" },
};

export function confidenceBand(c: number) {
  if (c >= 85) return { label: "High", color: "#22c55e" };
  if (c >= 60) return { label: "Medium", color: "#f59e0b" };
  return { label: "Low", color: "#ef4444" };
}

export function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}
