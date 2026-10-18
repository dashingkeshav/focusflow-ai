"use client";

/**
 * FocusProtectionCore — small interactive 3D Focus Core for the session page.
 *
 * Reactions (subtle by design):
 *   healthy session  → slow smooth rotation, calm violet/blue emissive
 *   productive site  → slightly brighter core
 *   distraction      → core dims and slows
 *   block event      → outer ring briefly pulses red
 *
 * Falls back to a static CSS orb when WebGL is unavailable or motion is reduced.
 */

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type CoreMood = "idle" | "healthy" | "productive" | "distracted" | "blocked";

interface FocusProtectionCoreProps {
  mood: CoreMood;
  size?: number;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

const MOOD_COLORS: Record<CoreMood, string> = {
  idle: "#94a3b8",
  healthy: "#0d9488",
  productive: "#06b6d4",
  distracted: "#f59e0b",
  blocked: "#f43f5e",
};

function CoreScene({ mood, reduce }: { mood: CoreMood; reduce: boolean }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const [pulse, setPulse] = useState(0);
  const lastMood = useRef<CoreMood>(mood);

  // Trigger a brief ring pulse when a block happens.
  useEffect(() => {
    if (mood === "blocked" && lastMood.current !== "blocked") {
      setPulse(1);
      const id = window.setTimeout(() => setPulse(0), 1200);
      lastMood.current = mood;
      return () => window.clearTimeout(id);
    }
    lastMood.current = mood;
  }, [mood]);

  const emissive = MOOD_COLORS[mood] || MOOD_COLORS.idle;
  const speed = mood === "distracted" || mood === "blocked" ? 0.06 : mood === "productive" ? 0.3 : 0.18;
  const brightness = mood === "productive" ? 0.75 : mood === "healthy" ? 0.5 : mood === "idle" ? 0.15 : 0.25;

  useFrame((state, delta) => {
    if (reduce) return;
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    if (group.current) {
      group.current.rotation.y += speed * d;
      group.current.position.y = Math.sin(t * 0.8) * 0.04;
    }
    if (ring.current) {
      ring.current.rotation.z += 0.4 * d;
      const material = ring.current.material as THREE.MeshStandardMaterial;
      material.opacity = pulse > 0 ? 0.85 : 0.35;
      material.emissiveIntensity = pulse > 0 ? 1.2 : 0.2;
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[0.95, 4]} />
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.15}
          roughness={0.25}
          emissive={emissive}
          emissiveIntensity={0.12 + brightness * 0.5}
        />
      </mesh>
      <mesh scale={1.22}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial color={emissive} transparent opacity={0.05 + brightness * 0.12} side={THREE.BackSide} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.5, 0.014, 10, 110]} />
        <meshStandardMaterial
          color={pulse > 0 ? "#f43f5e" : "#0d9488"}
          metalness={0.85}
          roughness={0.3}
          emissive={pulse > 0 ? "#f43f5e" : "#0d9488"}
          emissiveIntensity={0.22}
          transparent
          opacity={0.45}
        />
      </mesh>
    </group>
  );
}

export default function FocusProtectionCore({ mood = "idle", size = 120 }: FocusProtectionCoreProps) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setWebgl(detectWebGL());
      setReduce(prefersReducedMotion());
    }, 60);
    return () => window.clearTimeout(id);
  }, []);

  const color = MOOD_COLORS[mood] || MOOD_COLORS.idle;

  if (webgl === null || !webgl || reduce) {
    return (
      <div
        role="img"
        aria-label={`Focus protection: ${mood}`}
        className="relative mx-auto rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 34% 30%, rgba(255,255,255,0.95), ${color}33 40%, rgba(13, 148, 136, 0.15) 75%)`,
          boxShadow: `0 12px 40px -14px ${color}66`,
        }}
      />
    );
  }

  return (
    <div style={{ width: size, height: size }} role="img" aria-label={`Focus protection: ${mood}`}>
      <Canvas
        camera={{ position: [0, 0.6, 4.4], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 3, 3]} intensity={10} color="#FFFFFF" distance={10} />
        <pointLight position={[-3, -2, -2]} intensity={6} color="#0d9488" distance={9} />
        <CoreScene mood={mood} reduce={reduce} />
      </Canvas>
    </div>
  );
}
