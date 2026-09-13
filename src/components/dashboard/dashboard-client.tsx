"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Files, ShieldCheck, Hourglass, Flag, ArrowUpRight, ArrowDownRight,
  Plus, Download, Upload, Cpu, ScanText, Sparkles, ClipboardCheck,
  TrendingUp, MapPin, Activity, Inbox,
} from "lucide-react";
import { cn, fmtDate } from "@/lib/utils";
import { GlassCard, SectionLabel, CountUp, Sparkline, Button, RelTime, EmptyState } from "@/components/ui/atoms";
import type { DashboardStats, AuditDTO } from "@/lib/queries";

/* ------------------------------ animated icons ----------------------------- */

function Icon3D({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div
      className="relative flex size-12 shrink-0 items-center justify-center rounded-xl"
      style={{ background: `${color}16`, border: `1px solid ${color}33`, boxShadow: `0 8px 28px -10px ${color}55` }}
    >
      {children}
    </div>
  );
}

function DocStackIcon() {
  return (
    <div className="relative size-5 anim-floaty">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 * i, duration: 0.4 }}
          className="absolute rounded-[3px] border"
          style={{
            width: 18 - i * 1.5,
            height: 22 - i * 1.5,
            right: i * 3,
            top: -i * 3,
            background: `rgba(16,185,129,${0.25 + i * 0.25})`,
            borderColor: "rgba(16,185,129,0.6)",
            boxShadow: "0 2px 8px rgba(0,0,0,.3)",
          }}
        />
      ))}
      <span className="absolute left-[3px] top-[4px] h-[1.5px] w-2 rounded bg-white/70" />
      <span className="absolute left-[3px] top-[8px] h-[1.5px] w-2.5 rounded bg-white/50" />
    </div>
  );
}

function ShieldIcon() {
  const spin = { rotate: 360 };
  return (
    <div className="relative size-6">
      <motion.span
        animate={spin}
        transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full border border-dashed border-emerald-400/50"
      />
      <ShieldCheck size={17} className="absolute inset-0 m-auto text-emerald-400" />
    </div>
  );
}

