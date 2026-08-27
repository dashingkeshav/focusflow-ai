'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import { Camera, X, ShieldCheck } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [cameraPrompt, setCameraPrompt] = useState(false);
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Show camera permission prompt once per session
  useEffect(() => {
    if (!user) return;
    const alreadyAsked = sessionStorage.getItem('camera_prompt_shown');
    if (!alreadyAsked) {
      const timer = setTimeout(() => setCameraPrompt(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop()); // Release immediately after getting permission
      setCameraGranted(true);
    } catch {
      setCameraGranted(false);
    }
    setCameraPrompt(false);
    sessionStorage.setItem('camera_prompt_shown', '1');
  };

  const dismissCameraPrompt = () => {
    setCameraPrompt(false);
    sessionStorage.setItem('camera_prompt_shown', '1');
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#07080c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080c] text-gray-100 flex font-sans">
      {/* Camera Permission Prompt Overlay */}
      {cameraPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm glass-card rounded-2xl p-6 border border-white/10 shadow-2xl space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-600/30">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <button onClick={dismissCameraPrompt} className="text-gray-500 hover:text-gray-300 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Enable AI Camera Monitor</h2>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                FocusFlow AI uses your webcam to detect when you look away from study material. 
                <strong className="text-white"> No video is stored or uploaded</strong> — all processing happens locally on your device.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-gray-300">
              {[
                'Detects look-away and absence events',
                'Live face presence indicator on session screen',
                'Automatically decreases Focus Score on distraction',
                'Processed locally on your device — no video is uploaded',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button
                id="allow-camera-btn"
                onClick={requestCameraPermission}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold text-xs shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Allow Camera Access
              </button>
              <button
                id="skip-camera-btn"
                onClick={dismissCameraPrompt}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-medium hover:bg-white/10 transition-all"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera permission toast notification */}
      {cameraGranted !== null && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-medium shadow-xl transition-all ${
          cameraGranted
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
            : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
        }`}>
          <Camera className={`w-4 h-4 ${cameraGranted ? 'text-emerald-400' : 'text-rose-400'}`} />
          {cameraGranted
            ? '✅ Camera access granted! AI distraction monitoring is active.'
            : '⚠️ Camera access denied. You can enable it later in Study Sessions.'}
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader activeSession={false} currentScore={0} />
        <main className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
