"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, LayoutDashboard, Database, Map, BarChart3, ScrollText, Settings, BookOpen,
  Plus, Download, Moon, Sun, Zap, Landmark, Palette, ArrowRight, CheckCircle2, CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore, ACCENTS } from "@/lib/store";
import type { RecordDTO } from "@/lib/queries";

type Cmd = {
  id: string;
  group: "Navigation" | "Actions" | "Appearance" | "Records";
  icon: React.ReactNode;
  title: string;
  hint?: string;
  run: () => void;
  keywords?: string;
};

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const setTheme = useUiStore((s) => s.setTheme);
  const setAccent = useUiStore((s) => s.setAccent);
  const theme = useUiStore((s) => s.theme);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [records, setRecords] = useState<RecordDTO[]>([]);
  const fetched = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const focusTimer = setTimeout(() => {
      setQ("");
      setIdx(0);
      inputRef.current?.focus();
    }, 0);
    if (!fetched.current) {
      fetched.current = true;
      fetch("/api/records?pageSize=50")
        .then((r) => (r.ok ? r.json() : { rows: [] }))
        .then((d) => setRecords(d.rows))
        .catch(() => {});
    }
    return () => clearTimeout(focusTimer);
  }, [open]);

  const nav = useCallback((href: string) => () => { router.push(href); setOpen(false); }, [router, setOpen]);

  const commands = useMemo<Cmd[]>(() => {
    const base: Cmd[] = [
      { id: "dash", group: "Navigation", icon: <LayoutDashboard size={15} />, title: "Go to Dashboard", run: nav("/") },
      { id: "repo", group: "Navigation", icon: <Database size={15} />, title: "Go to Repository", run: nav("/records"), keywords: "records table" },
      { id: "map", group: "Navigation", icon: <Map size={15} />, title: "Go to GIS Map", run: nav("/map"), keywords: "gis cadastral parcels" },
      { id: "ana", group: "Navigation", icon: <BarChart3 size={15} />, title: "Go to Analytics", run: nav("/analytics"), keywords: "reports charts" },
      { id: "audit", group: "Navigation", icon: <ScrollText size={15} />, title: "Go to Audit Trail", run: nav("/audit") },
      { id: "knowledge", group: "Navigation", icon: <BookOpen size={15} />, title: "Open Knowledge Bank", run: nav("/knowledge"), keywords: "help assistant guidance" },
      { id: "set", group: "Navigation", icon: <Settings size={15} />, title: "Go to Settings", run: nav("/settings") },
      { id: "new", group: "Actions", icon: <Plus size={15} />, title: "New record — upload document", run: nav("/records?new=1"), keywords: "create ingest" },
      { id: "export", group: "Actions", icon: <Download size={15} />, title: "Export repository as CSV", run: () => { window.open("/api/records?format=csv", "_blank"); setOpen(false); } },
      { id: "verified", group: "Actions", icon: <CheckCircle2 size={15} />, title: "View verified records", run: nav("/records?status=verified") },
      { id: "flagged", group: "Actions", icon: <Zap size={15} />, title: "View flagged records", run: nav("/records?status=flagged"), keywords: "issues saffron" },
      { id: "theme", group: "Appearance", icon: theme === "dark" ? <Sun size={15} /> : <Moon size={15} />, title: theme === "dark" ? "Switch to light mode" : "Switch to dark mode", run: () => { setTheme(theme === "dark" ? "light" : "dark"); setOpen(false); } },
      ...ACCENTS.slice(0, 6).map((a) => ({
        id: `accent-${a.value}`,
        group: "Appearance" as const,
        icon: <Palette size={15} style={{ color: a.value }} />,
        title: `Accent — ${a.name}`,
        run: () => { setAccent(a.value); },
      })),
    ];
    const recs: Cmd[] = records.map((r) => ({
      id: `rec-${r.id}`,
      group: "Records",
      icon: <Landmark size={15} className="text-muted" />,
      title: `${r.recordNo} · ${r.ownerName}`,
      hint: `Khasra ${r.khasraNo} · ${r.village}`,
      run: () => { router.push(`/records/${r.recordNo}`); setOpen(false); },
      keywords: `${r.recordNo} ${r.ownerName} ${r.khasraNo} ${r.village} ${r.district}`,
    }));
    return [...base, ...recs];
  }, [nav, records, router, setAccent, setOpen, setTheme, theme]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((c) => `${c.title} ${c.keywords ?? ""}`.toLowerCase().includes(needle));
  }, [commands, q]);

  const groups = useMemo(() => {
    const order: Cmd["group"][] = ["Navigation", "Actions", "Appearance", "Records"];
    return order
      .map((g) => ({ g, items: filtered.filter((c) => c.group === g) }))
      .filter((x) => x.items.length);
  }, [filtered]);

  const flat = filtered;

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(flat.length - 1, i + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    if (e.key === "Enter" && flat[idx]) flat[idx].run();
  }

  let running = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-start justify-center bg-black/60 px-4 pt-[14vh] backdrop-blur-md"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl shadow-black/60"
          >
            <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3.5">
              <Search size={16} className="text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search records, run actions…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              />
              <kbd className="rounded border border-[var(--border-subtle)] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted">ESC</kbd>
            </div>
            <div className="max-h-[46vh] overflow-y-auto p-1.5">
              {flat.length === 0 && (
                <div className="px-4 py-10 text-center text-xs text-muted">No matches for “{q}”</div>
              )}
              {groups.map(({ g, items }) => (
                <div key={g}>
                  <div className="px-3 pb-1 pt-2.5 text-[9.5px] font-semibold uppercase tracking-[0.15em] text-muted">{g}</div>
                  {items.map((c) => {
                    running++;
                    const i = running;
                    const active = i === idx;
                    return (
                      <button
                        key={c.id}
                        onMouseEnter={() => setIdx(i)}
                        onClick={c.run}
                        className={cn(
                          "relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px]",
                          active ? "text-current" : "text-secondary",
                        )}
                      >
                        {active && (
                          <motion.span layoutId="cmd-active" className="absolute inset-0 rounded-lg bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/30" transition={{ duration: 0.12 }} />
                        )}
                        <span className="relative">{c.icon}</span>
                        <span className="relative flex-1 truncate">{c.title}</span>
                        {c.hint && <span className="relative hidden truncate text-[11px] text-muted sm:inline">{c.hint}</span>}
                        {active ? <CornerDownLeft size={12} className="relative text-muted" /> : <ArrowRight size={12} className="relative opacity-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 border-t border-[var(--border-subtle)] px-4 py-2.5 text-[10px] text-muted">
              <span className="flex items-center gap-1"><kbd className="rounded border border-[var(--border-subtle)] px-1 font-mono">↑↓</kbd> navigate</span>
              <span className="flex items-center gap-1"><kbd className="rounded border border-[var(--border-subtle)] px-1 font-mono">↵</kbd> select</span>
              <span className="ml-auto tabular">{flat.length} results</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
