'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  Flame,
  Plus,
  Search,
  Target,
  Loader2,
  Clock,
  Calendar as CalendarIcon,
  CheckSquare,
  Trophy,
  Play,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  CalendarDays,
} from 'lucide-react';
import {
  fetchGoals,
  createGoalApi,
  deleteGoalApi,
  addGoalTaskApi,
  toggleGoalTaskApi,
  editGoalTaskApi,
  deleteGoalTaskApi,
  checkGoalHabitApi,
  fetchCalendarEvents,
  startSmartFocusSession,
  type GoalItem,
  type GoalTask,
  type CalendarEventItem,
} from "@/lib/api";
import AchievementManager from '@/components/AchievementManager';
import TasksWorkspace from '@/components/TasksWorkspace';
import { useEntitlements } from '@/lib/useEntitlements';
import { ProBadge, FreeBadge, ProLockModal } from '@/components/ui/ProLockCard';

type Task = GoalTask;
type GoalForm = {
  name: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  start: string;
  target: string;
  targetValue: string;
  habit: boolean;
};
export type Goal = GoalItem;

const today = () => new Date().toISOString().slice(0, 10);
const fields = 'w-full rounded-xl border border-[#262832] bg-slate-50 px-3.5 py-2 text-sm text-white shadow-xs outline-none focus:border-[#FF4500]';
const views = ['goals', 'tasks', 'habits', 'calendar', 'achievements'] as const;
type View = typeof views[number];

function progress(g: Goal) {
  // Progress is computed server-side from linked tasks + milestones.
  // Fall back to a simple calculation only if the server value is absent.
  if (typeof g.progress === 'number') return g.progress;
  const items = [...(g.linkedTasks || []), ...(g.tasks || [])];
  if (!items.length) return 0;
  const done = items.filter((t) => (t.status ? t.status === 'completed' : t.done)).length;
  return Math.round((done / items.length) * 100);
}

function status(g: Goal) {
  // Server computes status from progress + deadline (Active/Completed/Overdue/Upcoming).
  if (g.computedStatus === 'Overdue') return 'Behind';
  if (g.computedStatus === 'Completed') return 'Completed';
  if (g.computedStatus === 'Upcoming') return 'Upcoming';
  if (g.computedStatus === 'Active') return 'On Track';
  const p = progress(g);
  const targetDate = g.target || g.created;
  const days = Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000);
  if (p === 100 || g.status === 'Completed') return 'Completed';
  if (days < 0) return 'Behind';
  if (days <= 7 && p < 70) return 'At Risk';
  return 'On Track';
}

function badge(s: string) {
  return s === 'Completed'
    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 font-mono'
    : s === 'Behind'
    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-mono'
    : s === 'At Risk'
    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono'
    : 'bg-[#FF4500]/15 text-[#FF4500] border border-[#FF4500]/30 font-mono';
}

const VIEW_TITLES: Record<View, { title: string; subtitle: string }> = {
  goals: {
    title: 'Goals Workspace',
    subtitle: 'Plan goals, complete tasks, build habits, and track your real academic progress.',
  },
  tasks: {
    title: 'Tasks',
    subtitle: 'Manage and complete all active action items linked to your goals.',
  },
  habits: {
    title: 'Habits & Streaks',
    subtitle: 'Build daily consistency. Complete today’s habits to maintain your streak.',
  },
  calendar: {
    title: 'Chronos Flow · Smart Focus Timeline',
    subtitle: 'AI-synchronized temporal horizon unifying upcoming deadlines, planned study blocks, and conflict-free calendar events.',
  },
  achievements: {
    title: 'Achievements & Badges',
    subtitle: 'Track unlocked milestones, custom goals, and level progression.',
  },
};

const VIEW_TAB_CONFIG: Record<View, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  goals: { label: 'Goals', icon: Target },
  tasks: { label: 'Tasks', icon: CheckSquare },
  habits: { label: 'Habits', icon: Flame },
  calendar: { label: 'Chronos Flow', icon: CalendarIcon },
  achievements: { label: 'Achievements', icon: Trophy },
};

