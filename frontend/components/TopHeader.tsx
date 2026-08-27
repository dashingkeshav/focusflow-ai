'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Bell, Flame, Play, LogOut, Camera } from 'lucide-react';

interface TopHeaderProps {
  activeSession?: boolean;
  currentScore?: number;
}

export default function TopHeader({ activeSession = false, currentScore = 87 }: TopHeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-white/10 bg-[#090b12]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-semibold text-white tracking-wide">
          FocusFlow Workspace
        </h1>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/40 border border-violet-500/30 text-xs">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-gray-300">5 Day Streak</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Live Session Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeSession ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${activeSession ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
          </span>
          <span className="text-gray-300 font-medium">
            {activeSession ? 'Session Active' : 'Extension Monitoring'}
          </span>
        </div>

        {/* Focus Score Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-600/10 border border-violet-500/30 text-xs font-semibold">
          <span className="text-gray-400">Score:</span>
          <span className={`text-sm font-bold ${currentScore >= 80 ? 'text-emerald-400' : currentScore >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
            {currentScore}/100
          </span>
        </div>

        {/* Start Session Button */}
        <Link
          href="/dashboard/sessions"
          id="header-start-session"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 hover:scale-105 transition-transform"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Focus Session</span>
        </Link>

        {/* Notifications */}
        <button
          id="notifications-btn"
          className="relative p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-colors"
          onClick={() => alert('📢 No new alerts. All focus systems nominal!')}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full" />
        </button>

        {/* User Avatar + Logout */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs border border-violet-400/30">
              {user.initials}
            </div>
            <button
              id="header-logout"
              onClick={logout}
              title="Sign out"
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
