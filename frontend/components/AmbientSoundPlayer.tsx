"use client";

import { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";

export type AmbientSoundType = "off" | "space" | "brown" | "rain" | "binaural";

interface AmbientSoundPlayerProps {
  isPlayingSession?: boolean;
  className?: string;
}

export default function AmbientSoundPlayer({
  isPlayingSession: _isPlayingSession = false,
  className = "",
}: AmbientSoundPlayerProps) {
  const [selectedSound, setSelectedSound] = useState<AmbientSoundType>("off");
  const [volume, setVolume] = useState<number>(0.35);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<AudioNode[]>([]);

  // Stop active synthesis
  const stopSynthesis = () => {
    activeNodesRef.current.forEach((node) => {
      try {
        if ("stop" in node && typeof (node as AudioScheduledSourceNode).stop === "function") {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // Safe cleanup
      }
    });
    activeNodesRef.current = [];
  };

  // Start sound generator based on type
  const startSound = (type: AmbientSoundType) => {
    stopSynthesis();
    if (type === "off") return;

    if (!audioCtxRef.current) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtxClass();
    }

    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(isMuted ? 0 : volume, ctx.currentTime);
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    if (type === "space") {
      // Warm Deep Space Cosmic Drone
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(55, ctx.currentTime); // A1 note
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(110, ctx.currentTime); // A2 harmonic

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(180, ctx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(masterGain);

      osc1.start();
      osc2.start();
      activeNodesRef.current = [osc1, osc2, filter, masterGain];
    } else if (type === "brown") {
      // Brown Noise Generator via Buffer
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Gain compensation
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(masterGain);

      whiteNoise.start();
      activeNodesRef.current = [whiteNoise, filter, masterGain];
    } else if (type === "binaural") {
      // 10 Hz Alpha Wave Binaural Beat (Carrier 432 Hz)
      const leftOsc = ctx.createOscillator();
      const rightOsc = ctx.createOscillator();
      const merger = ctx.createChannelMerger(2);

      leftOsc.frequency.setValueAtTime(432, ctx.currentTime);
      rightOsc.frequency.setValueAtTime(442, ctx.currentTime); // 10 Hz beat difference

      leftOsc.connect(merger, 0, 0);
      rightOsc.connect(merger, 0, 1);
      merger.connect(masterGain);

      leftOsc.start();
      rightOsc.start();
      activeNodesRef.current = [leftOsc, rightOsc, merger, masterGain];
    } else if (type === "rain") {
      // Soft Rainfall Emulation
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let b0 = 0,
        b1 = 0,
        b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.153852;
        output[i] = (b0 + b1 + b2) * 0.11;
      }

      const rainSource = ctx.createBufferSource();
      rainSource.buffer = noiseBuffer;
      rainSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
      filter.Q.setValueAtTime(0.5, ctx.currentTime);

      rainSource.connect(filter);
      filter.connect(masterGain);

      rainSource.start();
      activeNodesRef.current = [rainSource, filter, masterGain];
    }
  };

  // React to sound selection changes
  useEffect(() => {
    startSound(selectedSound);
    return () => stopSynthesis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSound]);

  // React to volume changes
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(
        isMuted ? 0 : volume,
        audioCtxRef.current.currentTime
      );
    }
  }, [volume, isMuted]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopSynthesis();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <div
      className={`rounded-2xl border border-[#262832] bg-[#12131A] p-4 text-xs font-mono ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-zinc-300 font-bold">
          <Volume2 className="h-4 w-4 text-[#FF4500]" />
          <span>AMBIENT SOUNDSCAPE</span>
        </div>
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className={`p-1 rounded-md transition-colors ${
            isMuted ? "text-rose-400 bg-rose-500/10" : "text-zinc-400 hover:text-white"
          }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Sound Selection Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
        {[
          { id: "off", label: "Mute / Off" },
          { id: "space", label: "Deep Space" },
          { id: "brown", label: "Brown Noise" },
          { id: "rain", label: "Rain Flow" },
        ].map((sound) => {
          const isSelected = selectedSound === sound.id;
          return (
            <button
              key={sound.id}
              type="button"
              onClick={() => setSelectedSound(sound.id as AmbientSoundType)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all text-center ${
                isSelected
                  ? "bg-[#FF4500] text-white font-bold shadow-xs"
                  : "bg-[#08090D] border border-[#262832] text-zinc-400 hover:text-white hover:border-zinc-700"
              }`}
            >
              {sound.label}
            </button>
          );
        })}
      </div>

      {/* Volume Slider */}
      {selectedSound !== "off" && (
        <div className="flex items-center gap-3 pt-2 border-t border-[#262832] text-[11px] text-zinc-400">
          <span>Vol:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="w-full h-1.5 bg-[#262832] rounded-lg appearance-none cursor-pointer accent-[#FF4500]"
          />
          <span className="w-8 text-right font-mono">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
        </div>
      )}
    </div>
  );
}
