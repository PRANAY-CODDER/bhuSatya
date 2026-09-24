"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, ChevronRight, FileText } from "lucide-react";
import { GlassCard, SectionLabel, StatusPill } from "@/components/ui/atoms";
import type { RecordDTO } from "@/lib/queries";
import { AmbientBackground } from "@/components/three/AmbientBackground";

export function ValidationQueueClient({ records, total }: { records: RecordDTO[]; total: number }) {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-[1400px] p-4 md:p-6">
      <header className="relative isolate mb-5 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 py-5">
        <AmbientBackground variant="grid" density={16} />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-3"><div>
          <div className="mb-2 flex items-center gap-2 text-[var(--accent)]"><ClipboardCheck size={17} /><SectionLabel>Review workflow</SectionLabel></div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Validation queue</h1>
          <p className="mt-1 text-[13px] text-muted"><span className="tabular text-secondary">{total}</span> records awaiting OCR and AI extraction validation</p>
        </div>
        <div className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] text-[var(--accent)]">Lowest confidence first</div>
        </div>
      </header>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead><tr className="border-b border-[var(--border-subtle)] bg-white/[0.02]">
              <th className="px-4 py-3"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Record</span></th>
              <th className="px-3 py-3"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Owner</span></th>
              <th className="px-3 py-3"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Village · District</span></th>
              <th className="px-3 py-3"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Stage</span></th>
              <th className="px-3 py-3"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">AI confidence</span></th>
              <th className="w-12 px-3 py-3" />
            </tr></thead>
            <tbody>
              {records.map((record, index) => {
                const color = record.confidence >= 85 ? "#22c55e" : record.confidence >= 70 ? "#f59e0b" : "#ef4444";
                return <tr key={record.id} onClick={() => router.push(`/validation/${record.id}`)} className={`group cursor-pointer border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--accent-soft)]/60 ${index % 2 === 1 ? "bg-white/[0.015]" : ""}`}>
                  <td className="px-4 py-3"><Link href={`/validation/${record.id}`} className="flex items-center gap-2 font-semibold hover:text-[var(--accent)]"><FileText size={14} className="text-muted" /><span className="tabular">{record.recordNo}</span></Link><div className="mt-1 text-[10px] text-muted">{record.sourceDoc}</div></td>
                  <td className="px-3 py-3"><div className="font-medium">{record.ownerName}</div><div className="text-[10.5px] text-muted">Khasra {record.khasraNo}</div></td>
                  <td className="px-3 py-3"><div>{record.village}</div><div className="text-[10.5px] text-muted">{record.district}</div></td>
                  <td className="px-3 py-3"><StatusPill status={record.status} /></td>
                  <td className="px-3 py-3"><span className="flex items-center gap-2"><span className="size-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 7px ${color}` }} /><span className="tabular text-xs font-semibold" style={{ color }}>{record.confidence}%</span></span></td>
                  <td className="px-3 py-3"><Link href={`/validation/${record.id}`} aria-label={`Open ${record.recordNo}`} className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-white/[0.06] hover:text-current"><ChevronRight size={16} /></Link></td>
                </tr>;
              })}
              {records.length === 0 && <tr><td colSpan={6} className="px-4 py-16 text-center text-xs text-muted">No records are waiting for validation.</td></tr>}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </main>
  );
}
