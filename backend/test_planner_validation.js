const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PlannerValidationError,
  validateGenerationRequest,
  validateTargetDate,
  validatePlanItems,
  validateGeminiPlan,
  parseGeminiJson,
  validateGeminiGoalTasks,
  validateGeminiBlockSteps,
  localDateString,
} = require("./src/utils/plannerValidation");

const validItem = (overrides = {}) => ({
  id: "plan-item-1",
  title: "Complete project outline",
  time: "09:00 - 09:45",
  durationMinutes: 45,
  type: "focus_block",
  priority: "High",
  why: "Scheduled in the requested morning window.",
  linkedGoal: "",
  ...overrides,
});

test("generation request accepts bounded settings and ignores client goals", () => {
  const settings = validateGenerationRequest({
    prompt: "Finish the project outline",
    availableHours: 3,
    existingGoals: [{ id: "untrusted", name: "Client goal" }],
  });
  assert.equal(settings.prompt, "Finish the project outline");
  assert.equal(settings.availableHours, 3);
  assert.equal(Object.hasOwn(settings, "existingGoals"), false);
});

test("generation request rejects out-of-range settings and unknown options", () => {
  assert.throws(() => validateGenerationRequest({ availableHours: 24 }), PlannerValidationError);
  assert.throws(() => validateGenerationRequest({ targetDate: "2026-02-31" }), PlannerValidationError);
  assert.throws(() => validateGenerationRequest({ privateOption: true }), PlannerValidationError);
});

test("item validation enforces interval duration, overlap, and capacity", () => {
  assert.equal(validatePlanItems([validItem()])[0].durationMinutes, 45);
  assert.throws(
    () => validatePlanItems([validItem({ time: "09:00 - 10:00" })]),
    /matching its duration/
  );
  assert.throws(
    () => validatePlanItems([validItem({ durationMinutes: "45" })]),
    /durationMinutes is outside/
  );
  assert.throws(
    () => validatePlanItems([validItem({ durationMinutes: 10, time: "09:00 - 09:10" })]),
    /durationMinutes is outside/
  );
  assert.throws(
    () => validatePlanItems([validItem(), validItem({ id: "second", time: "09:30 - 10:15" })]),
    /overlap/
  );
  assert.throws(() => validatePlanItems([validItem()], { availableMinutes: 30 }), /exceed the available time/);
});

test("item validation rejects calendar conflicts and overnight intervals", () => {
  const targetDate = localDateString(new Date(2030, 0, 2));
  const event = {
    startTime: new Date(`${targetDate}T09:30:00`).toISOString(),
    endTime: new Date(`${targetDate}T10:30:00`).toISOString(),
  };
  assert.throws(
    () => validatePlanItems([validItem()], { targetDate, calendarEvents: [event] }),
    (error) => error instanceof PlannerValidationError && error.status === 409
  );
  assert.throws(
    () => validatePlanItems([validItem({ time: "23:30 - 00:15", durationMinutes: 45 })]),
    /same-day interval/
  );
});

test("Gemini plan output must match the strict schema", () => {
  const item = validItem();
  delete item.id;
  delete item.status;
  const valid = validateGeminiPlan({ summary: "A focused plan.", items: [item] });
  assert.equal(valid.items[0].status, "planned");
  assert.throws(
    () => validateGeminiPlan({ summary: "Plan", items: [item], aiPowered: true }),
    /required plan schema/
  );
  assert.throws(() => parseGeminiJson("```json\n{}\n```"), /malformed JSON/);
});

test("Gemini decompositions enforce schema, counts, and duration budget", () => {
  const goalTasks = Array.from({ length: 5 }, (_, index) => ({
    title: `Task ${index + 1}`,
    milestone: "Phase 1",
    durationMinutes: 30,
    priority: "Medium",
  }));
  assert.equal(validateGeminiGoalTasks(goalTasks).length, 5);
  assert.throws(() => validateGeminiGoalTasks(goalTasks.slice(0, 2)), /5 to 7 tasks/);
  assert.equal(validateGeminiBlockSteps([
    { title: "Step one", estMinutes: 10 },
    { title: "Step two", estMinutes: 10 },
    { title: "Step three", estMinutes: 10 },
  ], 30).length, 3);
  assert.throws(
    () => validateGeminiBlockSteps([
      { title: "Step one", estMinutes: 15 },
      { title: "Step two", estMinutes: 15 },
      { title: "Step three", estMinutes: 15 },
    ], 30),
    /exceed the focus block/
  );
});
