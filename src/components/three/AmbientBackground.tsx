"use client";

import dynamic from "next/dynamic";

export type AmbientVariant = "grid" | "particles";

export interface AmbientBackgroundProps {
  className?: string;
  color?: string;
  density?: number;
  variant?: AmbientVariant;
}

const AmbientBackgroundCanvas = dynamic(() => import("./AmbientBackgroundCanvas"), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_srgb,var(--accent)_8%,transparent),transparent_68%)]" />,
});

export function AmbientBackground({ className, color = "#10b981", density = 18, variant = "grid" }: AmbientBackgroundProps) {
  return <AmbientBackgroundCanvas className={className} color={color} density={density} variant={variant} />;
}

export default AmbientBackground;
