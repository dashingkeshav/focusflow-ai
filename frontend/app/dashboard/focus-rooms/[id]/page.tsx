'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { io as socketIO, type Socket } from 'socket.io-client';
import {
  Users,
  Play,
  Pause,
  RotateCcw,
  Lock,
  Unlock,
  Radio,
  Copy,
  Check,
  LogOut,
  UserX,
  Flame,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Award,
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  fetchCollaborationRoomDetails,
  controlCollaborationRoomTimer,
  updateCollaborationRoom,
  removeCollaborationRoomMember,
  leaveCollaborationRoom,
  startCollaborationRoomSession,
  completeCollaborationRoomSession,
  fetchCollaborationRoomMessages,
  sendCollaborationRoomMessage,
  getApiBaseUrl,
  type FocusRoom,
  type FocusRoomMember,
  type FocusRoomMessage,
} from '@/lib/api';

export default function FocusRoomLivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  const router = useRouter();
  const { user, token } = useAuth();

  const [room, setRoom] = useState<FocusRoom | null>(null);
  const [participants, setParticipants] = useState<FocusRoomMember[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronized timer state
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [timerDuration, setTimerDuration] = useState(1500);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [timerStartTime, setTimerStartTime] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(1500);

  // Personal session tracking
  const [hasPersonalSession, setHasPersonalSession] = useState(false);
  const [sessionStarting, setSessionStarting] = useState(false);

  // Feedback states
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Quiet room feed / status messages
  const [messages, setMessages] = useState<FocusRoomMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // 1. Initial Room Data Fetch
  const loadRoom = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCollaborationRoomDetails(roomId);
      if (res.success && res.room) {
        setRoom(res.room);
        setParticipants(res.participants || []);
        setIsHost(res.isHost);
        setTimerStatus(res.room.timer_status);
        setTimerDuration(res.room.timer_duration_seconds || 1500);
        setTimerElapsed(res.room.timer_elapsed_seconds || 0);
        setTimerStartTime(res.room.timer_start_time || null);

        const currentMember = (res.participants || []).find((p) => p.user_id === user?.id);
        if (currentMember?.active_session_id) {
          setHasPersonalSession(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to room.');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await fetchCollaborationRoomMessages(roomId);
      if (res.success && res.messages) {
        setMessages(res.messages);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    loadRoom();
    loadMessages();
  }, [roomId, user?.id]);

  // 2. Real-time Socket.IO Connection
  useEffect(() => {
    if (!token || !roomId) return;

    const socket = socketIO(getApiBaseUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_focus_room', { roomId });
    });

    socket.on('room_presence_update', (payload: { roomId: string; userId: string; status: string; action?: string }) => {
      if (payload.roomId === roomId) {
        // Refresh participants
        fetchCollaborationRoomDetails(roomId).then((res) => {
          if (res.success) {
            setParticipants(res.participants || []);
          }
        }).catch(() => {});
      }
    });

    socket.on('room_timer_sync', (sync: {
      roomId: string;
      timerStatus: 'idle' | 'running' | 'paused' | 'completed';
      timerStartTime: string | null;
      timerElapsedSeconds: number;
      timerDurationSeconds: number;
      serverTime: number;
    }) => {
      if (sync.roomId === roomId) {
        setTimerStatus(sync.timerStatus);
        setTimerStartTime(sync.timerStartTime);
        setTimerElapsed(sync.timerElapsedSeconds);
        setTimerDuration(sync.timerDurationSeconds);

        if (sync.timerStatus === 'completed') {
          setShowSummaryModal(true);
        }
      }
    });

    socket.on('room_recent_messages', (history: FocusRoomMessage[]) => {
      if (Array.isArray(history) && history.length > 0) {
        setMessages(history);
      }
    });

    socket.on('room_message_broadcast', (msg: FocusRoomMessage) => {
      if (msg && msg.room_id === roomId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => {
      socket.emit('leave_focus_room', { roomId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, token]);

  const handleSendMessage = async (customContent?: string, type: 'chat' | 'status' | 'milestone' = 'chat') => {
    const text = (customContent || newMsg).trim();
    if (!text) return;

    try {
      setSendingMsg(true);
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('send_room_message', {
          roomId,
          content: text,
          messageType: type,
        });
        if (!customContent) setNewMsg('');
      } else {
        const res = await sendCollaborationRoomMessage(roomId, text, type);
        if (res.success && res.message) {
          setMessages((prev) => [...prev, res.message]);
          if (!customContent) setNewMsg('');
        }
      }
    } catch (err: any) {
      console.error('Failed to post message:', err);
    } finally {
      setSendingMsg(false);
    }
  };

  // 3. Local Countdown Tick (Calculated from server timestamps)
  useEffect(() => {
    const tick = () => {
      if (timerStatus === 'running' && timerStartTime) {
        const now = Date.now();
        const start = new Date(timerStartTime).getTime();
        const added = Math.max(0, Math.floor((now - start) / 1000));
        const totalElapsed = timerElapsed + added;
        const left = Math.max(0, timerDuration - totalElapsed);
        setRemainingSeconds(left);

        if (left === 0 && isHost) {
          controlCollaborationRoomTimer(roomId, 'complete').catch(() => {});
        }
      } else if (timerStatus === 'paused') {
        const left = Math.max(0, timerDuration - timerElapsed);
        setRemainingSeconds(left);
      } else if (timerStatus === 'idle') {
        setRemainingSeconds(timerDuration);
      } else if (timerStatus === 'completed') {
        setRemainingSeconds(0);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerStatus, timerStartTime, timerElapsed, timerDuration, isHost, roomId]);

  // Timer Controls (Host)
  const handleTimerAction = async (action: 'start' | 'pause' | 'resume' | 'reset') => {
    try {
      const res = await controlCollaborationRoomTimer(roomId, action, timerDuration);
      if (res.success && res.room) {
        setTimerStatus(res.room.timer_status);
        setTimerStartTime(res.room.timer_start_time || null);
        setTimerElapsed(res.room.timer_elapsed_seconds || 0);
      }
    } catch (err: any) {
      console.error('Timer action failed:', err.message);
    }
  };

  // Host Lock Toggle
  const toggleLock = async () => {
    if (!room) return;
    const nextStatus = room.status === 'locked' ? 'open' : 'locked';
    try {
      const res = await updateCollaborationRoom(roomId, { status: nextStatus });
      if (res.success && res.room) {
        setRoom(res.room);
      }
    } catch (err: any) {
      console.error('Lock toggle failed:', err.message);
    }
  };

  // Host Remove Member
  const handleRemoveMember = async (memberUserId: string) => {
    if (!confirm('Remove this participant from the room?')) return;
    try {
      await removeCollaborationRoomMember(roomId, memberUserId);
      setParticipants((prev) => prev.filter((p) => p.user_id !== memberUserId));
    } catch (err: any) {
      alert(err.message || 'Failed to remove participant.');
    }
  };

  // Participant Personal Session Toggle
  const handleTogglePersonalSession = async () => {
    try {
      setSessionStarting(true);
      if (!hasPersonalSession) {
        const res = await startCollaborationRoomSession(roomId);
        if (res.success) {
          setHasPersonalSession(true);
        }
      } else {
        const res = await completeCollaborationRoomSession(roomId);
        if (res.success) {
          setHasPersonalSession(false);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Session action failed.');
    } finally {
      setSessionStarting(false);
    }
  };

  // Leave Room
  const handleLeaveRoom = async () => {
    try {
      if (hasPersonalSession) {
        await completeCollaborationRoomSession(roomId).catch(() => {});
      }
      await leaveCollaborationRoom(roomId);
      router.push('/dashboard/focus-rooms');
    } catch {
      router.push('/dashboard/focus-rooms');
    }
  };

  // Copy Link
  const copyInvite = () => {
    if (!room) return;
    const url = `${window.location.origin}/dashboard/focus-rooms?join=${room.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Formatting
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = Math.min(100, Math.max(0, ((timerDuration - remainingSeconds) / timerDuration) * 100));

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF4500] mx-auto" />
          <p className="text-xs font-mono text-gray-400">Connecting to Focus Room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="p-8 rounded-3xl border border-red-500/20 bg-[#0e0e12] max-w-md text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Unable to Enter Room</h2>
          <p className="text-xs text-gray-400">{error || 'Room not found or unauthorized.'}</p>
          <Link
            href="/dashboard/focus-rooms"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Directory</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-inter text-white pb-16 max-w-5xl mx-auto">
      {/* Top Navigation & Room Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeaveRoom}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Leave Room"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white">{room.title}</h1>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#FF4500] bg-[#FF4500]/10 px-2.5 py-0.5 rounded-full border border-[#FF4500]/20">
                {room.category.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Hosted by {room.host_name} • Code: <span className="font-mono text-gray-300">#{room.invite_code}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Invite Link */}
          <button
            onClick={copyInvite}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold px-3 py-2 rounded-xl border border-white/10 transition-all cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Invite Link'}</span>
          </button>

          {/* Host Lock Control */}
          {isHost && (
            <button
              onClick={toggleLock}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                room.status === 'locked'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              {room.status === 'locked' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{room.status === 'locked' ? 'Locked' : 'Lock Room'}</span>
            </button>
          )}

          {/* Leave Button */}
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold px-3 py-2 rounded-xl border border-red-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Main Coworking Layout: Timer on Left, Presence on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Synchronized Focus Timer Hero Card */}
        <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-[#0e0e12] p-8 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div
            className={`absolute -top-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
              timerStatus === 'running'
                ? 'bg-[#FF4500]/20'
                : timerStatus === 'paused'
                ? 'bg-amber-500/15'
                : 'bg-white/5'
            }`}
          />

          {/* Status Badge */}
          <div className="mb-6 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider px-3.5 py-1 rounded-full ${
                timerStatus === 'running'
                  ? 'bg-[#FF4500]/20 text-[#FF4500] border border-[#FF4500]/30 animate-pulse'
                  : timerStatus === 'paused'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : timerStatus === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/10 text-gray-400'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>
                {timerStatus === 'running'
                  ? 'SYNCHRONIZED FOCUS'
                  : timerStatus === 'paused'
                  ? 'TIMER PAUSED'
                  : timerStatus === 'completed'
                  ? 'SESSION COMPLETED'
                  : 'READY TO SPRINT'}
              </span>
            </span>
          </div>

          {/* Big Authoritative Countdown Display */}
          <div className="my-2 relative flex flex-col items-center">
            <span className="text-6xl sm:text-7xl md:text-8xl font-black font-mono tracking-tighter text-white tabular-nums drop-shadow-md">
              {timeFormatted}
            </span>

            {/* Progress bar line */}
            <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden mt-4">
              <div
                className="h-full bg-linear-to-r from-[#FF4500] to-[#ff7a45] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Host Controls */}
          {isHost ? (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {timerStatus === 'idle' && (
                <button
                  onClick={() => handleTimerAction('start')}
                  className="flex items-center gap-2 bg-[#FF4500] hover:bg-[#ff5722] text-white text-sm font-bold px-6 py-3 rounded-2xl shadow-xl shadow-[#FF4500]/25 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Shared Sprint</span>
                </button>
              )}

              {timerStatus === 'running' && (
                <button
                  onClick={() => handleTimerAction('pause')}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold px-6 py-3 rounded-2xl shadow-xl shadow-amber-500/25 transition-all cursor-pointer"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Timer</span>
                </button>
              )}

              {timerStatus === 'paused' && (
                <button
                  onClick={() => handleTimerAction('resume')}
                  className="flex items-center gap-2 bg-[#FF4500] hover:bg-[#ff5722] text-white text-sm font-bold px-6 py-3 rounded-2xl shadow-xl shadow-[#FF4500]/25 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume Timer</span>
                </button>
              )}

              <button
                onClick={() => handleTimerAction('reset')}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold px-4 py-3 rounded-2xl border border-white/10 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </div>
          ) : (
            <p className="mt-8 text-xs text-gray-500 font-mono">
              The room timer is controlled by host <strong className="text-gray-300">{room.host_name}</strong>.
            </p>
          )}

          {/* Personal Focus Integration Section */}
          <div className="mt-8 pt-6 border-t border-white/10 w-full flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/2 p-4 rounded-2xl">
            <div className="text-left space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-[#FF4500]" />
                <span>Personal Focus Session Link</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Log this coworking session into your personal Study Sessions history and streak.
              </p>
            </div>

            <button
              onClick={handleTogglePersonalSession}
              disabled={sessionStarting}
              className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                hasPersonalSession
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/10 hover:bg-white/15 text-white'
              }`}
            >
              {sessionStarting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : hasPersonalSession ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Personal Session Active</span>
                </>
              ) : (
                <>
                  <Flame className="w-3.5 h-3.5 text-[#FF4500]" />
                  <span>Connect My Focus Session</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Presence / Participants Sidebar */}
        <div className="rounded-3xl border border-white/10 bg-[#0e0e12] p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FF4500]" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Participants ({participants.length}/{room.max_participants})
                </h2>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>

            <div className="space-y-2.5 max-h-90 overflow-y-auto pr-1">
              {participants.map((p) => {
                const isUserHost = p.role === 'host' || p.user_id === room.host_user_id;
                const isOnline = p.presence_status === 'online';
                const isMe = p.user_id === user?.id;

                return (
                  <div
                    key={p.id || p.user_id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white/2 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-linear-to-tr from-[#FF4500]/30 to-purple-500/30 flex items-center justify-center font-bold text-xs text-white uppercase border border-white/10">
                          {p.name ? p.name.slice(0, 2) : 'FF'}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0e0e12] ${
                            isOnline ? 'bg-emerald-400' : 'bg-gray-500'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate max-w-27.5">
                            {p.name || 'Member'}
                          </span>
                          {isMe && <span className="text-[9px] text-gray-500 font-mono">(You)</span>}
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          {isUserHost ? (
                            <span className="text-[#FF4500] font-semibold">Host</span>
                          ) : (
                            <span className="text-gray-400">Co-worker</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isHost && !isUserHost && (
                      <button
                        onClick={() => handleRemoveMember(p.user_id)}
                        className="text-gray-500 hover:text-red-400 p-1 rounded-lg hover:bg-white/5 transition-colors"
                        title="Remove participant"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quiet Status & Focus Feed */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300">
                <MessageSquare className="w-3.5 h-3.5 text-[#FF4500]" />
                <span>Quiet Focus Feed</span>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">Silent Coworking</span>
            </div>

            {/* Quick Intention / Status Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '🎯 In flow', type: 'status' as const },
                { label: '☕ Quick sip', type: 'status' as const },
                { label: '✅ Done task', type: 'status' as const },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => handleSendMessage(q.label, q.type)}
                  disabled={sendingMsg}
                  className="text-[10px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-2 py-1 rounded-lg border border-white/5 transition-colors cursor-pointer"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="max-h-44 overflow-y-auto space-y-2 pr-1 text-xs">
              {messages.length === 0 ? (
                <p className="text-[11px] text-gray-500 italic py-2 text-center">
                  No status pings yet. Post your focus goal or status below.
                </p>
              ) : (
                messages.map((m) => {
                  const isMe = m.user_id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={`p-2 rounded-xl text-[11px] ${
                        isMe
                          ? 'bg-[#FF4500]/10 border border-[#FF4500]/20 text-gray-200 ml-3'
                          : 'bg-white/5 border border-white/5 text-gray-300 mr-3'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] text-gray-500 mb-0.5">
                        <span className="font-semibold text-gray-400">{m.user_name || 'Member'}</span>
                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="leading-relaxed">{m.content}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-1.5 pt-1"
            >
              <input
                type="text"
                placeholder="Post focus status or goal..."
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                maxLength={240}
                className="w-full text-xs rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-[#FF4500]"
              />
              <button
                type="submit"
                disabled={sendingMsg || !newMsg.trim()}
                className="p-2 rounded-xl bg-[#FF4500] hover:bg-[#ff5722] text-white disabled:opacity-40 transition-colors shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Social Coworking Tip */}
          <div className="p-3.5 rounded-2xl border border-white/5 bg-white/2 text-[11px] text-gray-400 space-y-1">
            <span className="font-bold text-gray-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FF4500]" />
              Quiet Coworking Rule
            </span>
            <p>
              Focus Rooms are quiet accountability zones. No audio/video distractions — just synchronized deep work.
            </p>
          </div>
        </div>
      </div>

      {/* Post-Session Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-md p-6 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-[#FF4500]/15 text-[#FF4500] flex items-center justify-center mx-auto shadow-lg shadow-[#FF4500]/20">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white">Focus Sprint Complete!</h2>
              <p className="text-xs text-gray-400">
                You just completed a {Math.round(timerDuration / 60)}-minute focus session in {room.title}.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/3 border border-white/10 text-left space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Session Duration:</span>
                <span className="font-bold text-white">{Math.round(timerDuration / 60)} minutes</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Participants Alongside:</span>
                <span className="font-bold text-white">{participants.length} peers</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Personal Session:</span>
                <span className={`font-bold ${hasPersonalSession ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {hasPersonalSession ? 'Recorded to history' : 'Not linked'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Continue in Room
              </button>
              <Link
                href="/dashboard/sessions"
                className="w-full py-2.5 rounded-xl bg-[#FF4500] hover:bg-[#ff5722] text-white font-bold text-xs transition-all text-center"
              >
                View History
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
