const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const plannerController = require("../controllers/plannerController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireFeature, recordFeatureUsage } = require("../utils/entitlements");
const { PlannerValidationError } = require("../utils/plannerValidation");

const router = express.Router();

const UPLOAD_TYPES = new Map([
  ["application/pdf", new Set([".pdf"])],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", new Set([".docx"])],
  ["text/plain", new Set([".txt"])],
  ["text/csv", new Set([".csv"])],
  ["image/jpeg", new Set([".jpg", ".jpeg"])],
  ["image/png", new Set([".png"])],
  ["image/webp", new Set([".webp"])],
  ["audio/webm", new Set([".webm"])],
  ["audio/ogg", new Set([".ogg", ".oga"])],
  ["audio/mpeg", new Set([".mp3", ".mpeg"])],
  ["audio/mp4", new Set([".m4a", ".mp4"])],
  ["audio/wav", new Set([".wav"])],
  ["audio/x-wav", new Set([".wav"])],
  ["audio/x-m4a", new Set([".m4a"])],
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    fs.mkdir(uploadDir, { recursive: true }, (error) => cb(error, uploadDir));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (UPLOAD_TYPES.get(file.mimetype)?.has(extension)) {
      cb(null, true);
    } else {
      const err = new Error("Unsupported file type or extension.");
      err.status = 415;
      cb(err);
    }
  },
});

function uploadSingle(field) {
  const middleware = upload.single(field);
  return (req, res, next) => middleware(req, res, async (error) => {
    if (!error) return next();
    if (req.file?.path) await removeUpload(req.file.path);
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : error.status || (error instanceof multer.MulterError ? 400 : 500);
    return res.status(status).json({
      success: false,
      message: status === 413 || error.code === "LIMIT_FILE_SIZE"
        ? "File exceeds the 10MB upload limit."
        : error.status === 415
        ? error.message
        : "Could not accept the uploaded file.",
    });
  });
}

function assertSafeFileContent(file) {
  const header = Buffer.alloc(8);
  const descriptor = fs.openSync(file.path, "r");
  let bytesRead;
  try {
    bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
  } finally {
    fs.closeSync(descriptor);
  }
  const signature = header.subarray(0, bytesRead);
  const extension = path.extname(file.originalname).toLowerCase();
  if (file.mimetype === "application/pdf" && signature.subarray(0, 5).toString() !== "%PDF-") {
    throw new PlannerValidationError("The uploaded file is not a valid PDF.");
  }
  if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
    !(signature[0] === 0x50 && signature[1] === 0x4b)) {
    throw new PlannerValidationError("The uploaded file is not a valid DOCX document.");
  }
  if (file.mimetype === "text/plain" || file.mimetype === "text/csv") {
    if (fs.readFileSync(file.path).includes(0)) {
      throw new PlannerValidationError("The uploaded file is not valid text.");
    }
  }
  if (extension === ".doc") {
    throw new PlannerValidationError("Legacy DOC files are not supported; upload DOCX instead.", 415);
  }
}

async function removeUpload(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`[Planner] Temporary upload cleanup failed (${error.code || "error"}).`);
    }
  }
}

router.use(authMiddleware);

// =====================================================
// CORE PLAN ROUTES (Available to Free and Pro)
// =====================================================

router.get("/", plannerController.getPlan);
router.delete("/", plannerController.clearPlan);
router.post("/save", plannerController.savePlan);
router.put("/items", plannerController.updateItems);
router.post("/apply", plannerController.applyPlan);

// =====================================================
// ADVANCED PRO PLANNER CAPABILITIES
// =====================================================

