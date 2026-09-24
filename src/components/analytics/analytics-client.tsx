"use client";

import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar, PolarRadiusAxis, Cell,
} from "recharts";
import { Download, Gauge, Layers, MapPinned, Users } from "lucide-react";
import { fmtDate } from "@/lib/utils";
import { GlassCard, SectionLabel, Button } from "@/components/ui/atoms";
import type { AnalyticsData } from "@/lib/queries";

const fade = (d: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: d, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
});

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-semibold">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="size-2 rounded-full" style={{ background: p.color ?? "var(--accent)" }} />
          <span className="capitalize text-secondary">{p.name}</span>
          <span className="tabular ml-2 font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

const KPI_ICONS = [Gauge, Layers, MapPinned, Users];
const FUNNEL_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#22c55e"];

export function AnalyticsClient({ data }: { data: AnalyticsData }) {
  const throughput = data.throughput.map((t) => ({ ...t, day: fmtDate(t.date, { day: "numeric", month: "short" }) }));
  const radarData = [
    { metric: "Speed", ...Object.fromEntries(data.officers.map((o) => [o.name, o.speed])) },
    { metric: "Accuracy", ...Object.fromEntries(data.officers.map((o) => [o.name, o.accuracy])) },
    { metric: "Volume", ...Object.fromEntries(data.officers.map((o) => [o.name, o.volume])) },
    { metric: "Review rate", ...Object.fromEntries(data.officers.map((o) => [o.name, o.review])) },
  ];
  const OFFICER_COLORS = ["#ff9933", "#10b981", "#8b5cf6", "#3b82f6"];
  const maxDistrict = Math.max(...data.districts.map((d) => d.total), 1);

  return (
    <div className="mx-auto max-w-[1400px] p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Analytics & Reports</h1>
          <p className="mt-1 text-[13px] text-muted">District digitization intelligence · last 30 days</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Download size={14} /> Export report
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((k, i) => {
          const Icon = KPI_ICONS[i % KPI_ICONS.length];
          return (
            <motion.div key={k.label} {...fade(i * 0.05)}>
              <GlassCard className="p-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon size={16} />
                  </div>
                  <span className="text-xs text-muted">{k.label}</span>
                </div>
                <div className="tabular mt-3 text-[26px] font-bold leading-none tracking-tight">{k.value}</div>
                <div className="mt-1.5 text-[11px] text-muted">{k.sub}</div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* throughput */}
        <motion.div {...fade(0.15)} className="lg:col-span-2">
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionLabel>Daily throughput — ingestion vs verification</SectionLabel>
              <div className="flex gap-3 text-[10.5px] text-muted">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#3b82f6]" /> ingested</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[var(--accent)]" /> verified</span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={throughput} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gVer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.07)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9.5, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 9.5, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(148,163,184,0.2)" }} />
                  <Area type="monotone" dataKey="ingested" stroke="#3b82f6" strokeWidth={1.8} fill="url(#gIn)" name="ingested" />
                  <Area type="monotone" dataKey="verified" stroke="var(--accent)" strokeWidth={2} fill="url(#gVer)" name="verified" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* funnel */}
        <motion.div {...fade(0.22)}>
          <GlassCard className="p-5">
            <SectionLabel>Processing funnel</SectionLabel>
            <div className="mt-4 space-y-3">
              {data.funnel.map((f, i) => (
                <div key={f.stage}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-secondary">{f.stage}</span>
                    <span className="tabular text-muted">{f.count} · {f.pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.045]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${f.pct}%` }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${FUNNEL_COLORS[i]}99, ${FUNNEL_COLORS[i]})` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-white/[0.02] p-2.5 text-[10.5px] leading-relaxed text-muted">
              {data.funnel[0].count - data.funnel[data.funnel.length - 1].count} records drop out between upload and verification —
              most stall at the validation stage with sub-85% confidence.
            </p>
          </GlassCard>
        </motion.div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* districts */}
        <motion.div {...fade(0.28)}>
          <GlassCard className="p-5">
            <SectionLabel>District breakdown</SectionLabel>
            <div className="mt-4 space-y-3">
              {data.districts.map((d, i) => (
                <div key={d.district} className="group">
                  <div className="mb-1 flex items-baseline justify-between text-[11.5px]">
                    <span className="font-medium">{d.district}</span>
                    <span className="tabular text-muted">{d.verified}/{d.total} verified</span>
                  </div>
                  <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full">
                    <motion.span initial={{ width: 0 }} animate={{ width: `${(d.verified / maxDistrict) * 100}%` }} transition={{ delay: 0.3 + i * 0.06 }} className="h-full rounded-l-full bg-[#22c55e]" />
                    <motion.span initial={{ width: 0 }} animate={{ width: `${(d.review / maxDistrict) * 100}%` }} transition={{ delay: 0.35 + i * 0.06 }} className="h-full bg-[#f59e0b]" />
                    <motion.span initial={{ width: 0 }} animate={{ width: `${(d.flagged / maxDistrict) * 100}%` }} transition={{ delay: 0.4 + i * 0.06 }} className="h-full bg-[#ff9933]" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-4 text-[10px] text-muted">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#22c55e]" /> verified</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#f59e0b]" /> in queue</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#ff9933]" /> flagged</span>
            </div>
          </GlassCard>
        </motion.div>

        {/* confidence hist */}
        <motion.div {...fade(0.34)}>
          <GlassCard className="p-5">
            <SectionLabel>Confidence histogram</SectionLabel>
            <div className="mt-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.confidenceHist} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.07)" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 8.5, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} interval={1} />
                  <YAxis tick={{ fontSize: 9.5, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
                  <Bar dataKey="count" name="records" radius={[4, 4, 0, 0]}>
                    {data.confidenceHist.map((b, i) => (
                      <Cell key={b.bucket} fill={i >= 8 ? "#22c55e" : i >= 6 ? "#f59e0b" : "#ef4444"} fillOpacity={0.55 + i * 0.045} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* officers radar */}
        <motion.div {...fade(0.4)}>
          <GlassCard className="p-5">
            <SectionLabel>Officer performance</SectionLabel>
            <div className="mt-2 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="rgba(148,163,184,0.12)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} />
                  <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                  {data.officers.map((o, i) => (
                    <Radar key={o.name} dataKey={o.name} stroke={OFFICER_COLORS[i % 4]} fill={OFFICER_COLORS[i % 4]} fillOpacity={0.12} strokeWidth={1.6} />
                  ))}
                  <Tooltip content={<ChartTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 text-[10px] text-muted">
              {data.officers.map((o, i) => (
                <span key={o.name} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: OFFICER_COLORS[i % 4] }} /> {o.name}
                </span>
              ))}
              {data.officers.length === 0 && <span>No review actions recorded yet.</span>}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
