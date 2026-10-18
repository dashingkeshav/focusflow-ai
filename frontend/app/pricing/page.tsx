import type { Metadata } from "next";
import Link from "next/link";
import { Check, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start with FocusFlow for free or choose Pro for ₹399 per month. Secure recurring billing through Razorpay.",
};

const PLANS = [
  {
    name: "Free Tier",
    price: "₹0",
    period: "forever",
    note: "No credit card required · Free forever",
    description: "A complete workspace to organize your goals, tasks, focus sessions, and collaborative study.",
    features: [
      "Personal goals, milestones & task backlog",
      "Focus sessions with Pomodoro rhythms & ambient audio",
      "Chrome Extension distraction shielding",
      "5 AI plan generations / day (Gemini 2.5)",
      "5 voice transcriptions & 3 document uploads / day",
      "7-day analytics history & CSV export",
      "Top 15 recent distraction log events",
      "Focus Rooms: Host rooms with up to 4 participants",
      "Focus Circles: Own 1 Circle with up to 4 members",
      "Project Pods: Own 1 active Pod with up to 3 members",
      "Unblock Exchange: 3 help requests per rolling 7 days",
      "Join any Pro-hosted room, Circle, or Pod without upgrading",
    ],
    href: "/register",
    cta: "Create Free Account",
    featured: false,
  },
  {
    name: "FocusFlow Pro",
    price: "₹399",
    period: "per month",
    note: "Recurring monthly subscription · Cancel anytime",
    description: "The complete cognitive and collaboration toolkit for students, engineers, and high-focus teams.",
    features: [
      "Everything in Free Tier",
      "200 AI plan generations / day",
      "200 voice transcriptions & 100 document uploads / day",
      "Adaptive Auto-Replanning & What-If simulation",
      "AI Task Decomposition & Plan version history / rollback",
      "Algorithmic recovery plans for missed days",
      "All-time analytics trends (3,650 days) & hourly heatmaps",
      "1,000 distraction log events & domain category analysis",
      "Executive PDF & CSV report exports",
      "Focus Rooms: Host rooms with up to 12 participants",
      "Focus Circles: Own up to 10 Circles with up to 12 members each",
      "Project Pods: Own up to 10 active Pods with up to 10 members each",
      "Unblock Exchange: 20 help requests per rolling 7 days",
    ],
    href: "/billing/checkout?plan=pro",
    cta: "Upgrade to FocusFlow Pro",
    featured: true,
  },
];

const COMPARISON = [
  ["Goals, Milestones & Backlog", "Included", "Included"],
  ["Focus Sessions & Pomodoro Timer", "Included", "Included"],
  ["Chrome Extension Distraction Shield", "Included", "Included"],
  ["Daily AI Plan Generations", "5 / day", "200 / day"],
  ["Voice Transcription Planning", "5 / day", "200 / day"],
  ["Syllabus / Document Uploads", "3 / day", "100 / day"],
  ["AI Insights Diagnostic Runs", "3 / day", "100 / day"],
  ["Analytics Historical Range", "7 Days", "All-Time (3,650 Days)"],
  ["Distraction Event Log Retention", "Top 15 Events", "1,000 Events + Categorization"],
  ["Focus Rooms (Hosting Capacity)", "Up to 4 Participants", "Up to 12 Participants"],
  ["Focus Circles (Ownership & Size)", "1 Circle (Max 4 Members)", "Up to 10 Circles (12 Members Each)"],
  ["Project Pods (Active Projects & Size)", "1 Active Pod (Max 3 Members)", "Up to 10 Active Pods (10 Members Each)"],
  ["Unblock Exchange Rate Limit", "3 Requests / Rolling 7 Days", "20 Requests / Rolling 7 Days"],
  ["Join Pro-Hosted Rooms & Groups", "Included (No Upgrade Required)", "Included"],
  ["Adaptive Replanning & What-If", "—", "Included"],
  ["AI Task Decomposition", "—", "Included"],
  ["Recovery Planning (Missed Days)", "—", "Included"],
  ["Plan Version History & Rollback", "—", "Included"],
  ["Hourly Focus Heatmaps", "—", "Included"],
  ["Report Export Formats", "CSV Only", "Executive PDF + CSV"],
  ["Monthly Investment", "₹0 (Forever)", "₹399 / month"],
];

const FAQS = [
  {
    question: "Can I use FocusFlow for free indefinitely?",
    answer:
      "Yes. The Free plan includes your goals, task backlog, focus timer, Chrome extension shielding, 5 daily AI plans, 7-day analytics history, and core collaboration features. No credit card is required.",
  },
  {
    question: "Can Free members join rooms or groups created by Pro subscribers?",
    answer:
      "Yes. A Free member can join any valid Focus Room, Focus Circle, or Project Pod hosted by a Pro user without being forced to upgrade. Entitlement limits only apply when hosting new rooms, owning Circles, or initiating Pods.",
  },
  {
    question: "How does FocusFlow Pro billing work?",
    answer:
      "FocusFlow Pro is ₹399/month, processed securely via Razorpay with encrypted card and UPI options. Pro access is activated only upon verified payment capture.",
  },
  {
    question: "How can I cancel my subscription?",
    answer:
      "You can cancel at any time from your Dashboard Settings or Billing page with one click. Your Pro access remains active through the end of the paid monthly cycle.",
  },
  {
    question: "What information does focus monitoring collect?",
    answer:
      "FocusFlow analyzes behavioral activity: tab switches, window focus transitions, idle duration, and domain classification. No private page text or screen recordings are ever captured.",
  },
];

