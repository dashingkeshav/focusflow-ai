"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  Repeat,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  fetchTasksApi,
  createTaskApi,
  updateTaskApi,
  updateTaskStatusApi,
  toggleSubtaskApi,
  deleteTaskApi,
  fetchGoals,
  type TaskItem,
  type TaskPayload,
  type TaskCounts,
  type GoalItem,
} from "@/lib/api";

const fields =
  "w-full rounded-xl border border-white/10 bg-slate-50 px-3.5 py-2 text-sm text-white shadow-xs outline-none focus:border-[#FF4500]";

type StatusFilter = "all" | "todo" | "in_progress" | "completed" | "overdue";
type SortKey = "created_at" | "due_date" | "priority" | "title";

interface SubtaskDraft {
  id: string;
  title: string;
  completed: boolean;
}

const STATUS_LABELS: Record<TaskItem["status"], string> = {
  todo: "To do",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Blocked",
};

const PRIORITY_STYLES: Record<string, string> = {
  High: "border-rose-500/30 bg-rose-500/10 text-rose-400 font-semibold font-mono",
  Medium: "border-amber-500/30 bg-amber-500/10 text-amber-400 font-semibold font-mono",
  Low: "border-white/10 bg-white/5 text-gray-400 font-semibold font-mono",
};

function isOverdue(task: TaskItem): boolean {
  return (
    task.status !== "completed" &&
    !!task.due_date &&
    new Date(task.due_date).getTime() < Date.now()
  );
}