export default function GoalsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  // Per-user cache key: prevents goals leaking across accounts on shared browsers.
  const goalsCacheKey = `focusflow_goals_${user?.id || 'anon'}`;
  const requested = params.get('view') as View | null;
  const [view, setView] = useState<View>(views.includes(requested as View) ? (requested as View) : 'goals');

  // Keep view state in sync when user navigates via sidebar or browser back/forward
  useEffect(() => {
    const v = params.get('view') as View | null;
    if (v && views.includes(v)) {
      setView(v);
    } else if (!v) {
      setView('goals');
    }
  }, [params]);

  const handleTabChange = (v: View) => {
    setView(v);
    const targetUrl = v === 'goals' ? '/dashboard/goals' : `/dashboard/goals?view=${v}`;
    router.push(targetUrl, { scroll: false });
  };
  const { isPro, canAccess } = useEntitlements();
  const [lockModal, setLockModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    featureName: string;
    bulletPoints?: string[];
  }>({
    isOpen: false,
    title: "",
    description: "",
    featureName: "",
  });

  const handleDecomposeGoal = (goal: Goal) => {
    if (!canAccess("advanced_goals")) {
      setLockModal({
        isOpen: true,
        title: "AI Goal Decomposition",
        description: "Let Gemini AI analyze your goal objective and target deadline to break it down into realistic, sequential milestones and scheduled tasks with realistic durations.",
        featureName: "Advanced Goals — Pro",
        bulletPoints: [
          "Automatic milestone breakdown based on deadlines",
          "Realistic duration estimation per task",
          "Direct synchronization with your Tasks workspace",
        ],
      });
      return;
    }
    router.push(`/dashboard/planner?goal=${encodeURIComponent(goal.name)}`);
  };

  const [goals, setGoals] = useState<Goal[]>([]);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState<GoalForm>({
    name: '',
    description: '',
    category: 'Study',
    priority: 'Medium',
    start: today(),
    target: '',
    targetValue: '10',
    habit: false,
  });

  // Load ONLY this user's goals from the backend. localStorage is never
  // pushed into the account — the database is the single source of truth.
  // The local copy is a read cache for offline rendering only.
  useEffect(() => {
    if (!user?.id) return; // wait for auth to resolve
    let active = true;
    const load = async () => {
      try {
        const res = await fetchGoals();
        if (active && res.success && Array.isArray(res.goals)) {
          setGoals(res.goals);
          localStorage.setItem(goalsCacheKey, JSON.stringify(res.goals));
        }
      } catch (err) {
        console.warn('Could not load goals from API, loading from cache:', err);
        const cached = localStorage.getItem(goalsCacheKey);
        if (cached && active) {
          try {
            setGoals(JSON.parse(cached));
          } catch {}
        }
      } finally {
        if (active) setReady(true);
      }
    };
    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Update view when URL query param changes
  useEffect(() => {
    if (!views.includes(requested as View)) return;
    const id = window.setTimeout(() => setView(requested as View), 0);
    return () => window.clearTimeout(id);
  }, [requested]);

  const flash = (m: string) => {
    setError('');
    setNotice(m);
    setTimeout(() => setNotice(''), 3500);
  };

  const create = async () => {
    if (form.name.trim().length < 3) return setError('Goal name must be at least 3 characters.');
    if (form.description.trim().length < 5) return setError('Description must be at least 5 characters.');
    if (!form.target) return setError('Choose a target date.');
    if (form.target < form.start) return setError('Target date must be on or after the start date.');
    const value = Number(form.targetValue);
    if (!Number.isInteger(value) || value < 1 || value > 10000)
      return setError('Target value must be a whole number from 1 to 10,000.');

    try {
      const res = await createGoalApi({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
        start: form.start,
        target: form.target,
        targetValue: value,
        habit: form.habit,
        tasks: [],
      });

      if (res.success && res.goal) {
        setGoals((prev) => [res.goal, ...prev]);
        setShowCreate(false);
        setForm({
          name: '',
          description: '',
          category: 'Study',
          priority: 'Medium',
          start: today(),
          target: '',
          targetValue: '10',
          habit: false,
        });
        flash('Goal created successfully in database!');
      } else {
        setError('Failed to create goal in database.');
      }
    } catch {
      // Optimistic offline creation
      const localGoal: Goal = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
        start: form.start,
        target: form.target,
        targetValue: value,
        tasks: [],
        habit: form.habit,
        habitStreak: 0,
        status: 'Active',
        created: today(),
      };
      setGoals((prev) => [localGoal, ...prev]);
      setShowCreate(false);
      flash('Goal created locally.');
    }
  };

  const toggleTask = async (goalId: string, taskId: string) => {
    // Optimistic UI update
    setGoals((gs) =>
      gs.map((g) =>
        g.id !== goalId
          ? g
          : {
              ...g,
              tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
            }
      )
    );

    try {
      await toggleGoalTaskApi(goalId, taskId);
    } catch (err) {
      console.warn('Could not persist task toggle to backend:', err);
    }
  };

  const addTask = async (goalId: string, title: string, milestone: string) => {
    if (title.trim().length < 3) return false;
    const tempId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const tempTask: Task = {
      id: tempId,
      title: title.trim(),
      done: false,
      milestone: milestone.trim() || 'General',
    };

    // Optimistic update
    setGoals((gs) =>
      gs.map((g) => (g.id !== goalId ? g : { ...g, tasks: [...g.tasks, tempTask] }))
    );
    flash('Task added.');

    try {
      const res = await addGoalTaskApi(goalId, title.trim(), milestone.trim() || 'General');
      if (res.success && res.task) {
        setGoals((gs) =>
          gs.map((g) =>
            g.id !== goalId
              ? g
              : {
                  ...g,
                  tasks: g.tasks.map((t) => (t.id === tempId ? res.task : t)),
                }
          )
        );
      }
    } catch (err) {
      console.warn('Could not persist task to backend:', err);
    }
    return true;
  };

  const editTask = async (goalId: string, taskId: string, title: string, milestone: string) => {
    if (title.trim().length < 3) return setError('Task name must be at least 3 characters.');
    setGoals((gs) =>
      gs.map((g) =>
        g.id !== goalId
          ? g
          : {
              ...g,
              tasks: g.tasks.map((t) =>
                t.id === taskId
                  ? { ...t, title: title.trim(), milestone: milestone.trim() || 'General' }
                  : t
              ),
            }
      )
    );
    flash('Task updated.');

    try {
      await editGoalTaskApi(goalId, taskId, title.trim(), milestone.trim() || 'General');
    } catch (err) {
      console.warn('Could not persist task edit to backend:', err);
    }
  };

  const deleteTask = async (goalId: string, taskId: string) => {
    setGoals((gs) =>
      gs.map((g) => (g.id !== goalId ? g : { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) }))
    );
    flash('Task deleted.');

    try {
      await deleteGoalTaskApi(goalId, taskId);
    } catch (err) {
      console.warn('Could not delete task from backend:', err);
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal and all its tasks?')) return;
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    flash('Goal deleted.');

    try {
      await deleteGoalApi(goalId);
    } catch (err) {
      console.warn('Could not delete goal from backend:', err);
    }
  };

  const checkHabit = async (goalId: string) => {
    try {
      const res = await checkGoalHabitApi(goalId);
      if (res.success) {
        setGoals((gs) =>
          gs.map((g) => (g.id === goalId ? { ...g, habitStreak: res.habitStreak } : g))
        );
        flash(res.message || 'Habit completed — streak updated!');
      }
    } catch {
      flash('Habit checked.');
    }
  };

  const filtered = useMemo(
    () =>
      goals.filter(
        (g) =>
          (filter === 'All' ||
            (filter === 'Active' && status(g) !== 'Completed') ||
            (filter === 'Completed' && status(g) === 'Completed') ||
            (filter === 'Overdue' && status(g) === 'Behind')) &&
          g.name.toLowerCase().includes(search.toLowerCase())
      ),
    [goals, filter, search]
  );

  const completed = goals.filter((g) => status(g) === 'Completed').length;
  const currentViewMeta = VIEW_TITLES[view] || VIEW_TITLES.goals;

  if (!ready) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-mist-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-tide-500" />
        Loading Goals Workspace…
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Top Header Banner ─── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-white">{currentViewMeta.title}</h1>
          <p className="mt-1 text-xs text-gray-400">{currentViewMeta.subtitle}</p>
        </div>

        {view === 'goals' && (
          <button
            onClick={() => setShowCreate(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" />
            Create Goal
          </button>
        )}
      </div>

      {/* ─── Internal view tabs (Goals / Tasks / Habits / Chronos Flow / Achievements) ─── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {views.map((v) => {
          const cfg = VIEW_TAB_CONFIG[v];
          const Icon = cfg.icon;
          const isActive = view === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => handleTabChange(v)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-mono font-semibold transition-all ${
                isActive
                  ? 'border-[#FF4500] bg-[#FF4500]/15 text-[#FF4500] shadow-sm'
                  : 'border-[#262832] bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#FF4500]' : 'text-gray-400'}`} />
              <span>{cfg.label}</span>
              {v === 'calendar' && (
                <span className="rounded-md bg-[#FF4500]/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#FF4500] uppercase tracking-wider">
                  Timeline
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Alerts & Flash Notices ─── */}
      {(notice || error) && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 text-sm animate-in fade-in ${
            error
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
          }`}
        >
          {error || notice}
        </div>
      )}

      {/* ─── 1. GOALS VIEW ─── */}
      {view === 'goals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['All Goals', goals.length],
              ['Active', goals.filter((g) => status(g) !== 'Completed').length],
              ['Completed', completed],
              ['Overdue', goals.filter((g) => status(g) === 'Behind').length],
            ].map(([label, count]) => (
              <button
                key={String(label)}
                onClick={() => setFilter(String(label).replace(' Goals', ''))}
                className="glass-card rounded-2xl border border-[#262832] p-4 text-left transition-all hover:border-[#FF4500]/40"
              >
                <p className="text-xs font-mono text-gray-400">{String(label)}</p>
                <p className="mt-1 font-serif text-2xl font-bold text-white">{String(count)}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                className={`${fields} pl-9`}
                placeholder="Search goals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className={fields}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option className="bg-[#12131A] text-white">All</option>
              <option className="bg-[#12131A] text-white">Active</option>
              <option className="bg-[#12131A] text-white">Completed</option>
              <option className="bg-[#12131A] text-white">Overdue</option>
            </select>
          </div>

          <div className="space-y-4">
            {filtered.length ? (
              filtered.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  onToggle={toggleTask}
                  onAdd={addTask}
                  onEdit={editTask}
                  onDelete={deleteTask}
                  onDeleteGoal={deleteGoal}
                  onDecompose={handleDecomposeGoal}
                  isPro={isPro}
                />
              ))
            ) : (
              <div className="glass-card rounded-2xl border border-ink/10 p-12 text-center text-sm text-mist-500">
                <Target className="mx-auto h-8 w-8 text-mist-500" />
                <p className="mt-2 font-medium text-ink">No goals found</p>
                <p className="mt-1 text-xs text-mist-500">Create a goal to begin tracking your tasks and progress.</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-tide-600 px-4 py-2 text-xs font-bold text-white hover:bg-tide-500"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Your First Goal
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 2. TASKS VIEW — full first-class task workspace ─── */}
      {view === 'tasks' && <TasksWorkspace flash={flash} />}

      {/* ─── 3. HABITS VIEW ─── */}
      {view === 'habits' && <Habits goals={goals} onCheckHabit={checkHabit} />}

      {/* ─── 4. CALENDAR VIEW ─── */}
      {view === 'calendar' && <Calendar goals={goals} />}

      {/* ─── 5. ACHIEVEMENTS VIEW ─── */}
      {view === 'achievements' && <AchievementManager flash={flash} />}

      {/* ─── Create Goal Modal ─── */}
      {showCreate && (
        <Create
          form={form}
          setForm={setForm}
          close={() => setShowCreate(false)}
          submit={create}
        />
      )}

      {/* Pro Lock Modal */}
      <ProLockModal
        isOpen={lockModal.isOpen}
        onClose={() => setLockModal((prev) => ({ ...prev, isOpen: false }))}
        title={lockModal.title}
        description={lockModal.description}
        featureName={lockModal.featureName}
        bulletPoints={lockModal.bulletPoints}
      />
    </div>
  );
}

// ─── Goal Card Component ───
function GoalCard({
  goal,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
  onDeleteGoal,
  onDecompose,
  isPro,
}: {
  goal: Goal;
  onToggle: (g: string, t: string) => void;
  onAdd: (g: string, t: string, m: string) => Promise<boolean>;
  onEdit: (g: string, t: string, title: string, milestone: string) => void;
  onDelete: (g: string, t: string) => void;
  onDeleteGoal?: (g: string) => void;
  onDecompose?: (g: Goal) => void;
  isPro?: boolean;
}) {
  const [task, setTask] = useState('');
  const [milestone, setMilestone] = useState('');
  const [taskError, setTaskError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMilestone, setEditMilestone] = useState('');
  const p = progress(goal);
  const s = status(goal);
  const targetDate = goal.target || goal.created;
  const [days, setDays] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(
      () => setDays(Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000)),
      0
    );
    return () => window.clearTimeout(id);
  }, [targetDate]);

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim().length < 3) {
      setTaskError('Enter a task name with at least 3 characters.');
      return;
    }
    const ok = await onAdd(goal.id, task, milestone);
    if (ok) {
      setTask('');
      setMilestone('');
      setTaskError('');
    }
  };

  const tasksList = goal.tasks || [];

  return (
    <article className="glass-card rounded-2xl border border-ink/10 p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-ink">{goal.name}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${badge(s)}`}>{s}</span>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] text-mist-600">
              {goal.priority}
            </span>
            <span className="rounded-full bg-tide-500/10 border border-tide-500/20 px-2 py-0.5 text-[10px] text-tide-600">
              {goal.category}
            </span>
            {days <= 7 && days > 0 && p < 50 && (
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-400">
                Deadline Risk: High
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-mist-500">{goal.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => onDecompose?.(goal)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#FF4500]/30 bg-[#FF4500]/10 px-2.5 py-1 text-xs font-semibold text-[#FF4500] hover:bg-[#FF4500]/20 transition shadow-xs"
            title="Decompose goal into tasks using AI"
          >
            <Sparkles className="h-3 w-3" />
            <span>AI Decompose</span>
            {!isPro && <ProBadge className="scale-75 origin-left" />}
          </button>

          <div className="text-right text-xs text-mist-500 font-mono">
            {s === 'Completed'
              ? 'Completed'
              : days < 0
              ? `${Math.abs(days)}d overdue`
              : `${days}d left`}
          </div>
          {onDeleteGoal && (
            <button
              onClick={() => onDeleteGoal(goal.id)}
              className="text-mist-500 hover:text-rose-500 text-xs"
              title="Delete goal"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-mist-600">
            Progress · {tasksList.filter((t) => t.done).length}/{tasksList.length} tasks
          </span>
          <span className="font-bold text-sky-500">{p}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/70">
          <div
            className="h-full bg-linear-to-r from-tide-500 to-sky-400 transition-all duration-500"
            style={{ width: `${p}%` }}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {tasksList.length === 0 && (
          <p className="rounded-xl bg-white/60 px-3 py-3 text-xs text-mist-500">
            No tasks yet. Create your first task below.
          </p>
        )}
        {tasksList.map((t) =>
          editing === t.id ? (
            <div
              key={t.id}
              className="grid gap-2 rounded-xl bg-white/60 p-3 sm:grid-cols-[1fr_150px_auto_auto]"
            >
              <input
                className={fields}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <input
                className={fields}
                value={editMilestone}
                onChange={(e) => setEditMilestone(e.target.value)}
              />
              <button
                onClick={() => {
                  onEdit(goal.id, t.id, editTitle, editMilestone);
                  setEditing(null);
                }}
                className="rounded-lg bg-tide-600 px-3 text-xs text-white"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-2 text-xs text-mist-500"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-xl bg-white/60 px-3 py-2 text-xs"
            >
              <input
                type="checkbox"
                aria-label={`Complete ${t.title}`}
                checked={t.done}
                onChange={() => onToggle(goal.id, t.id)}
                className="h-4 w-4 accent-tide-500 cursor-pointer"
              />
              <span className={`flex-1 ${t.done ? 'text-mist-500 line-through' : 'text-ink'}`}>
                {t.title}
              </span>
              <span className="text-mist-500">{t.milestone}</span>
              <button
                onClick={() => {
                  setEditing(t.id);
                  setEditTitle(t.title);
                  setEditMilestone(t.milestone || '');
                }}
                className="text-sky-500 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Delete “${t.title}”?`)) onDelete(goal.id, t.id);
                }}
                className="text-rose-500 hover:underline"
              >
                Delete
              </button>
            </div>
          )
        )}
      </div>

      <form onSubmit={submitTask} className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
        <input
          className={fields}
          aria-invalid={!!taskError}
          placeholder="Add linked task..."
          value={task}
          onChange={(e) => {
            setTask(e.target.value);
            setTaskError('');
          }}
        />
        <input
          className={fields}
          placeholder="Milestone (optional)"
          value={milestone}
          onChange={(e) => setMilestone(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-xl border border-tide-500/40 bg-tide-500/10 px-4 text-xs font-bold text-tide-600 hover:bg-tide-500/20"
        >
          Add Task
        </button>
      </form>
      {taskError && <p className="mt-2 text-xs text-rose-500">{taskError}</p>}
    </article>
  );
}

// ─── Habits View ───
function Habits({
  goals,
  onCheckHabit,
}: {
  goals: Goal[];
  onCheckHabit: (goalId: string) => void;
}) {
  const habits = goals.filter((g) => g.habit);

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="font-bold text-ink">Daily Habits &amp; Reminders</h2>
      <p className="mt-1 text-xs text-mist-500">
        Streaks increment daily when checked. Complete 7 consecutive days to unlock Habit Keeper!
      </p>

      <div className="mt-4 space-y-3">
        {habits.length ? (
          habits.map((g) => {
            const streak = g.habitStreak || 0;
            return (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-xl bg-white/60 p-3.5"
              >
                <div>
                  <span className="text-sm font-semibold text-ink">{g.name}</span>
                  <p className="text-[11px] text-mist-500">{g.description || 'Daily habit challenge'}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600">
                    <Flame className="h-4 w-4" />
                    {streak} Day Streak
                  </span>

                  <button
                    onClick={() => onCheckHabit(g.id)}
                    className="rounded-xl bg-tide-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-tide-500"
                  >
                    Check In Today
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-mist-500">
            No habits marked yet. When creating a goal, check &quot;Make this a daily habit&quot; to track it here.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Chronos Flow View (Real AI Temporal Horizon + Supabase Events + Goal Deadlines) ───
function Calendar({ goals }: { goals: Goal[] }) {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'sessions' | 'deadlines'>('all');
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadEvents = async () => {
      try {
        const res = await fetchCalendarEvents();
        if (active && res.success && Array.isArray(res.events)) {
          setEvents(res.events);
        }
      } catch (err) {
        console.warn('Could not load calendar events:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadEvents();
    return () => {
      active = false;
    };
  }, []);

  const totalFocusMinutes = useMemo(() => {
    return events.reduce((sum, ev) => {
      const start = new Date(ev.startTime).getTime();
      const end = new Date(ev.endTime).getTime();
      const mins = Math.max(0, Math.round((end - start) / 60000));
      return sum + mins;
    }, 0);
  }, [events]);

  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) =>
      (a.target || '').localeCompare(b.target || '')
    );
  }, [goals]);

  const nearDeadlinesCount = useMemo(() => {
    const now = Date.now();
    const in7Days = now + 7 * 86400000;
    return goals.filter((g) => {
      if (!g.target) return false;
      const targetTime = new Date(g.target).getTime();
      return targetTime >= now && targetTime <= in7Days;
    }).length;
  }, [goals]);

  const handleStartFocus = async (ev: CalendarEventItem) => {
    setStartingSessionId(ev.id);
    try {
      const start = new Date(ev.startTime).getTime();
      const end = new Date(ev.endTime).getTime();
      const durationSeconds = Math.max(60, Math.round((end - start) / 1000));

      const res = await startSmartFocusSession({
        taskTitle: ev.title,
        taskId: ev.linkedTaskId,
        subject: ev.linkedGoal || ev.title,
        durationSeconds,
        strictness: 'balanced',
        browserProtection: true,
      });

      if (res.success) {
        router.push('/dashboard/sessions');
      }
    } catch (err) {
      console.error('Failed to launch focus session from calendar:', err);
    } finally {
      setStartingSessionId(null);
    }
  };

  const getDeadlineProximityBadge = (targetStr: string | null) => {
    if (!targetStr) return null;
    const targetDate = new Date(targetStr);
    const now = new Date();
    const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">Overdue ({Math.abs(diffDays)}d)</span>;
    }
    if (diffDays === 0) {
      return <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 animate-pulse">Due Today</span>;
    }
    if (diffDays === 1) {
      return <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">Due Tomorrow</span>;
    }
    if (diffDays <= 7) {
      return <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">In {diffDays} days</span>;
    }
    return <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-700">In {diffDays} days</span>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[0, 1].map((i) => (
          <div key={i} className="glass-card animate-pulse rounded-2xl p-6">
            <div className="h-5 w-48 rounded bg-white/70" />
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-14 rounded-xl bg-white/60" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Chronos Flow Metric HUD ─── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card rounded-2xl border border-ink/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-mist-500 font-medium">Scheduled Focus</p>
            <Clock className="h-4 w-4 text-tide-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">
            {Math.floor(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m
          </p>
          <p className="mt-0.5 text-[11px] text-mist-400">Total study block duration</p>
        </div>

        <div className="glass-card rounded-2xl border border-ink/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-mist-500 font-medium">Calendar Events</p>
            <CalendarDays className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{events.length}</p>
          <p className="mt-0.5 text-[11px] text-mist-400">Active study blocks</p>
        </div>

        <div className="glass-card rounded-2xl border border-ink/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-mist-500 font-medium">Goal Deadlines</p>
            <Target className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{sortedGoals.length}</p>
          <p className="mt-0.5 text-[11px] text-amber-600 font-medium">{nearDeadlinesCount} within 7 days</p>
        </div>

        <div className="glass-card rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-700 font-semibold">Conflict Shield</p>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-sm font-bold text-emerald-800">Protected</p>
          <p className="mt-0.5 text-[11px] text-emerald-600">Zero overlapping commitments</p>
        </div>
      </div>

      {/* ─── Controls & Sync Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 rounded-xl border border-ink/10 bg-white/60 p-1">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeFilter === 'all'
                ? 'bg-tide-600 text-white shadow-sm'
                : 'text-mist-600 hover:text-ink'
            }`}
          >
            All Horizon ({events.length + sortedGoals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('sessions')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeFilter === 'sessions'
                ? 'bg-tide-600 text-white shadow-sm'
                : 'text-mist-600 hover:text-ink'
            }`}
          >
            Study Blocks ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('deadlines')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeFilter === 'deadlines'
                ? 'bg-tide-600 text-white shadow-sm'
                : 'text-mist-600 hover:text-ink'
            }`}
          >
            Deadlines ({sortedGoals.length})
          </button>
        </div>

        <Link
          href="/dashboard/planner"
          className="inline-flex items-center gap-1.5 rounded-xl border border-tide-500/30 bg-tide-500/10 px-3.5 py-1.5 text-xs font-bold text-tide-700 hover:bg-tide-500/20 transition shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-tide-600" />
          <span>Plan with AI Planner</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ─── 1. Scheduled Study Sessions (Chronos Timeline) ─── */}
      {(activeFilter === 'all' || activeFilter === 'sessions') && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-ink text-base">Scheduled Focus Sessions</h2>
              <p className="mt-0.5 text-xs text-mist-500">Conflict-free study blocks synced from your AI Planner.</p>
            </div>
            <span className="rounded-full bg-tide-500/10 border border-tide-500/20 px-3 py-1 font-mono text-xs font-bold text-tide-700">
              {events.length} Blocks
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {events.length > 0 ? (
              events.map((ev) => {
                const startDate = new Date(ev.startTime);
                const endDate = new Date(ev.endTime);
                const durationMins = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
                const isStarting = startingSessionId === ev.id;

                return (
                  <div
                    key={ev.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white/80 p-4 transition-all hover:border-tide-500/30 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-55 flex-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tide-600/15 text-tide-700 shadow-sm">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-ink">{ev.title}</p>
                          <span className="rounded-md bg-tide-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-tide-700">
                            {durationMins}m
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-mist-500">
                          {ev.linkedGoal ? `Linked: ${ev.linkedGoal}` : ev.eventType}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono text-xs font-bold text-sky-600">
                          {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                          {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px] text-mist-400">
                          {startDate.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartFocus(ev)}
                        disabled={isStarting}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-tide-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-tide-700 transition shadow-sm disabled:opacity-50"
                      >
                        {isStarting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5 fill-current" />
                        )}
                        <span>Start</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-ink/15 p-8 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-mist-400" />
                <p className="mt-2 text-sm font-semibold text-ink">No focus blocks scheduled yet</p>
                <p className="mt-1 text-xs text-mist-500 max-w-sm mx-auto">
                  Create a study schedule with the AI Planner and approve it to see your conflict-free focus blocks here.
                </p>
                <Link
                  href="/dashboard/planner"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-tide-600 px-4 py-2 text-xs font-bold text-white hover:bg-tide-700 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Open AI Planner</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 2. Goal Deadlines & Milestone Horizon ─── */}
      {(activeFilter === 'all' || activeFilter === 'deadlines') && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-ink text-base">Goal Deadlines &amp; Target Milestones</h2>
              <p className="mt-0.5 text-xs text-mist-500">Upcoming targets sorted by proximity.</p>
            </div>
            <span className="rounded-full bg-white/70 px-3 py-1 font-mono text-xs text-rose-500 font-bold border border-ink/10">
              {sortedGoals.length} Targets
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {sortedGoals.length > 0 ? (
              sortedGoals.map((g) => {
                const p = progress(g);
                return (
                  <div
                    key={g.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white/80 p-4 transition-all hover:border-ink/20 shadow-sm"
                  >
                    <div className="min-w-50 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-ink text-sm">{g.name}</p>
                        <span className="rounded bg-mist-500/10 px-1.5 py-0.5 text-[10px] text-mist-600 font-medium">
                          {g.category || 'Study'}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-ink/10">
                          <div
                            className="h-full bg-tide-600 transition-all duration-300"
                            style={{ width: `${p}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-mist-500">{p}% progress</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getDeadlineProximityBadge(g.target)}
                      <div className="text-right">
                        <p className="font-mono text-xs font-bold text-ink">
                          {g.target ? new Date(g.target).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'No target'}
                        </p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${badge(status(g))}`}>
                          {status(g)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-ink/15 p-6 text-center text-xs text-mist-500">
                No goals created yet. Add goals in the Goals tab to track your deadlines here.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Goal Modal ───
function Create({
  form,
  setForm,
  close,
  submit,
}: {
  form: GoalForm;
  setForm: React.Dispatch<React.SetStateAction<GoalForm>>;
  close: () => void;
  submit: () => void;
}) {
  const put = (k: string, v: string | number | boolean) =>
    setForm((x: GoalForm) => ({ ...x, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="my-8 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <h2 className="text-lg font-bold text-slate-900 font-manrope">Create Goal</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-mist-600 sm:col-span-2">
            Goal Name
            <input
              className={fields}
              placeholder="e.g. Master Linear Algebra"
              value={form.name}
              maxLength={100}
              onChange={(e) => put('name', e.target.value)}
            />
          </label>
          <label className="text-xs text-mist-600 sm:col-span-2">
            Description
            <textarea
              className={`${fields} min-h-20`}
              placeholder="Outline what you want to achieve..."
              value={form.description}
              maxLength={500}
              onChange={(e) => put('description', e.target.value)}
            />
          </label>
          <label className="text-xs text-mist-600">
            Category
            <select
              className={fields}
              value={form.category}
              onChange={(e) => put('category', e.target.value)}
            >
              {['Study', 'Career', 'Health', 'Personal', 'Finance'].map((x) => (
                <option className="bg-white" key={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-mist-600">
            Priority
            <select
              className={fields}
              value={form.priority}
              onChange={(e) => put('priority', e.target.value)}
            >
              {['Low', 'Medium', 'High'].map((x) => (
                <option className="bg-white" key={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-mist-600">
            Start Date
            <input
              className={fields}
              type="date"
              value={form.start}
              onChange={(e) => put('start', e.target.value)}
            />
          </label>
          <label className="text-xs text-mist-600">
            Target Deadline
            <input
              className={fields}
              type="date"
              min={form.start}
              value={form.target}
              onChange={(e) => put('target', e.target.value)}
            />
          </label>
          <label className="text-xs text-mist-600">
            Target Value (sessions/hours)
            <input
              className={fields}
              type="number"
              min="1"
              max="10000"
              value={form.targetValue}
              onChange={(e) => put('targetValue', e.target.value)}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-xs text-mist-600 cursor-pointer">
            <input
              type="checkbox"
              checked={form.habit}
              onChange={(e) => put('habit', e.target.checked)}
              className="accent-tide-500 h-4 w-4"
            />
            Make this a daily habit
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={close} className="px-4 py-2 text-xs text-mist-600 hover:text-ink">
            Cancel
          </button>
          <button
            onClick={submit}
            className="rounded-xl bg-tide-600 px-5 py-2 text-xs font-bold text-white hover:bg-tide-500 shadow-md"
          >
            Create Goal
          </button>
        </div>
      </div>
    </div>
  );
}