export default function PricingPage() {
  return (
    <div className="relative min-h-screen bg-transparent text-white pt-32 pb-24 selection:bg-[#FF4500] selection:text-white">
      {/* Background Dot Matrix Pattern */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-15"
        style={{
          backgroundImage: "radial-gradient(circle, #444 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center">
          <Reveal>
            <span className="section-label">Transparent Pricing</span>
            <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Start free.{" "}
              <span className="serif-italic text-gradient-teal">Grow your focus.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-gray-400 sm:text-lg font-light leading-relaxed">
              Begin with a free personal workspace or unlock the full multimodal AI Planner and Focus Intelligence with FocusFlow Pro.
            </p>
          </Reveal>
        </div>

        {/* Plan Cards */}
        <div className="mt-16 mx-auto grid max-w-4xl grid-cols-1 items-stretch gap-8 md:grid-cols-2">
          {PLANS.map((plan, index) => (
            <Reveal key={plan.name} delay={index * 0.1} className="h-full">
              <article
                className={`relative flex h-full flex-col justify-between rounded-3xl border p-8 md:p-10 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 ${
                  plan.featured
                    ? "border-2 border-[#FF4500] bg-card shadow-[0_20px_50px_rgba(255,69,0,0.3)] ring-4 ring-[#FF4500]/10"
                    : "border-white/10 bg-card shadow-2xl hover:border-white/20"
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#FF4500] px-4 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-white shadow-md">
                    Full Toolkit
                  </span>
                )}
                <div>
                  <h2 className="text-2xl font-bold font-serif text-white flex items-center gap-2">
                    {plan.name}
                    {plan.featured && <Sparkles className="h-5 w-5 text-[#FF4500]" />}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">
                    {plan.description}
                  </p>
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-5xl font-bold tracking-tight text-white font-serif">
                      {plan.price}
                    </span>
                    <span className="text-sm font-mono text-gray-400">{plan.period}</span>
                  </div>
                  <p className="mt-1.5 text-xs font-mono text-gray-500">{plan.note}</p>

                  <ul className="mt-8 space-y-3.5 border-t border-white/10 pt-6 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-gray-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#FF4500] font-bold" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={plan.href}
                  className={`btn mt-8 w-full justify-center ${
                    plan.featured ? "btn-primary shadow-lg shadow-[#FF4500]/30" : "btn-ghost"
                  }`}
                >
                  <span>{plan.cta}</span>
                  {plan.featured && <ArrowRight className="h-4 w-4" />}
                </Link>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Razorpay Assurance */}
        <Reveal delay={0.2}>
          <p className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-gray-400">
            <ShieldCheck className="h-4 w-4 text-[#FF4500]" />
            Payments are securely processed by Razorpay with end-to-end bank encryption.
          </p>
        </Reveal>

        {/* Feature Comparison Table */}
        <section className="mt-28">
          <div className="text-center">
            <span className="section-label">Detailed Comparison</span>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold tracking-tight text-white">
              Feature Matrix
            </h2>
          </div>

          <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-card shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-xs font-mono uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6 font-semibold">Capability</th>
                    <th className="py-4 px-6 font-semibold">Free</th>
                    <th className="py-4 px-6 font-semibold text-[#FF4500]">FocusFlow Pro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {COMPARISON.map(([feat, free, pro]) => (
                    <tr key={feat} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-6 font-medium text-gray-200">{feat}</td>
                      <td className="py-3.5 px-6 text-gray-400 font-mono text-xs">{free}</td>
                      <td className="py-3.5 px-6 font-bold text-[#FF4500] font-mono text-xs">{pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ Grid */}
        <section className="mt-28">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <span className="section-label">FAQ</span>
              <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold tracking-tight text-white">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-sm text-gray-400 leading-relaxed font-light">
                Have more questions about our plans or enterprise needs?{" "}
                <Link href="/contact" className="font-semibold text-[#FF4500] underline hover:text-tide-400">
                  Contact our studio
                </Link>
                .
              </p>
            </div>
            <div className="space-y-4 lg:col-span-7">
              {FAQS.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-white/10 bg-card p-6 shadow-xl"
                >
                  <h3 className="font-semibold font-serif text-lg text-white">{faq.question}</h3>
                  <p className="mt-2.5 text-sm text-gray-400 leading-relaxed font-light">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
