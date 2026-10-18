'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  LifeBuoy,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Radio,
  Play,
  Handshake,
  MessageSquare,
  AlertTriangle,
  FolderKanban,
  CircleDot,
  Loader2,
  XCircle,
  Check,
  Trash2,
} from 'lucide-react';
import { io as socketIO, type Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/useEntitlements';
import {
  fetchCollaborationUnblockRequests,
  createCollaborationUnblockRequest,
  fetchCollaborationUnblockDetails,
  offerCollaborationUnblockHelp,
  deleteCollaborationUnblockOffer,
  acceptCollaborationUnblockOffer,
  resolveCollaborationUnblockRequest,
  cancelCollaborationUnblockRequest,
  launchRoomFromCollaborationUnblock,
  fetchCollaborationPods,
  fetchCollaborationCircles,
  getApiBaseUrl,
  type UnblockRequest,
  type UnblockOffer,
  type ProjectPod,
  type FocusCircle,
} from '@/lib/api';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'technical', label: 'Technical Help' },
  { id: 'feedback', label: 'Review & Feedback' },
  { id: 'brainstorming', label: 'Brainstorming' },
  { id: 'accountability', label: 'Accountability' },
  { id: 'decision_support', label: 'Decision Support' },
];

export default function UnblockExchangePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const { isPro } = useEntitlements();

  const [requests, setRequests] = useState<UnblockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterTab, setFilterTab] = useState<'all' | 'my' | 'needs_help'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selected Request Details & Offers Modal
  const [selectedReq, setSelectedReq] = useState<UnblockRequest | null>(null);
  const [offers, setOffers] = useState<UnblockOffer[]>([]);
  const [isRequester, setIsRequester] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Create Request Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('technical');
  const [newScopeType, setNewScopeType] = useState<'pod' | 'circle'>('pod');
  const [newScopeId, setNewScopeId] = useState('');
  const [linkedPodTaskId, setLinkedPodTaskId] = useState<string | null>(null);
  const [creatingReq, setCreatingReq] = useState(false);
  const [createReqError, setCreateReqError] = useState<string | null>(null);

  // User's available scopes (Pods & Circles)
  const [userPods, setUserPods] = useState<ProjectPod[]>([]);
  const [userCircles, setUserCircles] = useState<FocusCircle[]>([]);

  // Offer help modal
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [targetReqId, setTargetReqId] = useState<string | null>(null);
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Resolution modal
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const socketRef = React.useRef<Socket | null>(null);

  // Socket connection for real-time unblock requests & offers
  useEffect(() => {
    if (!token) return;

    const socket = socketIO(getApiBaseUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_unblock_exchange');
    });

    socket.on('unblock_request_created', () => {
      loadRequests();
    });

    socket.on('unblock_offer_created', () => {
      loadRequests();
      if (selectedReq) {
        fetchCollaborationUnblockDetails(selectedReq.id).then((res) => {
          if (res.success) setOffers(res.offers || []);
        }).catch(() => {});
      }
    });

    socket.on('unblock_offer_accepted', () => {
      loadRequests();
      if (selectedReq) {
        fetchCollaborationUnblockDetails(selectedReq.id).then((res) => {
          if (res.success) {
            setSelectedReq(res.request);
            setOffers(res.offers || []);
          }
        }).catch(() => {});
      }
    });

    socket.on('unblock_request_resolved', () => {
      loadRequests();
    });

    socket.on('unblock_request_cancelled', () => {
      loadRequests();
    });

    return () => {
      socket.emit('leave_unblock_exchange');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, selectedReq?.id]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCollaborationUnblockRequests({
        filter: filterTab,
        category: categoryFilter,
      });
      if (res.success) {
        setRequests(res.requests || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load unblock requests.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserScopes = async () => {
    try {
      const [podsRes, circlesRes] = await Promise.all([
        fetchCollaborationPods(),
        fetchCollaborationCircles(),
      ]);
      if (podsRes.success) setUserPods(podsRes.pods || []);
      if (circlesRes.success) setUserCircles(circlesRes.circles || []);

      if (podsRes.pods?.length > 0) {
        setNewScopeType('pod');
        setNewScopeId(podsRes.pods[0].id);
      } else if (circlesRes.circles?.length > 0) {
        setNewScopeType('circle');
        setNewScopeId(circlesRes.circles[0].id);
      }
    } catch (err) {
      console.warn('Failed to load user scopes:', err);
    }
  };

  // URL param detection for 1-click unblock from Pod tasks
  useEffect(() => {
    const podId = searchParams.get('podId');
    const taskId = searchParams.get('taskId');
    const title = searchParams.get('title');
    if (podId) {
      setNewScopeType('pod');
      setNewScopeId(podId);
      if (title) setNewTitle(`Blocked on: ${title}`);
      if (taskId) setLinkedPodTaskId(taskId);
      setShowCreateModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadRequests();
  }, [filterTab, categoryFilter]);

  useEffect(() => {
    loadUserScopes();
  }, []);

  const openRequestDetails = async (req: UnblockRequest) => {
    try {
      setSelectedReq(req);
      setShowDetailModal(true);
      setDetailsLoading(true);
      const res = await fetchCollaborationUnblockDetails(req.id);
      if (res.success) {
        setSelectedReq(res.request);
        setOffers(res.offers || []);
        setIsRequester(res.isRequester);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim() || !newScopeId) return;
    try {
      setCreatingReq(true);
      setCreateReqError(null);
      const res = await createCollaborationUnblockRequest({
        title: newTitle.trim(),
        description: newDesc.trim(),
        category: newCategory,
        scopeType: newScopeType,
        scopeId: newScopeId,
        podTaskId: linkedPodTaskId || undefined,
      });
      if (res.success) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewDesc('');
        setLinkedPodTaskId(null);
        await loadRequests();
      }
    } catch (err: any) {
      setCreateReqError(err.message || 'Failed to post unblock request.');
    } finally {
      setCreatingReq(false);
    }
  };

  const handleRetractOffer = async (offerId: string) => {
    if (!selectedReq) return;
    if (!confirm('Are you sure you want to retract this offer of help?')) return;
    try {
      await deleteCollaborationUnblockOffer(selectedReq.id, offerId);
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      await loadRequests();
      if (selectedReq) {
        await openRequestDetails(selectedReq);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to retract offer.');
    }
  };

  const handleOfferHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReqId || !offerMessage.trim()) return;
    try {
      setSubmittingOffer(true);
      const res = await offerCollaborationUnblockHelp(targetReqId, offerMessage.trim());
      if (res.success) {
        setShowOfferModal(false);
        setOfferMessage('');
        await loadRequests();
        if (showDetailModal && selectedReq?.id === targetReqId) {
          await openRequestDetails(selectedReq);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to offer help.');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleAcceptOffer = async (helperUserId: string) => {
    if (!selectedReq) return;
    try {
      const res = await acceptCollaborationUnblockOffer(selectedReq.id, helperUserId);
      if (res.success) {
        setSelectedReq(res.request);
        await openRequestDetails(res.request);
        await loadRequests();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to accept offer.');
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    try {
      setResolving(true);
      const res = await resolveCollaborationUnblockRequest(selectedReq.id, outcomeNotes.trim() || undefined);
      if (res.success) {
        setShowResolveModal(false);
        setShowDetailModal(false);
        setOutcomeNotes('');
        await loadRequests();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to resolve request.');
    } finally {
      setResolving(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    if (!confirm('Cancel this help request?')) return;
    try {
      await cancelCollaborationUnblockRequest(id);
      setShowDetailModal(false);
      await loadRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel.');
    }
  };

  const handleLaunchHelpRoom = async (reqId: string) => {
    try {
      const res = await launchRoomFromCollaborationUnblock(reqId);
      if (res.success && res.room) {
        router.push(`/dashboard/focus-rooms/${res.room.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to launch room.');
    }
  };

  return (
    <div className="space-y-8 font-inter text-white pb-16">
      {/* Top Banner */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#FF4500]/15 via-[#0a0a0a] to-[#0a0a0a] p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF4500]">
            <LifeBuoy className="w-4 h-4" />
            <span>UNBLOCK EXCHANGE</span>
            <span className="text-[10px] bg-[#FF4500]/20 text-[#FF4500] px-2 py-0.5 rounded-full font-medium">
              Peer Problem-Solving
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Get Human Assistance When Work Stalls
          </h1>
          <p className="text-sm text-gray-400 max-w-xl">
            Stuck on a tricky bug, need feedback on a design, or need a 10-minute collaborative problem-solving session? Ask your trusted Circles and Pods.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-[#FF4500] hover:bg-[#ff5722] text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-[#FF4500]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ask for Help</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Scope Tabs */}
        <div className="flex items-center gap-2 bg-[#0e0e12] p-1.5 rounded-2xl border border-white/10 text-xs">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-4 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterTab === 'all' ? 'bg-[#FF4500] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            All Requests
          </button>
          <button
            onClick={() => setFilterTab('needs_help')}
            className={`px-4 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterTab === 'needs_help' ? 'bg-[#FF4500] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Needs Help
          </button>
          <button
            onClick={() => setFilterTab('my')}
            className={`px-4 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterTab === 'my' ? 'bg-[#FF4500] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            My Requests
          </button>
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-2xl border border-white/10 bg-[#0e0e12] px-4 py-2 text-xs text-white outline-none focus:border-[#FF4500]"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Requests Listing */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-white/10 bg-[#0e0e12] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-gray-400">
            <LifeBuoy className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No Unblock Requests Found</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Nobody is currently blocked in your active Circles or Pods.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-[#FF4500] hover:bg-[#ff5722] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-[#FF4500]/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post a Help Request</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {requests.map((req) => {
            const isMine = req.requester_user_id === user?.id;
            const isOpen = req.status === 'open' || req.status === 'offered';
            const isAccepted = req.status === 'accepted' || req.status === 'in_progress';
            const isResolved = req.status === 'resolved';

            return (
              <div
                key={req.id}
                className="group rounded-3xl border border-white/10 bg-[#0e0e12] hover:border-white/20 p-5 shadow-lg transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#FF4500] bg-[#FF4500]/10 px-2.5 py-0.5 rounded-full border border-[#FF4500]/20">
                      {req.category.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                        isResolved
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isAccepted
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-[#FF4500] transition-colors line-clamp-1">
                      {req.title}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1">{req.description}</p>
                  </div>

                  <div className="space-y-1 pt-1 text-[11px] text-gray-500 font-mono">
                    <div className="flex items-center justify-between">
                      <span>Requester: <strong className="text-gray-300">{req.requester_name}</strong></span>
                      <span>{req.offer_count || 0} offers</span>
                    </div>
                    <div>
                      Scope: <strong className="text-gray-300">{req.scope_name}</strong> ({req.scope_type})
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openRequestDetails(req)}
                    className="text-xs text-gray-400 hover:text-white font-semibold transition-colors cursor-pointer"
                  >
                    View Details
                  </button>

                  <div className="flex items-center gap-2">
                    {!isMine && isOpen && !req.has_offered && (
                      <button
                        onClick={() => {
                          setTargetReqId(req.id);
                          setShowOfferModal(true);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        Offer Help
                      </button>
                    )}

                    {(isAccepted || req.room_id) && (
                      <button
                        onClick={() => handleLaunchHelpRoom(req.id)}
                        className="flex items-center gap-1 bg-[#FF4500] hover:bg-[#ff5722] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md shadow-[#FF4500]/20 transition-all cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Help Room</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request Details & Offers Modal */}
      {showDetailModal && selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-[#FF4500] bg-[#FF4500]/10 px-2.5 py-0.5 rounded-full border border-[#FF4500]/20">
                  {selectedReq.category.replace('_', ' ')}
                </span>
                <h2 className="text-lg font-bold text-white pt-1">{selectedReq.title}</h2>
                <p className="text-xs text-gray-400">
                  Posted by {selectedReq.requester_name} • Scoped to {selectedReq.scope_name}
                </p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Description</h4>
              <p className="text-xs text-gray-200 bg-white/[0.02] p-4 rounded-2xl border border-white/5 leading-relaxed">
                {selectedReq.description}
              </p>

              {selectedReq.outcome_notes && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/20 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Resolution Outcome
                  </span>
                  <p className="text-xs text-emerald-300">{selectedReq.outcome_notes}</p>
                </div>
              )}
            </div>

            {/* Offers Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Offers of Help ({offers.length})
                </h4>
                {!isRequester && selectedReq.status === 'open' && !selectedReq.has_offered && (
                  <button
                    onClick={() => {
                      setTargetReqId(selectedReq.id);
                      setShowOfferModal(true);
                    }}
                    className="text-xs text-[#FF4500] hover:underline font-bold"
                  >
                    + Offer Help
                  </button>
                )}
              </div>

              {offers.length === 0 ? (
                <p className="text-xs text-gray-500 py-3 text-center">No offers received yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{offer.helper_name}</span>
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase ${
                              offer.status === 'accepted'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-white/5 text-gray-400'
                            }`}
                          >
                            {offer.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300">{offer.message}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {offer.status === 'accepted' ? (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                              <Check className="w-3 h-3" /> Accepted Helper
                            </span>
                            <button
                              onClick={() => handleLaunchHelpRoom(selectedReq.id)}
                              className="flex items-center gap-1 bg-[#FF4500] hover:bg-[#ff5722] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md shadow-[#FF4500]/20 transition-all cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Join Room</span>
                            </button>
                          </div>
                        ) : isRequester && selectedReq.status !== 'resolved' ? (
                          <button
                            onClick={() => handleAcceptOffer(offer.helper_user_id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 cursor-pointer"
                          >
                            Accept Offer
                          </button>
                        ) : null}

                        {offer.helper_user_id === user?.id && offer.status !== 'accepted' && (
                          <button
                            onClick={() => handleRetractOffer(offer.id)}
                            title="Retract offer"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions Toolbar */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isRequester && selectedReq.status !== 'resolved' && selectedReq.status !== 'cancelled' && (
                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Mark as Resolved
                  </button>
                )}
                {isRequester && selectedReq.status === 'open' && (
                  <button
                    onClick={() => handleCancelRequest(selectedReq.id)}
                    className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-red-400 text-xs px-3 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel Request
                  </button>
                )}
              </div>

              {(selectedReq.status === 'accepted' || selectedReq.status === 'in_progress') && (
                <button
                  onClick={() => handleLaunchHelpRoom(selectedReq.id)}
                  className="flex items-center gap-2 bg-[#FF4500] hover:bg-[#ff5722] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-[#FF4500]/20 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Help Focus Room</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Offer Help Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Offer Help</h3>
              <button onClick={() => setShowOfferModal(false)} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleOfferHelp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  How can you assist with this request?
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. I worked on this part of the codebase yesterday. Let's do a 15-minute Focus Room review."
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOffer}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-4 py-2 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submittingOffer ? 'Sending...' : 'Send Help Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Request Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Resolve Unblock Request</h3>
              <button onClick={() => setShowResolveModal(false)} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Outcome notes / resolution summary:
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Resolved in 20-minute coworking session with Keshav. Fixed query index issue."
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500] resize-none"
                />
                <p className="text-[10px] text-emerald-400/90 mt-1 flex items-center gap-1">
                  <span>💡</span>
                  <span>If linked to a Project Pod task, resolving automatically clears the blocker and sets the task back to in-progress!</span>
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-4 py-2 rounded-xl shadow-md disabled:opacity-50"
                >
                  {resolving ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Create Unblock Request</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3.5">
              {createReqError && (
                <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
                  {createReqError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="What are you blocked on?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain what you are trying to do, where you got stuck, and what kind of help you need..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-xs text-white outline-none focus:border-[#FF4500]"
                  >
                    <option value="technical">Technical Help</option>
                    <option value="feedback">Review & Feedback</option>
                    <option value="brainstorming">Brainstorming</option>
                    <option value="accountability">Accountability</option>
                    <option value="decision_support">Decision Support</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Group Scope (Privacy)
                  </label>
                  <select
                    value={`${newScopeType}:${newScopeId}`}
                    onChange={(e) => {
                      const [type, id] = e.target.value.split(':');
                      setNewScopeType(type as any);
                      setNewScopeId(id);
                    }}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-xs text-white outline-none focus:border-[#FF4500]"
                  >
                    {userPods.map((p) => (
                      <option key={p.id} value={`pod:${p.id}`}>
                        Pod: {p.name}
                      </option>
                    ))}
                    {userCircles.map((c) => (
                      <option key={c.id} value={`circle:${c.id}`}>
                        Circle: {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] text-gray-400">
                {isPro ? (
                  <span>Pro plan: Create up to 20 Unblock requests per 7-day rolling period.</span>
                ) : (
                  <span>Free plan: Create up to 3 Unblock requests per 7-day rolling period.</span>
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
                  disabled={creatingReq}
                  className="bg-[#FF4500] hover:bg-[#ff5722] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-[#FF4500]/20 disabled:opacity-50"
                >
                  {creatingReq ? 'Posting...' : 'Post Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
