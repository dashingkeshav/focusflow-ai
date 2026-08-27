'use client';

import React from 'react';
import { Sparkles, Brain, Cpu, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

export default function InsightsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-cyan-400" /> AI Distraction Prediction & Insights
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Machine Learning classifier (Random Forest Behavioral Model) predictions based on historical tab switching, typing rates, and idle distributions.
        </p>
      </div>

      {/* Model Status Card */}
      <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4 bg-gradient-to-r from-violet-950/40 via-purple-950/20 to-slate-900/60">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center border border-violet-500/30">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Random Forest Focus Model v1.2</h2>
              <p className="text-xs text-gray-400">Trained on 1,200+ study session behavioral samples</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
            Model Active • 94.2% Accuracy
          </span>
        </div>
      </div>

      {/* AI Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <CheckCircle className="w-4 h-4" /> High Focus Probability Window
          </div>
          <h3 className="text-lg font-bold text-white">Morning Peak Work Zone</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            The ML model predicts an <span className="text-emerald-400 font-bold">89% likelihood of continuous focus</span> between 09:30 AM and 11:30 AM. Tab switching risk is lowest during this window.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <AlertTriangle className="w-4 h-4" /> Fatigue Vulnerability Forecast
          </div>
          <h3 className="text-lg font-bold text-white">Afternoon Slump Risk</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Predicts a <span className="text-amber-400 font-bold">67% chance of distraction loop</span> around 02:30 PM due to elevated idle timeouts and tab switching. Take a 15-minute break before starting long sessions.
          </p>
        </div>
      </div>
    </div>
  );
}
