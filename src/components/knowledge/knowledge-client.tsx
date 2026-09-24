"use client";

import { useState, useTransition } from "react";
import { BookOpen, Send, Sparkles } from "lucide-react";
import { Button, GlassCard, inputCls } from "@/components/ui/atoms";
import { cn } from "@/lib/utils";

type Message = { id: string; role: "user" | "assistant"; text: string };

const SUGGESTED_TOPICS = ["Upload", "OCR", "AI/NLP scoring", "Validation", "Review", "Security", "Audit", "Backup"];

function mockKnowledgeResponse(question: string): Promise<string> {
  return new Promise((resolve) => window.setTimeout(() => resolve(`Bhu Satya AI would use the Knowledge Bank to answer:\n\n“${question}”\n\nThis is a placeholder response. Connect the chat to the knowledge endpoint when the backend is ready.`), 700));
}

export function KnowledgeClient() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPending, startTransition] = useTransition();

  function ask(value = query) {
    const question = value.trim();
    if (!question || isPending) return;
    setMessages((current) => [...current, { id: `${Date.now()}-user`, role: "user", text: question }]);
    setQuery("");
    startTransition(async () => {
      const answer = await mockKnowledgeResponse(question);
      setMessages((current) => [...current, { id: `${Date.now()}-assistant`, role: "assistant", text: answer }]);
    });
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-112px)] max-w-[1100px] flex-col p-4 md:p-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[var(--accent)]"><BookOpen size={17} /><span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Knowledge Bank</span></div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Ask Bhu Satya AI</h1>
          <p className="mt-1 text-[13px] text-muted">Explore operational guidance for documents, OCR, validation, and review.</p>
        </div>
        <span className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] text-[var(--accent)]">Source: Knowledge Bank</span>
      </header>

      <GlassCard className="flex min-h-[650px] flex-1 flex-col overflow-hidden p-5 md:p-6">
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-4"><div className="flex size-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><Sparkles size={18} /></div><div><h2 className="text-sm font-bold">Bhu Satya AI</h2><p className="text-[10px] text-muted">Grounded answers for your document workflow</p></div></div>
        <div className="flex-1 space-y-3 overflow-y-auto py-5 pr-1">
          {messages.length === 0 && <div className="mx-auto flex min-h-72 max-w-lg flex-col items-center justify-center text-center"><Sparkles size={28} className="mb-3 text-[var(--accent)] opacity-80" /><p className="text-sm font-semibold">What do you want to understand?</p><p className="mt-1 text-xs leading-relaxed text-muted">Choose a topic or ask a question about your land-record operations.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{SUGGESTED_TOPICS.map((topic) => <button key={topic} type="button" onClick={() => ask(topic)} className="rounded-full border border-[var(--border-interactive)] px-3 py-1.5 text-[11px] text-secondary transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)] hover:text-current">{topic}</button>)}</div></div>}
          {messages.map((message) => <div key={message.id} className={cn("max-w-[82%] whitespace-pre-wrap rounded-xl px-3.5 py-3 text-xs leading-relaxed", message.role === "user" ? "ml-auto bg-[var(--accent-soft)]" : "mr-auto border border-[var(--border-subtle)] bg-white/[0.02] text-secondary")}>{message.text}{message.role === "assistant" && <div className="mt-2 border-t border-[var(--border-subtle)] pt-2 text-[10px] text-muted">Source: Knowledge Bank</div>}</div>)}
          {isPending && <div className="mr-auto flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3.5 py-3 text-xs text-muted"><Sparkles size={13} className="animate-pulse" /> Thinking…</div>}
        </div>
        <div className="border-t border-[var(--border-subtle)] pt-4"><div className="flex gap-2"><textarea value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(); } }} placeholder="Ask Bhu Satya AI about your workflow…" rows={2} className={cn(inputCls, "min-h-14 flex-1 resize-none py-2.5")} /><Button variant="primary" onClick={() => ask()} disabled={isPending || !query.trim()} aria-label="Send message"><Send size={14} /></Button></div><div className="mt-2 text-[10px] text-muted">Enter to send · Shift + Enter for a new line</div></div>
      </GlassCard>
    </main>
  );
}
