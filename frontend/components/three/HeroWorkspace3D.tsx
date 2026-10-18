"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Target,
  Brain,
  Timer,
  Sparkles,
  Zap,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import * as THREE from "three";

export default function HeroWorkspace3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mouse parallax motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), {
    stiffness: 120,
    damping: 24,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 120,
    damping: 24,
  });

  const [activePlanStep, setActivePlanStep] = useState(1); // DSA active

  // Three.js ambient background scene setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 7);

    // Dynamic resize handler
    const handleResize = () => {
      if (!canvas) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    handleResize();

    // Floating subtle particle field (cyan & teal)
    const particleCount = 140;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const tealColor = new THREE.Color("#0d9488");
    const cyanColor = new THREE.Color("#06b6d4");
    const pearlColor = new THREE.Color("#e2e8f0");

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;

      const mixed = Math.random();
      const color = mixed < 0.4 ? tealColor : mixed < 0.7 ? cyanColor : pearlColor;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.NormalBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Floating subtle geometric polyhedron (Focus intelligence core preview)
    const icosaGeometry = new THREE.IcosahedronGeometry(1.4, 1);
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x0d9488,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const icosa = new THREE.Mesh(icosaGeometry, wireMaterial);
    icosa.position.set(1.6, -0.6, -1);
    scene.add(icosa);

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Subtle rotation
      particles.rotation.y = elapsedTime * 0.04;
      particles.rotation.x = elapsedTime * 0.02;

      icosa.rotation.x = elapsedTime * 0.08;
      icosa.rotation.y = elapsedTime * 0.12;

      renderer.render(scene, camera);
    };

    animate();
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      geometry.dispose();
      material.dispose();
      icosaGeometry.dispose();
      wireMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handlePointerLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative mx-auto aspect-[1.15/1] w-full max-w-[680px] select-none [perspective:1400px]"
    >
      {/* 3D WebGL Background Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
      />

      {/* Ambient Radial Pearl Glow */}
      <div className="pointer-events-none absolute inset-[-10%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(13,148,136,0.12),rgba(6,182,212,0.08)_40%,transparent_70%)] blur-3xl" />

      {/* 3D Layered Transform Shell */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative h-full w-full [transform-style:preserve-3d]"
      >
        {/* ==============================================================
            CARD 1: CURRENT GOAL (Main Anchor Card, Back Depth)
            ============================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          style={{ transform: "translateZ(30px)" }}
          className="absolute left-[4%] top-[6%] w-[84%] rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 shadow-sm">
                <Target className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">
                  Current Goal
                </p>
                <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                  Prepare for Placement
                </h3>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/60 bg-teal-50/80 px-3 py-1 text-xs font-semibold text-teal-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />
              Active Sprint
            </span>
          </div>

          {/* Goal Milestones Pathway */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-700">Sprint Roadmap</span>
              <span className="font-semibold text-teal-700">4 Milestones</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500" style={{ width: "68%" }} />
              </div>
              <span className="text-xs font-bold text-slate-800">68%</span>
            </div>
          </div>
        </motion.div>

        {/* ==============================================================
            CARD 2: AI PLAN (Stepped Dimensional Nodes, Mid Depth)
            ============================================================== */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          style={{ transform: "translateZ(65px)" }}
          className="absolute left-[8%] top-[34%] w-[84%] rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_25px_60px_-18px_rgba(15,23,42,0.1)] backdrop-blur-2xl sm:p-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                <Brain className="h-4 w-4" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                AI Plan Sequence
              </p>
            </div>
            <span className="text-[11px] font-medium text-teal-600">Gemini 2.5 Dynamic</span>
          </div>

          {/* Stepped Interactive Nodes */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { id: 0, title: "Java", sub: "Core Done", done: true },
              { id: 1, title: "DSA", sub: "In Progress", active: true },
              { id: 2, title: "React", sub: "Next Up", queued: true },
              { id: 3, title: "Mock", sub: "Interview", queued: true },
            ].map((node) => (
              <div
                key={node.id}
                onClick={() => setActivePlanStep(node.id)}
                className={`relative cursor-pointer rounded-2xl border p-2.5 text-center transition-all ${
                  node.id === activePlanStep
                    ? "border-teal-500/70 bg-gradient-to-b from-teal-50/90 to-cyan-50/60 shadow-md ring-2 ring-teal-500/20"
                    : node.done
                    ? "border-slate-200/80 bg-slate-50/60 hover:bg-slate-100/60"
                    : "border-slate-200/60 bg-white/70 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-center">
                  {node.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                  ) : node.active ? (
                    <span className="h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(13,148,136,0.8)]" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  )}
                </div>
                <p className="mt-1 text-xs font-bold text-slate-800">{node.title}</p>
                <p className="text-[9px] text-slate-500">{node.sub}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ==============================================================
            CARD 3: FOCUS TIMER CAPSULE (Foreground High Depth)
            ============================================================== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{ transform: "translateZ(95px)" }}
          className="absolute bottom-[8%] left-[6%] w-[48%] rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-[0_25px_60px_-15px_rgba(13,148,136,0.18)] backdrop-blur-2xl sm:p-5"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700">
              <Timer className="h-3.5 w-3.5 text-teal-600" />
              Focus Session
            </span>
            <span className="flex h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(13,148,136,0.9)]" />
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              42:18
            </span>
            <span className="text-xs font-semibold text-slate-400">/ 50m</span>
          </div>

          <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            <span>Deep focus · Browser shielded</span>
          </div>
        </motion.div>

        {/* ==============================================================
            CARD 4: FOCUS SCORE GAUGE & METRICS (Foreground Floating Right)
            ============================================================== */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          style={{ transform: "translateZ(105px)" }}
          className="absolute bottom-[6%] right-[4%] w-[42%] rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-[0_30px_70px_-18px_rgba(6,182,212,0.2)] backdrop-blur-2xl sm:p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700">
              Focus Score
            </span>
            <Zap className="h-3.5 w-3.5 text-cyan-500" />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  91
                </span>
                <span className="text-xs font-semibold text-teal-600">/ 100</span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-teal-600">
                <TrendingUp className="h-3 w-3" /> +14% velocity
              </p>
            </div>

            {/* Circular Miniature Gauge */}
            <div className="relative flex h-14 w-14 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-teal-500"
                  strokeDasharray="91, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <Sparkles className="absolute h-4 w-4 text-teal-600" />
            </div>
          </div>
        </motion.div>

        {/* Floating Dimensional Light Sparks */}
        <div
          aria-hidden
          style={{ transform: "translateZ(120px)" }}
          className="pointer-events-none absolute -right-3 top-16 h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.8)]"
        />
        <div
          aria-hidden
          style={{ transform: "translateZ(90px)" }}
          className="pointer-events-none absolute -left-2 bottom-28 h-2.5 w-2.5 rounded-full bg-teal-400 shadow-[0_0_16px_rgba(13,148,136,0.8)]"
        />
      </motion.div>
    </div>
  );
}
