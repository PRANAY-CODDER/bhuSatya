import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bhulekh 2.0 — AI Land Record Digitization",
  description:
    "AI-powered land record digitization & verification command center. OCR pipelines, NLP extraction, GIS mapping and human review for India's land records.",
};

const themeInit = `
try {
  var s = (JSON.parse(localStorage.getItem("bhulekh-ui") || "{}").state) || {};
  var theme = s.theme || "dark";
  var dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (!dark) document.documentElement.classList.add("light");
  var a = s.accent || "#10b981";
  var h = a.replace("#","");
  var r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  var root = document.documentElement;
  root.style.setProperty("--accent", a);
  root.style.setProperty("--accent-soft", "rgba("+r+","+g+","+b+",0.13)");
  root.style.setProperty("--accent-glow", "rgba("+r+","+g+","+b+",0.28)");
  root.dataset.motion = (s.motion === false) ? "off" : "on";
  root.dataset.density = s.density || "comfortable";
  root.dataset.font = s.fontSize || "normal";
} catch (e) {}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="bg-app antialiased">{children}</body>
    </html>
  );
}
