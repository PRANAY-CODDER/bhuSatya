"use client";

import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import type { HeroSceneProps } from "./HeroScene";

interface SceneProps {
  isVisible: boolean;
}

function DistortedCore({ isVisible }: SceneProps) {
  const group = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  useFrame((_, delta) => {
    if (!group.current || !isVisible) return;

    group.current.rotation.y += delta * 0.12;
    group.current.rotation.x += delta * 0.035;
    group.current.rotation.x += (pointer.current.y * -0.08 - group.current.rotation.x) * delta * 1.5;
    group.current.rotation.z += (pointer.current.x * 0.06 - group.current.rotation.z) * delta * 1.5;
    group.current.position.x += (pointer.current.x * 0.22 - group.current.position.x) * delta * 1.2;
    group.current.position.y += (pointer.current.y * -0.12 - group.current.position.y) * delta * 1.2;
  });

  return (
    <group ref={group}>
      <Float speed={1.1} rotationIntensity={0.18} floatIntensity={0.28}>
        <mesh>
          <icosahedronGeometry args={[2.05, 5]} />
          <MeshDistortMaterial
            color="#10b981"
            distort={0.28}
            speed={1.2}
            roughness={0.28}
            metalness={0.72}
            transparent
            opacity={0.7}
          />
        </mesh>
      </Float>
      <mesh scale={2.14}>
        <icosahedronGeometry args={[2.05, 2]} />
        <meshBasicMaterial color="#6ee7b7" wireframe transparent opacity={0.2} />
      </mesh>
      <pointLight color="#10b981" intensity={12} distance={8} />
      <pointLight color="#ff9933" intensity={8} distance={7} position={[-3, 2, 2]} />
    </group>
  );
}

export default function HeroSceneCanvas({ className = "" }: HeroSceneProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(motionQuery.matches);
    const updateVisibility = () => setIsVisible(document.visibilityState === "visible");

    updateMotionPreference();
    updateVisibility();
    motionQuery.addEventListener("change", updateMotionPreference);
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      motionQuery.removeEventListener("change", updateMotionPreference);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const showScene = isVisible && !prefersReducedMotion;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[radial-gradient(circle_at_68%_38%,color-mix(in_srgb,var(--accent)_12%,transparent),transparent_38%),linear-gradient(135deg,var(--bg-primary),var(--bg-secondary))] ${className}`}
    >
      {showScene ? (
        <Canvas
          camera={{ position: [0, 0, 7], fov: 45 }}
          dpr={[1, 1.5]}
          frameloop={isVisible ? "always" : "never"}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        >
          <ambientLight intensity={0.35} />
          <DistortedCore isVisible={isVisible} />
        </Canvas>
      ) : null}
    </div>
  );
}