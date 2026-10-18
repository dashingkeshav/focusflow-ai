"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Radio,
  Users,
  Timer,
  ShieldCheck,
  Headphones,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowRight,
  Lock,
  Globe,
  Flame,
  CheckCircle2,
  Zap,
  BarChart3,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Award,
  Layers,
  Laptop,
  MessageSquare,
  ShieldAlert,
  Sliders,
  ExternalLink,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import MagneticButton from "@/components/ui/MagneticButton";
import Reveal from "@/components/ui/Reveal";
import { useAuth } from "@/lib/auth";

interface ParticipantSimulator {
  id: string;
  name: string;
  role: string;
  avatar: string;
  task: string;
  focusScore: number;
  streak: number;
  status: "Flowing" | "Deep Sprint" | "Reviewing";
}

const SIMULATED_PARTICIPANTS: ParticipantSimulator[] = [
  {
    id: "1",
    name: "Alex V.",
    role: "Systems Architect",
    avatar: "AV",
    task: "Refactoring PostgreSQL Query Engine",
    focusScore: 98,
    streak: 14,
    status: "Flowing",
  },
  {
    id: "2",
    name: "Elena R.",
    role: "ML Researcher",
    avatar: "ER",
    task: "NeurIPS 2026 Attention Benchmark",
    focusScore: 94,
    streak: 8,
    status: "Deep Sprint",
  },
  {
    id: "3",
    name: "Devon K.",
    role: "Full-Stack Dev",
    avatar: "DK",
    task: "Implementing WebSocket Room Mesh",
    focusScore: 91,
    streak: 21,
    status: "Flowing",
  },
  {
    id: "4",
    name: "Maya S.",
    role: "Med Student",
    avatar: "MS",
    task: "Neuroanatomy High-Yield Sprints",
    focusScore: 96,
    streak: 5,
    status: "Reviewing",
  },
];

const SOUNDSCAPES = [
  {
    id: "lofi",
    label: "Lo-Fi Deep Study",
    desc: "Mellow 75 BPM organic beats & warm electric piano chords",
    frequency: 220,
    type: "triangle" as OscillatorType,
  },
  {
    id: "binaural",
    label: "40Hz Gamma Waves",
    desc: "Clinically validated auditory entrainment for extreme focus",
    frequency: 180,
    type: "sine" as OscillatorType,
  },
  {
    id: "rain",
    label: "Rain in Kyoto",
    desc: "Calming pink noise rainfall against cedar wood architecture",
    frequency: 330,
    type: "sine" as OscillatorType,
  },
  {
    id: "drone",
    label: "Obsidian Cosmic Drone",
    desc: "Sub-bass harmonic resonance masking office and street noises",
    frequency: 110,
    type: "sawtooth" as OscillatorType,
  },
];

const ROOM_CATEGORIES = [
  {
    id: "deep_work",
    label: "Deep Work",
    badge: "Maximum Silence",
    desc: "Strict zero-interruption sprint pods. For heavy architectural decisions, paper writing, and hard problem solving.",
    recommendedRhythm: "50m sprint + 10m pause",
    activeRoomsCount: 18,
    sampleRoom: "Autonomous Kernel Sprints",
  },
  {
    id: "coding",
    label: "Software Engineering",
    badge: "Telemetry Shielded",
    desc: "Synchronized GitHub pull request sprints, algorithm practice, and full-stack feature releases.",
    recommendedRhythm: "90m Ultradian sprint",
    activeRoomsCount: 34,
    sampleRoom: "Distributed Rust Systems",
  },
  {
    id: "studying",
    label: "Academic Mastery",
    badge: "Exam Prep",
    desc: "Medical, law, engineering, and graduate students maintaining shared momentum through high-density study blocks.",
    recommendedRhythm: "25m Pomodoro rhythm",
    activeRoomsCount: 29,
    sampleRoom: "USMLE & Bar Exam Sprint Hub",
  },
  {
    id: "writing",
    label: "Creative & Prose",
    badge: "Flow State",
    desc: "Writers, researchers, and technical documentation authors maintaining solitary discipline together.",
    recommendedRhythm: "50m sprint + 10m pause",
    activeRoomsCount: 12,
    sampleRoom: "Nonfiction Manuscript Drafts",
  },
];

