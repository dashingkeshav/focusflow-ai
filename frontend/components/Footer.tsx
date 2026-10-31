"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Mail, ShieldCheck, CheckCircle2 } from "lucide-react";
import { BrandWordmark } from "@/components/brand";

const ECOSYSTEM_LINKS = [
  { label: "Product Overview", href: "/product" },
  { label: "Key Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Solutions", href: "/solutions" },
  { label: "Pricing & Plans", href: "/pricing" },
  { label: "Chrome Extension", href: "/download#installation" },
  { label: "Windows Desktop App", href: "/download#windows" },
];

const COLLABORATION_LINKS = [
  { label: "Focus Rooms", href: "/focus-rooms", badge: "Coworking" },
  { label: "Focus Circles", href: "/dashboard/focus-circles", badge: "Accountability" },
  { label: "Project Pods", href: "/dashboard/project-pods", badge: "Workspaces" },
  { label: "Unblock Exchange", href: "/dashboard/unblock-exchange", badge: "Peer Help" },
];

const CONNECT_LINKS = [
  { label: "GitHub", href: "https://github.com/dashingkeshav/focusflow-ai" },
  { label: "Twitter / X", href: "https://twitter.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
];

const LEGAL_LINKS = [
  { label: "About Platform", href: "/about" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Contact Us", href: "/contact" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="footer" className="w-full py-16 px-4 sm:px-6 lg:px-8 bg-transparent text-white relative">
      <div className="container mx-auto max-w-7xl">
        {/* Single Contained Obsidian Dark Glass Card */}
        <div className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] border border-[#262832] bg-[#12131A]/90 p-8 sm:p-12 backdrop-blur-2xl shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)]">
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-[#FF4500]/10 blur-[120px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF4500]/30 to-transparent" />

          {/* Clean 4-Column Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8 pb-10 border-b border-[#262832]">
            {/* 1. Brand Intro */}
            <div className="sm:col-span-2 lg:col-span-3 space-y-4">
              <BrandWordmark size="md" href="/" />
              <p className="max-w-xs text-sm leading-relaxed text-gray-400 font-normal">
                Autonomous focus intelligence for deep work. Protecting your attention and turning intent into uninterrupted achievement.
              </p>
              <div className="pt-1">
                <a
                  href="mailto:keerav2007@gmail.com"
                  id="footer-email-link"
                  className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-[#FF4500] transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-[#FF4500]" />
                  <span>keerav2007@gmail.com</span>
                </a>
              </div>
            </div>

            {/* 2. Ecosystem */}
            <div className="lg:col-span-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 font-sans mb-4">
                Ecosystem
              </h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                {ECOSYSTEM_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center gap-1 hover:text-white transition-colors group"
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#FF4500]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Collaboration */}
            <div className="lg:col-span-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 font-sans mb-4 flex items-center gap-2">
                <span>Collaboration</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FF4500]/15 text-[#FF4500] border border-[#FF4500]/30">
                  Live
                </span>
              </h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                {COLLABORATION_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center gap-1.5 hover:text-white transition-colors group"
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#FF4500]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 4. Trust & Legal */}
            <div className="lg:col-span-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 font-sans mb-4 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#FF4500]" />
                Trust & Connect
              </h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li className="pt-2 border-t border-white/5 flex items-center gap-4 text-xs font-mono">
                  {CONNECT_LINKS.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white text-gray-400 transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                </li>
              </ul>
            </div>
          </div>

          {/* Clean Bottom Copyright & Status Bar (Zero Duplicates) */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <p>© {currentYear} FocusFlow AI. All rights reserved.</p>

            <div className="flex items-center gap-2 font-mono text-[11px] text-gray-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Telemetry Core Operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
