"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, Plus, Download, ChevronDown, ChevronLeft, ChevronRight,
  Eye, ShieldCheck, Flag, Trash2, RotateCcw, AlarmClock, ArrowUpDown, Check,
  FileScan, X, Database, MapPin,
} from "lucide-react";
import { cn, fmtDate, confidenceBand } from "@/lib/utils";
import {
  StatusPill, ConfidenceRadial, Button, Dropdown, MenuItem, MenuDivider,
  Modal, Field, inputCls, EmptyState, RelTime,
} from "@/components/ui/atoms";
import { toast } from "@/lib/store";
import type { RecordDTO } from "@/lib/queries";

type Filters = {
  q: string;
  status: string[];
  districts: string[];
  minConf: number;
  from: string;
  to: string;
};

const ALL_STATUS = ["verified", "review", "pending", "processing", "flagged", "rejected"];
const PAGE_SIZE = 12;

/* ------------------------------- new record -------------------------------- */

function NewRecordModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (r: RecordDTO) => void }) {
  const [f, setF] = useState({ sourceDoc: "Handwritten register" });
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  function set(k: string, v: string) { setF((p) => ({ ...p, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const body = new FormData();
    Object.entries(f).forEach(([key, value]) => body.append(key, value));
    if (file) body.append("document", file);
    const res = await fetch("/api/records", { method: "POST", body });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return toast("error", "Could not create record", data.error);
    toast("success", `${data.record.recordNo} ingested`, "OCR pipeline started — watch it move through the stages.");
    onCreated(data.record);
    onClose();
  }

  const sel = inputCls;
  return (
    <Modal open={open} onClose={onClose} title="Ingest new land record" width={620}>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-2.5 text-xs leading-relaxed text-secondary sm:col-span-2">
          <span className="font-semibold text-current">Handwritten register scanner</span> · Upload a scanned handwritten land register as PDF or image. The OCR + AI/NLP pipeline will extract fields, calculate confidence scores, and route low-confidence records to review.
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] px-3 py-3 text-xs text-secondary sm:col-span-2">
          <div className="font-semibold text-current">No manual data entry required</div>
          <div className="mt-1 leading-relaxed text-muted">OCR reads the uploaded scan, AI/NLP extracts owner, khasra, area, village, district and mutation fields, then assigns confidence scores for review.</div>
        </div>
        <Field label="Register PDF / image" hint="PDF, JPG, PNG or WebP up to 10 MB">
          <input
            required
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className={cn(sel, "file:mr-2 file:rounded-md file:border-0 file:bg-[var(--accent-soft)] file:px-2 file:py-1 file:text-xs")}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <div className="flex items-end justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Ingesting…" : "Ingest & run OCR"} <FileScan size={14} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------ filter panel -------------------------------- */

function FilterPanel({
  open, filters, setFilters, districts, onApply, onReset,
}: {
  open: boolean;
  filters: Filters;
  setFilters: (f: Filters) => void;
  districts: string[];
  onApply: () => void;
  onReset: () => void;
}) {
  const [dQ, setDQ] = useState("");
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="glass mt-3 rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Filters</span>
              <button onClick={onReset} className="flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline">
                <RotateCcw size={11} /> Reset all
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="mb-2 text-xs font-medium text-secondary">Status</div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_STATUS.map((s) => {
                    const on = filters.status.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() =>
                          setFilters({ ...filters, status: on ? filters.status.filter((x) => x !== s) : [...filters.status, s] })
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition-all",
                          on ? "border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border-subtle)] text-muted hover:text-secondary",
                        )}
                      >
                        {on && <Check size={10} className="mr-1 inline" />}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium text-secondary">District</div>
                <div className="relative mb-1.5">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input value={dQ} onChange={(e) => setDQ(e.target.value)} placeholder="Search districts…" className={cn(inputCls, "py-1.5 pl-7 text-xs")} />
                </div>
                <div className="max-h-28 space-y-0.5 overflow-y-auto pr-1">
                  {districts.filter((d) => d.toLowerCase().includes(dQ.toLowerCase())).map((d) => {
                    const on = filters.districts.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => setFilters({ ...filters, districts: on ? filters.districts.filter((x) => x !== d) : [...filters.districts, d] })}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-secondary transition-colors hover:bg-white/[0.05]"
                      >
                        <span className={cn("flex size-3.5 items-center justify-center rounded border", on ? "border-[var(--accent)] bg-[var(--accent)] text-black" : "border-[var(--border-interactive)]")}>
                          {on && <Check size={10} strokeWidth={3.5} />}
                        </span>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium text-secondary">Min. AI confidence — <span className="tabular font-semibold text-[var(--accent)]">{filters.minConf}%</span></div>
                <input type="range" min={0} max={100} value={filters.minConf} onChange={(e) => setFilters({ ...filters, minConf: Number(e.target.value) })} className="mt-3 w-full" />
                <div className="mt-3 flex justify-between text-[10px] text-muted"><span>0</span><span>50</span><span>100</span></div>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium text-secondary">Ingested between</div>
                <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className={cn(inputCls, "mb-2 py-1.5 text-xs [color-scheme:dark]")} />
                <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className={cn(inputCls, "py-1.5 text-xs [color-scheme:dark]")} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
              <Button variant="outline" size="sm" onClick={onReset}>Clear</Button>
              <Button variant="primary" size="sm" onClick={onApply}>Apply filters</Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------- row actions -------------------------------- */

function RowActions({
  rec, busy, onAction, onDelete, onView,
}: {
  rec: RecordDTO;
  busy: boolean;
  onAction: (r: RecordDTO, action: string) => void;
  onDelete: (r: RecordDTO) => void;
  onView: (r: RecordDTO) => void;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      width={190}
      trigger={
        <Button variant="ghost" size="xs" disabled={busy} aria-label="Row actions">
          {busy ? <span className="size-3.5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /> : <ChevronDown size={14} />}
        </Button>
      }
    >
      <div className="py-1">
        <MenuItem icon={<Eye size={14} />} label="Open reviewer" shortcut="↵" onClick={() => { close(); onView(rec); }} />
        <MenuItem icon={<MapPin size={14} />} label="Show on map" onClick={() => { close(); window.location.href = `/map?focus=${rec.recordNo}`; }} />
        <MenuDivider />
        {rec.status !== "verified" && <MenuItem icon={<ShieldCheck size={14} />} label="Verify" onClick={() => { close(); onAction(rec, "verify"); }} />}
        <MenuItem icon={<Flag size={14} className="text-[#ff9933]" />} label="Flag for field check" onClick={() => { close(); onAction(rec, "flag"); }} />
        {rec.status !== "review" && <MenuItem icon={<RotateCcw size={14} />} label="Send to review" onClick={() => { close(); onAction(rec, "review"); }} />}
        <MenuDivider />
        <MenuItem icon={<Trash2 size={14} />} label="Delete" danger onClick={() => { close(); onDelete(rec); }} />
      </div>
    </Dropdown>
  );
}

function SortHeader({
  col,
  label,
  className,
  sort,
  onSort,
}: {
  col: string;
  label: string;
  className?: string;
  sort: { col: string; order: "asc" | "desc" };
  onSort: (col: string) => void;
}) {
  return (
    <button onClick={() => onSort(col)} className={cn("group inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-secondary", className)}>
      {label}
      <motion.span animate={{ rotate: sort.col === col && sort.order === "asc" ? 180 : 0 }}>
        <ArrowUpDown size={10} className={cn(sort.col === col ? "text-[var(--accent)]" : "opacity-40 group-hover:opacity-80")} />
      </motion.span>
    </button>
  );
}

/* -------------------------------- main client ------------------------------- */

export function RecordsClient({
  initialRows, initialTotal, districts, initialStatus, initialMinConf, initialMaxConf, openNew,
}: {
  initialRows: RecordDTO[];
  initialTotal: number;
  districts: string[];
  initialStatus: string;
  initialMinConf: string;
  initialMaxConf: string;
  openNew: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    q: "",
    status: initialStatus ? initialStatus.split(",") : [],
    districts: [],
    minConf: initialMinConf ? Number(initialMinConf) : 0,
    from: "",
    to: "",
  });
  const [applied, setApplied] = useState<Filters>(filters);
  const [sort, setSort] = useState<{ col: string; order: "asc" | "desc" }>({ col: "createdAt", order: "desc" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(openNew);
  const [delTarget, setDelTarget] = useState<RecordDTO | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const maxConf = initialMaxConf ? Number(initialMaxConf) : undefined;
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFilterCount =
    applied.status.length + applied.districts.length + (applied.minConf > 0 ? 1 : 0) + (applied.from ? 1 : 0) + (applied.to ? 1 : 0) + (applied.q ? 1 : 0);

  const load = useCallback(async (f: Filters, pg: number, srt = sort) => {
    setLoading(true);
    const p = new URLSearchParams();
    if (f.q) p.set("q", f.q);
    if (f.status.length) p.set("status", f.status.join(","));
    if (f.districts.length) p.set("districts", f.districts.join(","));
    if (f.minConf > 0) p.set("minConf", String(f.minConf));
    if (maxConf !== undefined) p.set("maxConf", String(maxConf));
    if (f.from) p.set("from", f.from);
    if (f.to) p.set("to", f.to);
    p.set("sort", srt.col);
    p.set("order", srt.order);
    p.set("page", String(pg));
    p.set("pageSize", String(PAGE_SIZE));
    const res = await fetch(`/api/records?${p}`);
    if (res.ok) {
      const d = await res.json();
      setRows(d.rows);
      setTotal(d.total);
    }
    setLoading(false);
  }, [sort, maxConf]);

  /* refresh when server payload changes (navigation with new searchParams) */
  useEffect(() => {
    const refreshTimer = setTimeout(() => {
      const status = initialStatus ? initialStatus.split(",") : [];
      setRows(initialRows);
      setTotal(initialTotal);
      setNewOpen(openNew);
      setFilters((f) => ({ ...f, status }));
      setApplied((f) => ({ ...f, status }));
    }, 0);
    return () => clearTimeout(refreshTimer);
  }, [initialRows, initialTotal, initialStatus, openNew]);

  function applyFilters() {
    setApplied(filters);
    setPage(1);
    setFiltersOpen(false);
    load(filters, 1);
  }
  function resetFilters() {
    const empty: Filters = { q: applied.q, status: [], districts: [], minConf: 0, from: "", to: "" };
    setFilters(empty);
    setApplied(empty);
    setPage(1);
    load(empty, 1);
  }
  function onSearch(v: string) {
    setFilters((f) => ({ ...f, q: v }));
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setApplied((a) => {
        const next = { ...a, q: v };
        load(next, 1);
        return next;
      });
      setPage(1);
    }, 350);
  }
  function toggleSort(col: string) {
    const next = sort.col === col ? { col, order: sort.order === "asc" ? "desc" as const : "asc" as const } : { col, order: "desc" as const };
    setSort(next);
    load(applied, page, next);
  }
  function gotoPage(p: number) {
    setPage(p);
    load(applied, p);
  }

  /* optimistic single-row action */
  async function rowAction(rec: RecordDTO, action: string) {
    setBusyIds((s) => new Set(s).add(rec.id));
    const prev = rows;
    const statusMap: Record<string, string> = { verify: "verified", flag: "flagged", review: "review" };
    setRows((rs) => rs.map((r) => (r.id === rec.id ? { ...r, status: statusMap[action] ?? r.status } : r)));
    const res = await fetch(`/api/records/${rec.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyIds((s) => { const n = new Set(s); n.delete(rec.id); return n; });
    if (!res.ok) {
      setRows(prev);
      return toast("error", "Action failed", "The record was restored.");
    }
    const { record } = await res.json();
    setRows((rs) => rs.map((r) => (r.id === rec.id ? { ...r, ...record } : r)));
    toast(action === "verify" ? "success" : action === "flag" ? "warning" : "info",
      `${rec.recordNo} ${action === "verify" ? "verified" : action === "flag" ? "flagged" : "moved to review"}`,
      `${rec.ownerName} · Khasra ${rec.khasraNo}`);
    router.refresh();
  }

  async function confirmDelete() {
    const rec = delTarget;
    if (!rec) return;
    setDelTarget(null);
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== rec.id));
    setTotal((t) => t - 1);
    const res = await fetch(`/api/records/${rec.id}`, { method: "DELETE" });
    if (!res.ok) {
      setRows(prev);
      setTotal((t) => t + 1);
      return toast("error", "Delete failed", "The record was restored.");
    }
    toast("error", `${rec.recordNo} deleted`, "Audit entry recorded.");
  }

  /* bulk actions */
  async function bulk(action: string) {
    const ids = [...selected];
    setSelected(new Set());
    if (action === "delete") {
      const prev = rows;
      setRows((rs) => rs.filter((r) => !ids.includes(r.id)));
      const res = await fetch("/api/records/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, action }) });
      if (!res.ok) setRows(prev);
      toast(res.ok ? "success" : "error", `Bulk delete ${res.ok ? "complete" : "failed"}`, `${ids.length} records`);
      return;
    }
    if (action === "export") {
      window.open("/api/records?format=csv", "_blank");
      return;
    }
    const statusMap: Record<string, string> = { verify: "verified", approve: "verified", flag: "flagged", reject: "rejected" };
    const prev = rows;
    setRows((rs) => rs.map((r) => (ids.includes(r.id) ? { ...r, status: statusMap[action] ?? r.status } : r)));
    const res = await fetch("/api/records/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, action }) });
    if (!res.ok) {
      setRows(prev);
      return toast("error", "Bulk action failed");
    }
    toast("success", `Bulk ${action} complete`, `${ids.length} records updated.`);
    load(applied, page);
    router.refresh();
  }

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-[1400px] p-4 md:p-6">
      {/* header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Records Repository</h1>
          <p className="mt-1 text-[13px] text-muted">
            <span className="tabular text-secondary">{total}</span> digitized land records across <span className="tabular text-secondary">{districts.length}</span> districts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open("/api/records?format=csv", "_blank")}>
            <Download size={14} /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open("/api/records?format=xlsx", "_blank")}>
            <Download size={14} /> Excel
          </Button>
          <Button variant="primary" size="sm" onClick={() => setNewOpen(true)}>
            <Plus size={14} /> New record
          </Button>
        </div>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            defaultValue=""
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search owner, khasra, record no, village…"
            className={cn(inputCls, "pl-9")}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setFiltersOpen(!filtersOpen)} className={cn(filtersOpen && "border-[var(--accent)]/50 text-[var(--accent)]")}>
          <SlidersHorizontal size={13} /> Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-black" style={{ background: "var(--accent)" }}>
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      <FilterPanel
        open={filtersOpen}
        filters={filters}
        setFilters={setFilters}
        districts={districts}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      {/* table */}
      <motion.div layout className="glass mt-4 overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-white/[0.02]">
                <th className="w-10 px-4 py-3">
                  <button
                    onClick={() => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)))}
                    className={cn("flex size-4 items-center justify-center rounded border transition-all", allChecked ? "border-[var(--accent)] bg-[var(--accent)] text-black" : "border-[var(--border-interactive)]")}
                    aria-label="Select all"
                  >
                    {allChecked && <Check size={11} strokeWidth={3.5} />}
                  </button>
                </th>
                <th className="px-3 py-3"><SortHeader col="recordNo" label="Record" sort={sort} onSort={toggleSort} /></th>
                <th className="px-3 py-3"><SortHeader col="owner" label="Owner" sort={sort} onSort={toggleSort} /></th>
                <th className="px-3 py-3"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Khasra</span></th>
                <th className="px-3 py-3"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Village · District</span></th>
                <th className="px-3 py-3"><SortHeader col="area" label="Area" sort={sort} onSort={toggleSort} /></th>
                <th className="px-3 py-3"><SortHeader col="confidence" label="AI Conf." sort={sort} onSort={toggleSort} /></th>
                <th className="px-3 py-3"><SortHeader col="status" label="Status" sort={sort} onSort={toggleSort} /></th>
                <th className="px-3 py-3"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Updated</span></th>
                <th className="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isSel = selected.has(r.id);
                const isOpen = expanded === r.id;
                return (
                  <RowGroup key={r.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                      className={cn(
                        "group cursor-pointer border-b border-[var(--border-subtle)] transition-colors",
                        i % 2 === 1 && "bg-white/[0.015]",
                        isSel ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--accent-soft)]/60",
                        isOpen && "bg-white/[0.035]",
                      )}
                    >
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelected((s) => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}
                          className={cn("flex size-4 items-center justify-center rounded border transition-all", isSel ? "scale-105 border-[var(--accent)] bg-[var(--accent)] text-black" : "border-[var(--border-interactive)] group-hover:border-[var(--accent)]/50")}
                          aria-label={`Select ${r.recordNo}`}
                        >
                          {isSel && <Check size={11} strokeWidth={3.5} />}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="tabular font-semibold tracking-tight">{r.recordNo}</div>
                        <div className="text-[10px] text-muted">{r.sourceDoc}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{r.ownerName}</div>
                        <div className="text-[10.5px] text-muted">{r.fatherName}</div>
                      </td>
                      <td className="tabular px-3 py-2.5 text-secondary">{r.khasraNo}</td>
                      <td className="px-3 py-2.5">
                        <div>{r.village}</div>
                        <div className="text-[10.5px] text-muted">{r.district}</div>
                      </td>
                      <td className="tabular px-3 py-2.5 text-secondary">{r.areaValue} <span className="text-[10px] text-muted">{r.areaUnit === "acres" ? "ac" : "kn"}</span></td>
                      <td className="px-3 py-2.5"><ConfidenceRadial value={r.confidence} /></td>
                      <td className="px-3 py-2.5"><StatusPill status={r.status} /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          {r.stale && <AlarmClock size={12} className="anim-pulse-dot text-amber-400" />}
                          <RelTime iso={r.updatedAt} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <RowActions rec={r} busy={busyIds.has(r.id)} onAction={rowAction} onDelete={setDelTarget} onView={(x) => router.push(`/records/${x.recordNo}`)} />
                      </td>
                    </motion.tr>

                    {/* expanded detail */}
                    <AnimatePresence>
                      {isOpen && (
                        <tr>
                          <td colSpan={10} className="border-b border-[var(--border-subtle)] p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden bg-white/[0.02]"
                            >
                              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                                <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-4">
                                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Document scan</div>
                                  <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#1c1c28] to-[#14141d]">
                                    <FileScan size={26} className="text-muted" />
                                    <span className="tabular absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[9px] text-muted">PAGE 1/1 · OCR’d</span>
                                    <span className="absolute left-3 top-3 h-1.5 w-16 rounded bg-white/10" />
                                    <span className="absolute left-3 top-6 h-1 w-24 rounded bg-white/[0.07]" />
                                    <span className="absolute left-3 top-9 h-1 w-20 rounded bg-white/[0.07]" />
                                  </div>
                                </div>
                                <div className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-4">
                                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Extracted fields</div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                    {[
                                      ["Mutation", r.mutationType],
                                      ["Land type", r.landType],
                                      ["State", r.state],
                                      ["Uploaded by", r.uploadedBy],
                                      ["Ingested", fmtDate(r.createdAt)],
                                      ["Assigned", r.assignedTo ?? "—"],
                                    ].map(([k, v]) => (
                                      <div key={k as string}>
                                        <div className="text-[10px] text-muted">{k}</div>
                                        <div className="mt-0.5 truncate font-medium capitalize">{v}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex flex-col rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-4">
                                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Quick actions</div>
                                  <div className="flex flex-1 flex-wrap content-start gap-2">
                                    <Button size="xs" variant="success" onClick={() => rowAction(r, "verify")}><ShieldCheck size={12} /> Verify</Button>
                                    <Button size="xs" variant="saffron" onClick={() => rowAction(r, "flag")}><Flag size={12} /> Flag</Button>
                                    <Button size="xs" variant="outline" onClick={() => router.push(`/records/${r.recordNo}`)}><Eye size={12} /> Full review</Button>
                                    <Button size="xs" variant="danger" onClick={() => setDelTarget(r)}><Trash2 size={12} /> Delete</Button>
                                  </div>
                                  <div className="tabular mt-2 text-[10px] text-muted">
                                    Confidence band: <span style={{ color: confidenceBand(r.confidence).color }}>{confidenceBand(r.confidence).label}</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </RowGroup>
                );
              })}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <EmptyState
            icon={<Database size={24} />}
            title="No records match"
            body="Try widening your filters, or ingest a new document to grow the repository."
            action={<Button variant="primary" size="sm" onClick={() => setNewOpen(true)}><Plus size={14} /> New record</Button>}
          />
        )}

        {/* pagination */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-3 text-xs text-muted">
          <span className="tabular">Page {page} of {pages} · {total} records</span>
          <div className="flex gap-1.5">
            <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => gotoPage(page - 1)}><ChevronLeft size={13} /> Prev</Button>
            <Button variant="outline" size="xs" disabled={page >= pages} onClick={() => gotoPage(page + 1)}>Next <ChevronRight size={13} /></Button>
          </div>
        </div>
      </motion.div>

      {/* bulk bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="glass-strong fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl px-4 py-2.5 shadow-2xl shadow-black/50 md:bottom-5"
          >
            <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold">
              <span className="tabular flex size-5 items-center justify-center rounded-md text-[10px] text-black" style={{ background: "var(--accent)" }}>{selected.size}</span>
              selected
            </span>
            <Button size="xs" variant="success" onClick={() => bulk("verify")}><ShieldCheck size={12} /> Verify all</Button>
            <Button size="xs" variant="saffron" onClick={() => bulk("flag")}><Flag size={12} /> Flag</Button>
            <Button size="xs" variant="outline" onClick={() => bulk("export")}><Download size={12} /> Export</Button>
            <Button size="xs" variant="danger" onClick={() => bulk("delete")}><Trash2 size={12} /> Delete</Button>
            <button onClick={() => setSelected(new Set())} className="rounded-lg p-1.5 text-muted hover:bg-white/[0.06] hover:text-current" aria-label="Deselect">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <NewRecordModal open={newOpen} onClose={() => setNewOpen(false)} onCreated={(r) => { setRows((rs) => [r, ...rs]); setTotal((t) => t + 1); }} />

      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title="Delete record?" width={420}>
        <p className="text-[13px] leading-relaxed text-secondary">
          <span className="tabular font-semibold text-current">{delTarget?.recordNo}</span> ({delTarget?.ownerName} · Khasra {delTarget?.khasraNo})
          will be permanently removed. An audit entry will be kept.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDelTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}><Trash2 size={13} /> Delete permanently</Button>
        </div>
      </Modal>
    </div>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
