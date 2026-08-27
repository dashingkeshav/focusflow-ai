'use client';

import React from 'react';

import Link from 'next/link';

import {
  ArrowLeft,
  Timer,
  ShieldCheck,
} from 'lucide-react';

import FocusTimer from '@/components/FocusTimer';


export default function SessionsPage() {

  return (

    <div className="min-h-screen">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-8">

        <div className="flex items-center gap-3 mb-3">

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all text-xs"
          >

            <ArrowLeft className="w-4 h-4" />

            Dashboard

          </Link>

        </div>


        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>

            <div className="flex items-center gap-2 mb-2">

              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-600/20">

                <Timer className="w-5 h-5 text-white" />

              </div>


              <h1 className="text-2xl font-bold text-white">
                Study Sessions
              </h1>

            </div>


            <p className="text-sm text-gray-400 max-w-2xl">

              Start a real focus session and let
              FocusFlow AI monitor your study
              activity, focus score and distractions.

            </p>

          </div>


          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">

            <ShieldCheck className="w-4 h-4 text-emerald-400" />

            <span className="text-xs font-semibold text-emerald-300">

              Session data saved securely

            </span>

          </div>

        </div>

      </div>


      {/* =================================================
          FOCUS TIMER
      ================================================= */}

      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">

        <FocusTimer />

      </div>

    </div>

  );
}