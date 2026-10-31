import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — FocusFlow AI",
  description:
    "Terms of Service for FocusFlow AI — terms governing the focus tracking, Chrome extension, and study planning platform.",
};

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-transparent text-white pt-36 pb-24 selection:bg-[#FF4500] selection:text-white">

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <div className="text-center mb-16">
          <span className="section-label">Legal Agreement</span>
          <h1 className="mt-4 font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white">
            Terms of <span className="serif-italic text-gradient-teal">Service</span>
          </h1>
          <p className="mt-3 text-xs font-mono text-gray-500 uppercase tracking-widest">
            Last updated: October 2026
          </p>
        </div>

        <div className="space-y-6">
          <section className="glass-card rounded-3xl border border-[#262832] bg-[#12131A] p-8 shadow-xl">
            <h3 className="text-xl font-bold font-serif text-white">1. Acceptance of Terms</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">
              By registering an account with FocusFlow AI or accessing the web dashboard, APIs, or Chrome extension, you agree to these Terms of Service. If you do not accept these terms in full, please do not use the service.
            </p>
          </section>

          <section className="glass-card rounded-3xl border border-[#262832] bg-[#12131A] p-8 shadow-xl">
            <h3 className="text-xl font-bold font-serif text-white">2. User Accounts & Security</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">
              You are responsible for guarding your login credentials and for all actions originating under your authenticated session. You must be at least 13 years of age to establish an account.
            </p>
          </section>

          <section className="glass-card rounded-3xl border border-[#262832] bg-[#12131A] p-8 shadow-xl">
            <h3 className="text-xl font-bold font-serif text-white">3. Focus Shielding & Extension Use</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">
              Active sessions utilize page-level tab lock and classification signals. You acknowledge that FocusFlow enforces site restrictions only as configured by you in the dashboard. Camera monitoring is purely opt-in and processed client-side.
            </p>
          </section>

          <section className="glass-card rounded-3xl border border-[#262832] bg-[#12131A] p-8 shadow-xl">
            <h3 className="text-xl font-bold font-serif text-white">4. Pro Subscriptions & Billing</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">
              FocusFlow Pro subscriptions are billed monthly at ₹399 through Razorpay. You may cancel renewal at any time from Settings or Billing Management. Upon cancellation, Pro capabilities remain active until the end of the paid billing cycle.
            </p>
          </section>

          <section className="glass-card rounded-3xl border border-[#262832] bg-[#12131A] p-8 shadow-xl">
            <h3 className="text-xl font-bold font-serif text-white">5. Service Availability & Modifications</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">
              We continually refine features, AI planning algorithms, and telemetry metrics. We strive for 99.9% uptime, but scheduled maintenance or third-party provider disruptions may occasionally occur.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
