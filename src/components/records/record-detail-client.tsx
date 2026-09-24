"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, ArrowLeft, ShieldCheck, Flag, XCircle, RotateCcw, Save, Lightbulb,
  ZoomIn, ZoomOut, Stamp, Check, Sparkles, FileText, Play, ClipboardCheck,
} from "lucide-react";
import { cn, fmtDateTime, confidenceBand } from "@/lib/utils";
import { StatusPill, Button, GlassCard, RelTime, SectionLabel } from "@/components/ui/atoms";
import { toast } from "@/lib/store";
import type { RecordDTO, AuditDTO } from "@/lib/queries";

type FieldDef = { key: string; label: string; mono?: boolean; confKey: string };
type ConfidenceTier = "high" | "medium" | "low";

const FIELDS: FieldDef[] = [
  { key: "ownerName", label: "Owner name", confKey: "owner" },
  { key: "fatherName", label: "Father / guardian", confKey: "owner" },
  { key: "khasraNo", label: "Khasra number", mono: true, confKey: "khasra" },
  { key: "areaValue", label: "Area", mono: true, confKey: "area" },
  { key: "village", label: "Village", confKey: "village" },
  { key: "district", label: "District", confKey: "village" },
  { key: "landType", label: "Land type", confKey: "mutation" },
  { key: "mutationType", label: "Mutation type", confKey: "mutation" },
];

const TIMELINE_COLORS: Record<string, string> = {
  ingest: "#3b82f6", preprocess: "#64748b", ocr: "#8b5cf6", ai: "#06b6d4",
  review: "#22c55e", export: "#f59e0b", system: "#94a3b8",
};

function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 85) return "high";
  if (confidence >= 70) return "medium";
  return "low";
}

const TIER_META: Record<ConfidenceTier, { color: string; label: string }> = {
  high: { color: "#22c55e", label: "High" },
  medium: { color: "#f59e0b", label: "Review" },
  low: { color: "#ef4444", label: "Low" },
};