router.post("/replan", requireFeature("adaptive_replan"), plannerController.adaptiveReplan);
router.post("/adaptive-check", plannerController.adaptiveCheck);
router.post("/recovery", requireFeature("recovery_plan"), plannerController.recoveryPlan);
router.post("/what-if", requireFeature("what_if_simulation"), plannerController.simulateWhatIf);
router.post("/feasibility", requireFeature("what_if_simulation"), plannerController.calculateGoalFeasibility);
router.post("/decompose", requireFeature("task_decomposition"), plannerController.decomposeGoal);
router.post("/decompose-block", requireFeature("task_decomposition"), plannerController.decomposeBlock);
router.get("/history", requireFeature("plan_history"), plannerController.getPlanHistory);
router.post("/restore-version", requireFeature("plan_history"), plannerController.restorePlanVersion);

// =====================================================
// FILE UPLOAD ENDPOINT
// =====================================================

router.post("/upload", requireFeature("ai_file_upload"), uploadSingle("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const fileType = req.file.mimetype;
    assertSafeFileContent(req.file);

    if (fileType.startsWith("image/")) {
      const base64Data = fs.readFileSync(req.file.path).toString("base64");
      const analysisText = await plannerController.analyzeImage(base64Data, req.file.mimetype);
      const topics = extractTopics(analysisText);
      const deadlines = extractDeadlines(analysisText);
      const deliverables = extractDeliverables(analysisText);
      await recordFeatureUsage(req.user.id, "ai_file_upload");
      return res.status(200).json({
        success: true,
        message: "Image syllabus/schedule extracted successfully.",
        file: {
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        extractedData: {
          type: "image",
          text: analysisText.substring(0, 1500) + (analysisText.length > 1500 ? "..." : ""),
          topics,
          deadlines,
          deliverables,
          wordCount: analysisText.split(/\s+/).filter(Boolean).length,
        },
      });
    }

    if (fileType.startsWith("audio/")) {
      const base64Data = fs.readFileSync(req.file.path).toString("base64");
      const transcription = await plannerController.transcribeAudio(base64Data, req.file.mimetype);
      await recordFeatureUsage(req.user.id, "ai_voice_transcribe");
      return res.status(200).json({
        success: true,
        message: "Audio transcribed successfully.",
        file: {
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        extractedData: {
          type: "voice",
          text: transcription,
          wordCount: transcription.split(/\s+/).filter(Boolean).length,
        },
      });
    }

    let extractedData;
    if (fileType === "application/pdf") extractedData = await processPDF(req.file.path);
    else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") extractedData = await processDocument(req.file.path);
    else if (fileType === "text/plain" || fileType === "text/csv") extractedData = await processTextFile(req.file.path);
    else {
      return res.status(415).json({ success: false, message: "Unsupported file type." });
    }

    await recordFeatureUsage(req.user.id, "ai_file_upload");
    return res.status(200).json({
      success: true,
      message: "File text extracted successfully.",
      file: {
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      extractedData,
    });
  } catch (error) {
    return res.status(error.status || 422).json({
      success: false,
      message: error.status ? error.message : (error.message || "Could not extract text from this file."),
    });
  } finally {
    await removeUpload(req.file?.path);
  }
});

// =====================================================
// VOICE TRANSCRIPTION ENDPOINT
// =====================================================

router.post("/transcribe", requireFeature("ai_voice_transcribe"), uploadSingle("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No audio file uploaded",
      });
    }

    if (!req.file.mimetype.startsWith("audio/")) {
      return res.status(400).json({
        success: false,
        message: "Uploaded file is not audio. Please record or upload an audio file.",
      });
    }

    const base64Data = fs.readFileSync(req.file.path).toString("base64");
    const transcription = await plannerController.transcribeAudio(base64Data, req.file.mimetype);
    await recordFeatureUsage(req.user.id, "ai_voice_transcribe");
    return res.status(200).json({
      success: true,
      transcription,
      message: "Audio transcribed successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to transcribe audio.",
    });
  } finally {
    await removeUpload(req.file?.path);
  }
});

// =====================================================
// PLAN GENERATION ENDPOINT
// =====================================================

