"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clipboard, ClipboardCheck, Copy, Flag, FileText, Lightbulb, ShieldCheck, X, XCircle, ZoomIn, ZoomOut } from "lucide-react";
import { Button, GlassCard, SectionLabel, StatusPill, inputCls } from "@/components/ui/atoms";
import { cn } from "@/lib/utils";
import type { RecordDTO } from "@/lib/queries";
import { AmbientBackground } from "@/components/three/AmbientBackground";

type Field = { key: keyof RecordDTO; label: string; confKey: string; mono?: boolean };
type Suggestion = { id: string; fieldKey: keyof RecordDTO; suggestedValue: string; reason: string };

const FIELDS: Field[] = [
  { key: "ownerName", label: "Owner name", confKey: "owner" },
  { key: "fatherName", label: "Father / guardian", confKey: "owner" },
  { key: "khasraNo", label: "Khasra number", confKey: "khasra", mono: true },
  { key: "areaValue", label: "Area", confKey: "area", mono: true },
  { key: "village", label: "Village", confKey: "village" },
  { key: "district", label: "District", confKey: "village" },
  { key: "landType", label: "Land type", confKey: "mutation" },
  { key: "mutationType", label: "Mutation type", confKey: "mutation" },
];

const fieldValue = (record: RecordDTO, key: keyof RecordDTO) => String(record[key] ?? "");
function confidence(record: RecordDTO, field: Field): number {
  const meta = record.extracted?.[field.confKey];
  return typeof meta?.confidence === "number" ? Math.round(meta.confidence) : record.confidence;
}
function confidenceColor(value: number): string {
  return value >= 85 ? "#22c55e" : value >= 70 ? "#f59e0b" : "#ef4444";
}
function mockSuggestions(record: RecordDTO): Suggestion[] {
  return FIELDS.flatMap((field) => {
    const value = fieldValue(record, field.key);
    const score = confidence(record, field);
    if (score >= 85) return [];
    return [{ id: `suggest-${String(field.key)}`, fieldKey: field.key, suggestedValue: value || "Needs manual review", reason: value ? `${field.label} was extracted at ${score}% confidence. Compare it against the scan.` : `${field.label} appears to be missing from the extraction.` }];
  });
}

