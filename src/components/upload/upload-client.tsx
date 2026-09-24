"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, FileText, FileUp, RefreshCw, Trash2, UploadCloud, X } from "lucide-react";
import { Button, GlassCard, SectionLabel, StatusPill, inputCls } from "@/components/ui/atoms";
import { cn } from "@/lib/utils";
import { AmbientBackground } from "@/components/three/AmbientBackground";

const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif"];
const MAX_FILE_SIZE = 25 * 1024 * 1024;
type UploadStatus = "pending" | "processing" | "extracted" | "rejected";

interface UploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  error?: string;
}

type Metadata = {
  state: string;
  district: string;
  village: string;
  recordNo: string;
  ownerName: string;
  fatherName: string;
  khasraNo: string;
  areaValue: string;
  areaUnit: string;
  landType: string;
  mutationType: string;
  sourceDoc: string;
  notes: string;
};

type ExtractedField = { value: string; confidence: number };
type ExtractionResponse = {
  rawText: string;
  fields: Record<keyof Metadata, ExtractedField>;
  ocrConfidence: number;
};

const INITIAL_METADATA: Metadata = {
  state: "Punjab", district: "", village: "", recordNo: "", ownerName: "", fatherName: "", khasraNo: "",
  areaValue: "", areaUnit: "acres", landType: "agricultural", mutationType: "inheritance", sourceDoc: "Jamabandi", notes: "",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): string | null {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(extension)) return "Use a PDF, JPG, JPEG, PNG, or TIFF file.";
  if (file.size > MAX_FILE_SIZE) return "Files must be smaller than 25 MB.";
  if (file.size === 0) return "This file is empty.";
  return null;
}

