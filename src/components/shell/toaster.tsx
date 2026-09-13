"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, TriangleAlert, Info, X } from "lucide-react";
import { useToastStore } from "@/lib/store";

const META = {
  success: { icon: CheckCircle2, color: "#22c55e" },
  error: { icon: XCircle, color: "#ef4444" },
  warning: { icon: TriangleAlert, color: "#f59e0b" },
  info: { icon: Info, color: "#3b82f6" },
} as const;

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const m = META[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 80, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="glass-strong pointer-events-auto relative overflow-hidden rounded-xl p-3.5 pr-9 shadow-2xl shadow-black/50"
              style={{ borderLeft: `3px solid ${m.color}` }}
            >
              <div className="flex gap-2.5">
                <m.icon size={16} style={{ color: m.color }} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold leading-tight">{t.title}</div>
                  {t.body && <div className="mt-0.5 text-xs leading-relaxed text-muted">{t.body}</div>}
                </div>
              </div>
              <button onClick={() => dismiss(t.id)} className="absolute right-2.5 top-2.5 rounded p-0.5 text-muted hover:text-current" aria-label="Dismiss">
                <X size={13} />
              </button>
              <motion.span
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 5, ease: "linear" }}
                className="absolute bottom-0 left-0 h-[2px] w-full origin-left"
                style={{ background: m.color, opacity: 0.7 }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
