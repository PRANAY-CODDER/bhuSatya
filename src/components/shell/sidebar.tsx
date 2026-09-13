"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Database, Map, BarChart3, ScrollText, Settings, BookOpen,
  Landmark, LogOut, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/atoms";
import { useUiStore } from "@/lib/store";
import type { SafeUser } from "@/lib/auth";

const NAV = [
  {
    group: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    group: "Records",
    items: [
      { href: "/records", label: "Repository", icon: Database },
      { href: "/map", label: "GIS Map", icon: Map },
      { href: "/audit", label: "Audit Trail", icon: ScrollText },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/knowledge", label: "Knowledge Bank", icon: BookOpen },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function SidebarContent({
  user,
  collapsed,
  onNavigate,
}: {
  user: SafeUser;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 items-center gap-2.5 border-b border-[var(--border-subtle)] px-4", collapsed && "justify-center px-2")}>
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "linear-gradient(135deg,#ff9933 0%,#f4f4f6 50%,#138808 100%)" }}
        >
          <Landmark size={17} color="#0a0a0f" strokeWidth={2.4} />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden whitespace-nowrap">
            <div className="text-[14px] font-extrabold leading-none tracking-tight">
              BHULEKH <span className="accent-text">2.0</span>
            </div>
            <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
              Land Records AI
            </div>
          </motion.div>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV.map((g) => (
          <div key={g.group}>
            {!collapsed && (
              <div className="mb-1.5 px-2.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted">
                {g.group}
              </div>
            )}
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                      active ? "text-current" : "text-secondary hover:bg-white/[0.05] hover:text-current",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-lg border border-[var(--accent)]/25 bg-[var(--accent-soft)]"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full accent-bg" />}
                    <item.icon size={17} className="relative shrink-0" strokeWidth={active ? 2.3 : 1.9} />
                    {!collapsed && <span className="relative">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-[var(--border-subtle)] p-3", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-2.5 rounded-xl p-2", !collapsed && "bg-white/[0.03]")}>
          <div className="relative">
            <Avatar name={user.name} color={user.color} size={30} />
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[var(--bg-secondary)] bg-emerald-500" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">{user.name}</div>
              <div className="truncate text-[10px] capitalize text-muted">{user.role}</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={signOut} title="Sign out" className="focus-ring rounded-lg p-1.5 text-muted transition-colors hover:bg-red-500/15 hover:text-red-400">
              <LogOut size={14} />
            </button>
          )}
        </div>
        {!collapsed && <div className="tricolor-line mt-3 h-[2.5px] rounded-full opacity-50" />}
      </div>
    </div>
  );
}

export function Sidebar({ user }: { user: SafeUser }) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="glass-strong fixed inset-y-0 left-0 z-30 hidden border-r border-[var(--border-subtle)] md:block"
    >
      <SidebarContent user={user} collapsed={collapsed} />
    </motion.aside>
  );
}

export function MobileDrawer({ user, open, onClose }: { user: SafeUser; open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 360, damping: 36 }}
            className="glass-strong fixed inset-y-0 left-0 z-50 w-[260px] border-r border-[var(--border-subtle)] md:hidden"
          >
            <button onClick={onClose} className="absolute right-3 top-3.5 z-10 rounded-lg p-1.5 text-muted hover:bg-white/[0.06]" aria-label="Close menu">
              <X size={16} />
            </button>
            <SidebarContent user={user} collapsed={false} onNavigate={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
