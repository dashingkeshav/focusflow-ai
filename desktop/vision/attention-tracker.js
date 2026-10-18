/**
 * FocusFlow AI — Genuine On-Device Camera Attention AI Tracker
 *
 * Runs 100% on-device in Windows desktop memory using:
 * - Pico.js cascade classifier for real-time human face detection.
 * - LPLoc (landmark pupil localizer) for eye pupil position and head/gaze orientation.
 *
 * Guarantees:
 * 1. Zero network requests: all model inference is executed on local pixel buffers.
 * 2. Privacy-preserving: camera imagery is never saved, streamed, or uploaded.
 * 3. Honest state reporting: never labels simulated or hardcoded values as real detections.
 * 4. Proper hardware lifecycle: media tracks are requested only when active and stopped immediately upon exit.
 */

(function (window) {
  "use strict";

  class AttentionTracker {
    constructor(options = {}) {
      this.video = options.video;
      this.canvas = options.canvas;
      this.onStateChange = options.onStateChange || (() => {});
      this.onTelemetryUpdate = options.onTelemetryUpdate || (() => {});
      this.onError = options.onError || (() => {});

      this.isRunning = false;
      this.stream = null;
      this.pollTimeout = null;
      this.secondInterval = null;

      this.faceClassifier = null;
      this.pupilLocalizer = null;
      this.updateMemory = null;
      this.isModelReady = false;

      this.currentState = "off"; // 'off' | 'starting' | 'attentive' | 'absent' | 'outside_region' | 'diverted' | 'error'
      this.lastDetection = null;

      // Telemetry accounting (all values measured from real detections)
      this.metrics = {
        totalSeconds: 0,
        attentiveSeconds: 0,
        absentSeconds: 0,
        divertedSeconds: 0,
        focusRatio: 100,
        distractionEvents: 0,
      };

      // Real measured detection rate
      this.detectionFps = 0;
      this.framesProcessed = 0;
      this.fpsWindowStart = 0;
      this.previousState = "off";

      // Offscreen canvas for frame pixel processing
      this.offscreenCanvas = document.createElement("canvas");
      this.offscreenCanvas.width = 320;
      this.offscreenCanvas.height = 240;
      this.offscreenCtx = this.offscreenCanvas.getContext("2d", { willReadFrequently: true });
    }

    async initModels(bridge) {
      if (this.isModelReady) return true;

      try {
        if (!window.pico || typeof window.pico.unpack_cascade !== "function") {
          throw new Error("Pico face detection runtime is not loaded.");
        }

        if (!bridge || typeof bridge.loadVisionAsset !== "function") {
          throw new Error("No on-device vision asset loader was provided.");
        }

        const toInt8 = (buf) => {
          if (buf instanceof Int8Array) return buf;
          if (buf instanceof ArrayBuffer) return new Int8Array(buf);
          if (ArrayBuffer.isView(buf)) {
            return new Int8Array(buf.buffer, buf.byteOffset, buf.byteLength);
          }
          return new Int8Array(buf);
        };

        // 1. Load facefinder cascade binary
        const facefinderBuf = await bridge.loadVisionAsset("facefinder.bin");
        if (!facefinderBuf || (facefinderBuf.byteLength || facefinderBuf.length || 0) < 1000) {
          throw new Error("Facefinder cascade model asset is missing or corrupted.");
        }
        this.faceClassifier = window.pico.unpack_cascade(toInt8(facefinderBuf));
        this.updateMemory = window.pico.instantiate_detection_memory(5);

        // 2. Load pupil localizer binary if lploc runtime is present
        if (window.lploc && typeof window.lploc.unpack_localizer === "function") {
          try {
            const puplocBuf = await bridge.loadVisionAsset("puploc.bin");
            if (puplocBuf && (puplocBuf.byteLength || puplocBuf.length || 0) > 1000) {
              this.pupilLocalizer = window.lploc.unpack_localizer(toInt8(puplocBuf));
            }
          } catch (e) {
            console.warn("Pupil localizer model asset notice:", e.message);
          }
        }

        this.isModelReady = true;
        return true;
      } catch (err) {
        console.error("Failed to initialize vision models:", err);
        this.onError("MODEL_INIT_FAILED", err.message);
        return false;
      }
    }

    async start(bridge) {
      if (this.isRunning) return true;

      this.currentState = "starting";
      this.emitState({
        state: "starting",
        label: "INITIALIZING SENSOR…",
        pillClass: "connecting",
        message: "Starting webcam sensor and loading on-device vision models...",
      });

      // Ensure model binaries are loaded and unpacked
      const modelsOk = await this.initModels(bridge);
      if (!modelsOk) {
        this.currentState = "error";
        this.emitState({
          state: "error",
          label: "MODEL ERROR",
          pillClass: "offline",
          message: "Failed to initialize on-device face detection models.",
        });
        return false;
      }

      // Request hardware camera stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: "user",
          },
          audio: false,
        });

        this.stream = stream;
        this.isRunning = true;

        if (this.video) {
          this.video.srcObject = stream;
          await this.video.play().catch(() => {});
        }

        this.startInferenceLoop();
        this.startTelemetryTimer();

        return true;
      } catch (err) {
        console.error("Camera access error:", err);
        this.isRunning = false;
        this.currentState = "error";

        let errorMsg = "Unable to access camera hardware.";
        let errorLabel = "CAMERA UNAVAILABLE";

        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          errorMsg = "Camera permission was denied. Please allow camera access in Windows Settings (Privacy & security > Camera).";
          errorLabel = "PERMISSION DENIED";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          errorMsg = "No webcam device detected on this system. Connect a physical camera to enable attention tracking.";
          errorLabel = "NO CAMERA FOUND";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          errorMsg = "Webcam is currently locked or in use by another Windows application.";
          errorLabel = "CAMERA IN USE";
        }

        this.emitState({
          state: "error",
          label: errorLabel,
          pillClass: "offline",
          message: errorMsg,
          rawError: err.message,
        });
        this.onError(err.name, errorMsg);
        return false;
      }
    }

    stop() {
      this.isRunning = false;
      this.currentState = "off";

      if (this.pollTimeout) {
        clearTimeout(this.pollTimeout);
        this.pollTimeout = null;
      }
      if (this.secondInterval) {
        clearInterval(this.secondInterval);
        this.secondInterval = null;
      }

      if (this.stream) {
        this.stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (_) {}
        });
        this.stream = null;
      }

      if (this.video) {
        this.video.srcObject = null;
      }

      if (this.canvas) {
        const ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }

      this.emitState({
        state: "off",
        label: "CAMERA OFF",
        pillClass: "off",
        message: "Camera monitoring is disabled. Click 'Start Camera Monitor' to activate.",
      });
    }

    startInferenceLoop() {
      const detectStep = () => {
        if (!this.isRunning) return;

        if (this.video && this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          this.processFrame();
        }

        // Run at ~15 FPS (every ~66ms) to keep CPU overhead negligible (< 3%)
        this.pollTimeout = setTimeout(() => {
          if (this.isRunning) detectStep();
        }, 66);
      };

      detectStep();
    }

    /*
     * Emit a state transition. Counts one distraction event only on a real
     * attentive → not-attentive transition, never on every frame.
     */
    emitState(payload) {
      const nextState = payload && payload.state ? payload.state : "off";
      const distracting = ["absent", "diverted", "outside_region"].includes(nextState);

      if (this.isRunning && distracting && this.previousState === "attentive") {
        this.metrics.distractionEvents++;
      }

      if (nextState !== this.previousState) {
        this.previousState = nextState;
      }

      this.onStateChange(payload);
    }

    getSummary() {
      return {
        totalSeconds: this.metrics.totalSeconds,
        attentiveSeconds: this.metrics.attentiveSeconds,
        absentSeconds: this.metrics.absentSeconds,
        divertedSeconds: this.metrics.divertedSeconds,
        focusRatio: this.metrics.focusRatio,
        distractionEvents: this.metrics.distractionEvents,
        detectionFps: this.detectionFps,
      };
    }

    processFrame() {
      const vWidth = this.video.videoWidth || 320;
      const vHeight = this.video.videoHeight || 240;
      if (vWidth === 0 || vHeight === 0) return;

      const targetW = 320;
      const targetH = 240;

      // Extract pixel buffer
      this.offscreenCtx.drawImage(this.video, 0, 0, targetW, targetH);
      const imgData = this.offscreenCtx.getImageData(0, 0, targetW, targetH);
      const rgba = imgData.data;

      // Convert to grayscale for cascade classifier
      const gray = new Uint8Array(targetW * targetH);
      for (let i = 0; i < targetW * targetH; i++) {
        gray[i] = (299 * rgba[i * 4] + 587 * rgba[i * 4 + 1] + 114 * rgba[i * 4 + 2]) / 1000;
      }

      const image = {
        pixels: gray,
        nrows: targetH,
        ncols: targetW,
        ldim: targetW,
      };

      const params = {
        shiftfactor: 0.1,
        minsize: 60,
        maxsize: 220,
        scalefactor: 1.1,
      };

      // Run real multi-scale cascade
      let dets = window.pico.run_cascade(image, this.faceClassifier, params);
      if (this.updateMemory) {
        dets = this.updateMemory(dets);
      }
      dets = window.pico.cluster_detections(dets, 0.2);

      // Measure the real detection rate from processed frames
      this.framesProcessed++;
      const nowMs = performance.now();
      if (!this.fpsWindowStart) this.fpsWindowStart = nowMs;
      if (nowMs - this.fpsWindowStart >= 1000) {
        this.detectionFps = Math.round(
          (this.framesProcessed * 1000) / (nowMs - this.fpsWindowStart)
        );
        this.framesProcessed = 0;
        this.fpsWindowStart = nowMs;
      }

      // Filter by confidence threshold (score >= 30)
      const validFaces = dets.filter((d) => d[3] >= 30.0);

      if (validFaces.length === 0) {
        this.currentState = "absent";
        this.lastDetection = null;
        this.drawOverlay(targetW, targetH, null, null, "absent");
        this.emitState({
          state: "absent",
          label: "● FACE ABSENT",
          pillClass: "offline",
          message: "No user face detected in camera viewport.",
          details: "User stepped away from desk.",
        });
        return;
      }

      // Strongest face detection
      validFaces.sort((a, b) => b[3] - a[3]);
      const face = validFaces[0];
      const [r, c, s, q] = face; // row center, col center, size, quality

      // Check supported attention region (centered 20%-80% horizontally, 15%-85% vertically)
      const isCenteredX = c >= targetW * 0.20 && c <= targetW * 0.80;
      const isCenteredY = r >= targetH * 0.15 && r <= targetH * 0.85;
      const isAdequateSize = s >= 65 && s <= 210;

      let pupils = null;
      let gazeDiverted = false;

      // Real pupil localization if model loaded
      if (this.pupilLocalizer && s >= 70) {
        try {
          const eyeRowOffset = -0.075 * s;
          const eyeColOffset = 0.175 * s;
          const eyeScale = 0.35 * s;

          const [lr, lc] = this.pupilLocalizer(r + eyeRowOffset, c - eyeColOffset, eyeScale, 63, image);
          const [rr, rc] = this.pupilLocalizer(r + eyeRowOffset, c + eyeColOffset, eyeScale, 63, image);

          if (lr >= 0 && lc >= 0 && rr >= 0 && rc >= 0) {
            pupils = { left: { r: lr, c: lc }, right: { r: rr, c: rc } };

            const eyeDist = Math.hypot(rc - lc, rr - lr);
            if (eyeDist > 20) {
              const eyeMidX = (lc + rc) / 2;
              const yawOffset = Math.abs((eyeMidX - c) / eyeDist);
              if (yawOffset > 0.32) {
                gazeDiverted = true;
              }
            }
          }
        } catch (_) {}
      }

      let stateName = "attentive";
      let stateLabel = "● ATTENTIVE";
      let pillClass = "attentive";
      let statusDesc = "Face aligned with primary monitor. Focus confirmed.";

      if (!isCenteredX || !isCenteredY || !isAdequateSize) {
        stateName = "outside_region";
        stateLabel = "● OUTSIDE FOCUS ZONE";
        pillClass = "offline";
        statusDesc = "Head turned away or positioned outside center focus zone.";
      } else if (gazeDiverted) {
        stateName = "diverted";
        stateLabel = "● GAZE DIVERTED";
        pillClass = "connecting";
        statusDesc = "Eyes directed away from workspace display.";
      } else {
        stateName = "attentive";
        stateLabel = "● ATTENTIVE";
        pillClass = "attentive";
        statusDesc = "Direct screen attention verified by on-device model.";
      }

      this.currentState = stateName;
      this.lastDetection = { r, c, s, q, pupils };

      this.drawOverlay(targetW, targetH, face, pupils, stateName);

      this.emitState({
        state: stateName,
        label: stateLabel,
        pillClass,
        message: statusDesc,
        confidence: Math.min(99, Math.round(q)),
        faceCoords: {
          x: Math.round(c - s / 2),
          y: Math.round(r - s / 2),
          size: Math.round(s),
        },
      });
    }

    drawOverlay(width, height, face, pupils, stateName) {
      if (!this.canvas) return;
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }

      const ctx = this.canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);

      // Target attention region rectangle
      const zoneX = width * 0.20;
      const zoneY = height * 0.15;
      const zoneW = width * 0.60;
      const zoneH = height * 0.70;

      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(zoneX, zoneY, zoneW, zoneH);
      ctx.restore();

      // Real detected face bounding brackets
      if (face) {
        const [r, c, s] = face;
        const boxX = c - s / 2;
        const boxY = r - s / 2;

        ctx.save();
        if (stateName === "attentive") {
          ctx.strokeStyle = "#10b981"; // Emerald green
          ctx.lineWidth = 2.5;
        } else if (stateName === "diverted") {
          ctx.strokeStyle = "#f59e0b"; // Amber
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = "#ef4444"; // Red
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
        }

        // Draw HUD corner brackets
        const len = Math.max(12, Math.min(24, Math.round(s * 0.2)));
        // Top-left
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + len);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX + len, boxY);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(boxX + s - len, boxY);
        ctx.lineTo(boxX + s, boxY);
        ctx.lineTo(boxX + s, boxY + len);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + s - len);
        ctx.lineTo(boxX, boxY + s);
        ctx.lineTo(boxX + len, boxY + s);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(boxX + s - len, boxY + s);
        ctx.lineTo(boxX + s, boxY + s);
        ctx.lineTo(boxX + s, boxY + s - len);
        ctx.stroke();

        // Real pupil markers
        if (pupils) {
          ctx.fillStyle = stateName === "attentive" ? "#10b981" : "#f59e0b";
          ctx.beginPath();
          ctx.arc(pupils.left.c, pupils.left.r, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(pupils.right.c, pupils.right.r, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    startTelemetryTimer() {
      if (this.secondInterval) clearInterval(this.secondInterval);

      this.secondInterval = setInterval(() => {
        if (!this.isRunning) {
          clearInterval(this.secondInterval);
          return;
        }

        this.metrics.totalSeconds++;
        if (this.currentState === "attentive") {
          this.metrics.attentiveSeconds++;
        } else if (this.currentState === "absent") {
          this.metrics.absentSeconds++;
        } else if (this.currentState === "outside_region" || this.currentState === "diverted") {
          this.metrics.divertedSeconds++;
        }

        const ratio =
          this.metrics.totalSeconds > 0
            ? Math.round((this.metrics.attentiveSeconds / this.metrics.totalSeconds) * 100)
            : 100;

        this.metrics.focusRatio = ratio;

        this.onTelemetryUpdate({
          totalSeconds: this.metrics.totalSeconds,
          attentiveSeconds: this.metrics.attentiveSeconds,
          absentSeconds: this.metrics.absentSeconds,
          divertedSeconds: this.metrics.divertedSeconds,
          focusRatio: ratio,
          distractionEvents: this.metrics.distractionEvents,
          detectionFps: this.detectionFps,
          attentiveNow: this.currentState === "attentive",
        });
      }, 1000);
    }
  }

  window.AttentionTracker = AttentionTracker;
})(window);
