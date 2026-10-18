"use client";

/**
 * FocusCore — the signature 3D object of FocusFlow AI.
 *
 * A translucent "focus engine" orb with orbiting metallic rings,
 * glowing particles and small task nodes on orbital paths.
 *
 * - Fully procedural geometry (no downloaded models)
 * - Mouse parallax + magnetic drift toward the cursor
 * - Pauses rendering when the tab is hidden
 * - Renders a single frame when prefers-reduced-motion is set
 * - Graceful CSS fallback when WebGL is unavailable
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

type FocusCoreProps = {
  /** overall size in px (canvas square) */
  size?: number;
  /** 0..1 — drives orb brightness / ring speed (dashboard usage) */
  intensity?: number;
  /** show soft floating labels (hero only) */
  labels?: boolean;
  className?: string;
};

/* =====================================================
   UTILITIES
===================================================== */

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

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none)").matches;
}

/* =====================================================
   INNER SCENE PARTS
===================================================== */

const RING_CONFIGS = [
  { radius: 1.65, tiltX: 0.45, tiltZ: 0.1, speed: 0.24, color: "#0d9488", opacity: 0.75 },
  { radius: 1.95, tiltX: -0.7, tiltZ: 0.5, speed: -0.17, color: "#06b6d4", opacity: 0.6 },
  { radius: 2.28, tiltX: 0.2, tiltZ: -0.65, speed: 0.11, color: "#2dd4bf", opacity: 0.45 },
];

function Rings({ reduce }: { reduce: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (reduce || !group.current) return;
    const d = Math.min(delta, 0.05);
    group.current.children.forEach((child, i) => {
      const cfg = RING_CONFIGS[i % RING_CONFIGS.length];
      child.rotation.z += cfg.speed * d;
    });
  });

  return (
    <group ref={group}>
      {RING_CONFIGS.map((cfg, i) => (
        <mesh
          key={i}
          rotation={[cfg.tiltX, 0, cfg.tiltZ]}
        >
          <torusGeometry args={[cfg.radius, 0.012, 12, 140]} />
          <meshStandardMaterial
            color={cfg.color}
            metalness={0.9}
            roughness={0.28}
            transparent
            opacity={cfg.opacity}
            emissive={cfg.color}
            emissiveIntensity={0.25}
          />
        </mesh>
      ))}
    </group>
  );
}

function FocusOrb({ reduce, intensity }: { reduce: boolean; intensity: number }) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (reduce || !mesh.current) return;
    const t = state.clock.elapsedTime;
    // gentle breathing pulse
    const pulse = 1 + Math.sin(t * 0.9) * 0.018;
    mesh.current.scale.setScalar(pulse);
  });

  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[1, 5]} />
      <meshPhysicalMaterial
        color="#ffffff"
        metalness={0.05}
        roughness={0.18}
        transmission={0.78}
        thickness={1.4}
        ior={1.32}
        clearcoat={1}
        clearcoatRoughness={0.2}
        emissive="#0d9488"
        emissiveIntensity={0.1 + intensity * 0.2}
        transparent
        opacity={0.96}
      />
    </mesh>
  );
}

