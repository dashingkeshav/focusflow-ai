import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — FocusFlow AI",
  description:
    "Privacy Policy for FocusFlow AI — what data we collect, how focus signals are processed, and the privacy-first guarantees behind the platform.",
};

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-transparent text-white pt-36 pb-24 selection:bg-[#FF4500] selection:text-white">

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <div className="text-center mb-16">
          <span className="section-label">Legal & Trust</span>
          <h1 className="mt-4 font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white">
            Privacy <span className="serif-italic text-gradient-teal">Policy</span>
          </h1>
          <p className="mt-3 text-xs font-mono text-gray-500 uppercase tracking-widest">
            Last updated: October 2026
          </p>
        </div>

        <div className="space-y-6">
          <section className="glass-card rounded-3xl border border-[#FF4500]/40 bg-card p-8 shadow-2xl">
            <h3 className="text-xl font-bold font-serif text-[#FF4500]">Privacy-First Architecture</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-300 font-light">
              FocusFlow AI records focus signals — never your private content. No webpage body text, form keystrokes, screenshots, or browsing history contents are ever stored or transmitted. Only numeric events (counts, durations, and policy classifications) power your personal analytics.
            </p>
          </section>

          <section className="glass-card rounded-3xl border border-white/10 bg-card p-8 shadow-xl">
            <h3 className="text-xl font-bold font-serif text-white">What Telemetry Is Captured</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">
              <strong className="text-white">Account Credentials:</strong> Full name, verified email, and your system preferences.<br /><br />
              <strong className="text-white">Focus Session Signals:</strong> Interval durations, computed focus scores, tab switch frequencies, idle seconds, and policy violation counts.<br /><br />
              <strong className="text-white">Multimodal Planner Data:</strong> Objectives, milestones, and syllabus documents you explicitly upload for plan structuring.
            </p>
          </section>

          <section className="glass-card rounded-3xl border border-white/10 bg-card p-8 shadow-xl">
            <h3 className="text-xl font-bold font-serif text-white">On-Device Camera Monitoring</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">
              Camera-based look-away detection is strictly opt-in and disabled by default. Computer vision inference executes entirely on-device via local WebAssembly. Video frames are <strong className="text-white">never uploaded, streamed, or saved</strong> to any disk. Only an integer counter (&quot;look-away events&quot;) is saved to PostgreSQL.
            </p>
          </section>

          <section className="glass-card rounded-3xl border border-white/10 bg-card p-8 shadow-xl">
            <h3 className="text-xl font-bold font-serif text-white">How Data Is Utilized</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">
              Telemetry exists exclusively to calculate your personal analytics, streaks, and AI study plans. We never sell user data, license information to third parties, or utilize focus data for advertising.
            </p>
          </section>

          <section className="glass-card rounded-3xl border border-white/10 bg-card p-8 shadow-xl">
            <h3 className="text-xl font-bold font-serif text-white">Multimodal AI Processing</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">
              When you prompt the AI Planner, goal summaries and syllabus files are transmitted over TLS to our AI inference pipeline (Google Gemini) to synthesize tasks. Data is processed transiently and not used for training foundation models.
            </p>
          </section>

          <section className="glass-card rounded-3xl border border-white/10 bg-card p-8 shadow-xl">
            <h3 className="text-xl font-bold font-serif text-white">Data Deletion & Rights</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">
              You maintain complete ownership of your data. You may export your entire history in JSON or CSV format at any time, or contact{" "}
              <a href="mailto:keerav2007@gmail.com" className="text-[#FF4500] hover:underline font-medium">
                keerav2007@gmail.com
              </a>{" "}
              for full account and database purge.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
