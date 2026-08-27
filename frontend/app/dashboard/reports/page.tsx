'use client';

import React from 'react';
import { FileText, Download, FileSpreadsheet, CheckCircle2, Calendar } from 'lucide-react';

export default function ReportsPage() {
  const handleDownloadPDF = () => {
    alert('Generating FocusFlow AI PDF Performance Report for your major project presentation...');
  };

  const handleDownloadCSV = () => {
    alert('Exporting session telemetry raw CSV data...');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide">Reports & Data Export</h1>
        <p className="text-xs text-gray-400 mt-1">
          Generate formatted PDF reports and export session telemetry data for academic presentations and personal tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Card */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center border border-violet-500/30">
            <FileText className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-white">Weekly Performance Summary (PDF)</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            Includes average Focus Score, total study hours, tab switch metrics, daily breakdown, and AI recommendations formatted for college project submissions.
          </p>
          <button
            onClick={handleDownloadPDF}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 hover:scale-102 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download PDF Report
          </button>
        </div>

        {/* CSV Card */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-white">Raw Telemetry Dataset (CSV)</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            Export raw timestamped event metrics including tab switch counts, idle durations, and calculated score logs for custom analysis.
          </p>
          <button
            onClick={handleDownloadCSV}
            className="w-full py-3 rounded-xl bg-white/10 text-white font-bold text-xs border border-white/10 hover:bg-white/20 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Export CSV Data
          </button>
        </div>
      </div>
    </div>
  );
}
