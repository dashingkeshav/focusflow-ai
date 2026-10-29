'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Play,
  Lock,
  Globe,
  Clock,
  Sparkles,
  Copy,
  Check,
  Radio,
  ArrowRight,
  Flame,
  ChevronRight,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/useEntitlements';
import {
  fetchCollaborationRooms,
  createCollaborationRoom,
  fetchCollaborationRoomByCode,
  cleanInviteCode,
  joinCollaborationRoom,
  type FocusRoom,
} from '@/lib/api';

const CATEGORIES = [
  { id: 'all', label: 'All Rooms' },
  { id: 'deep_work', label: 'Deep Work' },
  { id: 'coding', label: 'Coding' },
  { id: 'studying', label: 'Studying' },
  { id: 'writing', label: 'Writing' },
  { id: 'general', label: 'General' },
];

export default function FocusRoomsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { isPro } = useEntitlements();

  const [rooms, setRooms] = useState<FocusRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [roomFilter, setRoomFilter] = useState<'all' | 'my' | 'active'>('all');

  // Create room modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createCategory, setCreateCategory] = useState('deep_work');
  const [createIsPublic, setCreateIsPublic] = useState(false);
  const [createMaxParticipants, setCreateMaxParticipants] = useState(4);
  const [createDuration, setCreateDuration] = useState(1500); // 25 min default
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Quick join by code
  const [joinCode, setJoinCode] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCollaborationRooms({
        q: searchQuery,
        category: selectedCategory,
      });
      if (res.success) {
        const clean = (res.rooms || []).filter((r: any) => !r.title.startsWith('QA ') && !r.title.startsWith('Autonomous QA ')); setRooms(clean);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load focus rooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [selectedCategory]);

  // Handle URL join code if provided in query ?join=code
  useEffect(() => {
    const codeParam = searchParams.get('join') || searchParams.get('code');
    if (codeParam) {
      setJoinCode(codeParam);
      handleJoinByCode(codeParam);
    }
  }, [searchParams]);

  const handleJoinByCode = async (codeToUse?: string) => {
    const raw = codeToUse || joinCode;
    const code = cleanInviteCode(raw);
    if (!code) return;
    try {
      setJoiningCode(true);
      setJoinError(null);
      const res = await fetchCollaborationRoomByCode(code);
      if (res.success && res.room) {
        try {
          await joinCollaborationRoom(res.room.id, code);
        } catch (_) {}
        router.push(`/dashboard/focus-rooms/${res.room.id}`);
      } else {
        setJoinError('Focus room not found for this code or link.');
      }
    } catch (err: any) {
      setJoinError(err.message || 'Invalid or expired room code.');
    } finally {
      setJoiningCode(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) return;
    try {
      setCreating(true);
      setCreateError(null);
      const res = await createCollaborationRoom({
        title: createTitle.trim(),
        category: createCategory,
        isPublic: createIsPublic,
        maxParticipants: createMaxParticipants,
        durationSeconds: createDuration,
      });
      if (res.success && res.room) {
        setShowCreateModal(false);
        router.push(`/dashboard/focus-rooms/${res.room.id}`);
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create room.');
    } finally {
      setCreating(false);
    }
  };

  const copyInviteLink = (room: FocusRoom) => {
    const url = `${window.location.origin}/dashboard/focus-rooms?join=${room.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(room.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-8 font-inter text-white pb-12">
      {/* Header Banner */}
      <div className="rounded-3xl border border-white/10 bg-linear-to-r from-[#FF4500]/15 via-[#0a0a0a] to-[#0a0a0a] p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF4500]">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>FOCUS ROOMS</span>
            <span className="text-[10px] bg-[#FF4500]/20 text-[#FF4500] px-2 py-0.5 rounded-full font-medium">
              Live Coworking
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Work Together in Real Time
          </h1>
          <p className="text-sm text-gray-400 max-w-xl">
            Join public coworking sessions or create private rooms with synchronized focus timers, presence tracking, and zero distractions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-[#FF4500] hover:bg-[#ff5722] text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-[#FF4500]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Room</span>
          </button>
        </div>
      </div>

      {/* Quick Join & Search Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-4 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search rooms by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadRooms()}
            className="w-full rounded-2xl border border-white/10 bg-[#0e0e12] pl-11 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#FF4500]"
          />
        </div>

        {/* Join by Code */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter code (e.g. rm-...) or paste invite link..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
            className="w-full rounded-2xl border border-white/10 bg-[#0e0e12] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#FF4500]"
          />
          <button
            onClick={() => handleJoinByCode()}
            disabled={joiningCode || !joinCode.trim()}
            className="bg-white/10 hover:bg-white/15 text-white font-bold text-xs px-4 py-3 rounded-2xl transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {joiningCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
          </button>
        </div>
      </div>

      {joinError && (
        <div className="p-3 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
          {joinError}
        </div>
      )}

      {/* Room Scope Filters (Discover / My Rooms / Active) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'all', label: 'Discover All' },
          { id: 'my', label: 'My Rooms' },
          { id: 'active', label: 'Active Now' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRoomFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              roomFilter === tab.id
                ? 'bg-[#FF4500]/15 text-[#FF4500] border border-[#FF4500]/30 shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-[#FF4500] text-white shadow-md shadow-[#FF4500]/20'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Rooms Directory */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-3xl border border-white/10 bg-[#0e0e12] p-5 shadow-lg flex flex-col justify-between gap-5 animate-pulse"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-24 bg-white/10 rounded-full" />
                  <div className="h-5 w-16 bg-white/5 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-5 w-3/4 bg-white/10 rounded-lg" />
                  <div className="h-3 w-1/2 bg-white/5 rounded-lg" />
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <div className="h-4 w-16 bg-white/5 rounded-md" />
                  <div className="h-4 w-14 bg-white/5 rounded-md" />
                  <div className="h-4 w-20 bg-white/5 rounded-md" />
                </div>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="h-4 w-20 bg-white/5 rounded-md" />
                <div className="h-8 w-28 bg-[#FF4500]/20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-3xl border border-amber-500/20 bg-[#0e0e12]">
          <p className="text-amber-400 text-sm mb-4">{error}</p>
          <button onClick={loadRooms} className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl">
            Retry
          </button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="p-8 md:p-12 text-center rounded-3xl border border-white/10 bg-[#0e0e12] space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-[#FF4500]/10 border border-[#FF4500]/20 flex items-center justify-center mx-auto text-[#FF4500]">
            <Radio className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">No active Focus Rooms in this category</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Launch a live focus session in 1 click using a proven template below, or create your own custom room to invite peers.
            </p>
          </div>

          {/* Quick Start Room Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto pt-2">
            {[
              {
                title: '⚡ 25m Pomodoro Sprint',
                category: 'deep_work',
                duration: 1500,
                desc: 'Standard 25-minute sprint for deep uninterrupted focus.',
              },
              {
                title: '💻 50m Engineering Pod',
                category: 'coding',
                duration: 3000,
                desc: 'Dedicated 50-minute block for building & debugging.',
              },
              {
                title: '📚 30m Quiet Study',
                category: 'studying',
                duration: 1800,
                desc: 'Calm 30-minute session for learning and research.',
              },
            ].map((tpl) => (
              <div
                key={tpl.title}
                className="group rounded-2xl border border-white/10 bg-white/5 hover:border-[#FF4500]/40 p-4 flex flex-col justify-between transition-all"
              >
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-[#FF4500]">
                    {Math.round(tpl.duration / 60)}m Session
                  </span>
                  <h4 className="text-sm font-bold text-white group-hover:text-[#FF4500] transition-colors">
                    {tpl.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {tpl.desc}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      setCreating(true);
                      const res = await createCollaborationRoom({
                        title: tpl.title,
                        category: tpl.category,
                        isPublic: true,
                        maxParticipants: 4,
                        durationSeconds: tpl.duration,
                      });
                      if (res.success && res.room) {
                        router.push(`/dashboard/focus-rooms/${res.room.id}`);
                      }
                    } catch (err: any) {
                      setCreateError(err.message || 'Failed to start template room');
                      setShowCreateModal(true);
                    } finally {
                      setCreating(false);
                    }
                  }}
                  disabled={creating}
                  className="mt-4 flex items-center justify-between text-xs font-semibold text-white bg-white/10 hover:bg-[#FF4500] px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <span>Launch Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 text-gray-300 hover:text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Or Create Custom Room</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => {
            const isFull = (room.participant_count || 0) >= room.max_participants;
            const isTimerRunning = room.timer_status === 'running';

            return (
              <div
                key={room.id}
                className="group rounded-3xl border border-white/10 bg-[#0e0e12] hover:border-white/20 p-5 shadow-lg transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#FF4500] bg-[#FF4500]/10 px-2.5 py-0.5 rounded-full border border-[#FF4500]/20">
                      {room.category.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      {room.is_public ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <Globe className="w-3 h-3" /> Public
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      )}
                      <button
                        onClick={() => copyInviteLink(room)}
                        title="Copy Invite Link"
                        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        {copiedId === room.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-[#FF4500] transition-colors line-clamp-1">
                      {room.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Hosted by {room.host_name || 'Member'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-500" />
                      <span>
                        {room.participant_count || 1} / {room.max_participants}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      <span>{Math.round(room.timer_duration_seconds / 60)}m</span>
                    </div>

                    {isTimerRunning && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono animate-pulse">
                        <Flame className="w-3 h-3 fill-current" /> Running
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      copyInviteLink(room);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition-all cursor-pointer"
                    title="Click to copy invite code"
                  >
                    {copiedId === room.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold font-mono text-xs">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-mono text-xs text-gray-300">{room.invite_code}</span>
                      </>
                    )}
                  </button>

                  <Link
                    href={`/dashboard/focus-rooms/${room.id}`}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                      isFull && !room.is_member
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed pointer-events-none'
                        : 'bg-[#FF4500] hover:bg-[#ff5722] text-white shadow-md shadow-[#FF4500]/20'
                    }`}
                  >
                    <span>{room.is_member ? 'Rejoin' : isFull ? 'Full' : 'Enter Room'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#FF4500]" />
                <h2 className="text-lg font-bold text-white">Create Focus Room</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              {createError && (
                <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Room Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep Work Sprint, Physics Problem Set..."
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#FF4500]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3.5 py-2 text-sm text-white outline-none focus:border-[#FF4500]"
                  >
                    <option value="deep_work">Deep Work</option>
                    <option value="coding">Coding</option>
                    <option value="studying">Studying</option>
                    <option value="writing">Writing</option>
                    <option value="creative">Creative</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Timer Duration
                  </label>
                  <select
                    value={createDuration}
                    onChange={(e) => setCreateDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3.5 py-2 text-sm text-white outline-none focus:border-[#FF4500]"
                  >
                    <option value={900}>15 minutes</option>
                    <option value={1500}>25 minutes (Pomodoro)</option>
                    <option value={2700}>45 minutes</option>
                    <option value={3600}>60 minutes</option>
                    <option value={5400}>90 minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-300">
                    Max Participants
                  </label>
                  <span className="text-[10px] text-gray-400">
                    {isPro ? 'Pro plan: up to 12' : 'Free plan: up to 4'}
                  </span>
                </div>
                <input
                  type="number"
                  min={2}
                  max={isPro ? 12 : 4}
                  value={createMaxParticipants}
                  onChange={(e) => setCreateMaxParticipants(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white outline-none focus:border-[#FF4500]"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
                <input
                  type="checkbox"
                  id="isPublicCheck"
                  checked={createIsPublic}
                  onChange={(e) => setCreateIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded-sm accent-[#FF4500]"
                />
                <label htmlFor="isPublicCheck" className="text-xs text-gray-300 cursor-pointer">
                  List publicly in the Room Directory (leave unchecked to keep private & invite-only)
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-[#FF4500] hover:bg-[#ff5722] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-[#FF4500]/20 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
