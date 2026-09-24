"use client";

import { useState } from "react";
import { Bot, Send, Sparkles, X, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button, inputCls } from "@/components/ui/atoms";

type Message = { role: "user" | "assistant"; text: string; provider?: string; notice?: string };

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Hello! I’m Bhu Satya AI. Ask me anything about uploads, OCR, AI/NLP scoring, validation, records, security, or the workflow." }]);

  async function ask() {
    const text = question.trim();
    if (!text || busy) return;
    setQuestion("");
    const next = [...messages, { role: "user" as const, text }];
    setMessages(next);
    setBusy(true);
    const response = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, history: next }) });
    const data = await response.json().catch(() => ({}));
    setMessages((current) => [...current, { role: "assistant", text: data.answer ?? "I could not answer that right now.", provider: data.provider, notice: data.notice }]);
    setBusy(false);
  }

  return <div className="pointer-events-none fixed inset-0 z-[80]">
    <AnimatePresence>
      {open && <motion.button key="ai-chat-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} aria-label="Close AI chat backdrop" className="pointer-events-auto absolute inset-0 cursor-default bg-black/75 backdrop-blur-md" />}
      {open && !minimized && <motion.div key="ai-chat-panel" initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }} className="pointer-events-auto absolute bottom-4 right-4 flex h-[min(640px,calc(100dvh-32px))] w-[min(430px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-[var(--border-interactive)] bg-[var(--bg-secondary)] shadow-2xl shadow-black/70 md:bottom-6 md:right-6">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3"><div className="flex size-8 items-center justify-center rounded-xl bg-[var(--accent-soft)]"><Bot size={17} className="accent-text" /></div><div className="flex-1"><div className="text-sm font-semibold">Bhu Satya AI</div><div className="text-[10px] text-muted">Available across the website</div></div><button onClick={() => setMinimized(true)} className="rounded-lg p-1.5 text-muted hover:bg-white/[0.06]" aria-label="Minimize AI chat"><Minimize2 size={14} /></button><button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted hover:bg-white/[0.06]" aria-label="Close AI chat"><X size={14} /></button></div>
        <div className="flex-1 space-y-3 overflow-y-auto p-3">{messages.map((message, index) => <div key={index} className={cn("rounded-xl px-3 py-2.5 text-xs leading-relaxed", message.role === "user" ? "ml-8 bg-[var(--accent-soft)]" : "mr-3 border border-[var(--border-subtle)] bg-white/[0.02] text-secondary")}>{message.text}{message.provider && <div className="mt-1.5 text-[9px] text-muted">Source: {message.provider}</div>}{message.notice && <div className="mt-1 text-[9px] text-amber-400">{message.notice}</div>}</div>)}{busy && <div className="mr-3 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-xs text-muted"><Sparkles size={12} className="mr-1 inline animate-pulse" /> Thinking…</div>}</div>
        <div className="border-t border-[var(--border-subtle)] p-3"><div className="flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void ask(); }} placeholder="Ask Bhu Satya AI…" className={cn(inputCls, "min-w-0 flex-1")} /><Button variant="primary" onClick={() => void ask()} disabled={busy || !question.trim()} aria-label="Send message"><Send size={14} /></Button></div><div className="mt-2 text-[9px] text-muted">Answers are grounded in the Knowledge Bank.</div></div>
      </motion.div>}
    </AnimatePresence>
    {open && minimized && <button onClick={() => setMinimized(false)} className="pointer-events-auto absolute bottom-24 right-4 rounded-full border border-[var(--accent)]/30 bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] shadow-xl md:right-6">Open Bhu Satya AI</button>}
    <button onClick={() => { setOpen((value) => !value); setMinimized(false); }} className="pointer-events-auto absolute bottom-4 right-4 flex size-14 items-center justify-center rounded-full bg-[var(--accent)] text-[#06251c] shadow-xl shadow-[var(--accent-glow)] transition-transform hover:scale-105 md:bottom-6 md:right-6" aria-label="Open Bhu Satya AI"><Bot size={24} /></button>
  </div>;
}