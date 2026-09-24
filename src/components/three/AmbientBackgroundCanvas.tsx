"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Mesh, Points as PointsObject } from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import type { AmbientBackgroundProps, AmbientVariant } from "./AmbientBackground";

interface SceneProps {
  active: boolean;
  color: string;
  density: number;
  variant: AmbientVariant;
}

function AmbientScene({ active, color, density, variant }: SceneProps) {
  const mesh = useRef<Mesh>(null);
  const points = useRef<PointsObject>(null);
  const particleCount = Math.min(180, Math.max(24, Math.round(density * 4)));
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      positions[index * 3] = ((index * 37) % 100) / 100 * 13 - 6.5;
      positions[index * 3 + 1] = ((index * 61) % 100) / 100 * 7 - 3.5;
      positions[index * 3 + 2] = ((index * 17) % 100) / 100 * 2 - 1;
    }
    return positions;
  }, [particleCount]);

  useFrame((state, delta) => {
    if (!active) return;
    if (mesh.current) {
      mesh.current.rotation.z += delta * 0.012;
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.18) * 0.06;
    }
    if (points.current) {
      points.current.rotation.z -= delta * 0.006;
      points.current.position.y = Math.sin(state.clock.elapsedTime * 0.16) * 0.08;
    }
  });

  if (variant === "particles") {
    return (
      <points ref={points} position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} count={particleCount} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color={color} size={0.035} transparent opacity={0.22} sizeAttenuation />
      </points>
    );
  }

  const segments = Math.min(32, Math.max(12, Math.round(density)));
  return (
    <mesh ref={mesh} rotation={[0.15, 0, -0.18]} position={[1.25, 0.15, 0]}>
      <planeGeometry args={[13, 7, segments, Math.round(segments * 0.5)]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.055} />
    </mesh>
  );
}

export default function AmbientBackgroundCanvas({ className = "", color = "#10b981", density = 18, variant = "grid" }: AmbientBackgroundProps) {
  const [active, setActive] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motionQuery.matches);
    const updateVisibility = () => setActive(document.visibilityState === "visible");
    updateMotion();
    updateVisibility();
    motionQuery.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      motionQuery.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[radial-gradient(ellipse_at_top_right,color-mix(in_srgb,var(--accent)_8%,transparent),transparent_68%)] [mask-image:radial-gradient(ellipse_92%_110%_at_50%_50%,black_45%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_92%_110%_at_50%_50%,black_45%,transparent_100%)] ${className}`}
    >
      {!reducedMotion && (
        <Canvas
          className="absolute inset-0 h-full w-full"
          camera={{ position: [0, 0, 6], fov: 45 }}
          dpr={[1, 1.25]}
          frameloop={active ? "always" : "never"}
          gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
        >
          <AmbientScene active={active} color={color} density={density} variant={variant} />
        </Canvas>
      )}
    </div>
  );
}
