const crypto = require("crypto");

const HORIZONS = new Set(["today", "tomorrow", "this_week", "next_week", "this_month", "long_term"]);
const PLAN_TYPES = new Set(["daily", "weekly"]);
const WORK_WINDOWS = new Set(["Morning", "Afternoon", "Evening", "Night"]);
const PLAN_MODES = new Set(["balanced", "deadline_first", "deep_work", "flexible", "exam_sprint", "goal_builder", "recovery"]);
const ITEM_TYPES = new Set(["focus_block", "break", "review", "habit"]);
const PRIORITIES = new Set(["Critical", "High", "Medium", "Low"]);
const ITEM_STATUSES = new Set(["planned", "in_progress", "completed", "skipped", "rescheduled"]);
const ITEM_KEYS = new Set(["id", "taskId", "title", "time", "durationMinutes", "type", "priority", "why", "linkedGoal", "status", "source", "subtasks", "milestone", "dueDate"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

class PlannerValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "PlannerValidationError";
    this.status = status;
  }
}

function boundedString(value, field, maxLength, { optional = false } = {}) {
  if (optional && value === undefined) return undefined;
  if (typeof value !== "string") throw new PlannerValidationError(`${field} must be a string.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(normalized)) {
    throw new PlannerValidationError(`${field} must be between 1 and ${maxLength} characters.`);
  }
  return normalized;
}

function boundedNumber(value, field, min, max, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new PlannerValidationError(`${field} must be between ${min} and ${max}.`);
  }
  return value;
}

function validateDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new PlannerValidationError("Date must be a valid YYYY-MM-DD value.");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new PlannerValidationError("Date must be a valid YYYY-MM-DD value.");
  }
  return value;
}

function validateTargetDate(value, now = new Date()) {
  validateDateString(value);
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const maximum = new Date(today);
  maximum.setDate(maximum.getDate() + 365);
  if (date < today || date > maximum) {
    throw new PlannerValidationError("targetDate must be today or within the next 365 days.");
  }
  return value;
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function validateGenerationRequest(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new PlannerValidationError("Request body must be a JSON object.");
  }
  const acceptedKeys = new Set([
    "prompt", "planType", "workingTimePreference", "intensity", "focusBlockDuration",
    "breakDuration", "planningMode", "persona", "horizon", "availableHours",
    "targetDate", "existingGoals", "inputs",
  ]);
  for (const key of Object.keys(body)) {
    if (!acceptedKeys.has(key)) throw new PlannerValidationError(`Unsupported generation option: ${key}.`);
  }
  if (body.existingGoals !== undefined) {
    if (!Array.isArray(body.existingGoals) || body.existingGoals.length > 50) {
      throw new PlannerValidationError("existingGoals must contain at most 50 entries.");
    }
    let serializedLength = 0;
    for (const goal of body.existingGoals) {
      if (!goal || typeof goal !== "object" || Array.isArray(goal)) {
        throw new PlannerValidationError("existingGoals contains an invalid entry.");
      }
      serializedLength += JSON.stringify(goal).length;
      if (serializedLength > 20000) {
        throw new PlannerValidationError("existingGoals is too large.");
      }
    }
  }

  const prompt = body.prompt === undefined || body.prompt === "" ? "" : boundedString(body.prompt, "prompt", 2000);
  const planType = body.planType === undefined ? "daily" : body.planType;
  const workingTimePreference = body.workingTimePreference === undefined ? "Morning" : body.workingTimePreference;
  const planningMode = body.planningMode === undefined ? "balanced" : body.planningMode;
  const horizon = body.horizon === undefined ? "today" : body.horizon;
  const intensity = body.intensity === undefined ? "balanced" : body.intensity;
  if (!PLAN_TYPES.has(planType)) throw new PlannerValidationError("planType must be daily or weekly.");
  if (!WORK_WINDOWS.has(workingTimePreference)) throw new PlannerValidationError("workingTimePreference is invalid.");
  if (!PLAN_MODES.has(planningMode)) throw new PlannerValidationError("planningMode is invalid.");
  if (!HORIZONS.has(horizon)) throw new PlannerValidationError("horizon is invalid.");
  if (!["balanced", "focused", "relaxed", "intense"].includes(intensity)) {
    throw new PlannerValidationError("intensity is invalid.");
  }
  const persona = body.persona === undefined ? "General" : boundedString(body.persona, "persona", 64);
  const now = new Date();
  const inferredDate = new Date(now);
  if (horizon === "tomorrow") inferredDate.setDate(inferredDate.getDate() + 1);
  const targetDate = body.targetDate === undefined
    ? localDateString(inferredDate)
    : validateTargetDate(body.targetDate, now);
  return {
    prompt,
    planType,
    workingTimePreference,
    intensity,
    focusBlockDuration: boundedNumber(body.focusBlockDuration, "focusBlockDuration", 15, 120, 45),
    breakDuration: boundedNumber(body.breakDuration, "breakDuration", 5, 30, 15),
    planningMode,
    persona,
    horizon,
    availableHours: boundedNumber(body.availableHours, "availableHours", 0.5, 16, 4),
    targetDate,
  };
}

function parseTimeRange(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return {
    start: Number(match[1]) * 60 + Number(match[2]),
    end: Number(match[3]) * 60 + Number(match[4]),
  };
}

function localDayRange(dateString) {
  const start = new Date(`${dateString}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function getCalendarMinuteRange(event, dayRange) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return null;
  const dayStart = dayRange.start.getTime();
  const dayEnd = dayRange.end.getTime();
  if (end <= dayStart || start >= dayEnd) return null;
  return {
    start: Math.max(0, Math.floor((start.getTime() - dayStart) / 60000)),
    end: Math.min(1440, Math.ceil((end.getTime() - dayStart) / 60000)),
  };
}

function validatePlanItems(items, { availableMinutes = 16 * 60, calendarEvents = [], targetDate } = {}) {
  if (!Array.isArray(items) || items.length > 30) {
    throw new PlannerValidationError("items must be an array of at most 30 plan items.");
  }
  const normalized = [];
  const ranges = [];
  const dayRange = targetDate ? localDayRange(targetDate) : null;
  const eventRanges = dayRange
    ? calendarEvents.map((event) => getCalendarMinuteRange(event, dayRange)).filter(Boolean)
    : [];
  let totalDuration = 0;

  for (const [index, raw] of items.entries()) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new PlannerValidationError(`items[${index}] must be an object.`);
    }
    for (const key of Object.keys(raw)) {
      if (!ITEM_KEYS.has(key)) throw new PlannerValidationError(`items[${index}] contains an unsupported field.`);
    }
    const title = boundedString(raw.title, `items[${index}].title`, 160);
    const time = boundedString(raw.time, `items[${index}].time`, 32);
    // type/priority/why default for direct API callers (apply/save); Gemini
    // output is strictly validated in validateGeminiPlan before reaching here.
    const type = raw.type === undefined ? "focus_block" : raw.type;
    const priority = raw.priority === undefined ? "Medium" : raw.priority;
    if (!ITEM_TYPES.has(type)) throw new PlannerValidationError(`items[${index}].type is invalid.`);
    if (!PRIORITIES.has(priority)) throw new PlannerValidationError(`items[${index}].priority is invalid.`);
    const durationMinutes = raw.durationMinutes;
    const durationMinimum = type === "break" ? 5 : 15;
    const durationLimit = type === "break" ? 30 : 120;
    if (typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes) ||
      durationMinutes < durationMinimum || durationMinutes > durationLimit) {
      throw new PlannerValidationError(`items[${index}].durationMinutes is outside the allowed range.`);
    }
    const range = parseTimeRange(time);
    if (!range || range.end <= range.start || range.end - range.start !== durationMinutes) {
      throw new PlannerValidationError(`items[${index}].time must be a same-day interval matching its duration.`);
    }
    const why = raw.why === undefined || raw.why === "" ? "" : boundedString(raw.why, `items[${index}].why`, 500);
    const linkedGoal = raw.linkedGoal === undefined || raw.linkedGoal === ""
      ? ""
      : boundedString(raw.linkedGoal, `items[${index}].linkedGoal`, 255);
    const status = raw.status === undefined ? "planned" : raw.status;
    if (!ITEM_STATUSES.has(status)) throw new PlannerValidationError(`items[${index}].status is invalid.`);
    const id = raw.id === undefined ? crypto.randomUUID() : boundedString(raw.id, `items[${index}].id`, 80);
    const normalizedItem = { id, title, time, durationMinutes, type, priority, why, linkedGoal, status };
    if (raw.milestone !== undefined && raw.milestone !== "") {
      normalizedItem.milestone = boundedString(raw.milestone, `items[${index}].milestone`, 120);
    }
    if (raw.dueDate !== undefined && raw.dueDate !== "") {
      if (typeof raw.dueDate !== "string" || !DATE_RE.test(raw.dueDate)) {
        throw new PlannerValidationError(`items[${index}].dueDate must be a YYYY-MM-DD date.`);
      }
      validateDateString(raw.dueDate);
      normalizedItem.dueDate = raw.dueDate;
    }
    if (raw.taskId !== undefined) normalizedItem.taskId = boundedString(raw.taskId, `items[${index}].taskId`, 128);
    if (raw.source !== undefined) normalizedItem.source = boundedString(raw.source, `items[${index}].source`, 64);
    if (raw.subtasks !== undefined) {
      if (!Array.isArray(raw.subtasks) || raw.subtasks.length > 20) {
        throw new PlannerValidationError(`items[${index}].subtasks must contain at most 20 entries.`);
      }
      normalizedItem.subtasks = raw.subtasks.map((subtask, subtaskIndex) => {
        if (!subtask || typeof subtask !== "object" || Array.isArray(subtask)) {
          throw new PlannerValidationError(`items[${index}].subtasks[${subtaskIndex}] must be an object.`);
        }
        if (typeof subtask.completed !== "boolean") {
          throw new PlannerValidationError(`items[${index}].subtasks[${subtaskIndex}].completed must be boolean.`);
        }
        return {
          id: boundedString(subtask.id, `items[${index}].subtasks[${subtaskIndex}].id`, 80),
          title: boundedString(subtask.title, `items[${index}].subtasks[${subtaskIndex}].title`, 160),
          ...(subtask.estMinutes === undefined ? {} : {
            estMinutes: boundedNumber(subtask.estMinutes, `items[${index}].subtasks[${subtaskIndex}].estMinutes`, 1, 240),
          }),
          completed: subtask.completed === true,
        };
      });
    }
    normalized.push(normalizedItem);
    ranges.push({ ...range, index });
    totalDuration += durationMinutes;
  }

  if (totalDuration > availableMinutes) {
    throw new PlannerValidationError("Plan item durations exceed the available time.");
  }
  ranges.sort((a, b) => a.start - b.start);
  for (let i = 1; i < ranges.length; i += 1) {
    if (ranges[i].start < ranges[i - 1].end) {
      throw new PlannerValidationError(`Plan items ${ranges[i - 1].index + 1} and ${ranges[i].index + 1} overlap.`);
    }
  }
  for (const range of ranges) {
    if (eventRanges.some((event) => range.start < event.end && range.end > event.start)) {
      throw new PlannerValidationError("Plan conflicts with an existing calendar event.", 409);
    }
  }
  return normalized;
}

