"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User as UserIcon, Palette, Bell, Lock, KeyRound, Server, Sun, Moon, Monitor,
  Check, Copy, RefreshCw, Activity, LogOut, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, Button, Field, inputCls, Avatar, SectionLabel } from "@/components/ui/atoms";
import { useUiStore, ACCENTS, toast } from "@/lib/store";
import type { SafeUser } from "@/lib/auth";

const TABS = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Lock },
  { id: "api", label: "API Keys", icon: KeyRound },
  { id: "system", label: "System", icon: Server },
] as const;

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={cn("relative h-6 w-11 rounded-full transition-colors duration-200", on ? "" : "bg-white/[0.09]")}
      style={on ? { background: "var(--accent)" } : undefined}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow", on ? "right-0.5" : "left-0.5")}
      />
    </button>
  );
}

export function SettingsClient({ user }: { user: SafeUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("profile");
  const ui = useUiStore();

  const [notifPrefs, setNotifPrefs] = useState({ pipeline: true, verify: true, flagged: true, weekly: false, sound: false });
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [apiKey] = useState("bh_live_9f2cA71kxPq4mT8sDvN3eR6wY0uJ5hL2");
  const [health, setHealth] = useState<string | null>(null);
  const [apiHealth, setApiHealth] = useState<string | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwBusy(true);
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    const data = await res.json().catch(() => ({}));
    setPwBusy(false);
    if (!res.ok) return toast("error", "Password not changed", data.error);
    setCurrent("");
    setNext("");
    toast("success", "Password updated", "You remain signed in on this device.");
  }

  return (
    <div className="mx-auto max-w-[1100px] p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Settings</h1>
        <p className="mt-1 text-[13px] text-muted">Control center for your workspace, identity and integrations</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr]">
        {/* tab rail */}
        <div className="flex gap-1 overflow-x-auto md:flex-col">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                tab === t.id ? "text-current" : "text-secondary hover:bg-white/[0.05] hover:text-current",
              )}
            >
              {tab === t.id && (
                <motion.span layoutId="set-tab" className="absolute inset-0 rounded-lg border border-[var(--accent)]/25 bg-[var(--accent-soft)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <t.icon size={15} className="relative" />
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>

        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {/* PROFILE */}
          {tab === "profile" && (
            <GlassCard className="p-6">
              <SectionLabel>Officer profile</SectionLabel>
              <div className="mt-5 flex items-center gap-4">
                <Avatar name={user.name} color={user.color} size={64} />
                <div>
                  <div className="text-lg font-bold">{user.name}</div>
                  <div className="text-sm text-muted">{user.email}</div>
                  <span className="mt-1.5 inline-block rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                    {user.role}
                  </span>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Display name"><input className={inputCls} defaultValue={user.name} /></Field>
                <Field label="Official email"><input className={inputCls} defaultValue={user.email} disabled /></Field>
                <Field label="Jurisdiction"><input className={inputCls} defaultValue="Punjab Circle — Ludhiana Range" /></Field>
                <Field label="Employee ID"><input className={inputCls} defaultValue="REV-PB-2024-1187" /></Field>
              </div>
              <div className="mt-6 flex justify-end">
                <Button variant="primary" onClick={() => toast("success", "Profile saved")}>Save profile</Button>
              </div>
            </GlassCard>
          )}

          {/* APPEARANCE */}
          {tab === "appearance" && (
            <div className="space-y-4">
              <GlassCard className="p-6">
                <SectionLabel>Theme</SectionLabel>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {(
                    [
                      { id: "light", icon: Sun, label: "Light" },
                      { id: "dark", icon: Moon, label: "Dark" },
                      { id: "system", icon: Monitor, label: "System" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => ui.setTheme(t.id)}
                      className={cn(
                        "focus-ring rounded-xl border p-3.5 text-center transition-all",
                        ui.theme === t.id ? "border-[var(--accent)]/60 bg-[var(--accent-soft)]" : "border-[var(--border-subtle)] hover:border-[var(--border-interactive)]",
                      )}
                    >
                      <div className={cn("mx-auto mb-2 flex h-11 w-full max-w-24 items-center justify-center rounded-lg border", t.id === "dark" ? "border-white/10 bg-[#0a0a0f]" : "border-black/10 bg-[#f2f2f6]", t.id === "system" && "bg-gradient-to-r from-[#0a0a0f] via-[#f2f2f6] to-[#0a0a0f]")}>
                        <t.icon size={15} className={cn(t.id === "light" ? "text-amber-500" : "text-emerald-400")} />
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-xs font-medium">
                        {t.label}
                        {ui.theme === t.id && <Check size={12} className="accent-text" />}
                      </div>
                    </button>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <SectionLabel>Accent color</SectionLabel>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => ui.setAccent(a.value)}
                      title={a.name}
                      className={cn("focus-ring flex size-9 items-center justify-center rounded-full transition-transform hover:scale-110", ui.accent === a.value && "ring-2 ring-offset-2 ring-offset-[var(--bg-secondary)]")}
                      style={{ background: a.value, ...(ui.accent === a.value ? { ["--tw-ring-color" as string]: a.value } : {}) }}
                    >
                      {ui.accent === a.value && <Check size={15} className="text-black" strokeWidth={3} />}
                    </button>
                  ))}
                  <label className="ml-1 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5">
                    <span className="text-[10px] text-muted">Custom</span>
                    <input
                      type="color"
                      value={ui.accent}
                      onChange={(e) => ui.setAccent(e.target.value)}
                      className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                  </label>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <SectionLabel>Interface</SectionLabel>
                <div className="mt-2 divide-y divide-[var(--border-subtle)]">
                  {[
                    { label: "Animations & motion", sub: "Page transitions, count-ups and pulses", on: ui.motion, set: ui.setMotion },
                    { label: "Compact density", sub: "Tighter padding for data-heavy screens", on: ui.density === "compact", set: (v: boolean) => ui.setDensity(v ? "compact" : "comfortable") },
                    { label: "Large text", sub: "Increase base font size for readability", on: ui.fontSize === "large", set: (v: boolean) => ui.setFontSize(v ? "large" : "normal") },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between gap-4 py-3.5">
                      <div>
                        <div className="text-[13px] font-medium">{s.label}</div>
                        <div className="mt-0.5 text-[11px] text-muted">{s.sub}</div>
                      </div>
                      <Toggle on={s.on} onChange={s.set} />
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {tab === "notifications" && (
            <GlassCard className="p-6">
              <SectionLabel>Notification preferences</SectionLabel>
              <div className="mt-2 divide-y divide-[var(--border-subtle)]">
                {([
                  ["pipeline", "Pipeline events", "OCR completion, queue depth spikes, ingestion"],
                  ["verify", "Verification activity", "Records verified or rejected by your team"],
                  ["flagged", "Flags & anomalies", "Boundary conflicts and low-confidence alerts"],
                  ["weekly", "Weekly digest", "District progress summary every Monday"],
                  ["sound", "Notification sound", "Subtle chime for success events"],
                ] as const).map(([key, label, sub]) => (
                  <div key={key} className="flex items-center justify-between gap-4 py-3.5">
                    <div>
                      <div className="text-[13px] font-medium">{label}</div>
                      <div className="mt-0.5 text-[11px] text-muted">{sub}</div>
                    </div>
                    <Toggle on={notifPrefs[key]} onChange={(v) => { setNotifPrefs((p) => ({ ...p, [key]: v })); toast("info", "Preference saved"); }} />
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* SECURITY */}
          {tab === "security" && (
            <div className="space-y-4">
              <GlassCard className="p-6">
                <SectionLabel>Change password</SectionLabel>
                <form onSubmit={changePassword} className="mt-4 max-w-sm space-y-4">
                  <Field label="Current password"><input type="password" required className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
                  <Field label="New password" hint="Minimum 6 characters"><input type="password" required minLength={6} className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} /></Field>
                  <Button variant="primary" type="submit" disabled={pwBusy}>{pwBusy ? "Updating…" : "Update password"}</Button>
                </form>
              </GlassCard>
              <GlassCard className="p-6">
                <SectionLabel>Session</SectionLabel>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-muted">Signed in as <span className="font-medium text-secondary">{user.email}</span> · 7-day session</div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      await fetch("/api/auth/logout", { method: "POST" });
                      router.replace("/login");
                      router.refresh();
                    }}
                  >
                    <LogOut size={13} /> Sign out
                  </Button>
                </div>
              </GlassCard>
            </div>
          )}

          {/* API */}
          {tab === "api" && (
            <GlassCard className="p-6">
              <SectionLabel>Integration API key</SectionLabel>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Use this key to push scanned batches into the ingestion pipeline from district scanners and mobile capture apps.
              </p>
              <div className="tabular mt-4 flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] px-3.5 py-3 text-xs">
                <span className="flex-1 truncate text-secondary">{apiKey.slice(0, 12)}••••••••••••••••</span>
                <button onClick={() => { navigator.clipboard?.writeText(apiKey); toast("success", "API key copied"); }} className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-[10.5px] text-secondary hover:text-current">
                  <Copy size={11} /> Copy
                </button>
                <button onClick={() => toast("warning", "Rotation requested", "A new key will be issued by the admin portal.")} className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-[10.5px] text-secondary hover:text-current">
                  <RefreshCw size={11} /> Rotate
                </button>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                {[["1,204", "Calls this month"], ["99.98%", "Uptime"], ["84ms", "P95 latency"]].map(([v, l]) => (
                  <div key={l} className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-3">
                    <div className="tabular text-base font-bold">{v}</div>
                    <div className="mt-0.5 text-[10px] text-muted">{l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-3">
                <div><div className="text-xs font-medium">Ingestion API connection</div><div className="mt-0.5 text-[10px] text-muted">Upload, OCR, extraction and validation endpoints</div></div>
                <Button variant="outline" size="sm" onClick={async () => { setApiHealth("checking…"); const res = await fetch("/api/integration/health"); const data = await res.json().catch(() => ({})); setApiHealth(data.ok ? `${data.latencyMs}ms · operational` : "degraded"); }}><Activity size={13} /> Test API</Button>
              </div>
              {apiHealth && <div className={cn("mt-2 text-right text-xs", apiHealth.includes("operational") ? "text-emerald-400" : "text-amber-400")}>{apiHealth}</div>}
            </GlassCard>
          )}

          {/* SYSTEM */}
          {tab === "system" && (
            <div className="space-y-4">
              <GlassCard className="p-6">
                <SectionLabel>System status</SectionLabel>
                <div className="mt-4 flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setHealth("checking…");
                      const res = await fetch("/api/health");
                      const d = await res.json().catch(() => ({}));
                      setHealth(d.ok ? "ok — database reachable" : "degraded");
                    }}
                  >
                    <Activity size={13} /> Run health check
                  </Button>
                  {health && <span className={cn("text-xs font-medium", health.startsWith("ok") ? "text-emerald-400" : "text-amber-400")}>{health}</span>}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  {[
                    ["Version", "2.0.0-sih"],
                    ["Runtime", "Next.js 16"],
                    ["Database", "PostgreSQL 16"],
                    ["Region", "ap-south-1"],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-3">
                      <div className="text-[10px] text-muted">{k}</div>
                      <div className="tabular mt-1 font-semibold">{v}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard className="p-6">
                <SectionLabel>Backup & recovery</SectionLabel>
                <p className="mt-2 text-xs leading-relaxed text-muted">Download a portable snapshot of records, audit events and notifications for recovery or offline review.</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { window.open("/api/backup", "_blank"); toast("success", "Backup download started"); }}><Download size={13} /> Export backup</Button>
                  <span className="text-[10px] text-muted">JSON · records + audit + notifications</span>
                </div>
              </GlassCard>
              <GlassCard className="border-l-2 border-l-[#ff9933] p-6">
                <SectionLabel>Smart India Hackathon 2025</SectionLabel>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Bhulekh 2.0 — AI-powered land record digitization & verification. Team <span className="font-semibold text-secondary">_404Build</span>.
                  Saffron for flags, white for neutrality, green for verified — the tricolor is our design language.
                </p>
              </GlassCard>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
