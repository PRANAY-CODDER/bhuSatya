"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Landmark, ScanText, MapPinned, ShieldCheck, ArrowRight, Loader2,
  Sparkles, Eye, EyeOff,
} from "lucide-react";
import { Button, Field, inputCls } from "@/components/ui/atoms";

function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex items-center justify-center rounded-xl"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #ff9933 0%, #f4f4f6 50%, #138808 100%)",
          boxShadow: "0 8px 32px -8px rgba(255,153,51,0.4)",
        }}
      >
        <Landmark size={size * 0.52} color="#0a0a0f" strokeWidth={2.4} />
      </div>
      <div>
        <div className="text-lg font-extrabold leading-none tracking-tight">
          BHULEKH <span className="accent-text">2.0</span>
        </div>
        <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
          Land Records · AI Digitization
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: ScanText, title: "OCR Pipeline", body: "Indic-script OCR with 98.4% character accuracy across 6 record types." },
  { icon: Sparkles, title: "AI Field Extraction", body: "NLP pulls owner, khasra, area & mutation data with per-field confidence." },
  { icon: MapPinned, title: "Cadastral GIS", body: "Every parcel mapped, queried and cross-verified against boundary data." },
  { icon: ShieldCheck, title: "Human-in-the-loop", body: "Officers verify low-confidence records with full audit trail." },
];

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
      try {
        const res = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mode === "login" ? { email, password } : { name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed");
        } else {
          // Use full page reload to ensure session cookie is sent with the new request
          window.location.href = "/";
        }
      } finally {
        setBusy(false);
      }
  }

  function fillDemo(e2: string, pw: string) {
    setMode("login");
    setEmail(e2);
    setPassword(pw);
    setError(null);
  }

  return (
    <div className="relative flex min-h-dvh overflow-hidden bg-app">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 size-[560px] rounded-full opacity-25 blur-[120px]" style={{ background: "radial-gradient(circle, #ff9933, transparent 65%)" }} />
        <div className="absolute -bottom-52 right-1/4 size-[620px] rounded-full opacity-20 blur-[130px]" style={{ background: "radial-gradient(circle, #138808, transparent 65%)" }} />
        <div className="absolute left-1/2 top-1/3 size-[420px] rounded-full opacity-15 blur-[110px]" style={{ background: "radial-gradient(circle, var(--accent), transparent 65%)" }} />
        <svg className="absolute inset-0 h-full w-full opacity-[0.05]">
          <defs>
            <pattern id="pl" width="72" height="72" patternUnits="userSpaceOnUse">
              <path d="M0 36H72M36 0V72" stroke="white" strokeWidth="0.6" />
              <rect x="8" y="8" width="24" height="24" fill="none" stroke="white" strokeWidth="0.5" />
              <rect x="40" y="40" width="24" height="24" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pl)" />
        </svg>
      </div>

      {/* left brand panel */}
      <div className="relative hidden w-[54%] flex-col justify-between p-12 lg:flex">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Logo />
        </motion.div>

        <div className="max-w-xl">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium tracking-wide text-secondary backdrop-blur">
              <span className="size-1.5 rounded-full bg-[#138808]" style={{ boxShadow: "0 0 10px #138808" }} />
              SMART INDIA HACKATHON 2025 · TEAM _404BUILD
            </div>
            <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-tight xl:text-[54px]">
              Digitizing India&apos;s{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(100deg, #ff9933 0%, #ffffff 48%, #22c55e 100%)" }}
              >
                land memory
              </span>
              , one record at a time.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-secondary">
              A mission-control platform that turns decades of paper revenue records into
              verified, searchable, map-linked digital assets — with AI doing the heavy
              lifting and officers in command.
            </p>
          </motion.div>

          <div className="mt-10 grid grid-cols-2 gap-3.5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                className="glass card-shine rounded-2xl p-4"
              >
                <f.icon size={18} className="accent-text" />
                <div className="mt-2.5 text-[13px] font-semibold">{f.title}</div>
                <div className="mt-1 text-xs leading-relaxed text-muted">{f.body}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div className="flex gap-8">
            {[["12.4K", "Parcels mapped"], ["98.4%", "OCR accuracy"], ["6", "Districts live"]].map(([v, l], i) => (
              <motion.div key={l} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 + i * 0.12 }}>
                <div className="tabular text-xl font-bold">{v}</div>
                <div className="mt-0.5 text-[11px] text-muted">{l}</div>
              </motion.div>
            ))}
          </div>
          <div className="tricolor-line h-[3px] w-40 rounded-full opacity-70" />
        </div>
      </div>

      {/* right form panel */}
      <div className="relative flex flex-1 items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="glass-strong card-shine w-full max-w-[420px] rounded-3xl p-8 shadow-2xl shadow-black/50"
        >
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <div className="mb-6 flex rounded-xl border border-[var(--border-subtle)] bg-white/[0.03] p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`relative flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors ${mode === m ? "text-current" : "text-muted"}`}
              >
                {mode === m && (
                  <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-lg bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/40" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                )}
                <span className="relative">{m === "login" ? "Sign in" : "Create account"}</span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <Field label="Full name">
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Officer Sharma" required />
              </Field>
            )}
            <Field label="Official email">
              <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@land.gov.in" required />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input className={`${inputCls} pr-10`} type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-current" tabIndex={-1} aria-label="Toggle password">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>

            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
                {error}
              </motion.div>
            )}

            <Button variant="primary" type="submit" disabled={busy} className="h-10 w-full text-sm">
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === "login" ? "Enter command center" : "Create officer account"}
              {!busy && <ArrowRight size={15} />}
            </Button>
          </form>

          <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
            <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Demo access</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => fillDemo("admin@bhulekh.gov.in", "admin123")} className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)]">
                <div className="text-xs font-semibold">District Admin</div>
                <div className="tabular mt-0.5 text-[10px] text-muted">admin@bhulekh.gov.in</div>
              </button>
              <button onClick={() => fillDemo("officer@bhulekh.gov.in", "officer123")} className="rounded-lg border border-[var(--border-subtle)] bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)]">
                <div className="text-xs font-semibold">Review Officer</div>
                <div className="tabular mt-0.5 text-[10px] text-muted">officer@bhulekh.gov.in</div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
