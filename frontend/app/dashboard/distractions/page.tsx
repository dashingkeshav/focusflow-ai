'use client';

import React from 'react';
import { AlertTriangle, ShieldAlert, Ban, ExternalLink, RefreshCw } from 'lucide-react';

export default function DistractionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide">Distraction Intelligence Log</h1>
        <p className="text-xs text-gray-400 mt-1">
          Detailed telemetry logs of high tab-switching windows, idle timeouts, and context-switching alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-2">
          <div className="text-xs text-gray-400">Total Tab Switch Alerts</div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">14</div>
          <p className="text-[11px] text-gray-400">Peak hour: 12:00 PM – 1:00 PM</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-2">
          <div className="text-xs text-gray-400">Idle Time Penalty</div>
          <div className="text-3xl font-extrabold text-rose-400 font-mono">18m 40s</div>
          <p className="text-[11px] text-gray-400">Inactivity windows &gt; 2 mins</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-2">
          <div className="text-xs text-gray-400">Top Distraction Domain</div>
          <div className="text-2xl font-extrabold text-white font-mono">youtube.com</div>
          <p className="text-[11px] text-gray-400">5 tab switches recorded</p>
        </div>
      </div>

      {/* Log Table */}
      <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" /> Distraction Incident History
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="text-[11px] uppercase bg-white/5 text-gray-400">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Event Type</th>
                <th className="p-3">Frequency / Duration</th>
                <th className="p-3">Score Penalty</th>
                <th className="p-3">Action Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="p-3 font-mono text-gray-400">12:14:02 PM</td>
                <td className="p-3 text-rose-400 font-medium">Rapid Tab Switching</td>
                <td className="p-3">6 switches in 90s</td>
                <td className="p-3 font-mono font-bold text-rose-400">-24 pts</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">Alert Triggered</span></td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="p-3 font-mono text-gray-400">12:35:10 PM</td>
                <td className="p-3 text-amber-400 font-medium">Idle Timeout</td>
                <td className="p-3">4m 15s Inactive</td>
                <td className="p-3 font-mono font-bold text-amber-400">-15 pts</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Score Reduced</span></td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="p-3 font-mono text-gray-400">02:18:44 PM</td>
                <td className="p-3 text-cyan-400 font-medium">Social Domain Active</td>
                <td className="p-3">twitter.com open</td>
                <td className="p-3 font-mono font-bold text-amber-400">-10 pts</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Logged</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
