"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  FolderArchive,
  ToggleRight,
  Upload,
  FolderCheck,
  KeyRound,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

interface StepItem {
  step: string;
  title: string;
  description: string;
  actionText?: string;
  codeSnippet?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const INSTALL_STEPS: StepItem[] = [
  {
    step: "01",
    title: "Download the Extension Package",
    description:
      "Get the official FocusFlow Chrome Extension ZIP (v3.0.0, ~32 KB). It contains all Manifest V3 service worker files, assets, and the local classifier.",
    actionText: "Download ZIP",
    icon: Download,
  },
  {
    step: "02",
    title: "Extract the ZIP to a Local Folder",
    description:
      "Right-click the downloaded .zip file and select 'Extract All...'. Choose a permanent directory on your machine (e.g. Documents/FocusFlow-Extension) so Chrome can keep reading it.",
    icon: FolderArchive,
  },
  {
    step: "03",
    title: "Navigate to Extensions in Chrome",
    description:
      "Open Google Chrome, type or paste chrome://extensions in the address bar, and press Enter to open your browser extension management console.",
    codeSnippet: "chrome://extensions",
    icon: ExternalLink,
  },
  {
    step: "04",
    title: "Enable 'Developer Mode'",
    description:
      "In the top-right corner of the Extensions page, toggle the 'Developer mode' switch to ON. This enables the unpacked development tools.",
    icon: ToggleRight,
  },
  {
    step: "05",
    title: "Click 'Load Unpacked'",
    description:
      "In the top-left toolbar that appears, click the 'Load unpacked' button. A file picker window will open.",
    icon: Upload,
  },
  {
    step: "06",
    title: "Select the Extracted Folder",
    description:
      "Select the folder containing manifest.json (the root of the extracted archive). FocusFlow AI will immediately appear in your active extensions list.",
    icon: FolderCheck,
  },
  {
    step: "07",
    title: "Pin & Connect Your Account",
    description:
      "Click Chrome's puzzle icon, pin FocusFlow, and click the extension icon to sign in with your FocusFlow credentials or set your backend URL.",
    icon: KeyRound,
  },
];

const FAQS = [
  {
    q: "Why do I need to load unpacked instead of the Chrome Web Store?",
    a: "FocusFlow is distributed directly as an open verified Manifest V3 developer package for full privacy inspection and immediate local iteration without waiting on store approval cycles.",
  },
  {
    q: "What if Chrome says 'manifest.json missing' when loading?",
    a: "Make sure you select the specific folder that contains manifest.json directly, rather than an outer parent folder created during unzipping.",
  },
  {
    q: "How do I update when a new version is released?",
    a: "Replace the files in your extracted folder with the new release ZIP, then simply click the circular reload button on the FocusFlow tile in chrome://extensions.",
  },
];

export default function ExtensionInstallGuide() {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <section id="installation-guide" className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#FAFAF8] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Quick Setup
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Up and running in minutes.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            FocusFlow installs cleanly in Google Chrome, Brave, Edge, and all Chromium browsers via Developer Mode. Follow these 7 straightforward steps:
          </p>
        </div>

        {/* 7-Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {INSTALL_STEPS.map((item, idx) => {
            const Icon = item.icon;
            const isLast = idx === INSTALL_STEPS.length - 1;

            return (
              <div
                key={item.step}
                className={`rounded-3xl bg-white border border-slate-200/90 p-6 shadow-lg shadow-slate-200/40 relative flex flex-col justify-between group hover:border-teal-300 transition-all duration-300 ${
                  isLast ? "md:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-teal-600 tracking-tight">
                      {item.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2">
                    {item.title}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Optional interactive actions / copy buttons */}
                {item.codeSnippet && (
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <code className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {item.codeSnippet}
                    </code>
                    <button
                      onClick={() => handleCopy(item.codeSnippet!)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors px-2 py-1 rounded bg-teal-50 border border-teal-200/70"
                    >
                      {copiedText === item.codeSnippet ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-teal-600" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {item.actionText && (
                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <a
                      href="/downloads/FocusFlow-Chrome-Extension.zip"
                      download="FocusFlow-Chrome-Extension.zip"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{item.actionText} (32 KB)</span>
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Installation Troubleshooting Accordion */}
        <div className="max-w-3xl mx-auto rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-xl shadow-slate-200/30">
          <div className="flex items-center gap-2.5 mb-6 text-slate-900 font-bold text-lg">
            <HelpCircle className="w-5 h-5 text-teal-600" />
            <span>Common Installation Questions</span>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => {
              const isOpen = expandedFaq === i;

              return (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : i)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 font-semibold text-slate-800 text-sm hover:bg-slate-50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-teal-600" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
