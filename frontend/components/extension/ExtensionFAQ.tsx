"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: "install",
    question: "How do I install the FocusFlow extension in Chrome?",
    answer:
      "Download the verified ZIP package from this page, extract it to a permanent folder, navigate to chrome://extensions in your browser, switch on 'Developer mode' in the top right, click 'Load unpacked', and select the folder containing manifest.json.",
  },
  {
    id: "permissions",
    question: "Why does Chrome warn about permissions during installation?",
    answer:
      "Chrome displays standard permission warnings whenever an extension registers tabs or host permissions. FocusFlow needs these permissions strictly to check the active domain name against your task rules and to display the 30-second warning banner overlay. It never accesses your history or form inputs.",
  },
  {
    id: "account-connect",
    question: "How do I connect my FocusFlow account to the extension?",
    answer:
      "Click the FocusFlow icon in your Chrome toolbar. In the popup window, enter your account email and password (the same credentials used on the web app). The extension securely receives a JWT auth token and stores it in chrome.storage.local for session syncing.",
  },
  {
    id: "download-availability",
    question: "Why might a download be temporarily unavailable?",
    answer:
      "We only provide links to real, compiled release artifacts. If an installer is undergoing rebuild or verification, we display an honest notice rather than serving broken links or dummy executables.",
  },
  {
    id: "disconnected-state",
    question: "How do I resolve a disconnected extension state?",
    answer:
      "If the extension popup indicates 'Disconnected' or cannot reach the server, ensure your FocusFlow backend server is running (defaulting to http://localhost:5001) or check the backend URL setting inside the extension popup options.",
  },
  {
    id: "backend-url",
    question: "How do I configure the backend / API URL if running locally or remotely?",
    answer:
      "Open the extension popup, click the settings gear or Options page, and update the API Endpoint field. By default, it points to http://localhost:5001/api for local development, but can be updated to any hosted FocusFlow API address.",
  },
  {
    id: "reload-extension",
    question: "How do I reload the extension when an update is released?",
    answer:
      "Download the new release ZIP, extract its contents into your existing extension folder replacing the old files, open chrome://extensions, locate FocusFlow AI, and click the circular 'Reload' icon.",
  },
  {
    id: "remove-extension",
    question: "How do I uninstall or remove the extension completely?",
    answer:
      "Right-click the FocusFlow icon in your Chrome toolbar and select 'Remove from Chrome...'. Alternatively, go to chrome://extensions, find FocusFlow AI, and click 'Remove'. All local storage and settings will be deleted immediately.",
  },
  {
    id: "windows-requirement",
    question: "Is the FocusFlow for Windows desktop app required to use the extension?",
    answer:
      "No. The Chrome extension is completely standalone and communicates directly with your FocusFlow web account and API. The Windows desktop app is an optional companion designed for system-wide window tracking.",
  },
];

export default function ExtensionFAQ() {
  const [openId, setOpenId] = useState<string | null>("install");

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FAFAF8] via-[#F4F6F9] to-[#FAFAF8] border-t border-slate-200/70">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
            Support & Clarifications
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Everything you need to know about setting up, configuring, and operating the FocusFlow browser extension.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {FAQS.map((item) => {
            const isOpen = openId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-white border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-200 hover:border-teal-300"
              >
                <button
                  onClick={() => toggle(item.id)}
                  aria-expanded={isOpen}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-base sm:text-lg transition-colors hover:text-teal-700"
                >
                  <span className="leading-snug">{item.question}</span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen
                        ? "bg-teal-50 text-teal-700 rotate-180"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="px-5 sm:px-6 pb-6 pt-1 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100 bg-slate-50/40">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