router.post("/generate", requireFeature("ai_plan_generate"), async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (req.body?.inputs !== undefined) {
      const { inputs, ...options } = req.body;
      const prompt = combineInputsToPrompt(inputs);
      if (!prompt) throw new PlannerValidationError("Add text or extracted document content before generating a plan.");
      const conflicts = detectConflicts(inputs);

      if (conflicts.length > 0) {
        return res.status(200).json({
          success: true,
          needsResolution: true,
          conflicts,
          message: "Conflicting information found. Please resolve before generating plan.",
        });
      }
      req.body = { ...options, prompt: [options.prompt, prompt].filter(Boolean).join("\n") };
    }
    return await plannerController.generatePlan(req, res);
  } catch (error) {
    const status = error instanceof PlannerValidationError ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: error instanceof PlannerValidationError ? error.message : "Could not prepare planner input.",
    });
  }
});

// =====================================================
// INPUT COMBINATION HELPER
// =====================================================

function combineInputsToPrompt(inputs) {
  if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > 10) {
    throw new PlannerValidationError("inputs must contain between 1 and 10 entries.");
  }
  const allowedTypes = new Set(["text", "pdf", "document", "voice", "image"]);
  const parts = [];
  for (const [index, input] of inputs.entries()) {
    if (!input || typeof input !== "object" || Array.isArray(input) || !allowedTypes.has(input.type)) {
      throw new PlannerValidationError(`inputs[${index}] is invalid.`);
    }
    const content = typeof input.content === "string" ? input.content.trim() : "";
    const voiceText = typeof input.transcription === "string" ? input.transcription.trim() : "";
    const effectiveContent = content || voiceText;
    if (effectiveContent.length > 1500) throw new PlannerValidationError(`inputs[${index}].content is too long.`);
    if (effectiveContent) {
      const prefix = input.type === "voice" ? "Voice Note" : input.type === "image" ? "Image Document" : input.type;
      parts.push(`${prefix}: ${effectiveContent}`);
    }
    const extracted = input.extractedData;
    if (extracted && typeof extracted === "object" && !Array.isArray(extracted)) {
      for (const key of ["text", "content"]) {
        if (extracted[key] === undefined) continue;
        if (typeof extracted[key] !== "string" || extracted[key].length > 1500) {
          throw new PlannerValidationError("Extracted document text is invalid or too long.");
        }
        if (extracted[key].trim()) parts.push(`Extracted content: ${extracted[key].trim()}`);
      }
      for (const key of ["topics", "deadlines", "deliverables", "sections"]) {
        if (extracted[key] === undefined) continue;
        if (!Array.isArray(extracted[key]) || extracted[key].length > 20 ||
          extracted[key].some((value) => typeof value !== "string" || value.length > 200)) {
          throw new PlannerValidationError(`Extracted ${key} data is invalid.`);
        }
        if (extracted[key].length) parts.push(`${key}: ${extracted[key].join(", ")}`);
      }
    }
  }
  const prompt = parts.join("\n").trim();
  if (prompt.length > 3000) throw new PlannerValidationError("Combined planner input must not exceed 3000 characters.");
  return prompt;
}

// =====================================================
// FILE PROCESSING FUNCTIONS
// =====================================================

async function processPDF(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    
    const text = data.text;
    const pageCount = data.numpages;
    
    // Extract key information from PDF text
    const deadlines = extractDeadlines(text);
    const topics = extractTopics(text);
    const deliverables = extractDeliverables(text);
    
    return {
      type: "pdf",
      pageCount,
      text: text.substring(0, 1000) + (text.length > 1000 ? "..." : ""),
      topics,
      deadlines,
      deliverables,
      wordCount: text.split(/\s+/).length,
    };
  } catch (_) {
    throw new Error("Failed to process PDF file");
  }
}

async function processDocument(docPath) {
  try {
    const result = await mammoth.extractRawText({ path: docPath });
    const text = result.value;
    
    const sections = extractSections(text);
    const deadlines = extractDeadlines(text);
    const deliverables = extractDeliverables(text);
    
    return {
      type: "document",
      sections,
      deadlines,
      deliverables,
      wordCount: text.split(/\s+/).length,
      text: text.substring(0, 1000) + (text.length > 1000 ? "..." : ""),
    };
  } catch (_) {
    throw new Error("Failed to process document file");
  }
}

