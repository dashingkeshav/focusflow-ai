'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Timer,
  BarChart3,
  AlertTriangle,
  Sparkles,
  FileText,
  Target,
  Settings,
  Cpu,
  Puzzle,
  ChevronRight,
  LogOut,
  Video,
  CheckSquare,
  CalendarDays,
  Trophy,
  Bot,
  Flame,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Study Sessions', href: '/dashboard/sessions', icon: Timer },
    { name: 'Analytics & Trends', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Distraction Log', href: '/dashboard/distractions', icon: AlertTriangle },
    { name: 'AI Insights', href: '/dashboard/insights', icon: Sparkles, badge: 'AI' },
    { name: 'Reports & Export', href: '/dashboard/reports', icon: FileText },
    { name: 'Goals', href: '/dashboard/goals', icon: Target },
    { name: 'Tasks', href: '/dashboard/goals?view=tasks', icon: CheckSquare },
    { name: 'Habits', href: '/dashboard/goals?view=habits', icon: Flame },
    { name: 'Calendar', href: '/dashboard/goals?view=calendar', icon: CalendarDays },
    { name: 'Goal Analytics', href: '/dashboard/goals?view=analytics', icon: BarChart3 },
    { name: 'Achievements', href: '/dashboard/goals?view=achievements', icon: Trophy },
    { name: 'AI Planner', href: '/dashboard/goals?view=planner', icon: Bot, badge: 'AI' },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const initials = user?.initials || user?.name?.slice(0, 2).toUpperCase() || 'FF';
  const displayName = user?.name || 'Student';

  return (
    <aside className="w-64 border-r border-white/10 bg-[#090b12] flex flex-col justify-between shrink-0 min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white tracking-wide text-base flex items-center gap-1.5">
                FocusFlow <span className="text-cyan-400 text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">AI</span>
              </div>
              <div className="text-[10px] text-gray-400 font-medium">Phase II Workspace</div>
            </div>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Menu</div>
          {navItems.map((item) => {
            const [itemPath, itemQuery] = item.href.split('?');
            const isActive = pathname === itemPath && (!itemQuery ? !searchParams.get('view') : itemQuery === `view=${searchParams.get('view')}`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/30 to-cyan-500/20 text-white border border-violet-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer: Extension + User Info + Logout */}
      <div className="p-4 border-t border-white/10 space-y-3">
        {/* Camera & Extension Status */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-violet-950/40 to-slate-900/60 border border-violet-500/20 text-xs space-y-2">
          <div className="flex items-center gap-2 text-violet-300 font-semibold">
            <Puzzle className="w-4 h-4 text-cyan-400" />
            <span>Chrome Extension</span>
          </div>
          <p className="text-[11px] text-gray-400">
            Status: <span className="text-emerald-400 font-semibold">Connected</span>
          </p>
          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active v2.1
            </span>
            <Link href="/dashboard/settings" className="text-cyan-400 hover:underline flex items-center">
              Config <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* User Info + Logout */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs border border-violet-400/30 shrink-0">
              {initials}
            </div>
            <div className="flex flex-col text-xs overflow-hidden">
              <span className="text-white font-medium truncate max-w-[100px]">{displayName}</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <Video className="w-3 h-3" /> Camera Ready
              </span>
            </div>
          </div>
          <button
            id="logout-btn"
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
