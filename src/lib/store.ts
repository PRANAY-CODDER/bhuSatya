"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const ACCENTS = [
  { name: "Emerald", value: "#10b981" },
  { name: "Saffron", value: "#ff9933" },
  { name: "India Green", value: "#22c55e" },
  { name: "Navy", value: "#6366f1" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Amber", value: "#eab308" },
];

function hexToSoft(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function applyUiPrefs(p: {
  accent: string;
  theme: "dark" | "light" | "system";
  motion: boolean;
  density: "comfortable" | "compact";
  fontSize: "normal" | "large";
}) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark =
    p.theme === "dark" ||
    (p.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("light", !dark);
  root.style.setProperty("--accent", p.accent);
  root.style.setProperty("--accent-soft", hexToSoft(p.accent, 0.13));
  root.style.setProperty("--accent-glow", hexToSoft(p.accent, 0.28));
  root.dataset.motion = p.motion ? "on" : "off";
  root.dataset.density = p.density;
  root.dataset.font = p.fontSize;
}

type UiState = {
  sidebarCollapsed: boolean;
  paletteOpen: boolean;
  notifOpen: boolean;
  accent: string;
  theme: "dark" | "light" | "system";
  motion: boolean;
  density: "comfortable" | "compact";
  fontSize: "normal" | "large";
  toggleSidebar: () => void;
  setPaletteOpen: (v: boolean) => void;
  setNotifOpen: (v: boolean) => void;
  setAccent: (a: string) => void;
  setTheme: (t: "dark" | "light" | "system") => void;
  setMotion: (m: boolean) => void;
  setDensity: (d: "comfortable" | "compact") => void;
  setFontSize: (f: "normal" | "large") => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      paletteOpen: false,
      notifOpen: false,
      accent: "#10b981",
      theme: "dark",
      motion: true,
      density: "comfortable",
      fontSize: "normal",
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setPaletteOpen: (v) => set({ paletteOpen: v }),
      setNotifOpen: (v) => set({ notifOpen: v }),
      setAccent: (accent) => {
        set({ accent });
        applyUiPrefs({ ...get(), accent });
      },
      setTheme: (theme) => {
        set({ theme });
        applyUiPrefs({ ...get(), theme });
      },
      setMotion: (motion) => {
        set({ motion });
        applyUiPrefs({ ...get(), motion });
      },
      setDensity: (density) => {
        set({ density });
        applyUiPrefs({ ...get(), density });
      },
      setFontSize: (fontSize) => {
        set({ fontSize });
        applyUiPrefs({ ...get(), fontSize });
      },
    }),
    {
      name: "bhulekh-ui",
      partialize: (s) => ({
        accent: s.accent,
        theme: s.theme,
        motion: s.motion,
        density: s.density,
        fontSize: s.fontSize,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    },
  ),
);

/* ---------------------------------- toasts --------------------------------- */

export type Toast = {
  id: number;
  kind: "success" | "error" | "warning" | "info";
  title: string;
  body?: string;
};

type ToastState = {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
};

let toastSeq = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 5000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export function toast(kind: Toast["kind"], title: string, body?: string) {
  useToastStore.getState().push({ kind, title, body });
}
