"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Star, ArrowRight, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth";

// Integrated FocusFlow Intelligence & Product Showcase Components
import IntelligenceCore3D from "@/components/three/IntelligenceCore3D";
import HowItWorks from "@/components/landing/HowItWorks";
import ProductShowcase from "@/components/landing/ProductShowcase";
import AIPlanner from "@/components/landing/AIPlanner";
import SmartFocusModeSection from "@/components/landing/SmartFocusModeSection";
import GoalsTasksPreview from "@/components/landing/GoalsTasksPreview";
import CollaborationSection from "@/components/landing/CollaborationSection";
import AnalyticsPreview from "@/components/landing/AnalyticsPreview";
import ExtensionPreview from "@/components/landing/ExtensionPreview";
import PrivacySection from "@/components/landing/PrivacySection";
import PricingPreview from "@/components/landing/PricingPreview";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTA from "@/components/landing/FinalCTA";

export default function HomePage() {
  const { user } = useAuth();
  const [timeStr, setTimeStr] = useState("11:11 PM");
  const heroWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Reveal Elements on Scroll using Intersection Observer
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

    // 2. Parallax and Hero Fade on Scroll
    const handleScroll = () => {
      const scrolled = window.scrollY;

      // Card Parallax
      document.querySelectorAll<HTMLElement>(".parallax-card-up").forEach((el) => {
        el.style.setProperty("--scroll-offset-up", `${scrolled * -0.05}px`);
      });
      document.querySelectorAll<HTMLElement>(".parallax-card-down").forEach((el) => {
        el.style.setProperty("--scroll-offset-down", `${scrolled * 0.05}px`);
      });

      // Hero Content Parallax
      if (heroWrapperRef.current && scrolled < 1000) {
        heroWrapperRef.current.style.transform = `translateY(${scrolled * 0.4}px)`;
        heroWrapperRef.current.style.opacity = `${Math.max(0, 1 - scrolled / 600)}`;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // 3. Live Clock (Formatted)
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      setTimeStr(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => {
      revealObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-transparent selection:bg-[#FF4500] selection:text-white text-white overflow-x-hidden">
      {/* ==========================================================
          1. HERO SECTION (Surreal Red Atmosphere & Intelligent Focus Flow)
          Preserved in signature warm red/amber glow as requested
          ========================================================== */}
      <section className="relative z-20 min-h-screen flex items-center justify-center overflow-hidden pt-32 pb-20 bg-bg">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <div className="absolute top-0 left-0 w-full h-full opacity-60 mix-blend-screen">
            <img
              src="https://framerusercontent.com/images/9zvwRJAavKKacVyhFCwHyXW1U.png?width=1536&height=1024"
              alt="Atmosphere"
              className="w-full h-full object-cover object-center opacity-70"
            />
          </div>
          {/* Subtle radiant focus aura */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-162.5 h-162.5 rounded-full bg-[#FF4500]/15 blur-[160px] pointer-events-none" />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-bg/40 to-bg/90 z-10" />
        </div>

        {/* Hero Content */}
        <div className="container mx-auto px-6 relative z-20 text-center flex flex-col items-center justify-center h-full">
          <div id="hero-content-wrapper" ref={heroWrapperRef} className="max-w-4xl mx-auto transition-transform duration-75">
            {/* Live System Status */}
            <div className="reveal mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[11px] font-mono tracking-widest text-[#ffe0e0]/90 uppercase shadow-inner">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF4500] animate-ping" />
              <span>Autonomous Focus Intelligence</span>
            </div>

            <div className="reveal">
              <h1
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-medium leading-[1.08] tracking-tight mb-6 text-[#ffe0e0] mix-blend-overlay font-serif"
                style={{ textShadow: "0 0 16px rgba(255,255,255,0.7)" }}
              >
                FocusFlow AI. <br />
                <span className="italic font-light text-[#ffe0e0]">The intelligent focus agent.</span>
              </h1>
            </div>

            <div className="reveal" style={{ transitionDelay: "200ms" }}>
              <p
                className="text-base md:text-xl text-[#ffe0e0]/90 max-w-xl mx-auto mb-10 font-light tracking-wide leading-relaxed mix-blend-overlay"
                style={{ textShadow: "0 0 12px rgba(255,255,255,0.7)" }}
              >
                Eliminate digital friction so your deepest work happens effortlessly. Multimodal AI planning, browser distraction shielding, and real-time focus intelligence.
              </p>
            </div>

            <div className="reveal flex flex-col sm:flex-row items-center justify-center gap-4" style={{ transitionDelay: "400ms" }}>
              <Link href="/register" className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-[#FF4500]/40 blur-xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative border border-[#FF4500]/50 bg-[#FF4500] px-8 py-3 rounded-full flex items-center gap-2.5 text-xs md:text-sm font-semibold text-white uppercase tracking-widest hover:bg-[#FF4500]/90 transition-all duration-300 shadow-[0_0_24px_rgba(255,69,0,0.35)]">
                  <span>Enter Flow State</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {user ? (
                <Link
                  href="/dashboard"
                  id="hero-dashboard-btn"
                  className="relative group cursor-pointer"
                >
                  <div className="relative border border-white/20 bg-white/5 backdrop-blur-sm px-7 py-3 rounded-full flex items-center gap-2 text-xs md:text-sm text-white/90 uppercase tracking-widest hover:bg-white/10 hover:border-[#FF4500]/50 hover:text-white transition-all duration-300">
                    <LayoutDashboard className="w-4 h-4 text-[#FF4500]" />
                    <span>Dashboard</span>
                  </div>
                </Link>
              ) : (
                <Link
                  href="/how-it-works"
                  id="hero-how-it-works-btn"
                  className="relative group cursor-pointer"
                >
                  <div className="relative border border-white/20 bg-white/5 backdrop-blur-sm px-7 py-3 rounded-full flex items-center gap-2 text-xs md:text-sm text-white/90 uppercase tracking-widest hover:bg-white/10 hover:border-[#FF4500]/50 hover:text-white transition-all duration-300">
                    <span>See How It Works</span>
                  </div>
                </Link>
              )}

              <Link href="#capabilities" className="relative group cursor-pointer">
                <div className="relative border border-white/10 bg-transparent px-6 py-3 rounded-full flex items-center gap-2 text-xs md:text-sm text-white/60 uppercase tracking-widest hover:text-white hover:border-white/30 transition-colors duration-300">
                  <span>Explore Capabilities</span>
                </div>
              </Link>
            </div>

            {/* Live Telemetry Bar */}
            <div className="reveal flex items-center justify-center gap-4 text-[10px] md:text-xs text-white/40 uppercase tracking-widest mt-12 font-mono" style={{ transitionDelay: "500ms" }}>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Telemetry Live
              </span>
              <span className="w-px h-3 bg-white/20" />
              <span id="current-time">{timeStr}</span>
              <span className="w-px h-3 bg-white/20" />
              <span>Gemini 2.5 Engine</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          BLACK BACKGROUND PRODUCT SECTIONS WITH MOVING GALAXY DEPTH
          ========================================================== */}
      <div className="relative z-10 bg-transparent">
        {/* ==========================================================
            2. CORE PHILOSOPHY / ATTENTION SANCTUARY
            ========================================================== */}
        <section id="philosophy" className="py-32 relative bg-transparent">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="max-w-4xl mx-auto text-center reveal">
              <span className="section-label">Attention Engineering</span>
              <h2 className="text-3xl md:text-5xl lg:text-6xl leading-tight text-white/90 mt-4 mb-8 font-serif">
                Attention is your rarest asset. We build the sanctuary where it flourishes.
              </h2>
              <p className="text-xl md:text-2xl text-gray-400 leading-relaxed font-light max-w-3xl mx-auto">
                Elegance is refusal. We silence the ambient noise of notifications, tabs, and fragmented context so your intellect resonates with absolute clarity.
              </p>
            </div>

            {/* Engineering Foundations */}
            <div className="mt-28">
              <p className="text-center text-[10px] uppercase font-mono tracking-[0.25em] text-white/30 mb-8">
                Built on modern, verifiable production architecture
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-50 hover:opacity-80 transition-all duration-500">
                <div className="reveal font-mono font-bold text-sm sm:text-base tracking-widest text-white">MANIFEST V3</div>
                <div className="reveal font-mono font-bold text-sm sm:text-base tracking-widest text-white" style={{ transitionDelay: "100ms" }}>
                  POSTGRESQL
                </div>
                <div className="reveal font-mono font-bold text-sm sm:text-base tracking-widest text-white" style={{ transitionDelay: "200ms" }}>
                  GEMINI 2.5
                </div>
                <div className="reveal font-mono font-bold text-sm sm:text-base tracking-widest text-white" style={{ transitionDelay: "300ms" }}>
                  RAZORPAY SECURE
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================================
            3. DUAL INTELLIGENCE CAPABILITIES (Cards 01 & 02 Parallax)
            ========================================================== */}
        <section id="capabilities" className="py-32 relative overflow-hidden">
          <div className="container mx-auto px-6 relative z-10 max-w-6xl">
            <div className="reveal mb-28 text-center">
              <span className="section-label">Dual Engine</span>
              <h2 className="text-5xl md:text-7xl font-serif mt-4">
                Two systems. <br />
                <span className="italic">One singular flow state.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Card 1 - Red / Orange #FF4500 */}
              <div className="parallax-card-down">
                <Link href="/dashboard/planner" className="block group">
                  <div className="reveal bg-[#FF4500] rounded-3xl p-8 md:p-12 aspect-4/5 flex flex-col justify-between shadow-2xl hover:shadow-[0_20px_50px_rgba(255,69,0,0.35)] transition-all duration-500 cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-full bg-black/10 flex items-center justify-center group-hover:rotate-45 transition-transform duration-500">
                        <Star className="text-black text-2xl w-6 h-6 fill-current" />
                      </div>
                      <span className="text-black font-medium text-sm border border-black/20 px-3 py-1 rounded-full font-mono">
                        01 · PLANNING
                      </span>
                    </div>

                    <div>
                      <h3 className="text-4xl md:text-5xl text-black mb-4 leading-none tracking-tight font-serif">
                        Multimodal <br />Roadmapping
                      </h3>
                      <p className="text-black/80 text-lg leading-snug font-normal">
                        Turn messy syllabi, project documents, or voice transcripts into realistic, time-blocked Pomodoro milestones powered by Gemini AI.
                      </p>
                      <div className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-bold text-black border-b border-black/30 pb-0.5 group-hover:border-black transition-all">
                        <span>Explore AI Planner</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    <div className="w-full h-px bg-black/10 mt-8" />
                  </div>
                </Link>
              </div>

              {/* Card 2 - Deep Black #111 */}
              <div className="parallax-card-up md:mt-24">
                <Link href="/download" className="block group">
                  <div
                    className="reveal bg-[#111] border border-white/10 rounded-3xl p-8 md:p-12 aspect-4/5 flex flex-col justify-between shadow-2xl cursor-pointer hover:border-[#FF4500]/60 transition-all duration-500"
                    style={{ transitionDelay: "150ms" }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                        <ArrowRight className="text-white text-2xl w-6 h-6 -rotate-45" />
                      </div>
                      <span className="text-white/60 font-medium text-sm border border-white/10 px-3 py-1 rounded-full font-mono">
                        02 · SHIELDING
                      </span>
                    </div>

                    <div>
                      <h3 className="text-4xl md:text-5xl text-white mb-4 leading-none tracking-tight font-serif">
                        Real Browser <br />Telemetry
                      </h3>
                      <p className="text-gray-400 text-lg leading-snug">
                        Manifest V3 Chrome extension actively shields distracting domains, computes biometric-grade focus scores, and locks down your attention.
                      </p>
                      <div className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-bold text-[#FF4500] border-b border-[#FF4500]/30 pb-0.5 group-hover:border-[#FF4500] transition-all">
                        <span>Get Chrome Extension</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    <div className="w-full h-px bg-white/10 mt-8" />
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Background Dot Pattern */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-15 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #444 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </section>

        {/* ==========================================================
            4. FOCUSFLOW COGNITIVE CORE (Living 3D Object)
            ========================================================== */}
        <section id="core" className="relative py-20 px-4 sm:px-6 border-t border-white/5 bg-transparent">
          {/* Signature 3D Central Core */}
          <div className="reveal container mx-auto max-w-7xl">
            <IntelligenceCore3D />
          </div>
        </section>

        {/* 5. HOW IT OPERATES (5-Stage Loop) */}
        <HowItWorks />

        {/* 6. INTERACTIVE PRODUCT DEMO */}
        <ProductShowcase />

        {/* 7. AI MULTIMODAL PLANNER */}
        <AIPlanner />

        {/* 8. SMART FOCUS & CONTEXT SHIELDING */}
        <SmartFocusModeSection />

        {/* 9. GOALS & TASKS */}
        <GoalsTasksPreview />

        {/* 10. COLLABORATIVE FOCUS (Rooms, Circles, Pods, Unblock) */}
        <CollaborationSection />

        {/* 11. ANALYTICS & FOCUS SIGNALS */}
        <AnalyticsPreview />

        {/* 11. BROWSER TELEMETRY EXTENSION */}
        <ExtensionPreview />

        {/* 12. LOCAL PRIVACY ARCHITECTURE */}
        <PrivacySection />

        {/* 13. PRICING & MEMBERSHIP TIERS */}
        <PricingPreview />

        {/* 14. FREQUENTLY ANSWERED QUESTIONS */}
        <FAQSection />

        {/* 15. FINAL CALL TO ACTION */}
        <FinalCTA />
      </div>
    </div>
  );
}
