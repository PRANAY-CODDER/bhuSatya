"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell, Check, ChevronRight, Menu, Moon, PanelLeft, Search, Sun, Landmark, Upload, BookOpen,
  HelpCircle, Settings, LogOut, User as UserIcon, FileWarning, Info, CheckCircle2, TriangleAlert,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar, Dropdown, MenuDivider, MenuItem } from "@/components/ui/atoms";
import { useUiStore } from "@/lib/store";
import type { SafeUser } from "@/lib/auth";
import type { NotificationDTO } from "@/lib/queries";

const CRUMB_NAMES: Record<string, string> = {
  "": "Dashboard",
  records: "Repository",
  map: "GIS Map",
  analytics: "Analytics",
  audit: "Audit Trail",
  knowledge: "Knowledge Bank",
  settings: "Settings",
};

const N_ICON: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: FileWarning,
};
const N_COLOR: Record<string, string> = {
  info: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
};

export function Topbar({ user, onMenu }: { user: SafeUser; onMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotificationDTO[]>([]);
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) setNotifs((await res.json()).rows);
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void load();
      setNow(Date.now());
    }, 0);
    const iv = setInterval(() => void load(), 20000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(iv);
    };
  }, [load]);

  const unread = notifs.filter((n) => !n.read).length;

  async function markAll() {
    const res = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    if (res.ok) setNotifs((await res.json()).rows);
  }

  const segs = pathname.split("/").filter(Boolean);

  return (
    <header className="glass-strong sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-[var(--border-subtle)] px-3 md:px-5">
      <button onClick={onMenu} className="focus-ring rounded-lg p-2 text-secondary hover:bg-white/[0.05] md:hidden" aria-label="Menu">
        <Menu size={18} />
      </button>
      <button onClick={toggleSidebar} className="focus-ring hidden rounded-lg p-2 text-secondary hover:bg-white/[0.05] md:block" aria-label="Toggle sidebar">
        <PanelLeft size={17} />
      </button>

      <nav className="hidden items-center gap-1 text-[13px] sm:flex" aria-label="Breadcrumb">
        <Link href="/" className="flex items-center gap-1.5 text-muted transition-colors hover:text-current">
          <Landmark size={13} />
          Bhu Satya
        </Link>
        {segs.map((s, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight size={13} className="text-muted" />
            <Link
              href={"/" + segs.slice(0, i + 1).join("/")}
              className={cn("transition-colors hover:text-current", i === segs.length - 1 ? "font-semibold text-current" : "text-muted")}
            >
              {CRUMB_NAMES[s] ?? (s.startsWith("LR-") ? s : decodeURIComponent(s))}
            </Link>
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      <button
        onClick={() => router.push("/upload")}
        className="focus-ring flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-[#06251c] transition-all hover:brightness-110 sm:px-3"
      >
        <Upload size={13} /> Upload document
      </button>

      <button
        onClick={() => router.push("/knowledge")}
        className="focus-ring flex items-center gap-1.5 rounded-lg border border-[var(--border-interactive)] px-2.5 py-1.5 text-xs font-medium text-secondary transition-colors hover:border-[var(--accent)]/40 hover:text-current sm:px-3"
      >
        <BookOpen size={13} /> <span className="hidden md:inline">Knowledge Bank</span>
      </button>

      <button
        onClick={() => setPaletteOpen(true)}
        className="focus-ring flex items-center gap-2.5 rounded-lg border border-[var(--border-interactive)] bg-white/[0.03] px-3 py-1.5 text-xs text-muted transition-all hover:border-[var(--accent)]/40 hover:text-secondary"
      >
        <Search size={13} />
        <span className="hidden sm:inline">Search records, actions…</span>
        <kbd className="hidden rounded border border-[var(--border-subtle)] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] md:inline">⌘K</kbd>
      </button>

      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="focus-ring rounded-lg p-2 text-secondary transition-colors hover:bg-white/[0.05]"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      {/* notifications */}
      <Dropdown
        open={bellOpen}
        onOpenChange={setBellOpen}
        width={340}
        trigger={
          <button className="focus-ring relative rounded-lg p-2 text-secondary transition-colors hover:bg-white/[0.05]" aria-label="Notifications">
            <Bell size={17} />
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
              >
                {unread}
              </motion.span>
            )}
          </button>
        }
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <span className="text-[13px] font-semibold">Notifications</span>
          <button onClick={markAll} className="flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline">
            <Check size={12} /> Mark all read
          </button>
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {notifs.length === 0 && (
            <div className="px-4 py-10 text-center text-xs text-muted">You&apos;re all caught up.</div>
          )}
          {notifs.map((n) => {
            const Icon = N_ICON[n.type] ?? Info;
            return (
              <button
                key={n.id}
                onClick={() => {
                  setBellOpen(false);
                  if (n.recordNo) router.push(`/records/${n.recordNo}`);
                }}
                className={cn("flex w-full gap-3 border-b border-[var(--border-subtle)] px-4 py-3 text-left transition-colors hover:bg-white/[0.04]", !n.read && "bg-white/[0.02]")}
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${N_COLOR[n.type]}1e`, color: N_COLOR[n.type] }}>
                  <Icon size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-[12.5px] leading-tight", !n.read ? "font-semibold" : "font-medium text-secondary")}>{n.title}</span>
                  {n.body && <span className="mt-0.5 block truncate text-[11px] text-muted">{n.body}</span>}
                  <span className="mt-1 block text-[10px] text-muted">{timeAgo(n.createdAt, now || undefined)}</span>
                </span>
                {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-400" />}
              </button>
            );
          })}
        </div>
      </Dropdown>

      {/* user */}
      <Dropdown
        open={userOpen}
        onOpenChange={setUserOpen}
        width={240}
        trigger={
          <button className="focus-ring ml-1 rounded-full transition-transform hover:scale-105" aria-label="Account">
            <Avatar name={user.name} color={user.color} size={30} />
          </button>
        }
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Avatar name={user.name} color={user.color} size={38} />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold">{user.name}</div>
            <div className="truncate text-[11px] text-muted">{user.email}</div>
            <span className="mt-1 inline-block rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-[var(--accent)]">
              {user.role}
            </span>
          </div>
        </div>
        <MenuDivider />
        <MenuItem icon={<UserIcon size={14} />} label="Profile & settings" onClick={() => { setUserOpen(false); router.push("/settings"); }} />
        <MenuItem icon={<Settings size={14} />} label="Appearance" shortcut="⌘," onClick={() => { setUserOpen(false); router.push("/settings"); }} />
        <MenuItem icon={<HelpCircle size={14} />} label="Keyboard shortcuts" shortcut="⌘K" onClick={() => { setUserOpen(false); setPaletteOpen(true); }} />
        <MenuDivider />
        <MenuItem
          icon={<LogOut size={14} />}
          label="Sign out"
          danger
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.replace("/login");
            router.refresh();
          }}
        />
      </Dropdown>

      <motion.div className="pointer-events-none absolute inset-x-0 -bottom-px hidden md:block" />
    </header>
  );
}