async function processTextFile(filePath) {
  const text = fs.readFileSync(filePath, "utf-8");
  const lines = text.split("\n").filter(line => line.trim());

  return {
    type: "text",
    lineCount: lines.length,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    deadlines: extractDeadlines(text),
    topics: extractTopics(text),
    deliverables: extractDeliverables(text),
    content: text.substring(0, 500) + (text.length > 500 ? "..." : ""),
  };
}

// =====================================================
// CONFLICT DETECTION
// =====================================================

function detectConflicts(inputs) {
  const conflicts = [];
  const deadlines = [];
  const dates = [];
  const times = [];

  inputs.forEach((input, index) => {
    // Extract deadlines from different sources
    if (input.extractedData?.deadlines) {
      input.extractedData.deadlines.forEach((deadline) => {
        deadlines.push({ deadline, source: input.source || input.type, inputIndex: index });
      });
    }

    // Extract dates
    if (input.extractedData?.dates) {
      input.extractedData.dates.forEach((date) => {
        dates.push({ date, source: input.source || input.type, inputIndex: index });
      });
    }

    // Extract times
    if (input.extractedData?.times) {
      input.extractedData.times.forEach((time) => {
        times.push({ time, source: input.source || input.type, inputIndex: index });
      });
    }
  });

  // Check for deadline conflicts
  if (deadlines.length > 1) {
    const uniqueDeadlines = [...new Set(deadlines.map(d => d.deadline))];
    if (uniqueDeadlines.length > 1) {
      conflicts.push({
        type: "deadline",
        message: "Multiple different deadlines found",
        options: deadlines.map(d => ({
          value: d.deadline,
          source: d.source,
        })),
      });
    }
  }

  return conflicts;
}

// =====================================================
// TEXT EXTRACTION HELPERS
// =====================================================

function extractDeadlines(text) {
  const deadlinePatterns = [
    /deadline[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/gi,
    /due[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/gi,
    /due[:\s]*(\w+\s+\d{1,2},?\s*\d{4})/gi,
    /by[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/gi,
  ];
  
  const deadlines = [];
  for (const pattern of deadlinePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      deadlines.push(...matches);
    }
  }
  
  return [...new Set(deadlines)]; // Remove duplicates
}

function extractTopics(text) {
  const topicPatterns = [
    /(?:chapter|topic|subject|module)\s+\d+[:\s]+([A-Za-z][\w\s]+)/gi,
    /(?:chapter|topic|subject|module)[:\s]+([A-Z][a-zA-Z\s]+)/gi,
  ];
  
  const topics = [];
  for (const pattern of topicPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      topics.push(...matches.map(m => m.replace(/^(?:chapter|topic|subject|module)\s*\d*[:\s]+/i, '').trim()));
    }
  }
  
  return [...new Set(topics.filter(t => t.length > 2))];
}

function extractDeliverables(text) {
  const deliverablePatterns = [
    /(?:deliverable|assignment|project|task|submission)[:\s]+([A-Z][^.\n]+)/gi,
    /(?:deliverable|assignment|project|task|submission)\s+\d+[:\s]+([A-Z][^.\n]+)/gi,
  ];
  
  const deliverables = [];
  for (const pattern of deliverablePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      deliverables.push(...matches.map(m => m.replace(/^(?:deliverable|assignment|project|task|submission)\s*\d*[:\s]+/i, '').trim()));
    }
  }
  
  return [...new Set(deliverables.filter(d => d.length > 2))];
}

function extractSections(text) {
  const sectionPatterns = [
    /^#+\s+(.+)$/gm,
    /^(?:chapter|section|part)\s+\d+[:\s]+(.+)$/gim,
  ];
  
  const sections = [];
  for (const pattern of sectionPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      sections.push(...matches.map(m => m.replace(/^#+\s+/, '').trim()));
    }
  }
  
  return [...new Set(sections.filter(s => s.length > 2))];
}

module.exports = router;