export function RecordDetailClient({ record: initial, audits }: { record: RecordDTO; audits: AuditDTO[] }) {
  const router = useRouter();
  const [rec, setRec] = useState(initial);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [hoverField, setHoverField] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [leftPct, setLeftPct] = useState(46);
  const [dragging, setDragging] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [pipelineBusy, setPipelineBusy] = useState(false);
  const [validationBusy, setValidationBusy] = useState(false);
  const [validationSummary, setValidationSummary] = useState<string | null>(null);
  const [editedFields, setEditedFields] = useState<string[]>([]);

  const dirty = Object.keys(draft).length > 0;

  function fieldConf(def: FieldDef) {
    const meta = rec.extracted?.[def.confKey];
    return typeof meta?.confidence === "number" ? Math.round(meta.confidence) : rec.confidence;
  }

  const suggestions = useMemo(() => {
    const out: { id: string; text: string }[] = [];
    for (const def of FIELDS) {
      const c = fieldConf(def);
      if (c < 62 && !dismissed.includes(def.key)) {
        out.push({ id: def.key, text: `“${def.label}” extracted at ${c}% confidence — cross-check against the source scan before verifying.` });
      }
    }
    if (rec.areaValue <= 0.2 && !dismissed.includes("area-zero")) {
      out.push({ id: "area-zero", text: `Area of ${rec.areaValue} ${rec.areaUnit} is unusually small for a ${rec.landType} parcel — possible OCR decimal error.` });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec, dismissed]);

  async function saveFields() {
    if (!dirty) return;
    setSaving(true);
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(draft)) {
      body[k] = k === "areaValue" ? Number(v) : v;
    }
    const res = await fetch(`/api/records/${rec.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) return toast("error", "Save failed");
    const { record } = await res.json();
    setRec((p) => ({ ...p, ...record }));
    setDraft({});
    toast("success", "Corrections saved", "Change written to the audit trail.");
    router.refresh();
  }

  const action = useCallback(async (a: string) => {
    setBusyAction(a);
    const prev = rec;
    const statusMap: Record<string, string> = { verify: "verified", reject: "rejected", flag: "flagged", review: "review" };
    setRec((p) => ({ ...p, status: statusMap[a] ?? p.status }));
    const res = await fetch(`/api/records/${rec.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: a }),
    });
    setBusyAction(null);
    if (!res.ok) {
      setRec(prev);
      return toast("error", "Action failed");
    }
    const { record } = await res.json();
    setRec((p) => ({ ...p, ...record }));
    toast(
      a === "verify" ? "success" : a === "reject" || a === "flag" ? "warning" : "info",
      `${rec.recordNo} ${a === "verify" ? "verified" : a === "reject" ? "rejected" : a === "flag" ? "flagged for field verification" : "returned to review"}`,
    );
    router.refresh();
  }, [rec, router]);

  async function advancePipeline() {
    setPipelineBusy(true);
    const res = await fetch(`/api/records/${rec.id}/pipeline`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setPipelineBusy(false);
    if (!res.ok) return toast("error", "Pipeline step failed", data.error);
    setRec(data.record);
    toast("success", `Pipeline advanced to ${data.stage}`, "OCR and extraction progress has been recorded in the audit trail.");
  }

  async function runValidation() {
    setValidationBusy(true);
    const res = await fetch(`/api/records/${rec.id}/validate`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setValidationBusy(false);
    if (!res.ok) return toast("error", "Validation failed", data.error);
    setRec(data.record);
    setValidationSummary(`${data.checks.filter((check: { passed: boolean }) => check.passed).length}/${data.checks.length} checks passed`);
    toast(data.passed ? "success" : "warning", data.passed ? "Validation passed" : "Sent to review", data.checks.map((check: { label: string; passed: boolean }) => `${check.passed ? "✓" : "!"} ${check.label}`).join(" · "));
  }

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      const shortcut = event.key.toLowerCase();
      if (shortcut === "v" && !busyAction) void action("verify");
      if (shortcut === "f" && !busyAction) void action("flag");
      if (shortcut === "r" && !busyAction) void action("reject");
    }

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [action, busyAction]);

  function onDividerDrag(e: React.PointerEvent) {
    if (!dragging) return;
    const el = (e.currentTarget as HTMLElement).closest("[data-split]");
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftPct(Math.min(70, Math.max(30, pct)));
  }

  const confColor = confidenceBand(rec.confidence).color;

  return (
    <div className="mx-auto max-w-[1400px] p-4 md:p-6">
      {/* header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/records" className="focus-ring flex size-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] text-secondary transition-colors hover:bg-white/[0.05] hover:text-current">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="tabular text-lg font-bold tracking-tight md:text-xl">{rec.recordNo}</h1>
              <StatusPill status={rec.status} />
              {rec.stale && <span className="flex items-center gap-1 text-[11px] text-amber-400"><span className="size-1.5 rounded-full bg-amber-400 anim-pulse-dot" /> stale</span>}
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {rec.sourceDoc} · Khasra <span className="tabular">{rec.khasraNo}</span> · {rec.village}, {rec.district}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={pipelineBusy || rec.stage === "done"} onClick={advancePipeline}>
            <Play size={13} /> {pipelineBusy ? "Running…" : `Run ${rec.stage === "upload" ? "pre-process" : "next pipeline step"}`}
          </Button>
          <Button size="sm" variant="outline" disabled={validationBusy} onClick={runValidation}>
            <ClipboardCheck size={13} /> {validationBusy ? "Checking…" : "Validate"}
          </Button>
          {rec.status !== "review" && (
            <Button size="sm" variant="outline" disabled={!!busyAction} onClick={() => action("review")}>
              <RotateCcw size={14} /> To review
            </Button>
          )}
          <Button size="sm" variant="saffron" disabled={!!busyAction} onClick={() => action("flag")}>
            <Flag size={14} /> Flag
          </Button>
          <Button size="sm" variant="danger" disabled={!!busyAction} onClick={() => action("reject")}>
            <XCircle size={14} /> Reject
          </Button>
          <Button size="sm" variant="primary" disabled={!!busyAction} onClick={() => action("verify")}>
            <ShieldCheck size={14} /> {busyAction === "verify" ? "Verifying…" : "Verify record"}
          </Button>
          <span className="w-full text-right text-[10px] text-muted sm:w-auto"><kbd className="rounded border border-[var(--border-subtle)] px-1 py-0.5 font-mono">V</kbd> verify · <kbd className="rounded border border-[var(--border-subtle)] px-1 py-0.5 font-mono">F</kbd> flag · <kbd className="rounded border border-[var(--border-subtle)] px-1 py-0.5 font-mono">R</kbd> reject</span>
        </div>
      </div>

      {validationSummary && <div className="mb-4 rounded-lg border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-2 text-xs text-secondary"><ClipboardCheck size={13} className="mr-1.5 inline accent-text" /> Validation engine: <span className="font-semibold text-current">{validationSummary}</span></div>}

      {/* AI suggestions */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div initial={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 space-y-2 overflow-hidden">
            {suggestions.map((s) => (
              <motion.div key={s.id} layout exit={{ opacity: 0, x: 40 }} className="glass flex items-start gap-3 rounded-xl border-l-2 border-l-amber-400 px-4 py-3">
                <Lightbulb size={15} className="mt-0.5 shrink-0 text-amber-300" />
                <p className="flex-1 text-xs leading-relaxed text-secondary">
                  <span className="mr-1.5 rounded bg-amber-400/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-amber-300">AI suggestion</span>
                  {s.text}
                </p>
                <button onClick={() => setDismissed((d) => [...d, s.id])} className="text-[11px] font-medium text-muted hover:text-current">Dismiss</button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* split pane */}
      <div
        data-split
        onPointerMove={onDividerDrag}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
        className="grid grid-cols-1 gap-4 lg:grid-cols-none"
        style={{ gridTemplateColumns: undefined }}
      >
        <div className="hidden gap-4 lg:grid" style={{ gridTemplateColumns: `${leftPct}% 12px 1fr` }}>
          <DocumentPane rec={rec} zoom={zoom} setZoom={setZoom} hoverField={hoverField} />
          <div
            onPointerDown={(e) => { setDragging(true); (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
            className={cn("group flex cursor-col-resize items-center justify-center", dragging && "opacity-100")}
          >
            <div className={cn("h-16 w-1 rounded-full bg-[var(--border-interactive)] transition-colors group-hover:bg-[var(--accent)]", dragging && "bg-[var(--accent)]")} />
          </div>
          <DataPane
            rec={rec}
            draft={draft}
            setDraft={setDraft}
            setHoverField={setHoverField}
            fieldConf={fieldConf}
            saving={saving}
            dirty={dirty}
            saveFields={saveFields}
            confColor={confColor}
            editedFields={editedFields}
            setEditedFields={setEditedFields}
          />
        </div>
        {/* mobile stack */}
        <div className="space-y-4 lg:hidden">
          <DocumentPane rec={rec} zoom={zoom} setZoom={setZoom} hoverField={hoverField} />
          <DataPane
            rec={rec}
            draft={draft}
            setDraft={setDraft}
            setHoverField={setHoverField}
            fieldConf={fieldConf}
            saving={saving}
            dirty={dirty}
            saveFields={saveFields}
            confColor={confColor}
            editedFields={editedFields}
            setEditedFields={setEditedFields}
          />
        </div>
      </div>

      {/* audit timeline */}
      <GlassCard className="mt-4 p-5">
        <SectionLabel>Audit trail</SectionLabel>
        <div className="mt-4 space-y-0">
          {audits.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative flex gap-4 pb-5 last:pb-0"
            >
              {i < audits.length - 1 && <span className="absolute left-[7px] top-5 h-full w-px bg-[var(--border-subtle)]" />}
              <span className="relative z-10 mt-1 size-[15px] shrink-0 rounded-full border-2" style={{ borderColor: TIMELINE_COLORS[a.category], background: "var(--bg-primary)" }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="font-medium">{a.action}</span>
                  <span className="rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide" style={{ background: `${TIMELINE_COLORS[a.category]}1c`, color: TIMELINE_COLORS[a.category] }}>
                    {a.category}
                  </span>
                </div>
                {a.details && <div className="mt-0.5 text-xs text-muted">{a.details}</div>}
                <div className="mt-1 text-[10.5px] text-muted">
                  {a.actor} · <RelTime iso={a.createdAt} /> · {fmtDateTime(a.createdAt)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ------------------------------- document pane ------------------------------ */

function DocumentPane({
  rec, zoom, setZoom, hoverField,
}: {
  rec: RecordDTO; zoom: number; setZoom: (z: number) => void; hoverField: string | null;
}) {
  const band = confidenceBand(rec.confidence);
  return (
    <GlassCard className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2.5">
        <span className="flex items-center gap-2 text-xs font-medium text-secondary">
          <FileText size={13} /> Original document
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom(Math.max(0.6, zoom - 0.2))} className="rounded-md p-1.5 text-muted hover:bg-white/[0.06] hover:text-current" aria-label="Zoom out"><ZoomOut size={14} /></button>
          <span className="tabular w-10 text-center text-[11px] text-muted">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(2.2, zoom + 0.2))} className="rounded-md p-1.5 text-muted hover:bg-white/[0.06] hover:text-current" aria-label="Zoom in"><ZoomIn size={14} /></button>
          <span className="tabular ml-2 rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-muted">1 / 1</span>
        </div>
      </div>
      <div
        className="relative flex h-[520px] items-start justify-center overflow-auto p-6"
        style={{ background: "repeating-conic-gradient(rgba(255,255,255,0.016) 0% 25%, transparent 0% 50%) 0 0/22px 22px, #0c0c12" }}
      >
        {rec.status === "processing" ? (
          <div className="w-full max-w-[520px] animate-pulse space-y-4 rounded-md border border-[var(--border-subtle)] bg-white/[0.03] p-7">
            <div className="mx-auto h-4 w-3/4 rounded bg-white/[0.08]" />
            <div className="mx-auto h-px w-3/4 bg-white/[0.06]" />
            <div className="space-y-5 pt-4">
              {Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-4 rounded bg-white/[0.07]" style={{ width: `${72 - (index % 3) * 8}%` }} />)}
            </div>
          </div>
        ) : <motion.div
          animate={{ scale: zoom }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
          className="relative w-full max-w-[520px] origin-top"
        >
          {/* the "paper" */}
          <div className="relative overflow-hidden rounded-md border border-[#3a3527] text-[#e8e0c8] shadow-2xl" style={{ background: "linear-gradient(160deg,#2b2820 0%,#252219 60%,#211e16 100%)" }}>
            <div className="px-7 pb-16 pt-6">
              <div className="text-center">
                <div className="text-[9px] uppercase tracking-[0.3em] text-[#a99f7f]">Punjab Revenue Department · पंजाब भू-अभिलेख</div>
                <div className="mt-1 text-[15px] font-bold tracking-wide" style={{ fontFamily: "Georgia, serif" }}>जमाबंदी — RECORD OF RIGHTS</div>
                <div className="mx-auto mt-2 h-px w-3/4 bg-[#5a5340]" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-[13px] text-[11px]" style={{ fontFamily: "Georgia, serif" }}>
                <DocRow label="Owner / मालिक" value={rec.ownerName} />
                <div />
                <DocRow label="Father / पिता" value={rec.fatherName ?? "—"} />
                <div />
                <DocRow label="Khasra No." value={rec.khasraNo} mono />
                <DocRow label="Area / रकबा" value={`${rec.areaValue} ${rec.areaUnit}`} mono />
                <DocRow label="Village / गांव" value={rec.village} />
                <DocRow label="District / ज़िला" value={rec.district} />
                <DocRow label="Type / किस्म" value={rec.landType} cap />
                <DocRow label="Mutation / इंतकाल" value={rec.mutationType} cap />
              </div>
              <div className="absolute bottom-5 left-7 right-7 flex items-end justify-between">
                <div className="text-[9px] leading-relaxed text-[#8d8468]">
                  Digitally captured · OCR {band.label.toLowerCase()} confidence
                  <br />
                  <span className="tabular">{rec.recordNo}</span>
                </div>
                <div className="tricolor-line h-[2.5px] w-16 opacity-60" />
              </div>
            </div>
            {/* seal */}
            <div className="absolute right-6 top-14 flex size-20 rotate-[-14deg] items-center justify-center rounded-full border-2 opacity-70" style={{ borderColor: "rgba(34,197,94,0.5)" }}>
              <div className="flex size-16 items-center justify-center rounded-full border border-dashed" style={{ borderColor: "rgba(34,197,94,0.4)" }}>
                <Stamp size={20} className="text-emerald-500/70" />
              </div>
            </div>
            {/* Bounding boxes are rendered only when supplied by extraction metadata. */}
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
              {FIELDS.map((f) => {
                const box = rec.extracted?.[f.key]?.boundingBox ?? rec.extracted?.[f.confKey]?.boundingBox;
                if (!box) return null;
                return <motion.rect key={f.key} x={`${box.x}%`} y={`${box.y}%`} width={`${box.w}%`} height={`${box.h}%`} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" initial={{ opacity: 0 }} animate={{ opacity: hoverField === f.key || hoverField === f.confKey ? 1 : 0 }} transition={{ duration: 0.18 }} />;
              })}
            </svg>
            <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ background: "radial-gradient(circle at 30% 20%, white, transparent 55%)" }} />
          </div>
        </motion.div>
        }
      </div>
    </GlassCard>
  );
}

function DocRow({ label, value, mono, cap }: { label: string; value: string; mono?: boolean; cap?: boolean }) {
  return (
    <div>
      <div className="text-[8.5px] uppercase tracking-[0.14em] text-[#a99f7f]">{label}</div>
      <div className={cn("mt-0.5 border-b border-[#4a4433] pb-0.5 text-[12px] font-semibold", mono && "tabular", cap && "capitalize")}>{value}</div>
    </div>
  );
}

/* --------------------------------- data pane -------------------------------- */

function DataPane({
  rec, draft, setDraft, setHoverField, fieldConf, saving, dirty, saveFields, confColor, editedFields, setEditedFields,
}: {
  rec: RecordDTO;
  draft: Record<string, string>;
  setDraft: (d: Record<string, string>) => void;
  setHoverField: (v: string | null) => void;
  fieldConf: (def: FieldDef) => number;
  saving: boolean;
  dirty: boolean;
  saveFields: () => void;
  confColor: string;
  editedFields: string[];
  setEditedFields: (fields: string[]) => void;
}) {
  const c = rec.confidence;
  return (
    <GlassCard className="flex flex-col p-5">
      <div className="flex items-center justify-between">
        <SectionLabel>Extracted data</SectionLabel>
        <span className="flex items-center gap-1.5 text-[10px] text-muted">
          <Sparkles size={11} className="accent-text" /> editable — changes are audited
        </span>
      </div>

      {/* overall confidence */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs text-secondary">Overall AI confidence</span>
          <span className="tabular text-sm font-bold" style={{ color: confColor }}>{c}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${c}%` }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${confColor}88, ${confColor})` }}
          />
        </div>
      </div>

      <div className="mt-5 flex-1 space-y-3">
        {rec.status === "processing" ? Array.from({ length: FIELDS.length }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-xl border border-[var(--border-subtle)] p-2">
            <div className="mb-2 h-3 w-1/3 rounded bg-white/[0.08]" />
            <div className="h-9 rounded-lg bg-white/[0.06]" />
          </div>
        )) : FIELDS.map((def) => {
          const conf = fieldConf(def);
          const tier = confidenceTier(conf);
          const tierMeta = TIER_META[tier];
          const value = draft[def.key] ?? String((rec as unknown as Record<string, unknown>)[def.key] ?? "");
          return (
            <div
              key={def.key}
              onMouseEnter={() => setHoverField(def.key)}
              onMouseLeave={() => setHoverField(null)}
              onFocus={() => setHoverField(def.key)}
              onBlur={() => setHoverField(null)}
              className={cn("group rounded-xl border p-2 transition-all hover:border-[var(--border-subtle)] hover:bg-white/[0.025]", tier === "low" ? "border-red-500/30 bg-red-500/[0.06]" : "border-transparent")}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">{def.label}{editedFields.includes(def.key) && <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--accent)]">edited</span>}</span>
                <span className="flex items-center gap-1.5">
                  {tier === "medium" && <AlertTriangle size={12} className="text-amber-400" aria-label="Review recommended" />}
                  <span className="size-1.5 rounded-full" style={{ background: tierMeta.color, boxShadow: `0 0 6px ${tierMeta.color}` }} />
                  <span className="tabular text-[10px] font-semibold" style={{ color: tierMeta.color }}>{conf}%</span>
                </span>
              </div>
              <input
                value={value}
                onChange={(e) => { setDraft({ ...draft, [def.key]: e.target.value }); if (!editedFields.includes(def.key)) setEditedFields([...editedFields, def.key]); }}
                onFocus={() => setHoverField(def.key)}
                onBlur={() => setHoverField(null)}
                className={cn(
                  "focus-ring w-full rounded-lg border border-[var(--border-subtle)] bg-white/[0.03] px-2.5 py-1.5 text-[13px] transition-colors focus:border-[var(--accent)]",
                  def.mono && "tabular",
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
        <span className="text-[10.5px] text-muted">
          {dirty ? "Unsaved corrections" : `Verified fields lock automatically above 96%`}
        </span>
        <Button size="sm" variant={dirty ? "primary" : "outline"} disabled={!dirty || saving} onClick={saveFields}>
          {saving ? <span className="size-3.5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /> : <Save size={13} />}
          {saving ? "Saving…" : "Save corrections"}
        </Button>
      </div>

      {rec.status === "verified" && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
          <Check size={14} /> Verified {rec.verifiedAt ? `on ${fmtDateTime(rec.verifiedAt)}` : ""} — checksum anchored to audit ledger.
        </motion.div>
      )}
    </GlassCard>
  );
}
