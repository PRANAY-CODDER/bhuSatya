"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Database, Map, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar, MobileDrawer } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";
import { Toaster } from "./toaster";
import { AiChatWidget } from "./ai-chat-widget";
import { applyUiPrefs, useUiStore } from "@/lib/store";
import type { SafeUser } from "@/lib/auth";

const MOBILE_NAV = [
  { href: "/", icon: LayoutDashboard, label: "Home", exact: true },
  { href: "/records", icon: Database, label: "Records" },
  { href: "/map", icon: Map, label: "Map" },
  { href: "/analytics", icon: BarChart3, label: "Stats" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function AppShell({ user, children }: { user: SafeUser; children: ReactNode }) {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const [drawer, setDrawer] = useState(false);

  /* hydrate persisted prefs onto <html> */
  useEffect(() => {
    const s = useUiStore.getState();
    applyUiPrefs(s);
  }, []);

  /* ⌘K / Ctrl+K */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setPaletteOpen]);

  return (
    <div className="min-h-dvh">
      <Sidebar user={user} />
      <MobileDrawer user={user} open={drawer} onClose={() => setDrawer(false)} />

      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          collapsed ? "md:pl-16" : "md:pl-60",
        )}
      >
        <Topbar user={user} onMenu={() => setDrawer(true)} />

        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 14, filter: "blur(5px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 pb-20 md:pb-0"
        >
          {children}
        </motion.main>

        <footer className="hidden items-center justify-between border-t border-[var(--border-subtle)] px-5 py-2 text-[10.5px] text-muted md:flex">
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-[var(--border-subtle)] bg-white/[0.04] px-1.5 py-0.5 font-mono">⌘K</kbd>
            command palette
            <span className="mx-1 opacity-40">·</span> Bhu Satya 2.0 — SIH 2025 · _404Build
          </span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500 anim-pulse-dot" />
            All systems operational
          </span>
        </footer>
      </div>

      {/* mobile bottom nav */}
      <nav className="glass-strong fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-[var(--border-subtle)] pb-[env(safe-area-inset-bottom)] md:hidden">
        {MOBILE_NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-[52px] min-w-[52px] flex-col items-center justify-center gap-0.5 px-3 text-[9.5px] font-medium",
                active ? "text-[var(--accent)]" : "text-muted",
              )}
            >
              {active && (
                <motion.span layoutId="mnav" className="absolute -top-px h-[2.5px] w-10 rounded-b-full accent-bg" />
              )}
              <item.icon size={19} strokeWidth={active ? 2.3 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <CommandPalette />
      <AiChatWidget />
      <Toaster />
    </div>
  );
}