const FAQS = [
  {
    question: "Do I have to turn on my webcam or microphone in Focus Rooms?",
    answer:
      "Never. FocusFlow AI was built explicitly to eliminate Zoom and Google Meet video fatigue. Presence and accountability in Focus Rooms are maintained strictly through synchronized Pomodoro telemetry, verified focus scores, and real-time active sprint indicators. You work peacefully in your own space without camera pressure.",
  },
  {
    question: "How does the Distraction Shield protect the room?",
    answer:
      "When you connect via the FocusFlow Chrome Extension or Windows Desktop Agent, off-task domains (such as social feeds, gaming portals, and entertainment sites) are actively filtered during sprints. If a participant drifts into an off-task tab, their shield status flags locally, giving gentle nudges without revealing private screen or browsing content to other members.",
  },
  {
    question: "Can I create private rooms for my team, friends, or study group?",
    answer:
      "Yes. You can instantly toggle any room between Public (discoverable by the global community) and Private (accessible only via a unique 6-character room invite code or direct link). Pro members can also set custom room passwords and assign co-hosts.",
  },
  {
    question: "What happens if I disconnect or refresh my browser?",
    answer:
      "Our WebSocket mesh protocol is reconnection-resilient. When you reload or switch networks, FocusFlow AI automatically reconnects your session, resynchronizes the server countdown clock to the exact millisecond, and preserves your logged focus minutes in PostgreSQL without losing data.",
  },
  {
    question: "Can I run Focus Rooms alongside my Spotify or preferred music?",
    answer:
      "Absolutely. Focus Rooms includes optional built-in generative soundscapes (Lo-Fi, 40Hz Gamma binaural waves, Kyoto rain, and cosmic drones), but you can toggle them off with one click and stream your own Spotify, Apple Music, or ambient audio setup.",
  },
  {
    question: "How does Focus Rooms integrate with my AI Planner and Goals?",
    answer:
      "Focus Rooms seamlessly binds with your FocusFlow AI task backlog. You can launch a room session directly from any planned milestone or task card. When the room countdown timer concludes, verified minutes are automatically credited toward your active milestone.",
  },
];

