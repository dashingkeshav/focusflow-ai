"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import {
  Trophy,
  Award,
  CheckSquare,
  CheckCircle2,
  Flame,
  Plus,
  Edit2,
  Trash2,
  X,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  fetchAchievements,
  createCustomAchievementApi,
  updateCustomAchievementApi,
  deleteCustomAchievementApi,
  AchievementItem,
  AchievementStats,
  getSocketUrl,
} from "@/lib/api";
import { io as socketIO, Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckSquare,
  CheckCircle2,
  Trophy,
  Flame,
  Award,
};

interface AchievementManagerProps {
  flash?: (msg: string) => void;
}

export default function AchievementManager({ flash }: AchievementManagerProps) {
  const { token } = useAuth();
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [stats, setStats] = useState<AchievementStats>({
    unlocked: 0,
    inProgress: 0,
    total: 0,
    completionPercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);

  // Custom achievement form modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<AchievementItem | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTarget, setFormTarget] = useState(5);
  const [formProgress, setFormProgress] = useState(0);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Subtle animated unlocked notification
  const [unlockNotification, setUnlockNotification] = useState<AchievementItem | null>(null);
  const notifTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const loadAchievements = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetchAchievements();
      if (res.success) {
        setAchievements(res.achievements);
        setStats(res.stats);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load achievements";
      console.warn("Could not load achievements:", msg);
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetchAchievements();
        if (!ignore && res.success) {
          setAchievements(res.achievements);
          setStats(res.stats);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load achievements";
          console.warn("Could not load achievements:", msg);
          setLoadError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Real-time Socket.io listener for achievement_unlocked
  useEffect(() => {
    let socket: Socket | null = null;

    if (token) {
      socket = socketIO(getSocketUrl(), { auth: { token }, transports: ['websocket', 'polling'] } as any);

      socket.on("achievement_unlocked", (unlockedAch: AchievementItem) => {
        setUnlockNotification(unlockedAch);
        if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
        notifTimeoutRef.current = setTimeout(() => {
          setUnlockNotification(null);
        }, 6000);

        // Refresh live data
        loadAchievements();
      });
    }

    return () => {
      if (socket) socket.disconnect();
      if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    };
  }, [loadAchievements, token]);

  const handleOpenCreateModal = () => {
    setEditingAchievement(null);
    setFormTitle("");
    setFormDescription("");
    setFormTarget(5);
    setFormProgress(0);
    setFormError("");
    setShowFormModal(true);
  };

  const handleOpenEditModal = (ach: AchievementItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ach.isCustom) return;
    setEditingAchievement(ach);
    setFormTitle(ach.title);
    setFormDescription(ach.description);
    setFormTarget(ach.target);
    setFormProgress(ach.progress);
    setFormError("");
    setShowFormModal(true);
  };

  const handleDeleteCustom = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this custom achievement?")) return;
    try {
      await deleteCustomAchievementApi(id);
      setAchievements((prev) => prev.filter((a) => a.id !== id));
      flash?.("Custom achievement removed.");
      loadAchievements();
    } catch {
      alert("Failed to delete custom achievement.");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (formTitle.trim().length < 3) {
      setFormError("Title must be at least 3 characters.");
      return;
    }
    if (formTarget < 1) {
      setFormError("Target must be at least 1.");
      return;
    }

    try {
      setFormSubmitting(true);
      if (editingAchievement) {
        const res = await updateCustomAchievementApi(editingAchievement.id, {
          title: formTitle,
          description: formDescription,
          target: formTarget,
          progress: formProgress,
        });
        if (res.success) {
          setShowFormModal(false);
          flash?.("Achievement updated.");
          loadAchievements();
        }
      } else {
        const res = await createCustomAchievementApi({
          title: formTitle,
          description: formDescription,
          target: formTarget,
        });
        if (res.success) {
          setShowFormModal(false);
          flash?.("Custom achievement created.");
          loadAchievements();
        }
      }
    } catch {
      setFormError("Failed to save achievement.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const titleId = useId();

  if (loading && achievements.length === 0) {
    return (
      <div className="glass-card flex items-center justify-center rounded-2xl p-12 text-sm text-mist-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-tide-500" />
        Loading real achievements from Supabase…
      </div>
    );
  }

  return (
    <div className="space-y-6 font-inter text-white">
      {/* ─── Real-Time Unlocked Notification Toast ─── */}
      {unlockNotification && (
        <aside
          aria-labelledby={titleId}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-2xl border border-amber-400/50 bg-card p-4 text-white shadow-2xl shadow-amber-500/20 backdrop-blur-xl animate-in slide-in-from-bottom-5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-lg">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              <Sparkles className="h-3 w-3" />
              Achievement Unlocked!
            </div>
            <h4 id={titleId} className="text-sm font-bold text-white font-serif">{unlockNotification.title}</h4>
            <p className="text-xs text-white/50">{unlockNotification.description}</p>
          </div>
          <button
            onClick={() => setUnlockNotification(null)}
            className="ml-2 rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </aside>
      )}

      {/* ─── Error Notice ─── */}
      {loadError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => loadAchievements()}
            className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* ─── Top Stats Bar ─── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 font-inter text-white">
        <div className="rounded-2xl border border-white/10 bg-card p-5 shadow-sm">
          <p className="text-xs font-mono uppercase tracking-wider text-white/50">Achievements Unlocked</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-emerald-400">{stats.unlocked}</span>
            <span className="text-xs font-mono text-white/40">of {stats.total} total</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-card p-5 shadow-sm">
          <p className="text-xs font-mono uppercase tracking-wider text-white/50">In Progress</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-amber-400">{stats.inProgress}</span>
            <span className="text-xs font-mono text-white/40">actively progressing</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-card p-5 shadow-sm">
          <p className="text-xs font-mono uppercase tracking-wider text-white/50">Total Milestones</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-white">{stats.total}</span>
            <span className="text-xs font-mono text-white/40">system &amp; custom</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-card p-5 shadow-sm">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-white/50 uppercase tracking-wider">Mastery</span>
            <span className="font-bold text-[#FF4500]">{stats.completionPercentage}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-linear-to-r from-[#FF4500]/60 to-[#FF4500] transition-all duration-700"
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* ─── Section Header with Action ─── */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center text-white font-inter">
        <div>
          <h2 className="text-lg font-bold text-white font-serif">Your Achievements</h2>
          <p className="text-xs text-white/50">
            Real milestone progress tracked automatically from your tasks, goals, and focus sessions.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-[#FF4500] hover:bg-[#FF4500]/90 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#FF4500]/25 transition-all"
        >
          <Plus className="h-4 w-4" />
          Create Custom Achievement
        </button>
      </div>

      {/* ─── Achievements Cards Grid ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 font-inter text-white">
        {achievements.map((ach) => {
          const IconComponent = ICON_MAP[ach.icon] || Trophy;
          const isUnlocked = ach.unlocked;

          return (
            <div
              key={ach.id}
              onClick={() => setSelectedAchievement(ach)}
              className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-5 transition-all bg-card ${
                isUnlocked
                  ? "border-amber-400/40 shadow-lg shadow-amber-500/5 hover:border-amber-400/60"
                  : ach.progress > 0
                  ? "border-[#FF4500]/30 hover:border-[#FF4500]/50"
                  : "border-white/10 opacity-70 hover:opacity-100 hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                      isUnlocked
                        ? "border-amber-400/50 bg-amber-500/15 text-amber-400"
                        : ach.progress > 0
                        ? "border-[#FF4500]/40 bg-[#FF4500]/15 text-[#FF4500]"
                        : "border-white/10 bg-[#0a0a0a] text-white/40"
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white group-hover:text-[#FF4500] transition-colors font-serif">
                        {ach.title}
                      </h3>
                      {ach.isCustom ? (
                        <span className="rounded-full bg-[#FF4500]/10 border border-[#FF4500]/30 px-2 py-0.5 text-[9px] font-mono font-semibold text-[#FF4500]">
                          Custom
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-mono font-semibold text-white/60">
                          System
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-white/50 line-clamp-1">{ach.description}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-mono font-bold ${
                      isUnlocked
                        ? "border border-amber-400/40 bg-amber-400/15 text-amber-400"
                        : ach.progress > 0
                        ? "border border-[#FF4500]/40 bg-[#FF4500]/10 text-[#FF4500]"
                        : "border border-white/10 bg-[#0a0a0a] text-white/40"
                    }`}
                  >
                    {isUnlocked ? "✓ Unlocked" : ach.progress > 0 ? "In Progress" : "Locked"}
                  </span>

                  {ach.isCustom && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleOpenEditModal(ach, e)}
                        title="Edit custom achievement"
                        className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteCustom(ach.id, e)}
                        title="Delete custom achievement"
                        className="rounded-lg p-1.5 text-white/40 hover:bg-rose-500/20 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar & Details */}
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-[11px] font-mono">
                  <span className="text-white/40">
                    {isUnlocked ? "Target achieved" : `Progress: ${ach.progress} / ${ach.target}`}
                  </span>
                  <span className={`font-bold ${isUnlocked ? "text-amber-400" : "text-[#FF4500]"}`}>
                    {ach.percentage}%
                  </span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isUnlocked
                        ? "bg-linear-to-r from-amber-400 to-yellow-300"
                        : "bg-linear-to-r from-[#FF4500]/80 to-[#FF4500]"
                    }`}
                    style={{ width: `${ach.percentage}%` }}
                  />
                </div>

                {isUnlocked && ach.unlockedAt && (
                  <p className="mt-2 text-[10px] text-white/40 font-mono">
                    Unlocked on {new Date(ach.unlockedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Achievement Detail Modal ─── */}
      {selectedAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl text-white font-inter">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
                    selectedAchievement.unlocked
                      ? "border-amber-400/50 bg-amber-500/15 text-amber-400"
                      : "border-white/10 bg-[#0a0a0a] text-white/40"
                  }`}
                >
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-serif">{selectedAchievement.title}</h3>
                  <p className="text-xs text-white/50 font-mono">{selectedAchievement.isCustom ? "Custom Achievement" : "System Milestone"}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAchievement(null)}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3 rounded-xl bg-[#0a0a0a] border border-white/10 p-4 text-xs text-white/70">
              <p className="text-sm font-medium text-white">{selectedAchievement.description}</p>
              
              <div className="border-t border-white/10 pt-3 flex justify-between font-mono">
                <span className="text-white/40">Unlock Condition:</span>
                <span className="font-semibold text-white">Reach {selectedAchievement.target}</span>
              </div>

              <div className="flex justify-between font-mono">
                <span className="text-white/40">Current Progress:</span>
                <span className="font-semibold text-[#FF4500]">{selectedAchievement.progress} / {selectedAchievement.target}</span>
              </div>

              <div className="flex justify-between font-mono">
                <span className="text-white/40">Status:</span>
                <span className={`font-semibold ${selectedAchievement.unlocked ? "text-amber-400" : "text-white/60"}`}>
                  {selectedAchievement.unlocked ? "✓ Achievement Unlocked" : "Keep going — you're almost there!"}
                </span>
              </div>

              {selectedAchievement.unlockedAt && (
                <div className="flex justify-between font-mono">
                  <span className="text-white/40">Unlocked Date:</span>
                  <span className="font-semibold text-white">
                    {new Date(selectedAchievement.unlockedAt).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedAchievement(null)}
                className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create/Edit Custom Achievement Modal ─── */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleFormSubmit}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl space-y-4 text-white font-inter"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-serif">
                {editingAchievement ? "Edit Custom Achievement" : "Create Custom Achievement"}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <div>
              <label className="text-xs font-mono font-medium text-white/70">Achievement Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Study 5 hours this week"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0a0a0a] p-2.5 text-xs text-white shadow-xs outline-none focus:border-[#FF4500] placeholder:text-white/30"
              />
            </div>

            <div>
              <label className="text-xs font-mono font-medium text-white/70">Description</label>
              <textarea
                placeholder="Explain the milestone or habit goal..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="mt-1 w-full min-h-16 rounded-xl border border-white/10 bg-[#0a0a0a] p-2.5 text-xs text-white shadow-xs outline-none focus:border-[#FF4500] resize-none placeholder:text-white/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono font-medium text-white/70">Target Value</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formTarget}
                  onChange={(e) => setFormTarget(parseInt(e.target.value, 10) || 1)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0a0a0a] p-2.5 text-xs text-white shadow-xs outline-none focus:border-[#FF4500]"
                />
              </div>

              {editingAchievement && (
                <div>
                  <label className="text-xs font-mono font-medium text-white/70">Current Progress</label>
                  <input
                    type="number"
                    min="0"
                    value={formProgress}
                    onChange={(e) => setFormProgress(parseInt(e.target.value, 10) || 0)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#0a0a0a] p-2.5 text-xs text-white shadow-xs outline-none focus:border-[#FF4500]"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="rounded-xl px-4 py-2 text-xs text-white/50 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="flex items-center gap-2 rounded-xl bg-[#FF4500] hover:bg-[#FF4500]/90 px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#FF4500]/25 disabled:opacity-50"
              >
                {formSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingAchievement ? "Save Changes" : "Create Milestone"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
