import type { Metadata } from "next";
import FocusRoomsContent from "./FocusRoomsContent";

export const metadata: Metadata = {
  title: "Focus Rooms — Live Coworking & Synchronized Accountability | FocusFlow AI",
  description:
    "Work alongside high-output engineers, students, and researchers in real-time synchronized focus rooms. Zero video fatigue, distraction-shielded Pomodoro sprints, curated binaural soundscapes, and cryptographic proof-of-work telemetry.",
  openGraph: {
    title: "Focus Rooms — Live Coworking & Synchronized Accountability | FocusFlow AI",
    description:
      "Real-time synchronized coworking rooms with zero video fatigue, distraction shields, Pomodoro timers, and verified telemetry.",
    images: ["/brand/focusflow-logo.png"],
  },
};

export default function FocusRoomsPage() {
  return <FocusRoomsContent />;
}
