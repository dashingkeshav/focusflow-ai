"use client";

/**
 * DashboardCore — a compact FocusCore variant for the dashboard.
 * Brightness/speed react to the user's actual focus score;
 * rings spin while a session is active.
 */

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface DashboardCoreProps {
  score: number; // 0..100 (live data)
  activeSession: boolean;
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

function CoreScene({
  score,
  activeSession,
  reduce,
}: {
  score: number;
  activeSession: boolean;
  reduce: boolean;
}) {
  const norm = Math.max(0, Math.min(100, score)) / 100;
  const group = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);

  const emissive = norm >= 0.8 ? "#0d9488" : norm >= 0.6 ? "#06b6d4" : "#f59e0b";

  useFrame((state, delta) => {
    if (reduce) return;
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    if (group.current) {
      group.current.rotation.y += (activeSession ? 0.35 : 0.1) * d;
      group.current.position.y = Math.sin(t * 0.8) * 0.04;
    }
    if (ringA.current && activeSession) ringA.current.rotation.z += 0.6 * d;
    if (ringB.current && activeSession) ringB.current.rotation.z -= 0.4 * d;
  });

  return (
    <group ref={group}>
      {/* core */}
      <mesh>
        <icosahedronGeometry args={[0.95, 4]} />
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.15}
          roughness={0.25}
          emissive={emissive}
          emissiveIntensity={0.12 + norm * 0.5}
        />
      </mesh>
      {/* glow shell */}
      <mesh scale={1.22}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial
          color={emissive}
          transparent
          opacity={0.06 + norm * 0.1}
          side={THREE.BackSide}
        />
      </mesh>
      {/* rings — spin only during an active session */}
      <mesh ref={ringA} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.5, 0.012, 10, 110]} />
        <meshStandardMaterial
          color="#0d9488"
          metalness={0.85}
          roughness={0.3}
          emissive="#0d9488"
          emissiveIntensity={0.25}
          transparent
          opacity={activeSession ? 0.65 : 0.4}
        />
      </mesh>
      <mesh ref={ringB} rotation={[Math.PI / 1.7, 0.4, 0]}>
        <torusGeometry args={[1.8, 0.01, 10, 110]} />
        <meshStandardMaterial
          color="#06b6d4"
          metalness={0.9}
          roughness={0.3}
          emissive="#0891b2"
          emissiveIntensity={0.2}
          transparent
          opacity={activeSession ? 0.4 : 0.2}
        />
      </mesh>
    </group>
  );
}

export default function DashboardCore({
  score,
  activeSession,
  size = 150,
}: DashboardCoreProps) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setWebgl(detectWebGL());
      setReduce(prefersReducedMotion());
    }, 60);
    return () => window.clearTimeout(id);
  }, []);

  const norm = Math.max(0, Math.min(100, score)) / 100;
  const status =
    norm >= 0.8 ? "Optimal focus" : norm >= 0.6 ? "Moderate focus" : score > 0 ? "Low focus" : "No sessions yet";

  // CSS fallback (WebGL unavailable / pending)
  if (webgl === null || !webgl || reduce) {
    return (
      <div
        role="img"
        aria-label={`Focus state: ${status}`}
        className="relative mx-auto rounded-full"
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle at 34% 30%, rgba(255,255,255,0.95), rgba(239,35,60,0.55) 40%, rgba(128,15,47,0.24) 75%)",
          boxShadow: `0 16px 50px -18px rgba(239, 35, 60,${0.3 + norm * 0.25})`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-semibold text-ink">{score}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size }} role="img" aria-label={`Focus state: ${status}`}>
      <Canvas
        camera={{ position: [0, 0.6, 4.4], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        frameloop={reduce ? "demand" : "always"}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 3, 3]} intensity={10} color="#FFFFFF" distance={10} />
        <pointLight position={[-3, -2, -2]} intensity={6} color="#0d9488" distance={9} />
        <CoreScene score={score} activeSession={activeSession} reduce={reduce} />
      </Canvas>
    </div>
  );
}
