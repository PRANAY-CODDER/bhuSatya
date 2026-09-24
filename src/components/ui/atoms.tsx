"use client";

import { forwardRef, useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, STATUS_META, confidenceBand, timeAgo } from "@/lib/utils";
import { X } from "lucide-react";

/* --------------------------------- GlassCard -------------------------------- */

export function GlassCard({
  className,
  children,
  shine = true,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { shine?: boolean }) {
  return (
    <div
      className={cn("glass rounded-2xl", shine && "card-shine", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
      {children}
    </div>
  );
}

/* ---------------------------------- Button ---------------------------------- */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger" | "success" | "saffron";
  size?: "sm" | "md" | "xs";
};

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { className, variant = "ghost", size = "md", children, ...rest },
  ref,
) {
  const v: Record<string, string> = {
    primary:
      "text-[#06251c] font-semibold shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset,0_8px_24px_-8px_var(--accent-glow)] hover:brightness-110",
    ghost: "hover:bg-white/[0.06] text-secondary hover:text-current",
    outline: "border border-[var(--border-interactive)] hover:bg-white/[0.05] text-secondary hover:text-current",
    danger: "bg-red-500/12 text-red-400 border border-red-500/25 hover:bg-red-500/20",
    success: "bg-emerald-500/12 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20",
    saffron: "bg-[#ff9933]/12 text-[#ffb15e] border border-[#ff9933]/30 hover:bg-[#ff9933]/20",
  };
  const s = { md: "h-9 px-3.5 text-[13px]", sm: "h-8 px-3 text-xs", xs: "h-7 px-2.5 text-[11px]" }[size];
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "focus-ring inline-flex select-none items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        v[variant],
        s,
        className,
      )}
      style={variant === "primary" ? { background: "var(--accent)" } : undefined}
      {...(rest as object)}
    >
      {children}
    </motion.button>
  );
});

/* -------------------------------- StatusPill -------------------------------- */

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const m = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", className)}
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.color}30` }}
    >
      <span
        className={cn("size-1.5 rounded-full", (status === "processing" || status === "flagged") && "anim-pulse-dot")}
        style={{ background: m.dot, boxShadow: `0 0 8px ${m.dot}` }}
      />
      {m.label}
    </span>
  );
}

/* ----------------------------- ConfidenceRadial ---------------------------- */

export function ConfidenceRadial({ value, size = 38, stroke = 3.5 }: { value: number; size?: number; stroke?: number }) {
  const band = confidenceBand(value);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(128,128,150,0.18)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={band.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)", filter: `drop-shadow(0 0 4px ${band.color}66)` }}
        />
      </svg>
      <span className="tabular absolute text-[9.5px] font-semibold" style={{ color: band.color }}>
        {value}
      </span>
    </span>
  );
}

/* --------------------------------- Sparkline -------------------------------- */

export function Sparkline({ data, width = 120, height = 34, color = "var(--accent)", id }: { data: number[]; width?: number; height?: number; color?: string; id?: string }) {
  const max = Math.max(...data, 1);
  const step = width / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(height - 3 - (v / max) * (height - 7)).toFixed(1)}`);
  const gid = id ?? `sl${Math.abs(data.join("").split("").reduce((a, c) => a + c.charCodeAt(0), 0))}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts.join(" ")} ${width},${height}`} fill={`url(#${gid})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

/* ---------------------------------- CountUp --------------------------------- */

export function CountUp({ end, duration = 1200, className }: { end: number; duration?: number; className?: string }) {
  const [val, setVal] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(end * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [end, duration]);
  return <span className={cn("tabular", className)}>{val.toLocaleString("en-IN")}</span>;
}

/* ---------------------------------- RelTime --------------------------------- */

export function RelTime({ iso, className }: { iso: string; className?: string }) {
  const [txt, setTxt] = useState("…");
  useEffect(() => {
    const d = new Date(iso);
    const update = () => setTxt(timeAgo(d));
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [iso]);
  return <span className={className} title={new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}>{txt}</span>;
}

/* --------------------------------- Dropdown --------------------------------- */

export function Dropdown({
  trigger,
  children,
  align = "right",
  width = 220,
  open,
  onOpenChange,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  width?: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "glass-strong absolute z-50 mt-2 overflow-hidden rounded-xl shadow-2xl shadow-black/40",
              align === "right" ? "right-0" : "left-0",
            )}
            style={{ width }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({
  icon,
  label,
  shortcut,
  danger,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  shortcut?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "focus-ring flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--accent-soft)]",
        danger ? "text-red-400" : "text-secondary hover:text-current",
      )}
    >
      {icon && <span className="shrink-0 opacity-80">{icon}</span>}
      <span className="flex-1">{label}</span>
      {shortcut && <kbd className="rounded border border-[var(--border-subtle)] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted">{shortcut}</kbd>}
    </button>
  );
}

export function MenuDivider() {
  return <div className="mx-3 my-1 h-px bg-[var(--border-subtle)]" />;
}

/* -------------------------------- EmptyState -------------------------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <div className="anim-floaty flex size-16 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--accent-soft)] text-[var(--accent)]">
        {icon}
      </div>
      <div className="text-[15px] font-semibold">{title}</div>
      {body && <p className="max-w-sm text-[13px] leading-relaxed text-muted">{body}</p>}
      {action}
    </motion.div>
  );
}

/* ---------------------------------- Avatar ---------------------------------- */

export function Avatar({ name, color, size = 32 }: { name: string; color?: string; size?: number }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${color ?? "var(--accent)"}, color-mix(in srgb, ${color ?? "var(--accent)"} 55%, #000))`,
      }}
    >
      {initials}
    </span>
  );
}

/* ---------------------------------- Modal ----------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong card-shine w-full rounded-2xl shadow-2xl shadow-black/60"
            style={{ maxWidth: width }}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3.5">
              <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
              <button onClick={onClose} className="focus-ring rounded-lg p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-current" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* --------------------------------- Field ------------------------------------ */

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium text-secondary">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </label>
  );
}

export const inputCls =
  "focus-ring w-full rounded-lg border border-[var(--border-interactive)] bg-white/[0.03] px-3 py-2 text-[13px] placeholder:text-muted transition-colors hover:border-[var(--border-interactive)] focus:border-[var(--accent)]";