function validateGeminiPlan(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PlannerValidationError("Gemini returned an invalid plan object.", 502);
  }
  const allowed = new Set(["summary", "items", "assumptions"]);
  if (Object.keys(value).some((key) => !allowed.has(key)) ||
    !Object.prototype.hasOwnProperty.call(value, "summary") ||
    !Object.prototype.hasOwnProperty.call(value, "items")) {
    throw new PlannerValidationError("Gemini output did not match the required plan schema.", 502);
  }
  const summary = boundedString(value.summary, "summary", 1000);
  let assumptions;
  if (value.assumptions !== undefined) {
    if (!Array.isArray(value.assumptions) || value.assumptions.length > 6 ||
      value.assumptions.some((a) => typeof a !== "string" || a.trim().length === 0 || a.length > 240)) {
      throw new PlannerValidationError("Gemini assumptions were invalid.", 502);
    }
    assumptions = value.assumptions.map((a) => a.trim());
  }
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 30) {
    throw new PlannerValidationError("Gemini output did not contain a valid item list.", 502);
  }
  const items = value.items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new PlannerValidationError(`Gemini item ${index + 1} was invalid.`, 502);
    }
    const requiredFields = ["title", "time", "durationMinutes", "type", "priority", "why", "linkedGoal"];
    const optionalFields = ["milestone", "dueDate"];
    const keys = Object.keys(item);
    if (keys.some((key) => !requiredFields.includes(key) && !optionalFields.includes(key)) ||
      requiredFields.some((field) => !Object.prototype.hasOwnProperty.call(item, field))) {
      throw new PlannerValidationError(`Gemini item ${index + 1} did not match the required schema.`, 502);
    }
    const normalized = { ...item, status: "planned" };
    if (normalized.milestone !== undefined && normalized.milestone !== "") {
      normalized.milestone = boundedString(normalized.milestone, `Gemini item ${index + 1} milestone`, 120);
    }
    if (normalized.dueDate !== undefined && normalized.dueDate !== "") {
      if (typeof normalized.dueDate !== "string" || !DATE_RE.test(normalized.dueDate)) {
        throw new PlannerValidationError(`Gemini item ${index + 1} has an invalid dueDate.`, 502);
      }
      validateDateString(normalized.dueDate);
    } else {
      delete normalized.dueDate;
    }
    return normalized;
  });
  return { summary, items, ...(assumptions ? { assumptions } : {}) };
}