export function UploadClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [metadata, setMetadata] = useState<Metadata>(INITIAL_METADATA);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [showExtractionNotice, setShowExtractionNotice] = useState(false);
  const [fieldConfidence, setFieldConfidence] = useState<Partial<Record<keyof Metadata, number>>>({});

  async function extractFile(item: UploadFile) {
    setExtractionError(null);
    setFiles((current) => current.map((file) => file.id === item.id ? { ...file, status: "processing", error: undefined } : file));
    const body = new FormData();
    body.append("file", item.file);

    try {
      const response = await fetch("/api/documents/extract", { method: "POST", body });
      const result = await response.json().catch(() => null) as ExtractionResponse | { error?: string } | null;
      if (!response.ok || !result || !("fields" in result)) {
        throw new Error(result && "error" in result ? result.error : "Extraction failed.");
      }
      if (result.ocrConfidence < 70) throw new Error("The scan confidence is too low to auto-fill safely.");

      const nextMetadata = { ...metadata };
      const nextConfidence: Partial<Record<keyof Metadata, number>> = {};
      (Object.keys(nextMetadata) as Array<keyof Metadata>).forEach((key) => {
        const extracted = result.fields[key];
        if (extracted && typeof extracted.value === "string" && extracted.value) {
          nextMetadata[key] = extracted.value;
          nextConfidence[key] = extracted.confidence;
        }
      });
      setMetadata(nextMetadata);
      setFieldConfidence(nextConfidence);
      setShowExtractionNotice(true);
      setFiles((current) => current.map((file) => file.id === item.id ? { ...file, status: "extracted" } : file));
    } catch (error) {
      setExtractionError(error instanceof Error ? error.message : "AI extraction failed. You can enter the metadata manually.");
      setFiles((current) => current.map((file) => file.id === item.id ? { ...file, status: "pending", error: "Extraction failed; enter metadata manually." } : file));
    }
  }

  function addFiles(incomingFiles: FileList | File[]) {
    const shouldExtract = files.length === 0;
    const additions = Array.from(incomingFiles).map((file) => {
      const error = validateFile(file);
      return { id: `${file.name}-${file.lastModified}-${Math.random()}`, file, status: error ? "rejected" as const : "pending" as const, error: error ?? undefined };
    });
    setDropError(additions.find((item) => item.error)?.error ?? null);
    setFiles((current) => [...current, ...additions]);
    const firstValidFile = shouldExtract ? additions.find((item) => !item.error) : undefined;
    if (firstValidFile) void extractFile(firstValidFile);
  }

  function updateMetadata(key: keyof Metadata, value: string) {
    setMetadata((current) => ({ ...current, [key]: value }));
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((item) => item.id !== id));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const readyFiles = files.filter((item) => item.status === "pending" || item.status === "extracted");
    if (readyFiles.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setFiles((current) => current.map((item) => readyFiles.some((ready) => ready.id === item.id) ? { ...item, status: "processing" } : item));
    const results = await Promise.all(readyFiles.map(async (item) => {
      const body = new FormData();
      body.append("file", item.file);
      Object.entries(metadata).forEach(([key, value]) => body.append(key, value));
      const response = await fetch("/api/documents/upload", { method: "POST", body });
      if (!response.ok) throw new Error("Upload was not accepted.");
      return item.id;
    }).map((request, index) => request.then((id) => ({ id, ok: true })).catch(() => ({ id: readyFiles[index].id, ok: false }))));
    const failed = new Set(results.filter((result) => !result.ok).map((result) => result.id));
    if (failed.size > 0) {
      setFiles((current) => current.map((item) => failed.has(item.id) ? { ...item, status: "rejected", error: "Upload was not accepted." } : item));
      setIsSubmitting(false);
      return;
    }
    router.push("/validation");
  }

  const hasPendingFile = files.some((item) => item.status === "pending" || item.status === "extracted");
  const confidenceColor = (value: number) => value >= 85 ? "#22c55e" : value >= 70 ? "#f59e0b" : "#ef4444";
  const confidenceBadge = (key: keyof Metadata) => {
    const value = fieldConfidence[key];
    if (value === undefined) return null;
    const color = confidenceColor(value);
    return <span className="ml-2 inline-flex items-center gap-1 align-middle text-[10px] font-semibold" style={{ color }}><span className="size-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />{value}%</span>;
  };
  const reextract = (item: UploadFile) => {
    void extractFile(item);
  };
  const field = (key: keyof Metadata, label: string, required = false) => (
    <label className="block text-xs font-medium text-secondary">
      {label}{required && <span className="ml-1 text-[var(--accent)]">*</span>}{confidenceBadge(key)}
      <input required={required} value={metadata[key]} onChange={(event) => updateMetadata(key, event.target.value)} className={cn(inputCls, "mt-1.5")} />
    </label>
  );

  return (
    <main className="mx-auto max-w-[1320px] p-4 md:p-6">
      <header className="relative isolate mb-6 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 py-5">
        <AmbientBackground variant="particles" density={10} className="opacity-60" />
        <div className="relative z-10">
        <div className="mb-2 flex items-center gap-2 text-[var(--accent)]"><FileUp size={17} /><SectionLabel>Document intake</SectionLabel></div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Upload land records</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-muted">Add one or more source documents and provide the metadata stored with the land record.</p>
        </div>
      </header>

      <form onSubmit={submit} className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <GlassCard className="p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold">Source documents</h2><p className="mt-1 text-xs text-muted">PDF, JPG, JPEG, PNG, or TIFF · up to 25 MB per file</p></div><Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><UploadCloud size={14} /> Browse files</Button></div>
          <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_EXTENSIONS.join(",")} className="hidden" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} />
          <button type="button" className={cn("flex min-h-52 w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center transition-colors", isDragging ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-interactive)] bg-white/[0.015] hover:border-[var(--accent)]/60 hover:bg-white/[0.03]")} onClick={() => fileInputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }}>
            <span className={cn("mb-3 flex size-12 items-center justify-center rounded-2xl", isDragging ? "bg-[var(--accent)] text-[#06251c]" : "bg-[var(--accent-soft)] text-[var(--accent)]")}><UploadCloud size={23} /></span>
            <span className="text-sm font-semibold">{isDragging ? "Drop files to upload" : "Drag and drop files here"}</span><span className="mt-1 text-xs text-muted">or click to browse your device</span>
          </button>
          {dropError && <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs text-red-300"><AlertCircle size={14} className="mt-0.5 shrink-0" />{dropError}</div>}
          <div className="mt-5 space-y-2">{files.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border-subtle)] px-4 py-8 text-center text-xs text-muted"><FileText size={20} className="mx-auto mb-2 opacity-60" />No documents added yet</div> : files.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] px-3.5 py-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><FileText size={15} /></span><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{item.file.name}</div><div className="mt-1 text-[10px] text-muted">{formatBytes(item.file.size)}{item.error && <span className="text-red-300"> · {item.error}</span>}</div></div><StatusPill status={item.status} />{(item.status === "extracted" || item.error) && <Button type="button" variant="ghost" size="xs" onClick={() => reextract(item)}><RefreshCw size={12} /> Re-extract</Button>}<button type="button" aria-label={`Remove ${item.file.name}`} onClick={() => removeFile(item.id)} className="rounded-md p-1 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"><Trash2 size={14} /></button></div>)}</div>
        </GlassCard>

        <GlassCard className="p-5 md:p-6"><div className="mb-4"><h2 className="text-sm font-bold">Record metadata</h2><p className="mt-1 text-xs text-muted">Fields match the land-record schema.</p></div>{showExtractionNotice && <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-2.5 text-xs text-secondary"><Check size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" /><span className="flex-1">Fields auto-filled from AI extraction — please review before submitting.</span><button type="button" aria-label="Dismiss extraction notice" onClick={() => setShowExtractionNotice(false)} className="text-muted hover:text-current"><X size={14} /></button></div>}{extractionError && <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs text-red-300"><AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{extractionError} You can continue manually.</span></div>}<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{field("state", "State", true)}{field("district", "District", true)}{field("village", "Village", true)}{field("recordNo", "Record number")}{field("ownerName", "Owner name")}{field("fatherName", "Father name")}{field("khasraNo", "Khasra number")}{field("areaValue", "Area")}{field("sourceDoc", "Source document")}{field("landType", "Land type")}{field("mutationType", "Mutation type")}<label className="block text-xs font-medium text-secondary">Area unit{confidenceBadge("areaUnit")}<select value={metadata.areaUnit} onChange={(event) => updateMetadata("areaUnit", event.target.value)} className={cn(inputCls, "mt-1.5")}><option value="acres">Acres</option><option value="kanals">Kanals</option></select></label><label className="block text-xs font-medium text-secondary sm:col-span-2">Notes{confidenceBadge("notes")}<textarea value={metadata.notes} onChange={(event) => updateMetadata("notes", event.target.value)} rows={3} className={cn(inputCls, "mt-1.5 resize-none")} /></label></div><div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4"><span className="flex items-center gap-1.5 text-[11px] text-muted">{hasPendingFile ? <><Check size={13} className="text-[var(--accent)]" /> Verification ready</> : "Verification locked"}</span><Button type="submit" variant="primary" disabled={!hasPendingFile || isSubmitting}>{isSubmitting ? "Starting…" : "Start verification"}<UploadCloud size={14} /></Button></div></GlassCard>
      </form>
    </main>
  );
}
