"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Target,
  ListTodo,
  Calendar,
  History,
  Repeat,
  ShieldAlert,
  BrainCircuit,
  Clock,
  Timer,
  Lightbulb,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import * as THREE from "three";

const INPUTS = [
  { id: "goals", label: "Goals", icon: Target, desc: "Aspirations & milestones" },
  { id: "tasks", label: "Tasks", icon: ListTodo, desc: "Action items & priorities" },
  { id: "calendar", label: "Calendar", icon: Calendar, desc: "Committed time blocks" },
  { id: "history", label: "Focus History", icon: History, desc: "Past session stamina" },
  { id: "habits", label: "Habits", icon: Repeat, desc: "Daily routines & streaks" },
  { id: "distractions", label: "Distractions", icon: ShieldAlert, desc: "Drift triggers & sites" },
];

const OUTPUTS = [
  { id: "ai_plan", label: "AI Plan", icon: BrainCircuit, desc: "Decomposed roadmap" },
  { id: "schedule", label: "Schedule", icon: Clock, desc: "Feasible time allocations" },
  { id: "session", label: "Focus Session", icon: Timer, desc: "Protected attention window" },
  { id: "insights", label: "Insights", icon: Lightbulb, desc: "Empirical pattern learning" },
  { id: "adaptation", label: "Adaptation", icon: Sparkles, desc: "Dynamic rescheduling" },
];

