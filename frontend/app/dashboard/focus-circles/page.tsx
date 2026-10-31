'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CircleDot,
  Plus,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Radio,
  Target,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Search,
  AlertTriangle,
  Play,
  History,
  Archive,
  Flame,
  LogOut,
  UserX,
} from 'lucide-react';
import { io as socketIO, type Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/useEntitlements';
import {
  fetchCollaborationCircles,
  createCollaborationCircle,
  fetchCollaborationCircleByCode,
  cleanInviteCode,
  acceptCollaborationCircleInvite,
  fetchCollaborationCircleDetails,
  setCollaborationCircleCommitment,
  checkInCollaborationCircleCommitment,
  removeCollaborationCircleMember,
  createCollaborationRoom,
  fetchCollaborationCircleHistory,
  archiveCollaborationCircle,
  getApiBaseUrl,
  getSocketUrl,
  type FocusCircle,
  type FocusCircleMember,
  type FocusCircleCommitment,
} from '@/lib/api';

function FocusCirclesPageContent() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { isPro } = useEntitlements();

  const [circles, setCircles] = useState<FocusCircle[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [circleSearch, setCircleSearch] = useState('');

  // Selected Circle Details
  const [circleDetail, setCircleDetail] = useState<FocusCircle | null>(null);
  const [members, setMembers] = useState<FocusCircleMember[]>([]);
  const [commitments, setCommitments] = useState<FocusCircleCommitment[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Multi-week commitment history
  const [history, setHistory] = useState<FocusCircleCommitment[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Create Circle Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createCategory, setCreateCategory] = useState('general');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join by code
  const [joinCode, setJoinCode] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Weekly commitment modal / input
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitmentText, setCommitmentText] = useState('');
  const [submittingCommit, setSubmittingCommit] = useState(false);

  // Check in modal
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  // Copy link feedback
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCardCodeId, setCopiedCardCodeId] = useState<string | null>(null);

  const socketRef = React.useRef<Socket | null>(null);

  // Socket connection to Circle room for real-time commitment & checkin sync
  useEffect(() => {
    if (!token || !selectedCircleId) return;

    const socket = socketIO(getSocketUrl(), { auth: { token }, transports: ['websocket', 'polling'] } as any);

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_focus_circle', { circleId: selectedCircleId });
    });

    socket.on('circle_commitment_updated', () => {
      loadCircleDetails(selectedCircleId);
    });

    socket.on('circle_checkin_updated', () => {
      loadCircleDetails(selectedCircleId);
    });

    return () => {
      socket.emit('leave_focus_circle', { circleId: selectedCircleId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedCircleId, token]);

  const loadCircles = async (autoSelectId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCollaborationCircles();
      if (res.success) {
        const cleanCircles = (res.circles || []).filter(
          (c: any) => !c.name.startsWith('QA ') && !c.name.startsWith('Autonomous QA ')
        );
        setCircles(cleanCircles);
        if (cleanCircles.length > 0) {
          const targetId = autoSelectId || (selectedCircleId && cleanCircles.some((c: any) => c.id === selectedCircleId) ? selectedCircleId : cleanCircles[0].id);
          setSelectedCircleId(targetId);
          loadCircleDetails(targetId);
        } else {
          setSelectedCircleId(null);
          setCircleDetail(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Focus Circles.');
    } finally {
      setLoading(false);
    }
  };

  const loadCircleDetails = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await fetchCollaborationCircleDetails(id);
      if (res.success) {
        setCircleDetail(res.circle);
        setMembers(res.members || []);
        setCommitments(res.commitments || []);
        setCurrentWeek(res.currentWeek);
        setCurrentYear(res.currentYear);
        setUserRole(res.userRole);

        // Populate existing commitment text if set
        const myCommit = (res.commitments || []).find((c) => c.user_id === user?.id);
        if (myCommit) {
          setCommitmentText(myCommit.commitment);
        }
      }
    } catch (err: any) {
      console.error('Failed to load circle details:', err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadCircles();
  }, []);

  // Handle URL join code safely without Next.js useSearchParams suspense deopt
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const codeParam = sp.get('join') || sp.get('code');
      if (codeParam) {
        setJoinCode(codeParam);
        handleJoinByCode(codeParam);
      }
    }
  }, []);

  const handleJoinByCode = async (codeToUse?: string) => {
    const raw = codeToUse || joinCode;
    const code = cleanInviteCode(raw);
    if (!code) return;
    try {
      setJoiningCode(true);
      setJoinError(null);
      const res = await acceptCollaborationCircleInvite(code);
      if (res.success) {
        setJoinCode('');
        await loadCircles(res.circleId);
        if (res.circleId) {
          setSelectedCircleId(res.circleId);
          loadCircleDetails(res.circleId);
        }
      }
    } catch (err: any) {
      setJoinError(err.message || 'Focus Circle not found or closed. Please verify the invitation code.');
    } finally {
      setJoiningCode(false);
    }
  };

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    try {
      setCreating(true);
      setCreateError(null);
      const res = await createCollaborationCircle({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        category: createCategory,
      });
      if (res.success && res.circle) {
        setShowCreateModal(false);
        setCreateName('');
        setCreateDescription('');
        await loadCircles(res.circle.id);
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create Focus Circle.');
    } finally {
      setCreating(false);
    }
  };

  const handleSetCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCircleId || !commitmentText.trim()) return;
    try {
      setSubmittingCommit(true);
      const res = await setCollaborationCircleCommitment(selectedCircleId, commitmentText.trim());
      if (res.success) {
        setShowCommitModal(false);
        await loadCircleDetails(selectedCircleId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record commitment.');
    } finally {
      setSubmittingCommit(false);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCircleId) return;
    try {
      setSubmittingCheckIn(true);
      const res = await checkInCollaborationCircleCommitment(selectedCircleId, completionNote.trim() || undefined);
      if (res.success) {
        setShowCheckInModal(false);
        setCompletionNote('');
        await loadCircleDetails(selectedCircleId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to complete check-in.');
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  const handleLaunchRoomForCircle = async () => {
    if (!circleDetail) return;
    try {
      const res = await createCollaborationRoom({
        title: `${circleDetail.name} Sprint`,
        category: 'general',
        isPublic: false,
        maxParticipants: circleDetail.max_members,
        durationSeconds: 1500,
      });
      if (res.success && res.room) {
        router.push(`/dashboard/focus-rooms/${res.room.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to launch room.');
    }
  };

  
  const copyCircleCodeOnly = (c: FocusCircle, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(c.invite_code);
    }
    setCopiedCardCodeId(c.id);
    setTimeout(() => setCopiedCardCodeId(null), 2500);
  };

  const copyInvite = () => {
    if (!circleDetail) return;
    const url = `${window.location.origin}/dashboard/focus-circles?join=${circleDetail.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!selectedCircleId) return;
    const isMe = memberUserId === user?.id;
    if (!confirm(isMe ? 'Are you sure you want to leave this Circle?' : 'Remove this member from Circle?')) return;
    try {
      await removeCollaborationCircleMember(selectedCircleId, memberUserId);
      if (isMe) {
        await loadCircles();
      } else {
        await loadCircleDetails(selectedCircleId);
      }
    } catch (err: any) {
      alert(err.message || 'Operation failed.');
    }
  };

  const toggleHistory = async () => {
    if (!selectedCircleId) return;
    if (!showHistory) {
      try {
        setHistoryLoading(true);
        const res = await fetchCollaborationCircleHistory(selectedCircleId);
        if (res.success && res.history) {
          setHistory(res.history);
        }
      } catch (err: any) {
        console.error('Failed to load circle history:', err);
      } finally {
        setHistoryLoading(false);
      }
    }
    setShowHistory(!showHistory);
  };

  const handleArchiveCircle = async () => {
    if (!selectedCircleId || userRole !== 'owner') return;
    if (!confirm('Are you sure you want to archive this Focus Circle?')) return;
    try {
      const res = await archiveCollaborationCircle(selectedCircleId);
      if (res.success) {
        await loadCircles();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to archive circle.');
    }
  };

  // Check if current user has committed or checked in
  const myCommitment = useMemo(() => {
    return commitments.find((c) => c.user_id === user?.id);
  }, [commitments, user?.id]);

  return (
    <div className="space-y-8 font-inter text-white pb-16">
      {/* Top Banner */}
      <div className="rounded-3xl border border-[#262832] bg-linear-to-r from-[#FF4500]/15 via-[#0a0a0a] to-[#0a0a0a] p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF4500]">
            <CircleDot className="w-4 h-4" />
            <span>FOCUS CIRCLES</span>
            <span className="text-[10px] bg-[#FF4500]/20 text-[#FF4500] px-2 py-0.5 rounded-full font-medium">
              Recurring Accountability
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Small Groups, Long-Term Consistency
          </h1>
          <p className="text-sm text-gray-400 max-w-xl">
            Maintain weekly shared commitments with a small trusted cohort. No invasive surveillance—just authentic peer accountability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-[#FF4500] hover:bg-[#ff5722] text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-[#FF4500]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Circle</span>
          </button>
        </div>
      </div>

      {/* Join with Code Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-2xl border border-[#262832] bg-[#0e0e12]">
        <span className="text-xs font-semibold text-gray-300 shrink-0">Have an invitation code?</span>
        <div className="flex items-center gap-2 w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Enter code (e.g. fc-...) or paste invite link..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="w-full rounded-xl border border-[#262832] bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500]"
          />
          <button
            onClick={() => handleJoinByCode()}
            disabled={joiningCode || !joinCode.trim()}
            className="bg-white/10 hover:bg-white/15 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {joiningCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Accept'}
          </button>
        </div>
        {joinError && <span className="text-xs text-red-400">{joinError}</span>}
      </div>

      {/* Main Workspace Layout: Circle Selector on Left, Commitments Board on Right */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
          <div className="md:col-span-2 h-64 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
        </div>
      ) : circles.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-[#262832] bg-[#0e0e12] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-gray-400">
            <CircleDot className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No Focus Circles Yet</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Create a private Circle for your study group, project peers, or accountability partners.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-[#FF4500] hover:bg-[#ff5722] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-[#FF4500]/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Your Circle</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Circles List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                My Circles ({circles.length})
              </span>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-[11px] text-[#FF4500] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> New
              </button>
            </div>

            <div className="space-y-2">
              {circles.map((c) => {
                const isSelected = c.id === selectedCircleId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCircleId(c.id);
                      loadCircleDetails(c.id);
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#FF4500]/50 bg-[#FF4500]/10 shadow-lg shadow-[#FF4500]/10'
                        : 'border-[#262832] bg-[#0e0e12] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white line-clamp-1">{c.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {c.member_count || 1} members
                      </span>
                    </div>
                    {c.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{c.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500 font-mono">
                      <span>Owner: {c.owner_name}</span>
                      <span>•</span>
                      <span className="uppercase text-[#FF4500]">{c.user_role || 'member'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Circle Workspace */}
          <div className="lg:col-span-2 space-y-6">
            {detailLoading || !circleDetail ? (
              <div className="h-96 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
            ) : (
              <div className="space-y-6">
                {/* Circle Header Card */}
                <div className="p-6 rounded-3xl border border-[#262832] bg-[#0e0e12] shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-white">{circleDetail.name}</h2>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#FF4500] bg-[#FF4500]/10 px-2.5 py-0.5 rounded-full border border-[#FF4500]/20">
                          {circleDetail.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {circleDetail.description || 'Weekly accountability group'} • Led by {circleDetail.owner_name}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={copyInvite}
                        className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold px-3 py-2 rounded-xl border border-[#262832] transition-all cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied' : 'Invite'}</span>
                      </button>

                      <button
                        onClick={toggleHistory}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                          showHistory
                            ? 'bg-[#FF4500]/20 border-[#FF4500]/40 text-[#FF4500]'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300 border-[#262832]'
                        }`}
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>{showHistory ? 'Active Week' : 'History'}</span>
                      </button>

                      <button
                        onClick={handleLaunchRoomForCircle}
                        className="flex items-center gap-1.5 bg-[#FF4500] hover:bg-[#ff5722] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md shadow-[#FF4500]/20 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Launch Room</span>
                      </button>

                      {userRole === 'owner' ? (
                        <button
                          onClick={handleArchiveCircle}
                          title="Archive Circle"
                          className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-[#262832] transition-colors cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => user?.id && handleRemoveMember(user.id)}
                          title="Leave Circle"
                          className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-[#262832] transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Members Pill Row */}
                  <div className="pt-3 border-t border-white/5 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-gray-500 font-semibold mr-1">Members ({members.length}):</span>
                    {members.map((m) => {
                      const streak = (m as any).current_streak || 0;
                      return (
                        <span
                          key={m.id || m.user_id}
                          className="inline-flex items-center gap-1.5 text-xs text-gray-300 bg-white/5 px-2.5 py-1 rounded-xl border border-white/5"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#FF4500]" />
                          <span>{m.name || 'Member'}</span>
                          {streak > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-mono">
                              <Flame className="w-2.5 h-2.5 fill-current" />
                              {streak}w
                            </span>
                          )}
                          {m.role === 'owner' && <span className="text-[9px] text-[#FF4500] font-bold">Owner</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Multi-Week History View OR Active Weekly Commitments */}
                {showHistory ? (
                  <div className="p-6 rounded-3xl border border-[#262832] bg-[#0e0e12] shadow-xl space-y-5">
                    <div className="flex items-center justify-between border-b border-[#262832] pb-4">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF4500]">
                        <History className="w-4 h-4" />
                        <span>MULTI-WEEK COMMITMENT ARCHIVE</span>
                      </div>
                      <span className="text-xs text-gray-400">Past weekly accountability logs</span>
                    </div>

                    {historyLoading ? (
                      <div className="py-12 text-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#FF4500] mx-auto" />
                        <p className="text-xs text-gray-400">Loading history...</p>
                      </div>
                    ) : history.length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center italic">
                        No past week commitment records found yet. History builds automatically as weeks elapse.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {history.map((h) => (
                          <div
                            key={h.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              h.is_completed
                                ? 'border-emerald-500/20 bg-emerald-500/3'
                                : 'border-[#262832] bg-white/2'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white">{h.user_name || 'Member'}</span>
                                  <span className="text-[10px] text-gray-400 font-mono bg-white/5 px-2 py-0.5 rounded-md">
                                    Week {h.week_number}, {h.year}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-200">{h.commitment}</p>
                                {h.completion_note && (
                                  <p className="text-xs text-emerald-400/90 italic pt-1">
                                    "{h.completion_note}"
                                  </p>
                                )}
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                  h.is_completed
                                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                    : 'text-gray-400 bg-white/5'
                                }`}
                              >
                                {h.is_completed ? 'Completed' : 'Missed'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Weekly Commitments Section */
                  <div className="p-6 rounded-3xl border border-[#262832] bg-[#0e0e12] shadow-xl space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262832] pb-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF4500]">
                          <Calendar className="w-4 h-4" />
                          <span>WEEK {currentWeek}, {currentYear} COMMITMENTS</span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-0.5">
                          What everyone is completing this week
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {!myCommitment ? (
                          <button
                            onClick={() => setShowCommitModal(true)}
                            className="flex items-center gap-1.5 bg-[#FF4500] hover:bg-[#ff5722] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md shadow-[#FF4500]/20 transition-all cursor-pointer"
                          >
                            <Target className="w-3.5 h-3.5" />
                            <span>Set Commitment</span>
                          </button>
                        ) : !myCommitment.is_completed ? (
                          <button
                            onClick={() => setShowCheckInModal(true)}
                            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold px-3.5 py-2 rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                            <span>Check In Complete</span>
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Checked In!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Commitments List */}
                    {commitments.length === 0 ? (
                      <div className="text-center py-8 space-y-2">
                        <p className="text-xs text-gray-400">No commitments recorded yet for Week {currentWeek}.</p>
                        <button
                          onClick={() => setShowCommitModal(true)}
                          className="text-xs text-[#FF4500] hover:underline font-bold"
                        >
                          Be the first to set a goal this week →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {commitments.map((c) => {
                          const isMine = c.user_id === user?.id;
                          return (
                            <div
                              key={c.id}
                              className={`p-4 rounded-2xl border transition-all ${
                                c.is_completed
                                  ? 'border-emerald-500/20 bg-emerald-500/3'
                                  : 'border-[#262832] bg-white/2'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">
                                      {c.user_name || 'Member'}
                                    </span>
                                    {isMine && <span className="text-[10px] text-gray-500">(You)</span>}
                                  </div>
                                  <p className="text-sm text-gray-200 font-medium">{c.commitment}</p>
                                  {c.completion_note && (
                                    <p className="text-xs text-emerald-400/90 italic pt-1">
                                      "{c.completion_note}"
                                    </p>
                                  )}
                                </div>

                                <div>
                                  {c.is_completed ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 whitespace-nowrap">
                                      <Clock className="w-3.5 h-3.5" /> In Progress
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Missing Check-In Summary (Honest Accountability) */}
                    <div className="p-3.5 rounded-2xl bg-white/2 border border-white/5 text-[11px] text-gray-400 flex items-center justify-between">
                      <span>
                        Check-in rate: <strong className="text-white">{commitments.filter((c) => c.is_completed).length}</strong> of{' '}
                        <strong className="text-white">{members.length}</strong> members checked in this week.
                      </span>
                      <span className="text-gray-500">Resets every Monday</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Set Commitment Modal */}
      {showCommitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0e12] border border-[#262832] rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262832] pb-3">
              <h3 className="text-base font-bold text-white">Set Weekly Commitment</h3>
              <button onClick={() => setShowCommitModal(false)} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSetCommitment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  What is your primary commitment for Week {currentWeek}?
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Complete first draft of Chapter 3, ship the payment gateway integration..."
                  value={commitmentText}
                  onChange={(e) => setCommitmentText(e.target.value)}
                  className="w-full rounded-xl border border-[#262832] bg-white/5 p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500] resize-none"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Keep it concise. Your Circle members see this commitment to hold you accountable.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCommitModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCommit}
                  className="bg-[#FF4500] hover:bg-[#ff5722] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-[#FF4500]/20 disabled:opacity-50"
                >
                  {submittingCommit ? 'Saving...' : 'Lock In Commitment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0e12] border border-[#262832] rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262832] pb-3">
              <h3 className="text-base font-bold text-white">Check In: Commitment Complete</h3>
              <button onClick={() => setShowCheckInModal(false)} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCheckIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Optional completion notes or takeaways:
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Wrapped up chapter draft in 3 focus sessions. Moving to review next week."
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  className="w-full rounded-xl border border-[#262832] bg-white/5 p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCheckIn}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {submittingCheckIn ? 'Checking In...' : 'Confirm Completion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Circle Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0e12] border border-[#262832] rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262832] pb-3">
              <h3 className="text-base font-bold text-white">Create Private Focus Circle</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCircle} className="space-y-4">
              {createError && (
                <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Circle Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master's Thesis Cohort, Founders Circle..."
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full rounded-xl border border-[#262832] bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="What is this Circle focusing on together?"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full rounded-xl border border-[#262832] bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  className="w-full rounded-xl border border-[#262832] bg-[#16161c] px-3 py-2 text-xs text-white outline-none focus:border-[#FF4500]"
                >
                  <option value="general">General</option>
                  <option value="studying">Academic / Studying</option>
                  <option value="coding">Software Development</option>
                  <option value="writing">Writing & Publishing</option>
                  <option value="founders">Startups & Founders</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-white/2 border border-white/5 text-[10px] text-gray-400">
                {isPro ? (
                  <span>Pro plan: Own up to 10 Circles with up to 12 members each.</span>
                ) : (
                  <span>Free plan: Own 1 Circle with up to 4 members. Upgrade to Pro for 10 Circles.</span>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-[#FF4500] hover:bg-[#ff5722] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-[#FF4500]/20 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Circle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


export default function FocusCirclesPage() {
  return (
    <React.Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#FF4500] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-mono text-gray-400">Loading Focus Circles...</p>
        </div>
      </div>
    }>
      <FocusCirclesPageContent />
    </React.Suspense>
  );
}
