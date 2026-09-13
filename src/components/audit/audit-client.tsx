"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search, ScrollText, Inbox, ArrowUpRight, Loader2,
} from "lucide-react";
import { cn, fmtDate } from "@/lib/utils";
import { GlassCard, inputCls, RelTime, EmptyState, SectionLabel } from "@/components/ui/atoms";
import type { AuditDTO } from "@/lib/queries";

const CATS = ["all", "ingest", "preprocess", "ocr", "ai", "review", "export", "system"];
const CAT_COLORS: Record<string, string> = {
  ingest: "#3b82f6", preprocess: "#64748b", ocr: "#8b5cf6", ai: "#06b6d4",
  review: "#22c55e", export: "#f59e0b", system: "#94a3b8", all: "#10b981",
};

export function AuditClient({ initialRows }: { initialRows: AuditDTO[] }) {
  const [rows, setRows] = useState(initialRows);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(80);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (c: string, query: string, lim: number) => {
    setLoading(true);
    const p = new URLSearchParams({ limit: String(lim) });
    if (c !== "all") p.set("category", c);
    if (query) p.set("q", query);
    const res = await fetch(`/api/activity?${p}`);
    if (res.ok) setRows((await res.json()).rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(cat, q, limit), 250);
    return () => clearTimeout(t);
  }, [cat, q, limit, load]);

  /* group by day */
  const groups = rows.reduce<{ day: string; items: AuditDTO[] }[]>((acc, e) => {
    const day = fmtDate(e.createdAt, { weekday: "short" });
    const last = acc[acc.length - 1];
    if (last && last.day === day) last.items.push(e);
    else acc.push({ day, items: [e] });
    return acc;
  }, []);

  return (
    <div className="mx-auto max-w-[1000px] p-4 md:p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Audit Trail</h1>
        <p className="mt-1 text-[13px] text-muted">Every action, immutably logged — <span className="tabular">{rows.length}</span> events loaded</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions, actors, record numbers…" className={cn(inputCls, "pl-9")} />
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-medium capitalize transition-all",
              cat === c ? "border-transparent text-black" : "border-[var(--border-subtle)] text-muted hover:text-secondary",
            )}
            style={cat === c ? { background: CAT_COLORS[c] } : undefined}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-12 w-full" />)}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <GlassCard>
          <EmptyState icon={<Inbox size={24} />} title="No events found" body="Adjust the category filter or search query to see more audit history." />
        </GlassCard>
      )}

      {!loading && groups.map((g, gi) => (
        <div key={g.day + gi} className="mb-5">
          <div className="sticky top-14 z-10 -mx-1 flex items-center gap-2 bg-transparent px-1 py-1.5">
            <span className="rounded-md border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted backdrop-blur-xl" style={{ background: "color-mix(in srgb, var(--bg-primary) 80%, transparent)" }}>
              {g.day}
            </span>
            <span className="tabular text-[10px] text-muted">{g.items.length} events</span>
            <span className="h-px flex-1 bg-[var(--border-subtle)]" />
          </div>
          <div className="space-y-1">
            {g.items.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
              >
                <GlassCard shine={false} className="flex items-start gap-3.5 px-4 py-3 transition-colors hover:bg-[var(--bg-card-hover)]">
                  <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${CAT_COLORS[e.category]}1c`, color: CAT_COLORS[e.category] }}>
                    <ScrollText size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium">{e.action}</span>
                      <span className="rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wider" style={{ background: `${CAT_COLORS[e.category]}1c`, color: CAT_COLORS[e.category] }}>
                        {e.category}
                      </span>
                    </div>
                    {e.details && <div className="mt-0.5 truncate text-xs text-muted">{e.details}</div>}
                    <div className="mt-1 flex items-center gap-2 text-[10.5px] text-muted">
                      <span className="font-medium text-secondary">{e.actor}</span>·
                      <RelTime iso={e.createdAt} />
                    </div>
                  </div>
                  {e.recordNo && (
                    <Link href={`/records/${e.recordNo}`} className="tabular flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-[10.5px] text-secondary transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)]">
                      {e.recordNo} <ArrowUpRight size={10} />
                    </Link>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {rows.length >= limit && (
        <div className="mt-2 flex justify-center">
          <button
            onClick={() => setLimit((l) => l + 80)}
            className="focus-ring flex items-center gap-2 rounded-xl border border-[var(--border-interactive)] px-4 py-2 text-xs font-medium text-secondary transition-colors hover:bg-white/[0.05] hover:text-current"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            Load older events
          </button>
        </div>
      )}
    </div>
  );
}