export default function FocusRoomsContent() {
  const { user } = useAuth();

  // Interactive Simulator Timer States
  const [timerPreset, setTimerPreset] = useState<25 | 50 | 90>(25);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedSoundscape, setSelectedSoundscape] = useState<string>("lofi");
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Web Audio synth ref for ambient preview
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Switch timer preset
  const handleSelectPreset = (preset: 25 | 50 | 90) => {
    setTimerPreset(preset);
    setIsRunning(false);
    setTimeLeft(preset * 60);
  };

  // Timer Tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  // Handle ambient soundscape preview
  const toggleAudio = () => {
    if (isAudioPlaying) {
      stopAudio();
    } else {
      startAudio(selectedSoundscape);
    }
  };

  const startAudio = (soundId: string) => {
    try {
      const sound = SOUNDSCAPES.find((s) => s.id === soundId) || SOUNDSCAPES[0];
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }

      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }

      // Stop previous osc if any
      if (oscRef.current) {
        try {
          oscRef.current.stop();
          oscRef.current.disconnect();
        } catch {}
      }

      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();

      osc.type = sound.type;
      osc.frequency.setValueAtTime(sound.frequency, audioCtxRef.current.currentTime);

      // Low volume for gentle ambient preview
      gain.gain.setValueAtTime(0.04, audioCtxRef.current.currentTime);

      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);

      osc.start();
      oscRef.current = osc;
      gainRef.current = gain;
      setIsAudioPlaying(true);
    } catch {
      // Audio autoplay policy fallback
      setIsAudioPlaying(false);
    }
  };

  const stopAudio = () => {
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch {}
      oscRef.current = null;
    }
    setIsAudioPlaying(false);
  };

  useEffect(() => {
    if (isAudioPlaying) {
      startAudio(selectedSoundscape);
    }
    return () => {
      stopAudio();
    };
  }, [selectedSoundscape]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalSeconds = timerPreset * 60;
  const progressPercent = Math.round(((totalSeconds - timeLeft) / totalSeconds) * 100);

  return (
    <div className="relative min-h-screen bg-transparent text-white selection:bg-[#FF4500] selection:text-white">
      {/* Background Dot Matrix Pattern */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-15"
        style={{
          backgroundImage: "radial-gradient(circle, #444 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        {/* ========================================================================= */}
        {/* HERO SECTION */}
        {/* ========================================================================= */}
        <section className="text-center max-w-4xl mx-auto mb-20">
          <Reveal>
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500] text-xs font-mono font-semibold uppercase tracking-wider mb-8 shadow-lg shadow-[#FF4500]/10 backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4500] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF4500]"></span>
              </span>
              <span>LIVE COWORKING PROTOCOL • ZERO VIDEO FATIGUE</span>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
              Deep Work Is Better Together.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4500] via-[#FF6422] to-amber-400">
                Without The Video Burnout.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
              Step into synchronized, distraction-shielded coworking rooms. Real-time
              Pomodoro timers, ambient soundscapes, authentic browser telemetry
              accountability, and collective flow with elite builders, researchers, and
              students across the globe.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <MagneticButton>
                  <Link
                    href="/dashboard/focus-rooms"
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF4500] to-[#FF6422] text-white font-bold text-sm shadow-xl shadow-[#FF4500]/25 hover:opacity-95 transition-all"
                  >
                    <Radio className="w-5 h-5 animate-pulse" />
                    <span>Enter Your Focus Rooms Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </MagneticButton>
              ) : (
                <>
                  <MagneticButton>
                    <Link
                      href="/dashboard/focus-rooms"
                      className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF4500] to-[#FF6422] text-white font-bold text-sm shadow-xl shadow-[#FF4500]/25 hover:opacity-95 transition-all"
                    >
                      <Zap className="w-5 h-5" />
                      <span>Join or Host a Room</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </MagneticButton>

                  <a
                    href="#interactive-simulator"
                    className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200 font-semibold text-sm transition-all backdrop-blur-sm"
                  >
                    <Sliders className="w-4 h-4 text-[#FF4500]" />
                    <span>Try Room HUD Simulator</span>
                  </a>
                </>
              )}
            </div>
          </Reveal>

          {/* Quick Stats Grid */}
          <Reveal delay={0.4}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto">
              <div className="p-4 rounded-2xl border border-white/10 bg-[#0d0d12]/60 backdrop-blur-md text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-[#FF4500] font-mono">
                  14,800+
                </div>
                <div className="text-xs text-gray-400 mt-1">Hours Focused This Month</div>
              </div>

              <div className="p-4 rounded-2xl border border-white/10 bg-[#0d0d12]/60 backdrop-blur-md text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  0 Cameras
                </div>
                <div className="text-xs text-gray-400 mt-1">Zero Video / Zoom Fatigue</div>
              </div>

              <div className="p-4 rounded-2xl border border-white/10 bg-[#0d0d12]/60 backdrop-blur-md text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                  99.4%
                </div>
                <div className="text-xs text-gray-400 mt-1">Sprint Completion Rate</div>
              </div>

              <div className="p-4 rounded-2xl border border-white/10 bg-[#0d0d12]/60 backdrop-blur-md text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
                  &lt; 50ms
                </div>
                <div className="text-xs text-gray-400 mt-1">WebSocket Sync Telemetry</div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ========================================================================= */}
        {/* INTERACTIVE LIVE ROOM HUD SIMULATOR */}
        {/* ========================================================================= */}
        <section id="interactive-simulator" className="mb-28 scroll-mt-24">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <Badge className="mb-3">
                Hands-On Experience
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
                Interactive Focus Room HUD
              </h2>
              <p className="text-gray-400 text-sm">
                Test the exact synchronized control interface used inside FocusFlow rooms.
                Toggle timer rhythms, try live soundscapes, and witness peer telemetry.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-[#101016] via-[#0b0b0f] to-[#07070a] shadow-2xl overflow-hidden p-6 sm:p-8 relative">
              {/* Top Room Header Bar */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-white/10 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FF4500]/20 border border-[#FF4500]/40 flex items-center justify-center text-[#FF4500]">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base sm:text-lg">
                        Global Engineering & Deep Work Pod #04
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <Globe className="w-2.5 h-2.5" /> Public
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono">
                      Host: Sarah Chen (Senior Systems Lead) • Invite Code:{" "}
                      <span className="text-amber-400 font-bold">FF-9281</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono text-gray-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Shield: Strict 100%</span>
                  </div>

                  <Link
                    href="/dashboard/focus-rooms"
                    className="inline-flex items-center gap-2 bg-[#FF4500] hover:bg-[#ff5722] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-[#FF4500]/20"
                  >
                    <span>Open Live Room</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Main Room Cockpit: Timer & Participants */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
                {/* Left Column: Timer & Controls (7 cols) */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                  {/* Preset Rhythm Buttons */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-wider mr-2">
                      Rhythm:
                    </span>
                    {(
                      [
                        { val: 25, label: "25m Pomodoro" },
                        { val: 50, label: "50m Deep Flow" },
                        { val: 90, label: "90m Ultradian" },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.val}
                        onClick={() => handleSelectPreset(p.val)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          timerPreset === p.val
                            ? "bg-[#FF4500] text-white font-bold shadow-lg shadow-[#FF4500]/30"
                            : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Synchronized Circular Timer Display */}
                  <div className="relative py-8 flex flex-col items-center justify-center">
                    <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                      {/* Background SVG Ring */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="50%"
                          cy="50%"
                          r="42%"
                          className="stroke-white/5"
                          strokeWidth="10"
                          fill="transparent"
                        />
                        <circle
                          cx="50%"
                          cy="50%"
                          r="42%"
                          className="stroke-[#FF4500] transition-all duration-1000 ease-linear"
                          strokeWidth="10"
                          strokeDasharray={600}
                          strokeDashoffset={600 - (600 * progressPercent) / 100}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>

                      {/* Center Display */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-5xl sm:text-6xl font-black font-mono tracking-tighter text-white">
                          {formatTime(timeLeft)}
                        </span>
                        <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-gray-400">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isRunning ? "bg-emerald-400 animate-pulse" : "bg-gray-500"
                            }`}
                          />
                          <span>
                            {isRunning
                              ? "SYNCHRONIZED SPRINT IN PROGRESS"
                              : "READY TO LAUNCH COHORT"}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 mt-1 font-mono">
                          {progressPercent}% Elapsed
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Play / Pause / Reset Controls */}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setIsRunning(!isRunning)}
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF4500] to-[#FF6422] text-white font-bold text-sm shadow-xl shadow-[#FF4500]/30 hover:opacity-95 transition-all cursor-pointer"
                    >
                      {isRunning ? (
                        <>
                          <Pause className="w-4 h-4 fill-white" />
                          <span>Pause Room Sprint</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white" />
                          <span>Start Synchronized Sprint</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setIsRunning(false);
                        setTimeLeft(timerPreset * 60);
                      }}
                      className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                      title="Reset Timer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Embedded Ambient Soundscape Selector */}
                  <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                        <Headphones className="w-4 h-4 text-[#FF4500]" />
                        <span>Curated Binaural & Lo-Fi Soundscapes</span>
                      </div>

                      <button
                        onClick={toggleAudio}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isAudioPlaying
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10"
                        }`}
                      >
                        {isAudioPlaying ? (
                          <>
                            <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                            <span>Previewing Audio</span>
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>Test Ambient Tone</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {SOUNDSCAPES.map((sound) => (
                        <button
                          key={sound.id}
                          onClick={() => setSelectedSoundscape(sound.id)}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            selectedSoundscape === sound.id
                              ? "border-[#FF4500] bg-[#FF4500]/10 text-white"
                              : "border-white/5 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          <div className="text-xs font-bold truncate">{sound.label}</div>
                          <div className="text-[10px] text-gray-400 truncate mt-0.5">
                            {sound.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Cohort Telemetry (5 cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-white/[0.02] p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#FF4500]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        Active Cohort (4/8)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-gray-400">
                      Zero Cam • Pure Presence
                    </span>
                  </div>

                  {/* Participant Cards */}
                  <div className="space-y-2.5">
                    {SIMULATED_PARTICIPANTS.map((participant) => (
                      <div
                        key={participant.id}
                        className="p-3 rounded-xl border border-white/5 bg-black/30 hover:border-white/15 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF4500]/30 to-amber-500/20 border border-[#FF4500]/40 flex items-center justify-center font-bold text-xs text-[#FF4500] shrink-0 font-mono">
                            {participant.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-white truncate">
                                {participant.name}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                • {participant.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">
                              {participant.task}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <div className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-400">
                            <Zap className="w-3 h-3 fill-emerald-400" />
                            <span>{participant.focusScore}%</span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-400/90 mt-0.5">
                            🔥 {participant.streak}d streak
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Live Room Activity Feed Ticker */}
                  <div className="p-3 rounded-xl border border-white/5 bg-[#0a0a0e] text-[11px] font-mono text-gray-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <span className="truncate">
                      <strong className="text-white">Alex V.</strong> completed milestone{" "}
                      <span className="text-[#FF4500]">"Indexed 40k vectors"</span> (+50 XP)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ========================================================================= */}
        {/* 4 CORE PILLARS OF FOCUS ROOMS */}
        {/* ========================================================================= */}
        <section className="mb-28">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge className="mb-3">
                Architectural Superiority
              </Badge>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
                The Four Pillars of Focus Rooms
              </h2>
              <p className="text-gray-300 text-base leading-relaxed">
                Why standard video calls kill deep work, and how our telemetry-first
                coworking protocol guarantees relentless execution.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Reveal delay={0.1}>
              <div className="rounded-3xl border border-white/10 bg-[#0e0e14]/70 p-8 hover:border-white/20 transition-all space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FF4500]/15 border border-[#FF4500]/30 flex items-center justify-center text-[#FF4500]">
                  <Timer className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  1. Synchronized WebSocket Telemetry
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  No one starts early; no one takes breaks late. Our server-side WebSocket
                  mesh broadcasts millisecond-synchronized timer transitions to every
                  participant. When the room begins, everyone locks in simultaneously,
                  creating immense psychological momentum.
                </p>
                <div className="flex items-center gap-2 pt-2 text-xs font-mono text-[#FF4500]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sub-50ms synchronized timer heartbeat</span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="rounded-3xl border border-white/10 bg-[#0e0e14]/70 p-8 hover:border-white/20 transition-all space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FF4500]/15 border border-[#FF4500]/30 flex items-center justify-center text-[#FF4500]">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  2. Silent Accountability (Zero Camera Fatigue)
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Webcam coworking forces you to manage facial expressions, posture, and
                  lighting instead of coding or studying. FocusFlow AI provides ambient
                  presence: you see live sprint scores, streak milestones, and task targets
                  without being on camera.
                </p>
                <div className="flex items-center gap-2 pt-2 text-xs font-mono text-[#FF4500]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>No video strain • 100% focused attention</span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="rounded-3xl border border-white/10 bg-[#0e0e14]/70 p-8 hover:border-white/20 transition-all space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FF4500]/15 border border-[#FF4500]/30 flex items-center justify-center text-[#FF4500]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  3. Cohort Distraction Shielding
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Integrated directly with the FocusFlow Chrome Extension and Windows Desktop
                  App. Social media feeds, algorithmic video sites, and tab clutter are
                  shielded during room sprints. If a participant drifts off-task, their
                  shield alerts them before momentum is broken.
                </p>
                <div className="flex items-center gap-2 pt-2 text-xs font-mono text-[#FF4500]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cross-platform browser & OS rule enforcement</span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="rounded-3xl border border-white/10 bg-[#0e0e14]/70 p-8 hover:border-white/20 transition-all space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FF4500]/15 border border-[#FF4500]/30 flex items-center justify-center text-[#FF4500]">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  4. Cryptographic Proof of Work
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Every completed Focus Room sprint logs verified session records to your
                  personal PostgreSQL database. Level up your profile, earn physical-style
                  achievement badges, and export verified timesheets for clients or mentors.
                </p>
                <div className="flex items-center gap-2 pt-2 text-xs font-mono text-[#FF4500]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tamper-resistant database session logging</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ROOM ARCHETYPES & CATEGORIES */}
        {/* ========================================================================= */}
        <section className="mb-28">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge className="mb-3">
                Tailored Spaces
              </Badge>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
                Specialized Room Archetypes
              </h2>
              <p className="text-gray-300 text-base leading-relaxed">
                Filter by discipline to work alongside peers tackling similar cognitive
                challenges.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ROOM_CATEGORIES.map((cat, i) => (
              <Reveal key={cat.id} delay={i * 0.1}>
                <div className="rounded-3xl border border-white/10 bg-[#0c0c10] p-6 hover:border-[#FF4500]/50 transition-all flex flex-col justify-between h-full group">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#FF4500] bg-[#FF4500]/10 px-2.5 py-1 rounded-full border border-[#FF4500]/20">
                        {cat.badge}
                      </span>
                      <span className="text-xs font-mono text-gray-500">
                        {cat.activeRoomsCount} active
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-[#FF4500] transition-colors">
                      {cat.label}
                    </h3>

                    <p className="text-xs text-gray-400 leading-relaxed">{cat.desc}</p>
                  </div>

                  <div className="pt-6 border-t border-white/5 space-y-3 mt-4">
                    <div className="text-[11px] font-mono text-gray-400">
                      Cadence: <span className="text-gray-200">{cat.recommendedRhythm}</span>
                    </div>

                    <Link
                      href="/dashboard/focus-rooms"
                      className="inline-flex items-center justify-between w-full p-2.5 rounded-xl bg-white/5 hover:bg-[#FF4500] text-gray-300 hover:text-white text-xs font-semibold transition-all group-hover:bg-[#FF4500] group-hover:text-white"
                    >
                      <span>Join {cat.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HOW IT WORKS (3 SIMPLE STEPS) */}
        {/* ========================================================================= */}
        <section className="mb-28">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge className="mb-3">
                Effortless Flow
              </Badge>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
                How Focus Rooms Work
              </h2>
              <p className="text-gray-300 text-base leading-relaxed">
                From solo distraction to synchronized flow in three seamless steps.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <Reveal delay={0.1}>
              <div className="p-8 rounded-3xl border border-white/10 bg-[#0d0d12] relative space-y-4">
                <div className="text-4xl font-black font-mono text-[#FF4500]/30">01</div>
                <h3 className="text-xl font-bold text-white">Join or Spawn a Room</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Browse community rooms in Coding, Studying, or Deep Work. Or spawn a
                  private pod with a 6-character invite code to cowork with your immediate team.
                </p>
                <div className="text-xs font-mono text-gray-500 pt-2">
                  → Public directory & private invite codes
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="p-8 rounded-3xl border border-white/10 bg-[#0d0d12] relative space-y-4">
                <div className="text-4xl font-black font-mono text-[#FF4500]/30">02</div>
                <h3 className="text-xl font-bold text-white">Shields & Timers Engage</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  The host triggers the synchronized sprint countdown. Your browser and
                  desktop shields activate, ambient soundscapes spin up, and off-task
                  distractions disappear.
                </p>
                <div className="text-xs font-mono text-gray-500 pt-2">
                  → Automatic tab & notification suppression
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="p-8 rounded-3xl border border-white/10 bg-[#0d0d12] relative space-y-4">
                <div className="text-4xl font-black font-mono text-[#FF4500]/30">03</div>
                <h3 className="text-xl font-bold text-white">Bank Proof-of-Work</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  When the sprint completes, high-fives and streak points are credited. Your
                  authentic focus minutes are committed directly to your PostgreSQL
                  analytics database.
                </p>
                <div className="text-xs font-mono text-gray-500 pt-2">
                  → Verified streak XP & analytics logs
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* FREE VS PRO FEATURE MATRIX */}
        {/* ========================================================================= */}
        <section className="mb-28">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge className="mb-3">
                Transparent Allowances
              </Badge>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
                Free & Pro Room Matrix
              </h2>
              <p className="text-gray-300 text-base leading-relaxed">
                Free guests can join any room at any time. Upgrade only when you need
                unlimited room hosting capacity.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-3xl border border-white/15 bg-[#0a0a0e] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="p-5 text-sm font-bold text-gray-300">Feature</th>
                      <th className="p-5 text-sm font-bold text-gray-300">Free Tier</th>
                      <th className="p-5 text-sm font-bold text-[#FF4500]">
                        Pro Tier ($9/mo)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    <tr>
                      <td className="p-5 text-gray-200 font-medium">Join Any Public/Private Room</td>
                      <td className="p-5 text-emerald-400 font-mono">Unlimited</td>
                      <td className="p-5 text-emerald-400 font-mono">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="p-5 text-gray-200 font-medium">Host Participant Capacity</td>
                      <td className="p-5 text-gray-400 font-mono">Up to 4 participants</td>
                      <td className="p-5 text-[#FF4500] font-bold font-mono">
                        Up to 12+ participants
                      </td>
                    </tr>
                    <tr>
                      <td className="p-5 text-gray-200 font-medium">Timer Durations</td>
                      <td className="p-5 text-gray-400">Standard 25m & 50m</td>
                      <td className="p-5 text-emerald-400">
                        Custom durations + 90m Ultradian
                      </td>
                    </tr>
                    <tr>
                      <td className="p-5 text-gray-200 font-medium">Curated Soundscapes</td>
                      <td className="p-5 text-gray-400">Standard 2 ambient tracks</td>
                      <td className="p-5 text-emerald-400">
                        All 4 HD spatial soundscapes
                      </td>
                    </tr>
                    <tr>
                      <td className="p-5 text-gray-200 font-medium">Host Moderation Controls</td>
                      <td className="p-5 text-gray-400">Room Lock & Kick</td>
                      <td className="p-5 text-emerald-400">
                        Lock, Kick, Co-Hosts, & Password Protection
                      </td>
                    </tr>
                    <tr>
                      <td className="p-5 text-gray-200 font-medium">Telemetry History Retention</td>
                      <td className="p-5 text-gray-400">7 Days</td>
                      <td className="p-5 text-emerald-400 font-bold">
                        Permanent Lifetime Cloud History
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ========================================================================= */}
        {/* COMPREHENSIVE FAQ ACCORDION */}
        {/* ========================================================================= */}
        <section className="mb-28 max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <Badge className="mb-3">
                Everything Answered
              </Badge>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-gray-300 text-base">
                Got questions about telemetry, privacy, or soundscapes? We have you covered.
              </p>
            </div>
          </Reveal>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <Reveal key={idx} delay={idx * 0.05}>
                <div className="rounded-2xl border border-white/10 bg-[#0e0e14] overflow-hidden transition-all">
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02]"
                  >
                    <span className="font-semibold text-white text-base">
                      {faq.question}
                    </span>
                    {activeFaq === idx ? (
                      <ChevronUp className="w-5 h-5 text-[#FF4500] shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                    )}
                  </button>
                  {activeFaq === idx && (
                    <div className="px-6 pb-6 text-sm text-gray-300 leading-relaxed border-t border-white/5 pt-4">
                      {faq.answer}
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* GRAND CONVERSION CALL TO ACTION BANNER */}
        {/* ========================================================================= */}
        <section>
          <Reveal>
            <div className="rounded-3xl border border-[#FF4500]/30 bg-gradient-to-r from-[#FF4500]/20 via-[#0d0d12] to-[#FF6422]/20 p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
              <div className="max-w-3xl mx-auto space-y-6 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF4500]/20 text-[#FF4500] text-xs font-mono font-bold">
                  <Flame className="w-3.5 h-3.5" />
                  <span>START YOUR FIRST SPRINT TODAY</span>
                </div>

                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                  Ready To Experience Zero-Distraction Coworking?
                </h2>

                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  Join hundreds of engineers, writers, and students who have replaced solitary
                  procrastination with high-velocity focus cohorts.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <MagneticButton>
                    <Link
                      href={user ? "/dashboard/focus-rooms" : "/dashboard/focus-rooms"}
                      className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF4500] to-[#FF6422] text-white font-bold text-sm shadow-xl shadow-[#FF4500]/30 hover:opacity-95 transition-all"
                    >
                      <Radio className="w-4 h-4 animate-pulse" />
                      <span>{user ? "Open Focus Rooms Workspace" : "Enter Focus Rooms Now"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </MagneticButton>

                  <Link
                    href="/download"
                    className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200 font-semibold text-sm transition-all"
                  >
                    <Laptop className="w-4 h-4 text-[#FF4500]" />
                    <span>Download Desktop & Browser Shields</span>
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </div>
  );
}