function InnerGlow({ intensity }: { intensity: number }) {
  return (
    <mesh scale={1.28}>
      <sphereGeometry args={[1, 24, 24]} />
      <meshBasicMaterial
        color={intensity > 0.6 ? "#0d9488" : "#06b6d4"}
        transparent
        opacity={0.05 + intensity * 0.07}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

function Particles({ reduce }: { reduce: boolean }) {
  // deterministic pseudo-random so the render stays pure
  const { positions, speeds } = useMemo(() => {
    const COUNT = 260;
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    let seed = 42;
    const rand = () => {
      // simple deterministic LCG
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < COUNT; i++) {
      // loose spherical shell 2.4 .. 4.2
      const r = 2.4 + rand() * 1.8;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      speeds[i] = 0.02 + rand() * 0.05;
    }
    return { positions, speeds };
  }, []);

  const points = useRef<THREE.Points>(null);

  useFrame((state, delta) => {
    if (reduce || !points.current) return;
    const d = Math.min(delta, 0.05);
    points.current.rotation.y += 0.03 * d;
    // subtle vertical drift
    const attr = points.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const COUNT = attr.count;
    for (let i = 0; i < COUNT; i++) {
      const y = attr.getY(i) + speeds[i] * d * 0.4;
      attr.setY(i, y > 3.4 ? -3.4 : y);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#0d9488"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

const TASK_NODES = [
  { radius: 1.65, phase: 0.4, size: 0.045, color: "#0d9488" },
  { radius: 1.95, phase: 2.4, size: 0.05, color: "#06b6d4" },
  { radius: 2.28, phase: 4.6, size: 0.04, color: "#0ea5e9" },
  { radius: 1.95, phase: 5.5, size: 0.035, color: "#14b8a6" },
];

function TaskNodes({ reduce }: { reduce: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (reduce || !group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const cfg = TASK_NODES[i % TASK_NODES.length];
      const angle = cfg.phase + t * (0.35 - i * 0.05);
      child.position.set(
        Math.cos(angle) * cfg.radius,
        Math.sin(angle * 0.8) * 0.35,
        Math.sin(angle) * cfg.radius
      );
    });
  });

  return (
    <group ref={group}>
      {TASK_NODES.map((cfg, i) => (
        <mesh key={i}>
          <sphereGeometry args={[cfg.size, 10, 10]} />
          <meshBasicMaterial color={cfg.color} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function ParallaxRig({
  reduce,
  children,
}: {
  reduce: boolean;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reduce || isTouchDevice()) return;

    const onMove = (event: MouseEvent) => {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = (event.clientY / window.innerHeight) * 2 - 1;
      target.current = { x: nx, y: ny };
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [reduce]);

  useFrame((state, delta) => {
    if (!group.current) return;
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    if (!reduce) {
      // slow continuous rotation
      group.current.rotation.y += 0.06 * d;

      // magnetic drift toward cursor
      const lerp = 1 - Math.pow(0.002, d);
      group.current.rotation.x += (target.current.y * 0.12 - group.current.rotation.x) * lerp * 0.35;
      group.current.rotation.z += (target.current.x * 0.08 - group.current.rotation.z) * lerp * 0.35;
      group.current.position.x += (target.current.x * 0.18 - group.current.position.x) * lerp * 0.3;
      group.current.position.y += (-target.current.y * 0.12 - group.current.position.y) * lerp * 0.3;
    } else {
      // static but framed
      group.current.rotation.set(0.2, 0.4, 0);
    }

    // tiny idle bob (skip when reduced motion)
    if (!reduce) {
      group.current.position.y += Math.sin(t * 0.7) * 0.0006;
    }
  });

  return <group ref={group}>{children}</group>;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={0.9} color="#ffffff" />
      <pointLight position={[-5, -2, -4]} intensity={14} color="#0d9488" distance={14} />
      <pointLight position={[5, 3, 2]} intensity={8} color="#06b6d4" distance={12} />
    </>
  );
}

/* =====================================================
   CSS FALLBACK
===================================================== */

function StaticOrb({ size, intensity }: { size: number; intensity: number }) {
  return (
    <div
      className="relative mx-auto rounded-full"
      style={{
        width: size * 0.62,
        height: size * 0.62,
        background:
          "radial-gradient(circle at 34% 30%, rgba(255,255,255,0.95), rgba(239,35,60,0.6) 40%, rgba(128,15,47,0.28) 72%, rgba(0,0,0,0.6) 100%)",
        boxShadow:
          "0 24px 80px -24px rgba(239, 35, 60,0.5), inset 0 0 60px rgba(239, 35, 60,0.2)",
        opacity: 0.85 + intensity * 0.15,
      }}
      role="img"
      aria-label="FocusFlow AI focus core visualization"
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: "1px solid rgba(255, 255, 255, 0.15)",
          transform: "rotateX(68deg) scale(1.35)",
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: "1px solid rgba(239, 35, 60, 0.4)",
          transform: "rotateX(68deg) rotateY(28deg) scale(1.6)",
        }}
      />
    </div>
  );
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function FocusCore({
  size = 460,
  intensity = 0.7,
  labels = false,
  className = "",
}: FocusCoreProps) {
  const [ready, setReady] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    // mount canvas after first paint so the fallback never flashes
    const id = window.setTimeout(() => {
      setWebgl(detectWebGL());
      setReduce(prefersReducedMotion());
      setReady(true);
    }, 60);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", onChange);
    return () => {
      window.clearTimeout(id);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  const dpr = useMemo<[number, number]>(() => {
    if (typeof window === "undefined") return [1, 1.5];
    return window.innerWidth < 1024 ? [1, 1.25] : [1, 1.75];
  }, []);

  if (!ready || !webgl) {
    return (
      <div className={className} style={{ width: size, height: size }}>
        <div className="flex h-full w-full items-center justify-center">
          <StaticOrb size={size} intensity={intensity} />
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ width: size, height: size }}>
      <Canvas
        camera={{ position: [0, 0.4, 6.2], fov: 42 }}
        dpr={dpr}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={reduce ? "demand" : "always"}
        style={{ background: "transparent" }}
      >
        <Lights />
        <ParallaxRig reduce={reduce}>
          <FocusOrb reduce={reduce} intensity={intensity} />
          <InnerGlow intensity={intensity} />
          <Rings reduce={reduce} />
          <TaskNodes reduce={reduce} />
          <Particles reduce={reduce} />
        </ParallaxRig>
      </Canvas>

      {labels && !reduce && (
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          <span className="absolute left-[6%] top-[22%] text-[10px] uppercase tracking-[0.22em] text-ink/45">
            Tasks
          </span>
          <span className="absolute right-[4%] top-[38%] text-[10px] uppercase tracking-[0.22em] text-ink/45">
            Focus
          </span>
          <span className="absolute left-[10%] bottom-[24%] text-[10px] uppercase tracking-[0.22em] text-ink/45">
            Schedule
          </span>
          <span className="absolute right-[9%] bottom-[16%] text-[10px] uppercase tracking-[0.22em] text-ink/45">
            Analytics
          </span>
        </div>
      )}
    </div>
  );
}
