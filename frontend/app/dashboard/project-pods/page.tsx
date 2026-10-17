'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FolderKanban,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Radio,
  Target,
  ShieldAlert,
  AlertTriangle,
  Play,
  LifeBuoy,
  FileText,
  Calendar,
  Layers,
  ChevronRight,
  Loader2,
  CheckSquare,
  Square,
  Activity,
  Trash2,
  Archive,
  LogOut,
  UserX,
} from 'lucide-react';
import { io as socketIO, type Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/useEntitlements';
import {
  fetchCollaborationPods,
  createCollaborationPod,
  fetchCollaborationPodByCode,
  acceptCollaborationPodInvite,
  fetchCollaborationPodDetails,
  createCollaborationPodMilestone,
  updateCollaborationPodMilestone,
  deleteCollaborationPodMilestone,
  createCollaborationPodTask,
  updateCollaborationPodTask,
  deleteCollaborationPodTask,
  removeCollaborationPodMember,
  archiveCollaborationPod,
  launchRoomFromCollaborationPod,
  getApiBaseUrl,
  type ProjectPod,
  type ProjectPodMember,
  type ProjectPodMilestone,
  type ProjectPodTask,
  type ProjectPodActivity,
} from '@/lib/api';

export default function ProjectPodsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const { isPro } = useEntitlements();

  const [pods, setPods] = useState<ProjectPod[]>([]);
  const [selectedPodId, setSelectedPodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Pod Workspace Data
  const [podDetail, setPodDetail] = useState<ProjectPod | null>(null);
  const [members, setMembers] = useState<ProjectPodMember[]>([]);
  const [milestones, setMilestones] = useState<ProjectPodMilestone[]>([]);
  const [tasks, setTasks] = useState<ProjectPodTask[]>([]);
  const [activities, setActivities] = useState<ProjectPodActivity[]>([]);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Task Filter Tab
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'blocked' | 'done'>('all');

  // Create Pod Modal
  const [showCreatePodModal, setShowCreatePodModal] = useState(false);
  const [createPodName, setCreatePodName] = useState('');
  const [createPodDesc, setCreatePodDesc] = useState('');
  const [creatingPod, setCreatingPod] = useState(false);
  const [createPodError, setCreatePodError] = useState<string | null>(null);

  // Add Task Modal
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskMilestone, setNewTaskMilestone] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  // Add Milestone Modal
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDue, setNewMilestoneDue] = useState('');
  const [addingMilestone, setAddingMilestone] = useState(false);

  // Join by code
  const [joinCode, setJoinCode] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Copy feedback
  const [copiedLink, setCopiedLink] = useState(false);

  const socketRef = React.useRef<Socket | null>(null);

  // Socket connection to Pod room for real-time task & milestone sync
  useEffect(() => {
    if (!token || !selectedPodId) return;

    const socket = socketIO(getApiBaseUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_project_pod', { podId: selectedPodId });
    });

    socket.on('pod_task_created', () => {
      loadPodWorkspace(selectedPodId);
    });

    socket.on('pod_task_updated', () => {
      loadPodWorkspace(selectedPodId);
    });

    socket.on('pod_task_deleted', () => {
      loadPodWorkspace(selectedPodId);
    });

    socket.on('pod_milestone_created', () => {
      loadPodWorkspace(selectedPodId);
    });

    socket.on('pod_milestone_updated', () => {
      loadPodWorkspace(selectedPodId);
    });

    socket.on('pod_milestone_deleted', () => {
      loadPodWorkspace(selectedPodId);
    });

    socket.on('pod_activity_logged', () => {
      loadPodWorkspace(selectedPodId);
    });

    return () => {
      socket.emit('leave_project_pod', { podId: selectedPodId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedPodId, token]);

  const loadPods = async (autoSelectId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCollaborationPods();
      if (res.success) {
        setPods(res.pods || []);
        if (res.pods?.length > 0) {
          const targetId = autoSelectId || selectedPodId || res.pods[0].id;
          setSelectedPodId(targetId);
          loadPodWorkspace(targetId);
        } else {
          setSelectedPodId(null);
          setPodDetail(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Project Pods.');
    } finally {
      setLoading(false);
    }
  };

  const loadPodWorkspace = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await fetchCollaborationPodDetails(id);
      if (res.success) {
        setPodDetail(res.pod);
        setMembers(res.members || []);
        setMilestones(res.milestones || []);
        setTasks(res.tasks || []);
        setActivities(res.activities || []);
        setUserRole(res.userRole);
      }
    } catch (err: any) {
      console.error('Failed to load pod workspace:', err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadPods();
  }, []);

  // Handle URL join code
  useEffect(() => {
    const codeParam = searchParams.get('join') || searchParams.get('code');
    if (codeParam) {
      setJoinCode(codeParam);
      handleJoinByCode(codeParam);
    }
  }, [searchParams]);

  const handleJoinByCode = async (codeToUse?: string) => {
    const code = (codeToUse || joinCode).trim();
    if (!code) return;
    try {
      setJoiningCode(true);
      setJoinError(null);
      const res = await acceptCollaborationPodInvite(code);
      if (res.success) {
        setJoinCode('');
        await loadPods(res.podId);
      }
    } catch (err: any) {
      setJoinError(err.message || 'Invalid or full Project Pod invitation.');
    } finally {
      setJoiningCode(false);
    }
  };

  const handleCreatePod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createPodName.trim()) return;
    try {
      setCreatingPod(true);
      setCreatePodError(null);
      const res = await createCollaborationPod({
        name: createPodName.trim(),
        description: createPodDesc.trim() || undefined,
      });
      if (res.success && res.pod) {
        setShowCreatePodModal(false);
        setCreatePodName('');
        setCreatePodDesc('');
        await loadPods(res.pod.id);
      }
    } catch (err: any) {
      setCreatePodError(err.message || 'Failed to create Project Pod.');
    } finally {
      setCreatingPod(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPodId || !newTaskTitle.trim()) return;
    try {
      setAddingTask(true);
      const res = await createCollaborationPodTask(selectedPodId, {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || undefined,
        milestoneId: newTaskMilestone || undefined,
        assignedToUserId: newTaskAssignee || undefined,
        priority: newTaskPriority,
        dueDate: newTaskDue || undefined,
      });
      if (res.success) {
        setShowAddTaskModal(false);
        setNewTaskTitle('');
        setNewTaskDesc('');
        await loadPodWorkspace(selectedPodId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create task.');
    } finally {
      setAddingTask(false);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPodId || !newMilestoneTitle.trim()) return;
    try {
      setAddingMilestone(true);
      const res = await createCollaborationPodMilestone(selectedPodId, {
        title: newMilestoneTitle.trim(),
        dueDate: newMilestoneDue || undefined,
      });
      if (res.success) {
        setShowAddMilestoneModal(false);
        setNewMilestoneTitle('');
        setNewMilestoneDue('');
        await loadPodWorkspace(selectedPodId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create milestone.');
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleToggleTaskStatus = async (task: ProjectPodTask) => {
    if (!selectedPodId) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await updateCollaborationPodTask(selectedPodId, task.id, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus, is_blocked: false } : t))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update task.');
    }
  };

  const handleLaunchRoomForPod = async (taskId?: string) => {
    if (!selectedPodId) return;
    try {
      const res = await launchRoomFromCollaborationPod(selectedPodId, { taskId });
      if (res.success && res.room) {
        router.push(`/dashboard/focus-rooms/${res.room.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to launch room.');
    }
  };

  const copyInvite = () => {
    if (!podDetail) return;
    const url = `${window.location.origin}/dashboard/project-pods?join=${podDetail.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedPodId) return;
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteCollaborationPodTask(selectedPodId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete task.');
    }
  };

  const handleToggleMilestone = async (m: ProjectPodMilestone) => {
    if (!selectedPodId) return;
    const nextCompleted = !m.is_completed;
    try {
      await updateCollaborationPodMilestone(selectedPodId, m.id, { isCompleted: nextCompleted });
      setMilestones((prev) =>
        prev.map((item) => (item.id === m.id ? { ...item, is_completed: nextCompleted } : item))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update milestone.');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!selectedPodId) return;
    if (!confirm('Delete this milestone?')) return;
    try {
      await deleteCollaborationPodMilestone(selectedPodId, milestoneId);
      setMilestones((prev) => prev.filter((item) => item.id !== milestoneId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete milestone.');
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!selectedPodId) return;
    const isMe = memberUserId === user?.id;
    if (!confirm(isMe ? 'Are you sure you want to leave this Pod?' : 'Remove this member from Pod?')) return;
    try {
      await removeCollaborationPodMember(selectedPodId, memberUserId);
      if (isMe) {
        await loadPods();
      } else {
        await loadPodWorkspace(selectedPodId);
      }
    } catch (err: any) {
      alert(err.message || 'Operation failed.');
    }
  };

  const handleArchivePod = async () => {
    if (!selectedPodId || userRole !== 'owner') return;
    if (!confirm('Are you sure you want to archive this Project Pod?')) return;
    try {
      const res = await archiveCollaborationPod(selectedPodId);
      if (res.success) {
        await loadPods();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to archive pod.');
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (taskStatusFilter === 'all') return tasks;
    if (taskStatusFilter === 'blocked') return tasks.filter((t) => t.is_blocked || t.status === 'blocked');
    return tasks.filter((t) => t.status === taskStatusFilter);
  }, [tasks, taskStatusFilter]);

  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const blockedCount = tasks.filter((t) => t.is_blocked || t.status === 'blocked').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-8 font-inter text-white pb-16">
      {/* Top Banner */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#FF4500]/15 via-[#0a0a0a] to-[#0a0a0a] p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF4500]">
            <FolderKanban className="w-4 h-4" />
            <span>PROJECT PODS</span>
            <span className="text-[10px] bg-[#FF4500]/20 text-[#FF4500] px-2 py-0.5 rounded-full font-medium">
              Collaborative Workspace
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Focused Team Workspaces
          </h1>
          <p className="text-sm text-gray-400 max-w-xl">
            Lightweight milestone tracking, collaborative task boards, and one-click Focus Rooms for small teams and partners.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setShowCreatePodModal(true)}
            className="flex items-center gap-2 bg-[#FF4500] hover:bg-[#ff5722] text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-[#FF4500]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Pod</span>
          </button>
        </div>
      </div>

      {/* Join Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-2xl border border-white/10 bg-[#0e0e12]">
        <span className="text-xs font-semibold text-gray-300 shrink-0">Have a Pod invite code?</span>
        <div className="flex items-center gap-2 w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Enter Pod code..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500]"
          />
          <button
            onClick={() => handleJoinByCode()}
            disabled={joiningCode || !joinCode.trim()}
            className="bg-white/10 hover:bg-white/15 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {joiningCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Join'}
          </button>
        </div>
        {joinError && <span className="text-xs text-red-400">{joinError}</span>}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
          <div className="md:col-span-2 h-64 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
        </div>
      ) : pods.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-white/10 bg-[#0e0e12] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-gray-400">
            <FolderKanban className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No Project Pods Yet</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Create a Project Pod for your client project, app build, hackathon team, or collaborative venture.
            </p>
          </div>
          <button
            onClick={() => setShowCreatePodModal(true)}
            className="inline-flex items-center gap-2 bg-[#FF4500] hover:bg-[#ff5722] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-[#FF4500]/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Your First Pod</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Pods List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                My Pods ({pods.length})
              </span>
              <button
                onClick={() => setShowCreatePodModal(true)}
                className="text-[11px] text-[#FF4500] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> New
              </button>
            </div>

            <div className="space-y-2">
              {pods.map((p) => {
                const isSelected = p.id === selectedPodId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPodId(p.id);
                      loadPodWorkspace(p.id);
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#FF4500]/50 bg-[#FF4500]/10 shadow-lg shadow-[#FF4500]/10'
                        : 'border-white/10 bg-[#0e0e12] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white line-clamp-1">{p.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {p.member_count || 1} members
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{p.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500 font-mono">
                      <span>{p.task_count || 0} tasks</span>
                      <span>•</span>
                      <span>{p.completed_task_count || 0} done</span>
                      {(p.blocked_task_count || 0) > 0 && (
                        <span className="text-red-400 font-bold">• {p.blocked_task_count} blocked</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Pod Workspace */}
          <div className="lg:col-span-2 space-y-6">
            {detailLoading || !podDetail ? (
              <div className="h-96 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
            ) : (
              <div className="space-y-6">
                {/* Pod Header Card */}
                <div className="p-6 rounded-3xl border border-white/10 bg-[#0e0e12] shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-white">{podDetail.name}</h2>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          {podDetail.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {podDetail.description || 'Collaborative Workspace'} • Owner: {podDetail.owner_name}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={copyInvite}
                        className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold px-3 py-2 rounded-xl border border-white/10 transition-all cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied' : 'Invite'}</span>
                      </button>

                      <button
                        onClick={() => handleLaunchRoomForPod()}
                        className="flex items-center gap-1.5 bg-[#FF4500] hover:bg-[#ff5722] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md shadow-[#FF4500]/20 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Launch Pod Room</span>
                      </button>

                      {userRole === 'owner' ? (
                        <button
                          onClick={handleArchivePod}
                          title="Archive Project Pod"
                          className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/10 transition-colors cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => user?.id && handleRemoveMember(user.id)}
                          title="Leave Project Pod"
                          className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/10 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-400">Project Progress</span>
                      <span className="text-[#FF4500] font-mono">{progressPercent}% Completed</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#FF4500] to-emerald-400 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Members Pill Row */}
                  <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-gray-500 font-semibold mr-1">Members ({members.length}):</span>
                    {members.map((m) => (
                      <span
                        key={m.id || m.user_id}
                        className="inline-flex items-center gap-1.5 text-xs text-gray-300 bg-white/5 px-2.5 py-1 rounded-xl border border-white/5"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#FF4500]" />
                        <span>{m.name || 'Member'}</span>
                        {m.role === 'owner' && <span className="text-[9px] text-[#FF4500] font-bold">Owner</span>}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Blocked Tasks Alert Banner */}
                {blockedCount > 0 && (
                  <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-red-400">
                          {blockedCount} Task{blockedCount > 1 ? 's are' : ' is'} Blocked
                        </h4>
                        <p className="text-[11px] text-gray-300">
                          Need help moving forward? Launch an Unblock Exchange request to get unstuck.
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/unblock-exchange?podId=${selectedPodId}`}
                      className="inline-flex items-center gap-1 text-xs font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-xl border border-red-500/30 shrink-0 transition-colors"
                    >
                      <LifeBuoy className="w-3.5 h-3.5" />
                      <span>Unblock Exchange</span>
                    </Link>
                  </div>
                )}

                {/* Milestones Card */}
                <div className="p-6 rounded-3xl border border-white/10 bg-[#0e0e12] shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#FF4500]" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Milestones ({milestones.length})
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowAddMilestoneModal(true)}
                      className="text-xs text-[#FF4500] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Milestone
                    </button>
                  </div>

                  {milestones.length === 0 ? (
                    <p className="text-xs text-gray-500 py-3 text-center">No milestones added yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {milestones.map((m) => {
                        const isDone = m.is_completed;
                        return (
                          <div
                            key={m.id}
                            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                              isDone
                                ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                                : 'bg-white/[0.02] border border-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                onClick={() => handleToggleMilestone(m)}
                                className="text-gray-400 hover:text-white shrink-0 cursor-pointer"
                              >
                                {isDone ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                              <div className="space-y-0.5 min-w-0">
                                <span className={`text-xs font-bold line-clamp-1 ${isDone ? 'line-through text-gray-400' : 'text-white'}`}>
                                  {m.title}
                                </span>
                                {m.due_date && (
                                  <span className="text-[10px] text-gray-400 font-mono block">
                                    Due: {new Date(m.due_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleLaunchRoomForPod()}
                                title="Launch room for milestone"
                                className="text-gray-400 hover:text-[#FF4500] p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                              <button
                                onClick={() => handleDeleteMilestone(m.id)}
                                title="Delete milestone"
                                className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Collaborative Tasks Board */}
                <div className="p-6 rounded-3xl border border-white/10 bg-[#0e0e12] shadow-xl space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white">Pod Tasks ({tasks.length})</h3>
                      <p className="text-xs text-gray-400">Assigned collaborative work items</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAddTaskModal(true)}
                        className="flex items-center gap-1.5 bg-[#FF4500] hover:bg-[#ff5722] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md shadow-[#FF4500]/20 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  </div>

                  {/* Status Filter Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                    {(['all', 'todo', 'in_progress', 'blocked', 'done'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setTaskStatusFilter(st)}
                        className={`px-3 py-1 rounded-xl capitalize font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          taskStatusFilter === st
                            ? 'bg-white/15 text-white'
                            : 'text-gray-400 hover:text-white bg-white/5'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Task Items List */}
                  {filteredTasks.length === 0 ? (
                    <p className="text-xs text-gray-500 py-6 text-center">No tasks in this category.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredTasks.map((t) => {
                        const isDone = t.status === 'done';
                        const isBlocked = t.is_blocked || t.status === 'blocked';

                        return (
                          <div
                            key={t.id}
                            className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                              isDone
                                ? 'border-emerald-500/20 bg-emerald-500/[0.02] opacity-75'
                                : isBlocked
                                ? 'border-red-500/30 bg-red-500/[0.03]'
                                : 'border-white/10 bg-white/[0.02]'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <button
                                onClick={() => handleToggleTaskStatus(t)}
                                className="mt-0.5 text-gray-400 hover:text-white cursor-pointer"
                              >
                                {isDone ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>

                              <div className="space-y-1 min-w-0">
                                <span
                                  className={`text-xs font-bold ${
                                    isDone ? 'line-through text-gray-400' : 'text-white'
                                  }`}
                                >
                                  {t.title}
                                </span>
                                {t.description && (
                                  <p className="text-[11px] text-gray-400 line-clamp-1">{t.description}</p>
                                )}
                                {t.blocker_reason && (
                                  <p className="text-[11px] text-red-400 font-semibold pt-0.5">
                                    Blocker: {t.blocker_reason}
                                  </p>
                                )}

                                <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-gray-500 font-mono">
                                  {t.assigned_user_name && (
                                    <span className="text-gray-300">Assignee: {t.assigned_user_name}</span>
                                  )}
                                  <span className="uppercase text-amber-400">{t.priority}</span>
                                  {t.due_date && (
                                    <span>Due: {new Date(t.due_date).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isBlocked && (
                                <Link
                                  href={`/dashboard/unblock-exchange?podId=${selectedPodId}&taskId=${t.id}&title=${encodeURIComponent(t.title)}`}
                                  className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                >
                                  Ask Unblock
                                </Link>
                              )}
                              <button
                                onClick={() => handleLaunchRoomForPod(t.id)}
                                title="Sprint on this task in Focus Room"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-[#FF4500] cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                title="Delete task"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Activity Feed */}
                <div className="p-6 rounded-3xl border border-white/10 bg-[#0e0e12] shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <Activity className="w-4 h-4 text-[#FF4500]" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Recent Activity
                    </h3>
                  </div>

                  {activities.length === 0 ? (
                    <p className="text-xs text-gray-500 py-3 text-center">No activity recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {activities.map((act) => (
                        <div
                          key={act.id}
                          className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0"
                        >
                          <span className="text-gray-300">
                            <strong className="text-white">{act.user_name || 'Member'}</strong>{' '}
                            {act.action.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Add Pod Task</h3>
              <button onClick={() => setShowAddTaskModal(false)} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional details or context..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Assignee</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-xs text-white outline-none focus:border-[#FF4500]"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.name || 'Member'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-xs text-white outline-none focus:border-[#FF4500]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Milestone</label>
                  <select
                    value={newTaskMilestone}
                    onChange={(e) => setNewTaskMilestone(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-xs text-white outline-none focus:border-[#FF4500]"
                  >
                    <option value="">None</option>
                    {milestones.map((ms) => (
                      <option key={ms.id} value={ms.id}>
                        {ms.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-xs text-white outline-none focus:border-[#FF4500]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingTask}
                  className="bg-[#FF4500] hover:bg-[#ff5722] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-[#FF4500]/20 disabled:opacity-50"
                >
                  {addingTask ? 'Saving...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {showAddMilestoneModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Add Shared Milestone</h3>
              <button onClick={() => setShowAddMilestoneModal(false)} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Milestone Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Beta Release, Midterm Exam, Prototype Complete..."
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Target Deadline</label>
                <input
                  type="date"
                  value={newMilestoneDue}
                  onChange={(e) => setNewMilestoneDue(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-xs text-white outline-none focus:border-[#FF4500]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMilestoneModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMilestone}
                  className="bg-[#FF4500] hover:bg-[#ff5722] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-[#FF4500]/20 disabled:opacity-50"
                >
                  {addingMilestone ? 'Saving...' : 'Add Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Pod Modal */}
      {showCreatePodModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Create Project Pod</h3>
              <button onClick={() => setShowCreatePodModal(false)} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePod} className="space-y-4">
              {createPodError && (
                <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
                  {createPodError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Pod Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FocusFlow Mobile, AI Thesis, Design System..."
                  value={createPodName}
                  onChange={(e) => setCreatePodName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="What is this team working toward?"
                  value={createPodDesc}
                  onChange={(e) => setCreatePodDesc(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#FF4500]"
                />
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] text-gray-400">
                {isPro ? (
                  <span>Pro plan: Own up to 10 active Pods with up to 10 members each.</span>
                ) : (
                  <span>Free plan: Own 1 active Pod with up to 3 members. Upgrade to Pro for 10 Pods.</span>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePodModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPod}
                  className="bg-[#FF4500] hover:bg-[#ff5722] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-[#FF4500]/20 disabled:opacity-50"
                >
                  {creatingPod ? 'Creating...' : 'Create Pod'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