function parseGeminiJson(rawText) {
  if (typeof rawText !== "string" || rawText.length > 20000) {
    throw new PlannerValidationError("Gemini returned an invalid response.", 502);
  }
  try {
    return JSON.parse(rawText);
  } catch (_) {
    throw new PlannerValidationError("Gemini returned malformed JSON.", 502);
  }
}

function validateGeminiGoalTasks(value) {
  if (!Array.isArray(value) || value.length < 5 || value.length > 7) {
    throw new PlannerValidationError("Gemini goal breakdown must contain 5 to 7 tasks.", 502);
  }
  return value.map((task, index) => {
    const fields = ["title", "milestone", "durationMinutes", "priority"];
    if (!task || typeof task !== "object" || Array.isArray(task) ||
      Object.keys(task).length !== fields.length ||
      fields.some((field) => !Object.prototype.hasOwnProperty.call(task, field))) {
      throw new PlannerValidationError(`Gemini goal task ${index + 1} did not match the required schema.`, 502);
    }
    const title = boundedString(task.title, `tasks[${index}].title`, 160);
    const milestone = boundedString(task.milestone, `tasks[${index}].milestone`, 120);
    const durationMinutes = task.durationMinutes;
    if (typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes) ||
      durationMinutes < 10 || durationMinutes > 240) {
      throw new PlannerValidationError(`Gemini goal task ${index + 1} has an invalid duration.`, 502);
    }
    if (!["High", "Medium", "Low"].includes(task.priority)) {
      throw new PlannerValidationError(`Gemini goal task ${index + 1} has an invalid priority.`, 502);
    }
    return { title, milestone, durationMinutes, priority: task.priority };
  });
}

