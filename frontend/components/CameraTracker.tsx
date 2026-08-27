'use client';

/**
 * CameraTracker — Real-time face detection using @mediapipe/tasks-vision.
 *
 * Privacy guarantees:
 * - Camera is only requested when the user explicitly enables it.
 * - No video frames are sent to any server.
 * - Only derived events (face present / absent) are reported.
 * - Camera stream is stopped on unmount and session end.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertTriangle, Eye, ShieldCheck, CheckCircle2, ShieldAlert } from 'lucide-react';

interface CameraTrackerProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  onDistractionDetected: (reason: string) => void;
  isActiveSession: boolean;
}

type CameraStatus = 'off' | 'loading-model' | 'starting' | 'active' | 'permission-denied' | 'unavailable' | 'error';

const MIN_ALERT_INTERVAL_MS = 6000; // Minimum time between distraction alerts

export default function CameraTracker({
  isEnabled,
  onToggle,
  onDistractionDetected,
  isActiveSession,
}: CameraTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<unknown>(null);
  const frameLoopRef = useRef<number | null>(null);
  const lastAlertRef = useRef<number>(0);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('off');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [distractionCount, setDistractionCount] = useState(0);
  const [faceStatus, setFaceStatus] = useState<'present' | 'absent' | 'multiple' | 'unknown'>('unknown');

  // ── Stop camera and cleanup ──────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (frameLoopRef.current) {
      cancelAnimationFrame(frameLoopRef.current);
      frameLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detectorRef.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCameraStatus('off');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFaceStatus('unknown');
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // ── Stop camera when session ends or isEnabled goes false ────────────────────
  useEffect(() => {
    if (!isEnabled || !isActiveSession) {
      stopCamera();
    }
  }, [isEnabled, isActiveSession, stopCamera]);

  // ── Load MediaPipe FaceDetector and start camera ─────────────────────────────
  useEffect(() => {
    if (!isEnabled || !isActiveSession) return;

    let cancelled = false;

    async function start() {
      setCameraStatus('loading-model');
      setErrorMessage(null);

      try {
        // Dynamically import to avoid SSR issues
        const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');

        if (cancelled) return;

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
        );

        if (cancelled) return;

        const faceDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
        });

        if (cancelled) {
          faceDetector.close();
          return;
        }

        detectorRef.current = faceDetector;
        setCameraStatus('starting');

        // Request camera permission
        let mediaStream: MediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, frameRate: 15, facingMode: 'user' },
          });
        } catch (camErr: unknown) {
          if (cancelled) return;
          const name = camErr instanceof Error ? camErr.name : '';
          if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            setCameraStatus('permission-denied');
            setErrorMessage('Camera permission denied. Please allow camera access in your browser settings.');
          } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
            setCameraStatus('unavailable');
            setErrorMessage('No camera found on this device.');
          } else {
            setCameraStatus('error');
            setErrorMessage('Camera could not be started. Please check your device.');
          }
          return;
        }

        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
        }

        setCameraStatus('active');
        runDetectionLoop(faceDetector as import('@mediapipe/tasks-vision').FaceDetector);
      } catch (err) {
        if (cancelled) return;
        console.error('[CameraTracker] Initialization error:', err);
        setCameraStatus('error');
        setErrorMessage('Face detection could not be initialized. Please try again.');
      }
    }

    start();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, isActiveSession]);

  // ── Detection loop ───────────────────────────────────────────────────────────
  function runDetectionLoop(faceDetector: import('@mediapipe/tasks-vision').FaceDetector) {
    let lastVideoTime = -1;

    function detect() {
      const video = videoRef.current;
      if (!video || !faceDetector || video.readyState < 2) {
        frameLoopRef.current = requestAnimationFrame(detect);
        return;
      }

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;

        try {
          const result = faceDetector.detectForVideo(video, Date.now());
          const count = result.detections?.length ?? 0;

          if (count === 0) {
            setFaceStatus('absent');
            const now = Date.now();
            if (now - lastAlertRef.current > MIN_ALERT_INTERVAL_MS) {
              lastAlertRef.current = now;
              setDistractionCount((prev) => prev + 1);
              onDistractionDetected('No face detected — you may have looked away.');
            }
          } else if (count > 1) {
            setFaceStatus('multiple');
            const now = Date.now();
            if (now - lastAlertRef.current > MIN_ALERT_INTERVAL_MS) {
              lastAlertRef.current = now;
              setDistractionCount((prev) => prev + 1);
              onDistractionDetected('Multiple faces detected during focus session.');
            }
          } else {
            setFaceStatus('present');
          }
        } catch {
          // Detection frame error — skip
        }
      }

      frameLoopRef.current = requestAnimationFrame(detect);
    }

    frameLoopRef.current = requestAnimationFrame(detect);
  }

  // ── UI ───────────────────────────────────────────────────────────────────────
  const handleToggle = () => {
    if (isEnabled) {
      stopCamera();
      onToggle(false);
    } else {
      onToggle(true);
    }
  };

  const statusLabel: Record<CameraStatus, string> = {
    off: 'Camera Off',
    'loading-model': 'Loading AI model…',
    starting: 'Requesting camera…',
    active: 'Camera Active',
    'permission-denied': 'Permission Denied',
    unavailable: 'Camera Not Found',
    error: 'Camera Error',
  };

  const faceStatusConfig = {
    present: { label: 'Face Detected', color: 'text-emerald-300', bg: 'bg-emerald-950/80 border-emerald-500/50', icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" /> },
    absent: { label: 'No Face Detected', color: 'text-rose-300', bg: 'bg-rose-950/80 border-rose-500/50 animate-pulse', icon: <AlertTriangle className="w-3 h-3 text-rose-400" /> },
    multiple: { label: 'Multiple Faces', color: 'text-amber-300', bg: 'bg-amber-950/80 border-amber-500/50', icon: <AlertTriangle className="w-3 h-3 text-amber-400" /> },
    unknown: { label: 'Initializing…', color: 'text-gray-400', bg: 'bg-slate-950/80 border-white/10', icon: <Eye className="w-3 h-3 text-gray-400" /> },
  };

  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Eye className="w-4 h-4 text-cyan-400" />
          <span>AI Camera Monitor</span>
        </div>
        <button
          onClick={handleToggle}
          aria-label={isEnabled ? 'Disable camera monitoring' : 'Enable camera monitoring'}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            isEnabled
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-white/10 text-gray-400 border border-white/10 hover:bg-white/20'
          }`}
        >
          {isEnabled ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
          <span>{statusLabel[cameraStatus]}</span>
        </button>
      </div>

      {/* Privacy notice — always visible */}
      <div className="flex items-start gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-[10px] text-gray-400">
        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
        <span>Camera is processed <strong className="text-white">locally only</strong>. No video is recorded or uploaded.</span>
      </div>

      {/* Camera Feed / Status Area */}
      {isEnabled ? (
        <div className="relative aspect-video rounded-xl bg-black/60 overflow-hidden border border-white/10 flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            aria-label="Camera monitoring feed"
            className={`w-full h-full object-cover scale-x-[-1] ${cameraStatus === 'active' ? 'block' : 'hidden'}`}
          />

          {/* Loading / initializing states */}
          {(cameraStatus === 'loading-model' || cameraStatus === 'starting') && (
            <div className="text-center p-4 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
              <span className="text-xs text-cyan-400">{statusLabel[cameraStatus]}</span>
            </div>
          )}

          {/* Error states */}
          {(cameraStatus === 'permission-denied' ||
            cameraStatus === 'unavailable' ||
            cameraStatus === 'error') && (
            <div className="text-center p-4 flex flex-col items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-rose-400" />
              <span className="text-xs text-rose-300 max-w-[180px] text-center">{errorMessage}</span>
            </div>
          )}

          {/* Face status badge — only shown when active */}
          {cameraStatus === 'active' && (
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[10px]">
              <span
                className={`px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 backdrop-blur-md border ${faceStatusConfig[faceStatus].bg} ${faceStatusConfig[faceStatus].color}`}
              >
                {faceStatusConfig[faceStatus].icon}
                {faceStatusConfig[faceStatus].label}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-900/80 text-gray-300 border border-white/10 font-mono">
                Alerts: {distractionCount}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-white/5 border border-dashed border-white/10 text-center">
          <p className="text-xs text-gray-400">
            Enable camera monitoring to detect look-away events during your focus session.
          </p>
        </div>
      )}

      {/* Stats row — only when active */}
      {cameraStatus === 'active' && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            Look-away events: <strong className="text-white font-mono">{distractionCount}</strong>
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            faceStatus === 'present'
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/20 text-rose-300'
          }`}>
            {faceStatus === 'present' ? '● Monitoring' : '● Attention Required'}
          </span>
        </div>
      )}
    </div>
  );
}