export function ValidationDetailClient({ record: initial }: { record: RecordDTO }) {
  const [record, setRecord] = useState(initial);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState(1);
  const [suggestionsOn, setSuggestionsOn] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copyState, setCopyState] = useState(false);

  const scoringComplete = record.stage === "validation" || record.stage === "done" || record.status === "review";
  const suggestions = scoringComplete ? mockSuggestions(record).filter((item) => !dismissed.includes(item.id)) : [];
  const dirty = Object.keys(draft).length > 0;
  const displayedValue = (field: Field) => draft[field.key] ?? fieldValue(record, field.key);

  async function updateRecord(body: Record<string, unknown>, action?: string) {
    setBusyAction(action ?? "save");
    const response = await fetch(`/api/records/${record.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    setBusyAction(null);
    if (response.ok && data.record) { setRecord(data.record); setDraft({}); }
  }

  async function runValidation() {
    setBusyAction("validate");
    const response = await fetch(`/api/records/${record.id}/validate`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setBusyAction(null);
    if (response.ok && data.record) setRecord(data.record);
  }

  async function applySuggestion(suggestion: Suggestion) {
    setDraft((current) => ({ ...current, [suggestion.fieldKey]: suggestion.suggestedValue }));
    setDismissed((current) => [...current, suggestion.id]);
    await fetch(`/api/records/${record.id}/suggestions/${suggestion.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "apply", value: suggestion.suggestedValue }) });
  }

  async function dismissSuggestion(suggestion: Suggestion) {
    setDismissed((current) => [...current, suggestion.id]);
    await fetch(`/api/records/${record.id}/suggestions/${suggestion.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dismiss" }) });
  }

  async function copyOcr() {
    await navigator.clipboard.writeText(record.ocrText ?? "No OCR text available.");
    setCopyState(true);
    window.setTimeout(() => setCopyState(false), 1200);
  }

  return (
    <main className="mx-auto max-w-[1500px] p-4 md:p-6">
      <header className="relative isolate mb-4 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-4"><AmbientBackground variant="grid" density={16} /><div className="relative z-10 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Link href="/validation" className="focus-ring flex size-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] text-secondary hover:bg-white/[0.05]"><ArrowLeft size={16} /></Link><div><div className="flex items-center gap-2.5"><h1 className="tabular text-lg font-bold tracking-tight md:text-xl">{record.recordNo}</h1><StatusPill status={record.status} /></div><p className="mt-0.5 text-xs text-muted">{record.sourceDoc} · {record.village}, {record.district}</p></div></div>
        <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!!busyAction} onClick={() => void runValidation()}><ClipboardCheckIcon /> {busyAction === "validate" ? "Checking…" : "Validate"}</Button><Button size="sm" variant="saffron" disabled={!!busyAction} onClick={() => void updateRecord({ action: "flag" }, "flag")}><Flag size={14} /> Flag</Button><Button size="sm" variant="danger" disabled={!!busyAction} onClick={() => void updateRecord({ action: "reject" }, "reject")}><XCircle size={14} /> Reject</Button><Button size="sm" variant="primary" disabled={!!busyAction} onClick={() => void updateRecord({ action: "verify" }, "verify")}><ShieldCheck size={14} /> {busyAction === "verify" ? "Verifying…" : "Verify record"}</Button></div></div>
      </header>

      {suggestionsOn && suggestions.length > 0 && <div className="mb-4 space-y-2">{suggestions.map((suggestion) => <div key={suggestion.id} className="glass flex flex-wrap items-center gap-3 rounded-xl border-l-2 border-l-amber-400 px-4 py-3"><Lightbulb size={15} className="shrink-0 text-amber-300" /><p className="min-w-0 flex-1 text-xs leading-relaxed text-secondary"><span className="mr-1.5 rounded bg-amber-400/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-amber-300">AI suggestion</span> AI suggests <span className="font-semibold text-current">{suggestion.fieldKey}</span> → <span className="font-semibold text-current">{suggestion.suggestedValue}</span>. {suggestion.reason}</p><Button size="xs" variant="success" onClick={() => void applySuggestion(suggestion)}><Check size={12} /> Apply</Button><Button size="xs" variant="ghost" onClick={() => void dismissSuggestion(suggestion)}><X size={13} /> Dismiss</Button></div>)}</div>}

      <div className="mb-4 flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] px-3.5 py-2.5"><span className="flex items-center gap-2 text-xs text-secondary"><Lightbulb size={14} className="text-amber-300" /> AI suggestions</span><button type="button" role="switch" aria-checked={suggestionsOn} onClick={() => setSuggestionsOn((value) => !value)} className={cn("relative h-5 w-9 rounded-full transition-colors", suggestionsOn ? "bg-[var(--accent)]" : "bg-white/[0.12]")}><span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", suggestionsOn ? "left-[18px]" : "left-0.5")} /></button></div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(280px,.8fr)_minmax(340px,.95fr)]">
        <GlassCard className="overflow-hidden"><PaneHeader icon={<FileText size={13} />} title="Original document"><div className="flex items-center gap-1.5"><button onClick={() => setZoom(Math.max(.6, zoom - .2))} className="rounded-md p-1.5 text-muted hover:bg-white/[.06]" aria-label="Zoom out"><ZoomOut size={14} /></button><span className="tabular w-10 text-center text-[11px] text-muted">{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(Math.min(2.2, zoom + .2))} className="rounded-md p-1.5 text-muted hover:bg-white/[.06]" aria-label="Zoom in"><ZoomIn size={14} /></button></div></PaneHeader><div className="flex h-[590px] items-start justify-center overflow-auto p-6" style={{ background: "repeating-conic-gradient(rgba(255,255,255,.016) 0% 25%, transparent 0% 50%) 0 0/22px 22px, #0c0c12" }}><div className="w-full max-w-[510px] origin-top rounded-md border border-[#3a3527] p-7 text-[#e8e0c8] shadow-2xl" style={{ transform: `scale(${zoom})`, background: "linear-gradient(160deg,#2b2820,#211e16)" }}><div className="text-center text-[10px] uppercase tracking-[.25em] text-[#a99f7f]">Punjab Revenue Department</div><div className="mt-2 border-b border-[#5a5340] pb-3 text-center text-base font-bold">JAMABANDI · RECORD OF RIGHTS</div><div className="mt-6 space-y-5 text-xs">{FIELDS.slice(0, 6).map((field) => <div key={String(field.key)} className="border-b border-[#4a4433] pb-1"><div className="text-[9px] uppercase tracking-[.14em] text-[#a99f7f]">{field.label}</div><div className="mt-1 font-semibold">{displayedValue(field)}</div></div>)}</div><div className="mt-16 text-[9px] text-[#8d8468]">Digitally captured · OCR confidence {record.confidence}%</div></div></div></GlassCard>

        <GlassCard className="flex min-h-[650px] flex-col p-5"><PaneHeader icon={<FileText size={13} />} title="Raw OCR text"><div className="flex items-center gap-2"><span className="tabular text-xs font-semibold" style={{ color: confidenceColor(record.confidence) }}>{record.confidence}%</span><button onClick={() => void copyOcr()} className="flex items-center gap-1 rounded-md border border-[var(--border-interactive)] px-2 py-1 text-[10px] text-secondary hover:bg-white/[.05]"><Copy size={11} /> {copyState ? "Copied" : "Copy text"}</button></div></PaneHeader><div className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-white/[.02] px-3 py-2 text-[11px] text-muted"><span className="size-1.5 rounded-full" style={{ background: confidenceColor(record.confidence) }} /> OCR confidence <span className="tabular font-semibold" style={{ color: confidenceColor(record.confidence) }}>{record.confidence}%</span></div><pre className="mt-4 flex-1 whitespace-pre-wrap rounded-xl border border-[var(--border-subtle)] bg-black/10 p-4 font-mono text-[11px] leading-6 text-secondary">{record.ocrText ?? "No OCR text is available for this record yet."}</pre></GlassCard>

        <GlassCard className="flex min-h-[650px] flex-col p-5"><PaneHeader icon={<Clipboard size={13} />} title="AI-extracted fields"><span className="text-[10px] text-muted">Field · value · confidence</span></PaneHeader><div className="mt-4 flex-1 space-y-3">{FIELDS.map((field) => { const score = confidence(record, field); const color = confidenceColor(score); return <div key={String(field.key)} className={cn("rounded-xl border p-2", score < 70 ? "border-red-500/30 bg-red-500/[.06]" : "border-[var(--border-subtle)] bg-white/[.02]")}><div className="mb-1.5 flex items-center justify-between"><span className="text-[11px] font-medium text-muted">{field.label}</span><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} /><span className="tabular text-[10px] font-semibold" style={{ color }}>{score}%</span></span></div><input value={displayedValue(field)} onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))} className={cn(inputCls, "text-[13px]", field.mono && "tabular")} /></div>; })}</div><div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-4"><span className="text-[10.5px] text-muted">{dirty ? "Unsaved corrections" : "Changes are audited"}</span><Button size="sm" variant={dirty ? "primary" : "outline"} disabled={!dirty || !!busyAction} onClick={() => void updateRecord(draft)}>{busyAction === "save" ? "Saving…" : "Save corrections"}</Button></div></GlassCard>
      </div>
    </main>
  );
}

function PaneHeader({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 text-xs font-medium text-secondary"><span className="flex items-center gap-2">{icon}{title}</span>{children}</div>;
}
function ClipboardCheckIcon() { return <ClipboardCheck size={13} />; }
