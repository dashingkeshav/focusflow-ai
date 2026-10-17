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
import { useCameraMonitoring } from '@/context/CameraContext';

interface CameraTrackerProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  onDistractionDetected: (reason: string) => void;
  isActiveSession: boolean;
  showUI?: boolean;
}

type CameraStatus = 'off' | 'loading-model' | 'starting' | 'active' | 'permission-denied' | 'unavailable' | 'error';

const MIN_ALERT_INTERVAL_MS = 6000; // Minimum time between distraction alerts

export default function CameraTracker({
  isEnabled,
  onToggle,
  onDistractionDetected,
  isActiveSession,
  showUI = true,
}: CameraTrackerProps) {
  const {
    stream: contextStream,
    enableCamera,
    disableCamera,
    setFaceStatus: setContextFaceStatus,
  } = useCameraMonitoring();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isLocalStreamRef = useRef<boolean>(false);
  const detectorRef = useRef<unknown>(null);
  const frameLoopRef = useRef<number | null>(null);
  const lastAlertRef = useRef<number>(0);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('off');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [distractionCount, setDistractionCount] = useState(0);
  const [faceStatus, setFaceStatus] = useState<'present' | 'absent' | 'looked-away' | 'multiple' | 'unknown'>('unknown');
  const absentStartRef = useRef<number>(0);
  const lookAwayStartRef = useRef<number>(0);

  // ── Stop camera and cleanup ──────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (frameLoopRef.current) {
      cancelAnimationFrame(frameLoopRef.current);
      frameLoopRef.current = null;
    }
    if (isLocalStreamRef.current && streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      isLocalStreamRef.current = false;
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detectorRef.current = null;
    absentStartRef.current = 0;
    lookAwayStartRef.current = 0;
    setCameraStatus('off');
    setFaceStatus('unknown');
    setContextFaceStatus('unknown');
  }, [setContextFaceStatus]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // ── Stop camera when isEnabled goes false ─────────────────────────────────────
  useEffect(() => {
    if (!isEnabled) {
      // defer cleanup so the effect body stays free of synchronous setState
      const id = window.setTimeout(stopCamera, 0);
      return () => window.clearTimeout(id);
    }
  }, [isEnabled, stopCamera]);

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
          const now = Date.now();

          if (count === 0) {
            lookAwayStartRef.current = 0;
            if (!absentStartRef.current) absentStartRef.current = now;

            // Require 2.5 seconds of sustained absence to avoid single-frame blinks
            if (now - absentStartRef.current > 2500) {
              setFaceStatus('absent');
              setContextFaceStatus('absent');
              if (now - lastAlertRef.current > MIN_ALERT_INTERVAL_MS) {
                lastAlertRef.current = now;
                setDistractionCount((prev) => prev + 1);
                onDistractionDetected('No face detected — attention drift detected.');
              }
            }
          } else if (count > 1) {
            absentStartRef.current = 0;
            lookAwayStartRef.current = 0;
            setFaceStatus('multiple');
            setContextFaceStatus('multiple');
            if (now - lastAlertRef.current > MIN_ALERT_INTERVAL_MS) {
              lastAlertRef.current = now;
              setDistractionCount((prev) => prev + 1);
              onDistractionDetected('Multiple faces detected in camera view.');
            }
          } else {
            absentStartRef.current = 0;
            const detection = result.detections[0];
            const keypoints = detection.keypoints;

            // Keypoint 0: right eye, 1: left eye, 2: nose tip
            let isHeadTurned = false;
            if (keypoints && keypoints.length >= 3) {
              const eyeR = keypoints[0];
              const eyeL = keypoints[1];
              const nose = keypoints[2];
              const eyeCenterX = (eyeR.x + eyeL.x) / 2;
              const eyeDistance = Math.abs(eyeL.x - eyeR.x);

              if (eyeDistance > 0.02) {
                const noseOffsetRatio = (nose.x - eyeCenterX) / eyeDistance;
                // Absolute ratio > 0.45 indicates head is turned noticeably away
                if (Math.abs(noseOffsetRatio) > 0.45) {
                  isHeadTurned = true;
                }
              }
            }

            if (isHeadTurned) {
              if (!lookAwayStartRef.current) lookAwayStartRef.current = now;

              // Require 3.5 seconds of sustained head turn away from screen
              if (now - lookAwayStartRef.current > 3500) {
                setFaceStatus('looked-away');
                setContextFaceStatus('looked-away');
                if (now - lastAlertRef.current > MIN_ALERT_INTERVAL_MS) {
                  lastAlertRef.current = now;
                  setDistractionCount((prev) => prev + 1);
                  onDistractionDetected('Head turned away from screen — attention drift detected.');
                }
              }
            } else {
              lookAwayStartRef.current = 0;
              setFaceStatus('present');
              setContextFaceStatus('present');
            }
          }
        } catch {
          // Detection frame error — skip
        }
      }

      frameLoopRef.current = requestAnimationFrame(detect);
    }

    frameLoopRef.current = requestAnimationFrame(detect);
  }

  // ── Load MediaPipe FaceDetector and start camera ─────────────────────────────
  useEffect(() => {
    if (!isEnabled) return;

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

        // Reuse shared stream from CameraContext if available to prevent device lock collision
        let mediaStream: MediaStream | null =
          contextStream && contextStream.getVideoTracks().some((t) => t.readyState === 'live')
            ? contextStream
            : null;

        if (!mediaStream) {
          const success = await enableCamera();
          if (cancelled) return;
          if (success && contextStream) {
            mediaStream = contextStream;
          }
        }

        // Local fallback if context stream is not available
        if (!mediaStream) {
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { width: 320, height: 240, frameRate: 15, facingMode: 'user' },
            });
            isLocalStreamRef.current = true;
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
        }

        if (cancelled) {
          if (isLocalStreamRef.current && mediaStream) {
            mediaStream.getTracks().forEach((t) => t.stop());
            isLocalStreamRef.current = false;
          }
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
  }, [isEnabled, isActiveSession, contextStream]);

  // ── UI ───────────────────────────────────────────────────────────────────────
  const handleToggle = () => {
    if (isEnabled) {
      stopCamera();
      disableCamera();
      onToggle(false);
    } else {
      enableCamera();
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
    present: { label: 'Face Detected', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" /> },
    absent: { label: 'No Face Detected', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30 animate-pulse', icon: <AlertTriangle className="w-3 h-3 text-rose-400" /> },
    'looked-away': { label: 'Head Turned Away', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: <AlertTriangle className="w-3 h-3 text-amber-400" /> },
    multiple: { label: 'Multiple Faces', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: <AlertTriangle className="w-3 h-3 text-amber-400" /> },
    unknown: { label: 'Initializing…', color: 'text-white/40', bg: 'bg-white/5 border-white/10', icon: <Eye className="w-3 h-3 text-white/40" /> },
  };

  if (!showUI) return null;

  return (
    <div className="bg-card rounded-2xl p-4 border border-white/10 space-y-3 font-inter text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Eye className="w-4 h-4 text-[#FF4500]" />
          <span>AI Camera Monitor</span>
        </div>
        <button
          onClick={handleToggle}
          aria-label={isEnabled ? 'Disable camera monitoring' : 'Enable camera monitoring'}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            isEnabled
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-[#0a0a0a] text-white/60 border border-white/10 hover:text-white hover:bg-white/5'
          }`}
        >
          {isEnabled ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
          <span>{statusLabel[cameraStatus]}</span>
        </button>
      </div>

      {/* Privacy notice — always visible */}
      <div className="flex items-start gap-2 p-2 rounded-lg bg-[#0a0a0a] border border-white/10 text-[10px] text-white/50">
        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
        <span>Camera is processed <strong className="text-white">locally only</strong>. No video is recorded or uploaded.</span>
      </div>

      {/* Camera Feed / Status Area */}
      {isEnabled ? (
        <div className="relative aspect-video rounded-xl bg-[#0a0a0a] overflow-hidden border border-white/10 flex items-center justify-center">
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
              <div className="w-6 h-6 border-2 border-[#FF4500]/40 border-t-[#FF4500] rounded-full animate-spin" />
              <span className="text-xs text-[#FF4500] font-mono">{statusLabel[cameraStatus]}</span>
            </div>
          )}

          {/* Error states */}
          {(cameraStatus === 'permission-denied' ||
            cameraStatus === 'unavailable' ||
            cameraStatus === 'error') && (
            <div className="text-center p-4 flex flex-col items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-rose-500" />
              <span className="text-xs text-rose-400 max-w-45 text-center">{errorMessage}</span>
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
              <span className="px-2 py-0.5 rounded-full bg-[#0a0a0a]/80 text-white/70 border border-white/10 font-mono">
                Alerts: {distractionCount}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-[#0a0a0a] border border-dashed border-white/10 text-center">
          <p className="text-xs text-white/50">
            Enable camera monitoring to detect look-away events during your focus session.
          </p>
        </div>
      )}

      {/* Stats row — only when active */}
      {cameraStatus === 'active' && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/50">
            Look-away events: <strong className="text-white font-mono">{distractionCount}</strong>
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            faceStatus === 'present'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            {faceStatus === 'present' ? '● Monitoring' : '● Attention Required'}
          </span>
        </div>
      )}
    </div>
  );
}
