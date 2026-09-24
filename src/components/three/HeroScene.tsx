"use client";

import dynamic from "next/dynamic";

export interface HeroSceneProps {
  className?: string;
}

const DynamicHeroScene = dynamic(
  () => import("./HeroSceneCanvas"),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[radial-gradient(circle_at_68%_38%,color-mix(in_srgb,var(--accent)_12%,transparent),transparent_38%),linear-gradient(135deg,var(--bg-primary),var(--bg-secondary))]"
      />
    ),
  },
);

/**
 * Usage: place <HeroScene /> as the first child of a relative page wrapper.
 */
export function HeroScene(props: HeroSceneProps) {
  return <DynamicHeroScene {...props} />;
}

export default HeroScene;