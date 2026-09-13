"use client";

import { useState } from "react";
import { BookOpen, Search, Sparkles, Send } from "lucide-react";
import { KNOWLEDGE_BASE, type KnowledgeArticle } from "@/lib/knowledge-base";
import { cn } from "@/lib/utils";
import { GlassCard, Button, SectionLabel, inputCls } from "@/components/ui/atoms";

type Message = { role: "user" | "assistant"; text: string; sources?: KnowledgeArticle[] };

export function KnowledgeClient() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const filtered = KNOWLEDGE_BASE.filter((article) => `${article.title} ${article.category} ${article.content}`.toLowerCase().includes(search.toLowerCase()));

  async function ask(question = query) {
    if (!question.trim() || busy) return;
    setMessages((items) => [...items, { role: "user", text: question }]);
    setQuery("");
    setBusy(true);
    const response = await fetch("/api/knowledge/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
    const data = await response.json().catch(() => ({}));
    setMessages((items) => [...items, { role: "assistant", text: data.answer ?? "Knowledge service unavailable.", sources: data.sources }]);
    setBusy(false);
  }

  return <div className="mx-auto max-w-[1300px] p-4 md:p-6">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl"><BookOpen className="accent-text" size={23} /> Knowledge Bank</h1><p className="mt-1 text-[13px] text-muted">Operational guidance for upload, OCR, AI/NLP, validation, security and recovery.</p></div><div className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] text-[var(--accent)]">{KNOWLEDGE_BASE.length} verified topics</div></div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_430px]">
      <div><div className="relative mb-4"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the Knowledge Bank…" className={cn(inputCls, "pl-9")} /></div><div className="grid gap-3 md:grid-cols-2">{filtered.map((article) => <GlassCard key={article.id} className="p-5"><div className="mb-3 flex items-start justify-between gap-3"><div><SectionLabel>{article.category}</SectionLabel><h2 className="mt-1 text-sm font-bold">{article.title}</h2></div><Sparkles size={16} className="shrink-0 accent-text" /></div><p className="text-xs leading-relaxed text-secondary">{article.content}</p><div className="mt-4 flex flex-wrap gap-1.5">{article.keywords.slice(0, 5).map((keyword) => <span key={keyword} className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] text-muted">{keyword}</span>)}</div></GlassCard>)}</div></div>
      <GlassCard className="flex min-h-[520px] flex-col p-5"><div className="mb-4 flex items-center gap-2"><div className="flex size-9 items-center justify-center rounded-xl bg-[var(--accent-soft)]"><Sparkles size={17} className="accent-text" /></div><div><h2 className="text-sm font-bold">Knowledge Assistant</h2><p className="text-[10px] text-muted">Answers only from the Knowledge Bank</p></div></div><div className="flex-1 space-y-3 overflow-y-auto pr-1">{messages.length === 0 && <div className="rounded-xl border border-dashed border-[var(--border-interactive)] p-4 text-xs leading-relaxed text-muted">Ask how to upload handwritten registers, how OCR scoring works, when validation sends a record to review, or how to export a backup.</div>}{messages.map((message, index) => <div key={index} className={cn("rounded-xl px-3 py-2.5 text-xs leading-relaxed", message.role === "user" ? "ml-8 bg-[var(--accent-soft)] text-current" : "mr-3 border border-[var(--border-subtle)] bg-white/[0.02] text-secondary")}>{message.text}{message.sources && message.sources.length > 0 && <div className="mt-2 border-t border-[var(--border-subtle)] pt-2 text-[10px] text-muted">Sources: {message.sources.map((source) => source.title).join(" · ")}</div>}</div>)}</div><div className="mt-4 border-t border-[var(--border-subtle)] pt-3"><div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void ask(); }} placeholder="Ask the Knowledge Assistant…" className={cn(inputCls, "flex-1")} /><Button variant="primary" onClick={() => void ask()} disabled={busy || !query.trim()} aria-label="Ask assistant"><Send size={14} /></Button></div>{busy && <div className="mt-2 text-[10px] text-muted">Searching verified guidance…</div>}</div></GlassCard>
    </div>
  </div>;
}