export default function TasksWorkspace({ flash }: { flash?: (msg: string) => void }) {
  const [tasks, setTasks] = useState<TaskItem[] | null>(null);
  const [counts, setCounts] = useState<TaskCounts | null>(null);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [goalFilter, setGoalFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  // editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TaskItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TaskItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTasksApi({
        status: statusFilter === "all" || statusFilter === "overdue" ? "all" : statusFilter,
        priority: priorityFilter,
        goalId: goalFilter,
        search,
        sortBy,
        order,
      });
      if (res.success) {
        setTasks(res.tasks || []);
        setCounts(res.counts || null);
      } else {
        setError("Failed to load tasks.");
      }
      const gRes = await fetchGoals();
      if (gRes.success && Array.isArray(gRes.goals)) setGoals(gRes.goals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, goalFilter, search, sortBy, order]);

  useEffect(() => {
    const id = window.setTimeout(load, 250);
    return () => window.clearTimeout(id);
  }, [load]);

  const visible = useMemo(() => {
    let list = tasks || [];
    if (statusFilter === "overdue") list = list.filter(isOverdue);
    return list;
  }, [tasks, statusFilter]);

  const notify = (msg: string) => flash?.(msg);

  // ── actions ────────────────────────────────────────────
  const toggleComplete = async (task: TaskItem) => {
    const next = task.status === "completed" ? "todo" : "completed";
    // optimistic
    setTasks((ts) =>
      (ts || []).map((t) =>
        t.id === task.id
          ? { ...t, status: next, completed_at: next === "completed" ? new Date().toISOString() : null }
          : t
      )
    );
    try {
      await updateTaskStatusApi(task.id, next);
      notify(next === "completed" ? "Task completed — goal progress updated." : "Task reopened.");
      load();
    } catch {
      notify("Could not update the task. Retrying…");
      load();
    }
  };

  const changeStatus = async (task: TaskItem, status: TaskItem["status"]) => {
    setTasks((ts) => (ts || []).map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      await updateTaskStatusApi(task.id, status);
      notify(`Task moved to ${STATUS_LABELS[status]}.`);
      load();
    } catch {
      notify("Could not update the task status.");
      load();
    }
  };

  const toggleSubtask = async (task: TaskItem, subtaskId: string, completed: boolean) => {
    setTasks((ts) =>
      (ts || []).map((t) =>
        t.id === task.id
          ? {
              ...t,
              subtasks: (t.subtasks || []).map((s) => (s.id === subtaskId ? { ...s, completed } : s)),
            }
          : t
      )
    );
    try {
      await toggleSubtaskApi(task.id, subtaskId, completed);
    } catch {
      notify("Could not update the subtask.");
      load();
    }
  };

  const removeTask = async (task: TaskItem) => {
    setTasks((ts) => (ts || []).filter((t) => t.id !== task.id));
    setConfirmDelete(null);
    try {
      await deleteTaskApi(task.id);
      notify("Task deleted.");
      load();
    } catch {
      notify("Could not delete the task.");
      load();
    }
  };

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (task: TaskItem) => {
    setEditing(task);
    setEditorOpen(true);
  };

  // ── render helpers ─────────────────────────────────────
  const statusTabs: Array<{ key: StatusFilter; label: string; count?: number }> = [
    { key: "all", label: "All", count: counts?.all },
    { key: "todo", label: "To do", count: counts?.todo },
    { key: "in_progress", label: "Active", count: counts?.in_progress },
    { key: "completed", label: "Done", count: counts?.completed },
    { key: "overdue", label: "Overdue", count: counts?.overdue },
  ];

  return (
    <div className="space-y-4">
      {/* ── toolbar ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-50 flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-mist-500" aria-hidden />
            <input
              className={`${fields} pl-9`}
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search tasks"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                aria-pressed={statusFilter === tab.key}
                className={`rounded-xl border px-3 py-1.5 text-xs font-mono font-medium transition-all ${
                  statusFilter === tab.key
                    ? "border-[#FF4500] bg-[#FF4500]/15 text-[#FF4500]"
                    : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
                {typeof tab.count === "number" && (
                  <span className="ml-1.5 text-[10px] text-gray-400">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className={`${fields} w-auto`}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="all">All priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            className={`${fields} w-auto`}
            value={goalFilter}
            onChange={(e) => setGoalFilter(e.target.value)}
            aria-label="Filter by goal"
          >
            <option value="all">All goals</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            className={`${fields} w-auto`}
            value={`${sortBy}:${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split(":");
              setSortBy(s as SortKey);
              setOrder(o as "asc" | "desc");
            }}
            aria-label="Sort tasks"
          >
            <option value="created_at:desc">Newest first</option>
            <option value="created_at:asc">Oldest first</option>
            <option value="due_date:asc">Due date ↑</option>
            <option value="due_date:desc">Due date ↓</option>
            <option value="priority:desc">Priority</option>
            <option value="title:asc">Title A–Z</option>
          </select>
          <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
            <Plus className="h-4 w-4" aria-hidden />
            New Task
          </button>
        </div>
      </div>

      {/* ── error ── */}
      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
          {error}
          <button onClick={load} className="ml-2 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* ── list ── */}
      {loading && !tasks ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/70" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="glass-card rounded-2xl border border-ink/10 p-12 text-center">
          <ListTodo className="mx-auto h-8 w-8 text-mist-500" aria-hidden />
          <p className="mt-2 font-medium text-ink">
            {tasks && tasks.length > 0 ? "No tasks match these filters" : "No data yet"}
          </p>
          <p className="mt-1 text-xs text-mist-500">
            {tasks && tasks.length > 0
              ? "Try clearing the search or filters."
              : "Create your first task — link it to a goal to move real progress."}
          </p>
          {(!tasks || tasks.length === 0) && (
            <button type="button" onClick={openCreate} className="btn btn-primary btn-sm mt-4">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Create Your First Task
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => {
            const overdue = isOverdue(task);
            const subtasks = task.subtasks || [];
            const subDone = subtasks.filter((s) => s.completed).length;
            const isOpen = expanded === task.id;
            return (
              <li
                key={task.id}
                className={`glass-card rounded-2xl border p-4 transition-all ${
                  task.status === "completed"
                    ? "border-white/5 bg-white/2 opacity-60"
                    : overdue
                      ? "border-rose-500/30 bg-card"
                      : "border-white/10 bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* complete toggle */}
                  <button
                    type="button"
                    onClick={() => toggleComplete(task)}
                    aria-label={task.status === "completed" ? `Reopen ${task.title}` : `Complete ${task.title}`}
                    className={`mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border transition-all ${
                      task.status === "completed"
                        ? "border-leaf-500 bg-leaf-500 text-white"
                        : "border-ink/25 bg-white hover:border-tide-500 hover:bg-tide-500/10"
                    }`}
                  >
                    {task.status === "completed" && <Check className="h-3 w-3" aria-hidden />}
                  </button>

                  {/* body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          task.status === "completed" ? "text-mist-500 line-through" : "text-ink"
                        }`}
                      >
                        {task.title}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Low}`}
                      >
                        {task.priority}
                      </span>
                      {overdue && (
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                          Overdue
                        </span>
                      )}
                      {task.is_recurring && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-white/70 px-2 py-0.5 text-[10px] text-mist-600">
                          <Repeat className="h-3 w-3" aria-hidden />
                          {task.recurrence_rule || "recurring"}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-mist-500">
                      {task.due_date && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" aria-hidden />
                          {new Date(task.due_date).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {task.estimated_duration ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden />
                          {task.estimated_duration}m
                        </span>
                      ) : null}
                      {task.goal_name && (
                        <span className="inline-flex items-center gap-1 text-tide-700">
                          <ListTodo className="h-3 w-3" aria-hidden />
                          {task.goal_name}
                        </span>
                      )}
                      {task.milestone && <span>· {task.milestone}</span>}
                      {task.tags && task.tags.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Tag className="h-3 w-3" aria-hidden />
                          {task.tags.join(", ")}
                        </span>
                      )}
                      {subtasks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : task.id)}
                          className="inline-flex items-center gap-1 font-semibold text-tide-700 hover:underline"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-3 w-3" aria-hidden />
                          ) : (
                            <ChevronRight className="h-3 w-3" aria-hidden />
                          )}
                          {subDone}/{subtasks.length} subtasks
                        </button>
                      )}
                    </div>

                    {/* subtasks */}
                    {isOpen && subtasks.length > 0 && (
                      <ul className="mt-3 space-y-1.5 border-l-2 border-tide-500/15 pl-3">
                        {subtasks.map((st) => (
                          <li key={st.id} className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => toggleSubtask(task, st.id, !st.completed)}
                              aria-label={`Toggle subtask ${st.title}`}
                              className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                                st.completed
                                  ? "border-leaf-500 bg-leaf-500 text-white"
                                  : "border-ink/25 bg-white hover:border-tide-500"
                              }`}
                            >
                              {st.completed && <Check className="h-2.5 w-2.5" aria-hidden />}
                            </button>
                            <span className={st.completed ? "text-mist-500 line-through" : "text-[#43584f]"}>
                              {st.title}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* actions */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <select
                      value={task.status}
                      onChange={(e) => changeStatus(task, e.target.value as TaskItem["status"])}
                      aria-label={`Status of ${task.title}`}
                      className="rounded-lg border border-ink/10 bg-white/70 px-2 py-1 text-[11px] text-ink outline-none focus:border-tide-400"
                    >
                      {(Object.keys(STATUS_LABELS) as Array<TaskItem["status"]>).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      aria-label={`Edit ${task.title}`}
                      className="rounded-lg p-1.5 text-mist-500 transition-colors hover:bg-sky-500/10 hover:text-sky-700"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(task)}
                      aria-label={`Delete ${task.title}`}
                      className="rounded-lg p-1.5 text-mist-500 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-6 shadow-2xl text-white">
            <h3 className="text-base font-serif font-bold text-white">Delete task?</h3>
            <p className="mt-2 text-sm text-gray-400">
              “{confirmDelete.title}” will be removed{confirmDelete.goal_name ? ` and ${confirmDelete.goal_name}'s progress recalculated` : ""}.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)} className="btn btn-ghost btn-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => removeTask(confirmDelete)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* editor modal */}
      {editorOpen && (
        <TaskEditor
          task={editing}
          goals={goals}
          saving={saving}
          onClose={() => setEditorOpen(false)}
          onSave={async (payload: TaskPayload) => {
            setSaving(true);
            try {
              if (editing) {
                await updateTaskApi(editing.id, payload);
                notify("Task updated.");
              } else {
                await createTaskApi(payload);
                notify("Task created.");
              }
              setEditorOpen(false);
              load();
              return true;
            } catch (err) {
              notify(err instanceof Error ? err.message : "Could not save the task.");
              return false;
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    </div>
  );
}

// =====================================================
// TASK EDITOR MODAL
// =====================================================

function TaskEditor({
  task,
  goals,
  saving,
  onClose,
  onSave,
}: {
  task: TaskItem | null;
  goals: GoalItem[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: TaskPayload) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState<string>(task?.priority || "Medium");
  const [status, setStatus] = useState<TaskItem["status"]>(task?.status || "todo");
  const [dueDate, setDueDate] = useState(
    task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : ""
  );
  const [estimatedDuration, setEstimatedDuration] = useState(String(task?.estimated_duration || 25));
  const [milestone, setMilestone] = useState(task?.milestone || "");
  const [goalId, setGoalId] = useState(task?.goal_id || "");
  const [tagsInput, setTagsInput] = useState((task?.tags || []).join(", "));
  const [isRecurring, setIsRecurring] = useState(Boolean(task?.is_recurring));
  const [recurrenceRule, setRecurrenceRule] = useState(task?.recurrence_rule || "weekly");
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>(
    (task?.subtasks || []).map((s) => ({ id: s.id, title: s.title, completed: s.completed }))
  );
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [formError, setFormError] = useState("");

  const addSubtask = () => {
    if (subtaskTitle.trim().length < 2) return;
    setSubtasks((s) => [
      ...s,
      { id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, title: subtaskTitle.trim(), completed: false },
    ]);
    setSubtaskTitle("");
  };

  const submit = async () => {
    if (title.trim().length < 2) {
      setFormError("Task title must be at least 2 characters.");
      return;
    }
    const ok = await onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      status,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      estimatedDuration: Number(estimatedDuration) || 25,
      milestone: milestone.trim() || null,
      goalId: goalId || null,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      isRecurring,
      recurrenceRule: isRecurring ? recurrenceRule : null,
      subtasks: subtasks.map((s) => ({ id: s.id, title: s.title, completed: s.completed })),
    });
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={task ? "Edit task" : "Create task"}
        className="my-8 w-full max-w-xl rounded-2xl border border-white/10 bg-card p-6 shadow-2xl text-white"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-white">{task ? "Edit Task" : "New Task"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
            <X className="h-4.5 w-4.5" aria-hidden />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-mist-600 sm:col-span-2">
            Title
            <input
              className={fields}
              value={title}
              maxLength={255}
              placeholder="e.g. Finish physics problem set"
              onChange={(e) => {
                setTitle(e.target.value);
                setFormError("");
              }}
            />
          </label>
          <label className="text-xs text-mist-600 sm:col-span-2">
            Description
            <textarea
              className={`${fields} min-h-16`}
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="text-xs text-mist-600">
            Priority
            <select className={fields} value={priority} onChange={(e) => setPriority(e.target.value)}>
              {["Low", "Medium", "High"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-mist-600">
            Status
            <select
              className={fields}
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskItem["status"])}
            >
              {(Object.keys(STATUS_LABELS) as Array<TaskItem["status"]>).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-mist-600">
            Due date &amp; time
            <input
              className={fields}
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          <label className="text-xs text-mist-600">
            Estimated duration (minutes)
            <input
              className={fields}
              type="number"
              min={5}
              max={600}
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
            />
          </label>
          <label className="text-xs text-mist-600">
            Linked goal
            <select className={fields} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">No goal</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-mist-600">
            Milestone (optional)
            <input
              className={fields}
              value={milestone}
              placeholder="e.g. Week 1"
              onChange={(e) => setMilestone(e.target.value)}
            />
          </label>
          <label className="text-xs text-mist-600 sm:col-span-2">
            Tags (comma separated)
            <input
              className={fields}
              value={tagsInput}
              placeholder="physics, revision"
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </label>

          {/* recurring */}
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-xs text-mist-600">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="h-4 w-4 accent-tide-500"
              />
              Recurring task
            </label>
            {isRecurring && (
              <select
                className={`${fields} mt-2`}
                value={recurrenceRule}
                onChange={(e) => setRecurrenceRule(e.target.value)}
                aria-label="Recurrence rule"
              >
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
              </select>
            )}
          </div>

          {/* subtasks */}
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-mist-600">Subtasks</p>
            <ul className="mt-2 space-y-1.5">
              {subtasks.map((st) => (
                <li key={st.id} className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-1.5 text-xs">
                  <span className={st.completed ? "text-mist-500 line-through" : "text-ink"}>{st.title}</span>
                  <button
                    type="button"
                    onClick={() => setSubtasks((s) => s.filter((x) => x.id !== st.id))}
                    className="ml-auto text-mist-500 hover:text-rose-500"
                    aria-label={`Remove subtask ${st.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input
                className={fields}
                value={subtaskTitle}
                placeholder="Add a subtask…"
                onChange={(e) => setSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSubtask();
                  }
                }}
              />
              <button type="button" onClick={addSubtask} className="rounded-xl border border-tide-500/40 bg-tide-500/10 px-3 text-xs font-bold text-tide-700">
                Add
              </button>
            </div>
          </div>
        </div>

        {formError && <p className="mt-3 text-xs text-rose-600">{formError}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={saving} className="btn btn-primary btn-sm">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {task ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
