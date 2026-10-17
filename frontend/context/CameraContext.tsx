"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";

interface CameraContextType {
  cameraEnabled: boolean;
  cameraActive: boolean;
  cameraStatus: "off" | "starting" | "active" | "denied" | "unavailable" | "error";
  cameraError: string | null;
  distractionCount: number;
  faceStatus: "present" | "absent" | "looked-away" | "multiple" | "unknown";
  setFaceStatus: (status: "present" | "absent" | "looked-away" | "multiple" | "unknown") => void;
  enableCamera: () => Promise<boolean>;
  disableCamera: () => void;
  stream: MediaStream | null;
  resetDistractionCount: () => void;
  registerDistractionHandler: (handler: (reason: string) => void) => () => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

/**
 * PRIVACY GUARANTEE:
 * - The camera NEVER starts on public pages or before sign-in.
 * - It only (re)starts while a signed-in user has explicitly enabled it
 *   (explicit user gesture in this session, or an explicit saved choice).
 * - Signing out always stops the stream immediately.
 */
export function CameraProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [cameraEnabled, setCameraEnabled] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<CameraContextType["cameraStatus"]>("off");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [distractionCount, setDistractionCount] = useState<number>(0);
  const [faceStatus, setFaceStatus] = useState<CameraContextType["faceStatus"]>("unknown");
  const [stream, setStream] = useState<MediaStream | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const frameLoopRef = useRef<number | null>(null);
  const handlersRef = useRef<Set<(reason: string) => void>>(new Set());
  // Set when the user explicitly turned the camera OFF — blocks any auto-restart.
  const explicitlyDisabledRef = useRef<boolean>(false);

  // =====================================================
  // Stop camera helper
  // =====================================================
  const stopCameraTracks = useCallback(() => {
    if (frameLoopRef.current) {
      cancelAnimationFrame(frameLoopRef.current);
      frameLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setStream(null);
    setCameraActive(false);
    setCameraStatus("off");
    setFaceStatus("unknown");
  }, []);

  // =====================================================
  // Restore camera preference per user (signed-in only).
  // Also hard-stops the camera if the user signed out.
  // =====================================================
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!userId) {
        // Signed out (or auth still resolving): no camera, ever.
        stopCameraTracks();
        setCameraEnabled(false);
        explicitlyDisabledRef.current = false;
        return;
      }
      const storedChoice = localStorage.getItem(`focusflow_camera_enabled_${userId}`);
      if (storedChoice === "1" && !explicitlyDisabledRef.current) {
        // User explicitly opted in previously — allow auto-restart, but only
        // while signed in. The auto-restart effect owns the actual start.
        setCameraEnabled(true);
      } else {
        setCameraEnabled(false);
        setCameraStatus("off");
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [userId, stopCameraTracks]);

  // =====================================================
  // Disable Camera (explicit user action)
  // =====================================================
  const disableCamera = useCallback(() => {
    explicitlyDisabledRef.current = true;
    stopCameraTracks();
    setCameraEnabled(false);
    if (userId) {
      localStorage.setItem(`focusflow_camera_enabled_${userId}`, "0");
    }
  }, [stopCameraTracks, userId]);

  // =====================================================
  // Enable Camera (requests getUserMedia)
  // =====================================================
  const enableCamera = useCallback(async (): Promise<boolean> => {
    // Hard gate: camera is only available to signed-in users.
    if (!userId) {
      setCameraStatus("off");
      setCameraError("Please sign in to enable camera monitoring.");
      return false;
    }

    explicitlyDisabledRef.current = false;
    setCameraError(null);

    // Reuse stream if already active to avoid hardware device lock collisions
    if (streamRef.current && streamRef.current.getVideoTracks().some((t) => t.readyState === "live")) {
      setStream(streamRef.current);
      setCameraEnabled(true);
      setCameraActive(true);
      setCameraStatus("active");
      return true;
    }

    setCameraStatus("starting");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus("unavailable");
      setCameraError("Camera access is not supported by your browser.");
      return false;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 15, facingMode: "user" },
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraEnabled(true);
      setCameraActive(true);
      setCameraStatus("active");
      setFaceStatus("present");

      localStorage.setItem(`focusflow_camera_enabled_${userId}`, "1");
      return true;
    } catch (err: unknown) {
      console.error("[CameraContext] getUserMedia error:", err);
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraStatus("denied");
        setCameraError("Camera permission was denied in your browser settings.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setCameraStatus("unavailable");
        setCameraError("No camera device was found.");
      } else {
        setCameraStatus("error");
        setCameraError("Failed to initialize camera.");
      }

      localStorage.setItem(`focusflow_camera_enabled_${userId}`, "0");
      return false;
    }
  }, [userId]);

  // =====================================================
  // Cleanup on unmount
  // =====================================================
  useEffect(() => {
    return () => {
      stopCameraTracks();
    };
  }, [stopCameraTracks]);

  // =====================================================
  // Auto-restart ONLY when all of these hold:
  //   - a user is signed in
  //   - the user explicitly enabled the camera
  //   - the user has not explicitly disabled it
  //   - the stream was lost (e.g. device sleep)
  // This effect can never fire on public pages because
  // enableCamera() hard-gates on userId as well.
  // =====================================================
  useEffect(() => {
    if (!userId) return;
    // Never auto-start outside the dashboard (e.g. public homepage,
    // pricing, auth pages) even when signed in.
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/dashboard")) return;
    if (!cameraEnabled || cameraActive || cameraStatus !== "off") return;
    if (explicitlyDisabledRef.current) return;

    const t = window.setTimeout(() => {
      enableCamera().catch(() => {});
    }, 800);
    return () => window.clearTimeout(t);
  }, [userId, cameraEnabled, cameraActive, cameraStatus, enableCamera]);

  const resetDistractionCount = useCallback(() => setDistractionCount(0), []);

  const registerDistractionHandler = useCallback((handler: (reason: string) => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return (
    <CameraContext.Provider
      value={{
        cameraEnabled,
        cameraActive,
        cameraStatus,
        cameraError,
        distractionCount,
        faceStatus,
        setFaceStatus,
        enableCamera,
        disableCamera,
        stream,
        resetDistractionCount,
        registerDistractionHandler,
      }}
    >
      {children}
    </CameraContext.Provider>
  );
}

export function useCameraMonitoring() {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error("useCameraMonitoring must be used within a CameraProvider");
  }
  return context;
}
