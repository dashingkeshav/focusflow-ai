"use client";

import React from "react";
import Link from "next/link";
import { Lock, ArrowRight, ShieldCheck, Zap, Sparkles, X } from "lucide-react";

interface ProLockCardProps {
  title: string;
  description: string;
  featureKey?: string;
  compact?: boolean;
  className?: string;
  actionText?: string;
}

export function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-[#FF4500]/30 bg-[#FF4500]/15 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#FF4500] shadow-xs ${className}`}
    >
      <Zap className="h-3 w-3 text-[#FF4500]" />
      PRO
    </span>
  );
}

export function FreeBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-gray-400 ${className}`}
    >
      FREE
    </span>
  );
}

export default function ProLockCard({
  title,
  description,
  featureKey,
  compact = false,
  className = "",
  actionText = "Upgrade to Pro",
}: ProLockCardProps) {
  if (compact) {
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-2xl border border-[#FF4500]/30 bg-[#FF4500]/5 p-3.5 text-xs backdrop-blur-xl ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#FF4500]/30 bg-card text-[#FF4500] shadow-xs">
            <Lock className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <span>{title}</span>
              <ProBadge />
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed font-light">{description}</p>
          </div>
        </div>

        <Link
          href="/pricing"
          className="shrink-0 rounded-xl bg-[#FF4500] px-3.5 py-1.5 text-[11px] font-bold text-white shadow-md shadow-[#FF4500]/20 transition-all hover:bg-[#e03e00]"
        >
          {actionText}
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-card p-6 shadow-2xl backdrop-blur-xl transition-all hover:border-[#FF4500]/30 ${className}`}
    >
      {/* Decorative gradient glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#FF4500]/10 blur-2xl" />

      <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold font-serif text-white">{title}</span>
            <Lock className="h-4 w-4 text-[#FF4500]" />
            <ProBadge />
          </div>
          <p className="max-w-xl text-xs leading-relaxed text-gray-400 font-light">
            {description}
          </p>
        </div>

        <Link
          href="/pricing"
          className="group inline-flex items-center gap-2 self-start rounded-xl bg-[#FF4500] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#FF4500]/25 transition-all hover:bg-[#e03e00] hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>{actionText}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="relative z-10 mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3.5 text-[11px] font-mono text-gray-400">
        <span className="flex items-center gap-1.5 text-gray-300">
          <ShieldCheck className="h-3.5 w-3.5 text-[#FF4500]" />
          Instant activation via Razorpay
        </span>
        <span className="text-gray-600">·</span>
        <span>Cancel anytime from settings</span>
        <span className="text-gray-600">·</span>
        <span className="font-semibold text-[#FF4500]">₹399/month</span>
      </div>
    </div>
  );
}

interface ProLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  featureName?: string;
  bulletPoints?: string[];
}

export function ProLockModal({
  isOpen,
  onClose,
  title,
  description,
  featureName = "FocusFlow Pro",
  bulletPoints,
}: ProLockModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[#FF4500]/30 bg-card p-6 shadow-2xl backdrop-blur-2xl text-white"
      >
        {/* Glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#FF4500]/15 blur-3xl" />

        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500]">
              <Lock className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-mono font-bold text-[#FF4500] uppercase tracking-wider">
              {featureName}
            </span>
            <ProBadge />
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-bold font-serif text-white">{title}</h2>
          <p className="mt-2 text-xs leading-relaxed text-gray-300 font-light">
            {description}
          </p>

          {bulletPoints && bulletPoints.length > 0 && (
            <ul className="mt-4 space-y-2 text-xs text-gray-300">
              {bulletPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF4500]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href="/pricing"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF4500] py-3 text-xs font-bold text-white shadow-lg shadow-[#FF4500]/30 hover:bg-[#e03e00] transition active:scale-[0.98]"
          >
            <span>Upgrade to FocusFlow Pro (₹399/mo)</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            Continue with Free
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-mono text-gray-500">
          <ShieldCheck className="h-3.5 w-3.5 text-[#FF4500]" />
          Bank-grade encryption via Razorpay · Cancel anytime
        </div>
      </div>
    </div>
  );
}