function validateGeminiBlockSteps(value, totalMinutes) {
  if (!Array.isArray(value) || value.length < 3 || value.length > 4) {
    throw new PlannerValidationError("Gemini focus breakdown must contain 3 to 4 steps.", 502);
  }
  const steps = value.map((step, index) => {
    const fields = ["title", "estMinutes"];
    if (!step || typeof step !== "object" || Array.isArray(step) ||
      Object.keys(step).length !== fields.length ||
      fields.some((field) => !Object.prototype.hasOwnProperty.call(step, field))) {
      throw new PlannerValidationError(`Gemini focus step ${index + 1} did not match the required schema.`, 502);
    }
    const title = boundedString(step.title, `subtasks[${index}].title`, 160);
    const estMinutes = step.estMinutes;
    if (typeof estMinutes !== "number" || !Number.isInteger(estMinutes) || estMinutes < 5 || estMinutes > 60) {
      throw new PlannerValidationError(`Gemini focus step ${index + 1} has an invalid duration.`, 502);
    }
    return { title, estMinutes };
  });
  if (steps.reduce((sum, step) => sum + step.estMinutes, 0) > totalMinutes) {
    throw new PlannerValidationError("Gemini focus steps exceed the focus block duration.", 502);
  }
  return steps;
}

module.exports = {
  PlannerValidationError,
  validateGenerationRequest,
  validateDateString,
  validateTargetDate,
  parseTimeRange,
  validatePlanItems,
  validateGeminiPlan,
  parseGeminiJson,
  validateGeminiGoalTasks,
  validateGeminiBlockSteps,
  localDateString,
};