function HourglassIcon() {
  return (
    <div className="relative">
      <Hourglass size={19} className="text-blue-400" />
      <motion.span
        animate={{ y: [0, 8], opacity: [0, 1, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeIn" }}
        className="absolute left-1/2 top-1 size-[3px] -translate-x-1/2 rounded-full bg-blue-300"
      />
    </div>
  );
}

function FlagIcon() {
  return (
    <div className="anim-flag">
      <Flag size={19} className="text-[#ff9933]" fill="rgba(255,153,51,0.35)" />
    </div>
  );
}

/* --------------------------------- stat card -------------------------------- */

const container: Variants = { animate: { transition: { staggerChildren: 0.06 } } };
const item: Variants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

function StatCard({
  label, value, change, trend, icon, color, href, invert,
}: {
  label: string; value: number; change: number; trend: number[]; icon: React.ReactNode; color: string; href: string; invert?: boolean;
}) {
  const up = change >= 0;
  const good = invert ? !up : up;
  return (
    <motion.div variants={item} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
      <Link href={href}>
        <GlassCard className="group p-4 transition-all duration-200 hover:border-[var(--border-interactive)] hover:shadow-[0_0_36px_-8px_var(--accent-glow)]">
          <div className="flex items-start justify-between">
            <Icon3D color={color}>{icon}</Icon3D>
            <span
              className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold",
                good ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}
            >
              {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {Math.abs(change)}%
            </span>
          </div>
          <div className="mt-3.5 text-[26px] font-bold leading-none tracking-tight">
            <CountUp end={value} />
          </div>
          <div className="mt-1 text-xs text-muted">{label}</div>
          <div className="mt-2.5 opacity-80 transition-opacity group-hover:opacity-100">
            <Sparkline data={trend} width={150} height={30} color={color} />
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  );
}

/* --------------------------------- pipeline -------------------------------- */

const STAGES = [
  { key: "upload", label: "Upload", icon: Upload },
  { key: "preprocess", label: "Pre-process", icon: Cpu },
  { key: "ocr", label: "OCR", icon: ScanText },
  { key: "ai", label: "AI / NLP", icon: Sparkles },
  { key: "validation", label: "Validation", icon: ClipboardCheck },
];

function PipelineStrip({ pipeline }: { pipeline: { stage: string; count: number }[] }) {
  const router = useRouter();
  return (
    <GlassCard className="p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Pipeline health — live</SectionLabel>
        <span className="flex items-center gap-1.5 text-[10.5px] text-muted">
          <span className="size-1.5 rounded-full bg-blue-400 anim-pulse-dot" />
          processing in real time
        </span>
      </div>
      <div className="flex items-center">
        {STAGES.map((s, i) => {
          const count = pipeline.find((p) => p.stage === s.key)?.count ?? 0;
          const active = count > 0;
          return (
            <div key={s.key} className={cn("flex items-center", i < STAGES.length - 1 && "flex-1")}>
              <button
                onClick={() => router.push("/records?status=processing")}
                className="group flex flex-col items-center gap-1.5 outline-none"
              >
                <motion.span
                  whileHover={{ scale: 1.08 }}
                  className={cn(
                    "relative flex size-11 items-center justify-center rounded-full border transition-colors",
                    active
                      ? "border-blue-400/50 bg-blue-500/10 text-blue-300"
                      : "border-[var(--border-subtle)] bg-white/[0.02] text-muted group-hover:border-[var(--border-interactive)]",
                  )}
                >
                  {active && (
                    <motion.span
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border border-blue-400/60"
                    />
                  )}
                  <s.icon size={16} />
                </motion.span>
                <span className="text-[10px] font-medium text-secondary">{s.label}</span>
                <span className="tabular -mt-1 text-[11px] font-bold" style={{ color: active ? "#7db8ff" : "var(--text-muted)" }}>
                  {count}
                </span>
              </button>
              {i < STAGES.length - 1 && (
                <svg className="mx-1 mb-7 h-4 min-w-4 flex-1" preserveAspectRatio="none" viewBox="0 0 100 8">
                  <line x1="0" y1="4" x2="100" y2="4" stroke="var(--border-interactive)" strokeWidth="1" />
                  <line x1="0" y1="4" x2="100" y2="4" stroke="var(--accent)" strokeWidth="1.4" className="flow-line" opacity="0.75" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

/* --------------------------------- heatmap ---------------------------------- */

const CAT_COLORS: Record<string, string> = {
  ingest: "#3b82f6", review: "#22c55e", export: "#f59e0b", ocr: "#8b5cf6",
  ai: "#06b6d4", preprocess: "#64748b", system: "#94a3b8",
};

function Heatmap({ data }: { data: DashboardStats["heatmap"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.count), 1);
  const weeks = useMemo(() => {
    const w: DashboardStats["heatmap"][] = [];
    for (let i = 0; i < 12; i++) w.push(data.slice(i * 7, i * 7 + 7));
    return w;
  }, [data]);
  const totalActions = data.reduce((s, d) => s + d.count, 0);

  return (
    <GlassCard className="p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Activity — last 12 weeks</SectionLabel>
        <span className="tabular text-[10.5px] text-muted">{totalActions} actions</span>
      </div>
      <div className="relative">
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-1 flex-col gap-[3px]">
              {week.map((d, di) => {
                const idx = wi * 7 + di;
                const intensity = d.count / max;
                const isToday = idx === data.length - 1;
                return (
                  <div key={d.date} className="relative">
                    <motion.button
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.004 }}
                      onMouseEnter={() => setHover(idx)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => (window.location.href = "/audit")}
                      className={cn(
                        "block aspect-square w-full rounded-[3px] transition-transform duration-150 hover:scale-125 hover:shadow-lg",
                        isToday && "anim-pulse-dot",
                      )}
                      style={{
                        background: d.count === 0 ? "rgba(128,128,150,0.09)" : `color-mix(in srgb, var(--accent) ${18 + intensity * 82}%, transparent)`,
                        boxShadow: intensity > 0.6 ? "0 0 8px var(--accent-glow)" : undefined,
                        outline: isToday ? "1px solid var(--accent)" : undefined,
                      }}
                      aria-label={`${fmtDate(d.date)} — ${d.count} actions`}
                    />
                    <AnimatePresence>
                      {hover === idx && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="glass-strong pointer-events-none absolute bottom-full z-20 mb-2 w-44 -translate-x-1/2 rounded-xl p-3 shadow-2xl"
                          style={{ left: "50%" }}
                        >
                          <div className="text-[11px] font-semibold">{fmtDate(d.date, { weekday: "short" })}, {fmtDate(d.date)}</div>
                          <div className="my-1.5 h-px bg-[var(--border-subtle)]" />
                          {Object.keys(d.cats).length === 0 && <div className="text-[10.5px] text-muted">No activity</div>}
                          {Object.entries(d.cats).map(([c, n]) => (
                            <div key={c} className="flex items-center gap-1.5 py-0.5 text-[10.5px]">
                              <span className="size-1.5 rounded-full" style={{ background: CAT_COLORS[c] ?? "#999" }} />
                              <span className="capitalize text-secondary">{c}</span>
                              <span className="tabular ml-auto font-semibold">{n}</span>
                            </div>
                          ))}
                          {d.count > 0 && <div className="mt-1 text-[10px] text-muted">Total: {d.count} actions</div>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex items-center justify-end gap-1 text-[9.5px] text-muted">
          Less
          {[0.12, 0.32, 0.55, 0.8, 1].map((o) => (
            <span key={o} className="size-[9px] rounded-[2.5px]" style={{ background: `color-mix(in srgb, var(--accent) ${o * 100}%, transparent)` }} />
          ))}
          More
        </div>
      </div>
    </GlassCard>
  );
}

/* ------------------------------ progress ring ------------------------------- */

function ProgressRing({ today }: { today: DashboardStats["today"] }) {
  const pct = Math.min(100, Math.round((today.done / today.target) * 100));
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <GlassCard className="p-5">
      <SectionLabel>Today&apos;s progress</SectionLabel>
      <div className="mt-3 flex items-center justify-center">
        <div className={cn("relative", pct > 80 && "anim-ring-glow")}>
          <svg width="132" height="132" className="-rotate-90">
            <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(128,128,150,0.15)" strokeWidth="9" />
            <motion.circle
              cx="66" cy="66" r={r} fill="none" stroke="var(--accent)" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: c * (1 - pct / 100) }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="tabular text-[26px] font-bold leading-none"><CountUp end={pct} />%</span>
            <span className="mt-1 text-[10px] text-muted">of daily target</span>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        {today.tasks.map((t) => {
          const p = t.total ? Math.min(1, t.done / t.total) : 0;
          return (
            <div key={t.label}>
              <div className="mb-1 flex justify-between text-[10.5px]">
                <span className="text-secondary">{t.label}</span>
                <span className="tabular text-muted">{t.done}/{t.total}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${p * 100}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: p >= 1 ? "#22c55e" : "var(--accent)" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

/* ----------------------------- confidence donut ----------------------------- */

function ConfidenceDonut({ confidence, total }: { confidence: DashboardStats["confidence"]; total: number }) {
  const segs = [
    { label: "High (85+)", value: confidence.high, color: "#22c55e", href: "/records?minConf=85" },
    { label: "Medium (60–84)", value: confidence.medium, color: "#f59e0b", href: "/records?minConf=60&maxConf=84" },
    { label: "Low (<60)", value: confidence.low, color: "#ef4444", href: "/records?maxConf=59" },
  ];
  const sum = Math.max(1, segs.reduce((s, x) => s + x.value, 0));
  const r = 46, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <GlassCard className="p-5">
      <SectionLabel>AI confidence distribution</SectionLabel>
      <div className="mt-3 flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="118" height="118" className="-rotate-90">
            {segs.map((s) => {
              const frac = s.value / sum;
              const dash = frac * c;
              const off = -(acc * c);
              acc += frac;
              return (
                <motion.circle
                  key={s.label}
                  cx="59" cy="59" r={r} fill="none" stroke={s.color} strokeWidth="14"
                  strokeDasharray={`${dash} ${c}`}
                  initial={{ strokeDashoffset: c }}
                  animate={{ strokeDashoffset: off }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  opacity="0.9"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="tabular text-xl font-bold leading-none">{total}</span>
            <span className="text-[9px] text-muted">records</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {segs.map((s) => (
            <Link key={s.label} href={s.href} className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.05]">
              <span className="size-2 rounded-sm" style={{ background: s.color }} />
              <span className="flex-1 text-[11.5px] text-secondary">{s.label}</span>
              <span className="tabular text-[11.5px] font-bold">{s.value}</span>
            </Link>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

/* -------------------------------- live feed --------------------------------- */

const FEED_COLORS: Record<string, string> = {
  ingest: "#3b82f6", review: "#22c55e", export: "#f59e0b",
  ocr: "#8b5cf6", ai: "#06b6d4", preprocess: "#64748b", system: "#94a3b8",
};

function LiveFeed({ initial }: { initial: AuditDTO[] }) {
  const [feed, setFeed] = useState(initial);
  const load = useCallback(async () => {
    const res = await fetch("/api/activity?limit=18");
    if (res.ok) setFeed((await res.json()).rows);
  }, []);
  useEffect(() => {
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [load]);

  return (
    <GlassCard className="flex min-h-0 flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <SectionLabel>Live activity</SectionLabel>
        <span className="flex items-center gap-1.5 text-[10.5px] text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-400 anim-pulse-dot" /> LIVE
        </span>
      </div>
      <div className="-mr-2 max-h-[380px] flex-1 space-y-1 overflow-y-auto pr-2">
        {feed.length === 0 && <EmptyState icon={<Inbox size={22} />} title="Quiet for now" body="Pipeline events will stream in here as documents move through the system." />}
        <AnimatePresence initial={false}>
          {feed.map((e) => (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
            >
              <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold uppercase"
                style={{ background: `${FEED_COLORS[e.category]}1f`, color: FEED_COLORS[e.category], border: `1px solid ${FEED_COLORS[e.category]}44` }}>
                {e.actor.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] leading-snug">
                  <span className="font-medium">{e.action}</span>
                  {e.recordNo && <span className="tabular text-muted"> · {e.recordNo}</span>}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                  <span className="capitalize">{e.category}</span>
                  <RelTime iso={e.createdAt} />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Link href="/audit" className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-[var(--border-subtle)] py-2 text-[11px] font-medium text-secondary transition-colors hover:bg-white/[0.05] hover:text-current">
        View full audit trail <ArrowUpRight size={12} />
      </Link>
    </GlassCard>
  );
}

/* --------------------------------- dashboard -------------------------------- */

export function DashboardClient({ stats, firstName }: { stats: DashboardStats; firstName: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const todayStr = fmtDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-[1400px] p-4 md:p-6">
      {/* header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-muted">
            <Activity size={13} className="accent-text" />
            {todayStr} · {stats.districtCount} districts · <span className="tabular">{stats.areaDigitized} acres</span> digitized
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open("/api/records?format=csv", "_blank")}>
            <Download size={14} /> Export
          </Button>
          <Link href="/records?new=1">
            <Button variant="primary" size="sm"><Plus size={14} /> New record</Button>
          </Link>
        </div>
      </div>

      {/* hero stats */}
      <motion.div variants={container} initial="initial" animate="animate" className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Documents digitized" value={stats.counts.total} change={stats.changes.total} trend={stats.trends.total} icon={<DocStackIcon />} color="#10b981" href="/records" />
        <StatCard label="Verified records" value={stats.counts.verified} change={stats.changes.verified} trend={stats.trends.verified} icon={<ShieldIcon />} color="#22c55e" href="/records?status=verified" />
        <StatCard label="Pending in queue" value={stats.counts.pending} change={stats.changes.pending} trend={stats.trends.pending} icon={<HourglassIcon />} color="#3b82f6" href="/records?status=pending,review" invert />
        <StatCard label="Flagged for review" value={stats.counts.flagged} change={stats.changes.flagged} trend={stats.trends.flagged} icon={<FlagIcon />} color="#ff9933" href="/records?status=flagged" />
      </motion.div>

      {/* pipeline */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-4">
        <PipelineStrip pipeline={stats.pipeline} />
      </motion.div>

      {/* main grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
            <Heatmap data={stats.heatmap} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <ConfidenceDonut confidence={stats.confidence} total={stats.counts.total} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
            <GlassCard className="flex flex-wrap items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <TrendingUp size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">Average AI confidence — {stats.avgConfidence}%</div>
                <div className="mt-0.5 text-xs text-muted">
                  Straight-through verification is enabled above 96%. {stats.counts.pending} records still need a human eye.
                </div>
              </div>
              <Link href="/map">
                <Button variant="outline" size="sm"><MapPin size={13} /> Open GIS map</Button>
              </Link>
            </GlassCard>
          </motion.div>
        </div>
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
            <ProgressRing today={stats.today} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}>
            <LiveFeed initial={stats.feed} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