export default function IntelligenceCore3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedInput, setSelectedInput] = useState<string>("goals");
  const [selectedOutput, setSelectedOutput] = useState<string>("ai_plan");

  // Three.js 3D Core Animation
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
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 6.5);

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

    // Central Luminous Icosahedron Core (Warm radiant orange wireframe)
    const coreGeo = new THREE.IcosahedronGeometry(1.2, 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Inner Glowing Plasma Sphere (Warm golden amber)
    const innerGeo = new THREE.SphereGeometry(0.72, 24, 24);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffa500,
      transparent: true,
      opacity: 0.35,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerMesh);

    // Orbiting Concentric Energy Rings
    const ringGeo1 = new THREE.TorusGeometry(1.85, 0.016, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0xff6a00,
      transparent: true,
      opacity: 0.5,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    scene.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(2.15, 0.014, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xffbe3b,
      transparent: true,
      opacity: 0.38,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    scene.add(ring2);

    // Flowing Cosmic Particles (Data streaming from Inputs to Core to Outputs)
    const particleCount = 220;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    const pVel = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 6.2;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 3.2;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 2;
      pVel[i] = 0.012 + Math.random() * 0.022;
    }

    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      size: 0.07,
      color: 0xffa028,
      transparent: true,
      opacity: 0.85,
    });
    const particlePoints = new THREE.Points(pGeo, pMat);
    scene.add(particlePoints);

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      coreMesh.rotation.x = elapsedTime * 0.15;
      coreMesh.rotation.y = elapsedTime * 0.2;

      innerMesh.scale.setScalar(1 + 0.08 * Math.sin(elapsedTime * 2.5));

      ring1.rotation.z = elapsedTime * 0.25;
      ring2.rotation.x = elapsedTime * 0.2;

      // Update streaming particles
      const posAttr = pGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        let x = posAttr.getX(i);
        x += pVel[i];
        if (x > 3.2) x = -3.2;
        posAttr.setX(i, x);
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      coreGeo.dispose();
      coreMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      pGeo.dispose();
      pMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-7xl overflow-hidden rounded-4xl sm:rounded-[40px] border border-white/10 bg-[#070709]/80 p-6 sm:p-12 shadow-[0_32px_100px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
      {/* Subtle Atmospheric Cosmic Auras */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#FF4500]/12 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-amber-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#FF4500]/40 to-transparent" />

      {/* Header */}
      <div className="relative z-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-3.5 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF4500] shadow-[0_0_15px_rgba(255,69,0,0.2)]">
          <Sparkles className="h-3 w-3 text-[#FF4500]" />
          The Intelligent Core
        </span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl font-serif">
          How FocusFlow{" "}
          <span className="italic text-[#FF5500]">synthesizes your day.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-400 sm:text-base font-light">
          6 real signals stream continuously into the neural Focus Core, transforming raw intent
          into five adaptive, protected outputs.
        </p>
      </div>

      {/* 3D Visualizer Tri-Column Layout */}
      <div className="relative z-10 mt-12 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        {/* ==============================================================
            LEFT COLUMN: 6 INPUTS
            ============================================================== */}
        <div className="space-y-2.5 lg:col-span-3">
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-[#FF5500]">
              01 · Living Inputs
            </span>
            <span className="text-[10px] font-mono text-gray-400">6 Telemetries</span>
          </div>
          {INPUTS.map((inp) => {
            const Icon = inp.icon;
            const isSelected = selectedInput === inp.id;
            return (
              <motion.button
                key={inp.id}
                type="button"
                onClick={() => setSelectedInput(inp.id)}
                whileHover={{ x: 4 }}
                className={`group flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all backdrop-blur-md ${
                  isSelected
                    ? "border-[#FF4500]/60 bg-linear-to-r from-[#FF4500]/15 to-[#FF4500]/5 text-white shadow-[0_0_24px_rgba(255,69,0,0.2)] ring-1 ring-[#FF4500]/30"
                    : "border-white/10 bg-white/3 text-gray-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    isSelected
                      ? "border-[#FF4500]/40 bg-[#FF4500]/20 text-[#FF4500] shadow-xs"
                      : "border-white/10 bg-white/5 text-gray-400 group-hover:border-[#FF4500]/30 group-hover:bg-[#FF4500]/10 group-hover:text-[#FF5500]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white tracking-tight">{inp.label}</p>
                  <p className="truncate text-[10px] text-gray-400 font-light">{inp.desc}</p>
                </div>
                <ArrowRight
                  className={`h-3.5 w-3.5 transition-all ${
                    isSelected
                      ? "translate-x-1 text-[#FF4500] opacity-100"
                      : "text-gray-400 opacity-0 group-hover:opacity-100 group-hover:text-white"
                  }`}
                />
              </motion.button>
            );
          })}
        </div>

        {/* ==============================================================
            CENTER COLUMN: 3D WEBGL CORE
            ============================================================== */}
        <div className="relative flex min-h-95 items-center justify-center lg:col-span-6">
          <canvas
            ref={canvasRef}
            className="h-90 w-full max-w-115 cursor-grab active:cursor-grabbing"
          />

          {/* Central Overlay Badge */}
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-[#0a0a0c]/85 px-4 py-1.5 text-center shadow-xl backdrop-blur-xl">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF4500]">
              FocusFlow Intelligence Engine
            </p>
            <p className="text-[9px] text-gray-400 font-sans">Autonomous synthesis & cognitive pacing</p>
          </div>
        </div>

        {/* ==============================================================
            RIGHT COLUMN: 5 OUTPUTS
            ============================================================== */}
        <div className="space-y-2.5 lg:col-span-3">
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-amber-400">
              02 · Adaptive Outputs
            </span>
            <span className="text-[10px] font-mono text-gray-400">5 Executables</span>
          </div>
          {OUTPUTS.map((out) => {
            const Icon = out.icon;
            const isSelected = selectedOutput === out.id;
            return (
              <motion.button
                key={out.id}
                type="button"
                onClick={() => setSelectedOutput(out.id)}
                whileHover={{ x: -4 }}
                className={`group flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all backdrop-blur-md ${
                  isSelected
                    ? "border-amber-500/60 bg-linear-to-l from-amber-500/15 to-amber-500/5 text-white shadow-[0_0_24px_rgba(255,69,0,0.2)] ring-1 ring-amber-500/30"
                    : "border-white/10 bg-white/3 text-gray-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    isSelected
                      ? "border-amber-500/40 bg-amber-500/20 text-amber-400 shadow-xs"
                      : "border-white/10 bg-white/5 text-gray-400 group-hover:border-amber-500/30 group-hover:bg-amber-500/10 group-hover:text-amber-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white tracking-tight">{out.label}</p>
                  <p className="truncate text-[10px] text-gray-400 font-light">{out.desc}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
