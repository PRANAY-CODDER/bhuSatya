"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowDownRight, ArrowUpRight, CalendarPlus, Clock3, Database, Flag, Gauge, ShieldCheck,
  Sparkles, Upload, WandSparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, GlassCard, SectionLabel } from "@/components/ui/atoms";
import type { DashboardStats } from "@/lib/queries";
import { AmbientBackground } from "@/components/three/AmbientBackground";

const STATUS_COLORS: Record<string, string> = {
  verified: "#22c55e",
  processing: "#3b82f6",
  flagged: "#ff9933",
  rejected: "#ef4444",
  pending: "#94a3b8",
  review: "#f59e0b",
};

const STATUS_LABELS: Record<string, string> = {
  verified: "Verified",
  processing: "Processing",
  flagged: "Flagged",
  rejected: "Rejected",
  pending: "Pending",
  review: "In review",
};

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", options).format(new Date(date));
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-semibold">{label}</div>
      {payload.map((entry) => <div key={entry.name} className="flex items-center gap-2 text-secondary"><span className="size-2 rounded-full" style={{ background: entry.color ?? "var(--accent)" }} />{entry.name}<span className="tabular ml-2 font-bold text-current">{entry.value}</span></div>)}
    </div>
  );
}

function StatCard({ label, value, change, icon: Icon, color, href, invert = false }: { label: string; value: number; change: number; icon: typeof Database; color: string; href: string; invert?: boolean }) {
  const up = change >= 0;
  const positive = invert ? !up : up;
  return (
    <Link href={href} className="block">
      <GlassCard className="h-full p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--border-interactive)] hover:shadow-[0_0_32px_-12px_var(--accent-glow)]">
        <div className="flex items-start justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-xl" style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}><Icon size={18} /></span><span className={cn("flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", positive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>{up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{Math.abs(change)}%</span></div>
        <div className="tabular mt-4 text-[26px] font-bold leading-none tracking-tight">{value.toLocaleString("en-IN")}</div><div className="mt-1 text-xs text-muted">{label}</div>
      </GlassCard>
    </Link>
  );
}

function ConfidenceDonut({ stats }: { stats: DashboardStats }) {
  const data = [{ name: "Verified", value: stats.confidence.high, color: "#22c55e" }, { name: "Processing", value: stats.confidence.medium, color: "#3b82f6" }, { name: "Flagged", value: stats.confidence.low, color: "#ef4444" }];
  return <GlassCard className="p-5"><div className="flex items-start justify-between"><div><SectionLabel>Extraction confidence</SectionLabel><p className="mt-1 text-xs text-muted">Overall confidence distribution</p></div><span className="tabular text-lg font-bold text-[var(--accent)]">{stats.avgConfidence}%</span></div><div className="mt-3 flex items-center gap-5"><div className="relative h-40 w-40 shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={3} stroke="none">{data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="tabular text-2xl font-bold">{stats.counts.total}</span><span className="text-[10px] text-muted">records</span></div></div><div className="min-w-0 flex-1 space-y-2">{data.map((entry) => <div key={entry.name} className="flex items-center gap-2 text-xs"><span className="size-2 rounded-sm" style={{ background: entry.color }} /><span className="flex-1 text-secondary">{entry.name}</span><span className="tabular font-semibold">{entry.value}</span></div>)}</div></div></GlassCard>;
}

function Pipeline({ stats }: { stats: DashboardStats }) {
  const count = (stage: string) => stats.pipeline.find((item) => item.stage === stage)?.count ?? 0;
  const stages = [
    { label: "Pre-processing", count: count("preprocess"), icon: WandSparkles },
    { label: "Extraction", count: count("ocr") + count("ai"), icon: Sparkles },
    { label: "Validation", count: count("validation"), icon: ShieldCheck },
    { label: "Review", count: stats.statusBreakdown.find((item) => item.status === "review")?.count ?? 0, icon: Flag },
    { label: "Completed", count: stats.counts.verified, icon: ShieldCheck },
  ];
  return <GlassCard className="p-5"><div className="flex items-start justify-between"><div><SectionLabel>Processing pipeline</SectionLabel><p className="mt-1 text-xs text-muted">Records by workflow stage</p></div><Upload size={15} className="text-[var(--accent)]" /></div><div className="mt-7 grid grid-cols-5 gap-1">{stages.map((stage, index) => <div key={stage.label} className="relative text-center">{index < stages.length - 1 && <span className="absolute left-1/2 top-5 h-px w-full bg-[var(--border-interactive)]" />}<span className="relative z-10 mx-auto flex size-10 items-center justify-center rounded-full border border-[var(--accent)]/35 bg-[var(--accent-soft)] text-[var(--accent)]"><stage.icon size={16} /></span><div className="mt-2 text-[10px] font-medium text-secondary">{stage.label}</div><div className="tabular mt-1 text-sm font-bold">{stage.count}</div></div>)}</div></GlassCard>;
}

function Throughput({ stats }: { stats: DashboardStats }) {
  const rows = stats.statusBreakdown.filter((item) => ["verified", "pending", "flagged", "rejected", "processing"].includes(item.status));
  const max = Math.max(...rows.map((item) => item.count), 1);
  return <GlassCard className="p-5"><div className="mb-5"><SectionLabel>Throughput by status</SectionLabel><p className="mt-1 text-xs text-muted">Current record distribution</p></div><div className="space-y-4">{rows.map((item) => <div key={item.status}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-secondary"><span className="size-2 rounded-full" style={{ background: STATUS_COLORS[item.status] }} />{STATUS_LABELS[item.status]}</span><span className="tabular font-semibold">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.05]"><motion.div initial={{ width: 0 }} animate={{ width: `${(item.count / max) * 100}%` }} transition={{ duration: .7 }} className="h-full rounded-full" style={{ background: STATUS_COLORS[item.status] }} /></div></div>)}</div></GlassCard>;
}

function DashboardLower({ stats }: { stats: DashboardStats }) {
  const trend = stats.ingestionTrend.map((item) => ({ ...item, day: formatDate(item.date, { day: "2-digit", month: "2-digit" }) }));
  const statusData = stats.statusBreakdown.filter((item) => item.count > 0).map((item) => ({ ...item, name: STATUS_LABELS[item.status], color: STATUS_COLORS[item.status] }));
  const maxDistrict = Math.max(...stats.districts.map((item) => item.count), 1);
  const total = stats.statusBreakdown.reduce((sum, item) => sum + item.count, 0);
  return <>
    <GlassCard className="mt-4 p-5"><div className="flex items-start justify-between"><div><SectionLabel>Ingestion trend · last 7 days</SectionLabel><p className="mt-1 text-xs text-muted">Records uploaded per day</p></div><span className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)]">Σ {stats.ingestionTrend.reduce((sum, item) => sum + item.count, 0)} ingested</span></div><div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}><defs><linearGradient id="dashboardTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={.32} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(148,163,184,0.07)" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 9.5, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 9.5, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="count" name="Ingested" stroke="var(--accent)" strokeWidth={2} fill="url(#dashboardTrend)" /></AreaChart></ResponsiveContainer></div></GlassCard>
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2"><GlassCard className="p-5"><div className="flex items-start justify-between"><div><SectionLabel>Status breakdown</SectionLabel><p className="mt-1 text-xs text-muted">Distribution across record lifecycle</p></div></div><div className="mt-3 flex items-center gap-5"><div className="relative h-44 w-44 shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="count" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={2} stroke="none">{statusData.map((entry) => <Cell key={entry.status} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="tabular text-2xl font-bold">{total}</span><span className="text-[10px] text-muted">TOTAL</span></div></div><div className="min-w-0 flex-1 space-y-2">{statusData.map((entry) => <div key={entry.status} className="flex items-center gap-2 text-xs"><span className="size-2 rounded-sm" style={{ background: entry.color }} /><span className="flex-1 text-secondary">{entry.name}</span><span className="tabular font-semibold">{entry.count}</span></div>)}</div></div></GlassCard><GlassCard className="p-5"><div className="flex items-start justify-between"><div><SectionLabel>District breakdown</SectionLabel><p className="mt-1 text-xs text-muted">Top districts by records</p></div><span className="text-[10px] text-muted">TOP {stats.districts.length}</span></div><div className="mt-5 space-y-3">{stats.districts.map((item) => <div key={item.district}><div className="mb-1 flex justify-between text-xs"><span className="font-medium">{item.district}</span><span className="tabular text-muted">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.05]"><motion.div initial={{ width: 0 }} animate={{ width: `${(item.count / maxDistrict) * 100}%` }} transition={{ duration: .65 }} className="h-full rounded-full bg-[var(--accent)]" /></div></div>)}</div></GlassCard></div>
  </>;
}

export function DashboardClient({ stats, firstName }: { stats: DashboardStats; firstName: string }) {
  const [timestamp, setTimestamp] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setTimestamp(new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date())), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const cards = useMemo(() => [
    { label: "Total records", value: stats.counts.total, change: stats.changes.total, icon: Database, color: "#10b981", href: "/records" },
    { label: "Verified", value: stats.counts.verified, change: stats.changes.verified, icon: ShieldCheck, color: "#22c55e", href: "/records?status=verified" },
    { label: "Pending review", value: stats.counts.pending, change: stats.changes.pending, icon: Clock3, color: "#f59e0b", href: "/records?status=pending,review", invert: true },
    { label: "Flagged", value: stats.counts.flagged, change: stats.changes.flagged, icon: Flag, color: "#ff9933", href: "/records?status=flagged" },
    { label: "Avg confidence", value: stats.avgConfidence, change: stats.changes.total, icon: Gauge, color: "#3b82f6", href: "/records?sort=confidence" },
    { label: "Added today", value: stats.addedToday, change: stats.changes.total, icon: CalendarPlus, color: "#8b5cf6", href: "/records" },
  ], [stats]);

  return <main className="mx-auto max-w-[1400px] p-4 md:p-6"><section className="relative isolate mb-5 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 py-6"><AmbientBackground variant="grid" density={18} /><div className="relative z-10 flex flex-wrap items-end justify-between gap-4"><div><SectionLabel>Dashboard</SectionLabel><h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Welcome back, {firstName}</h1><p className="mt-1 text-[13px] text-muted">Here&apos;s the land registry at a glance.</p></div><div className="flex items-center gap-2 text-[11px] text-muted"><span className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-400 anim-pulse-dot" />Live</span><span>as of {timestamp ?? "—"}</span></div></div></section><div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{cards.map((card) => <StatCard key={card.label} {...card} />)}</div><div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2"><ConfidenceDonut stats={stats} /><Pipeline stats={stats} /></div><div className="mt-4"><Throughput stats={stats} /></div><DashboardLower stats={stats} /></main>;
}
