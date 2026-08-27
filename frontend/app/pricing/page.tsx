import Link from "next/link";

const CHECK = (
  <svg
    className="pricing-check"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function PricingPage() {
  return (
    <div className="public-page">

      {/* =====================
          HERO
      ====================== */}
      <section className="page-hero">
        <div className="page-hero-badge">
          ✦ Simple, Transparent Pricing
        </div>

        <h1 className="page-hero-title">
          Simple Pricing.{" "}
          <span className="gradient-text">Powerful Focus.</span>
        </h1>

        <p className="page-hero-subtitle">
          Choose the plan that fits your study workflow. Start free and
          upgrade when you need more.
        </p>
      </section>


      {/* =====================
          PRICING CARDS
      ====================== */}
      <section className="page-section" style={{ paddingTop: "0" }}>
        <div className="pricing-grid">

          {/* FREE */}
          <div className="pricing-card">
            <p className="pricing-name">Free</p>
            <p className="pricing-desc">
              Perfect for getting started with focus tracking at no cost.
            </p>
            <div className="pricing-price">
              $0<span> /mo</span>
            </div>
            <p className="pricing-period">Free forever</p>

            <ul className="pricing-features">
              {[
                "Basic tab & idle tracking",
                "Focus timer with pause / resume",
                "Daily summary statistics",
                "Up to 5 sessions per week",
                "Dashboard overview",
              ].map((f) => (
                <li key={f}>{CHECK}{f}</li>
              ))}
            </ul>

            <Link href="/login" className="pricing-cta pricing-cta-outline">
              Get Started Free
            </Link>
          </div>


          {/* PRO — FEATURED */}
          <div className="pricing-card pricing-card-featured">
            <div className="pricing-badge">Most Popular</div>

            <p className="pricing-name" style={{ marginTop: "10px" }}>Student Pro</p>
            <p className="pricing-desc">
              Full AI distraction engine, real-time alerts, and unlimited
              session history for serious students.
            </p>
            <div className="pricing-price" style={{ color: "#7c3aed" }}>
              $4.99<span> /mo</span>
            </div>
            <p className="pricing-period">Billed monthly · cancel anytime</p>

            <ul className="pricing-features">
              {[
                "Everything in Free",
                "Chrome Extension real-time monitoring",
                "Live Focus Score via Socket.io",
                "Real-time distraction alerts",
                "AI-powered session insights",
                "Unlimited session history",
                "PDF & CSV report export",
                "Priority support",
              ].map((f) => (
                <li key={f}>{CHECK}{f}</li>
              ))}
            </ul>

            <Link href="/login" className="pricing-cta pricing-cta-primary">
              Start Student Pro
            </Link>
          </div>


          {/* TEAM */}
          <div className="pricing-card">
            <p className="pricing-name">Pro Team</p>
            <p className="pricing-desc">
              For study groups, research labs, and institutions that need
              shared analytics.
            </p>
            <div className="pricing-price">
              $14.99<span> /mo</span>
            </div>
            <p className="pricing-period">Per workspace · billed monthly</p>

            <ul className="pricing-features">
              {[
                "Everything in Student Pro",
                "Multi-user team dashboard",
                "Focus leaderboard",
                "Team session analytics",
                "Custom MongoDB integration API",
                "Dedicated onboarding support",
              ].map((f) => (
                <li key={f}>{CHECK}{f}</li>
              ))}
            </ul>

            <Link href="/contact" className="pricing-cta pricing-cta-outline">
              Contact Sales
            </Link>
          </div>

        </div>

        {/* Disclaimer */}
        <p
          style={{
            textAlign: "center",
            marginTop: "28px",
            color: "#94a3b8",
            fontSize: "12px",
          }}
        >
          Payment processing is not yet active. Buttons currently route to
          account creation. Billing will be enabled in a future release.
        </p>
      </section>


      {/* =====================
          COMPARISON TABLE
      ====================== */}
      <section
        className="page-section"
        style={{ background: "white", maxWidth: "100%", padding: "70px 0" }}
      >
        <div style={{ maxWidth: "1200px", margin: "auto", padding: "0 28px" }}>

          <div className="page-section-center" style={{ marginBottom: "40px" }}>
            <div className="section-label">Compare Plans</div>
            <h2 className="section-title">Side-by-Side Comparison</h2>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="compare-table">
              <thead>
                <tr>
                  <th className="col-feature">Feature</th>
                  <th>Free</th>
                  <th style={{ color: "#7c3aed" }}>Student Pro</th>
                  <th>Pro Team</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Focus timer", "✓", "✓", "✓"],
                  ["Tab & idle tracking", "✓", "✓", "✓"],
                  ["Dashboard overview", "✓", "✓", "✓"],
                  ["Daily statistics", "5 sessions/wk", "Unlimited", "Unlimited"],
                  ["Chrome Extension monitoring", "—", "✓", "✓"],
                  ["Real-time Socket.io alerts", "—", "✓", "✓"],
                  ["AI-powered insights", "—", "✓", "✓"],
                  ["PDF / CSV export", "—", "✓", "✓"],
                  ["Team dashboard", "—", "—", "✓"],
                  ["Focus leaderboard", "—", "—", "✓"],
                  ["Custom API access", "—", "—", "✓"],
                  ["Priority support", "—", "✓", "✓"],
                ].map(([feature, free, pro, team]) => (
                  <tr key={feature as string}>
                    <td className="col-feature">{feature}</td>
                    <td className={free === "—" ? "compare-no" : "compare-yes"}>{free}</td>
                    <td className={pro === "—" ? "compare-no" : "compare-yes"}>{pro}</td>
                    <td className={team === "—" ? "compare-no" : "compare-yes"}>{team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </section>


      {/* =====================
          FAQ
      ====================== */}
      <section className="page-section">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.6fr",
            gap: "48px",
            alignItems: "start",
          }}
        >
          <div>
            <div className="section-label">FAQ</div>
            <h2 className="section-title" style={{ fontSize: "clamp(28px, 4vw, 42px)" }}>
              Frequently Asked Questions
            </h2>
            <p style={{ color: "#64748b", lineHeight: 1.8 }}>
              Can&apos;t find what you&apos;re looking for?{" "}
              <Link
                href="/contact"
                style={{ color: "#7c3aed", fontWeight: 700, textDecoration: "none" }}
              >
                Reach out to us
              </Link>{" "}
              and we&apos;ll be happy to help.
            </p>
          </div>

          <div className="faq-list">
            {[
              {
                q: "Is the Free plan actually free forever?",
                a: "Yes. The Free plan has no time limit. You can use the focus timer, basic tracking, and dashboard overview without ever paying.",
              },
              {
                q: "When will billing go live?",
                a: "Payment processing is planned for a future release. For now, all plan buttons route to account creation so you can explore the full dashboard.",
              },
              {
                q: "Does FocusFlow AI record my screen or browsing history?",
                a: "No. The Chrome Extension only captures tab switch events, window focus changes, and idle state. It never reads page content, URLs, or takes screenshots.",
              },
              {
                q: "Can I cancel my plan at any time?",
                a: "Yes. When billing launches, all paid plans will be month-to-month with no long-term commitment and instant cancellation.",
              },
              {
                q: "What is the Chrome Extension and is it required?",
                a: "The extension collects browser activity signals that power the real-time Focus Score. It is optional for the Free plan but required for Student Pro real-time features.",
              },
              {
                q: "Is my data shared with third parties?",
                a: "No. Your session data is stored in your personal account on MongoDB Atlas and is never sold or shared with third parties.",
              },
            ].map((item) => (
              <div className="faq-item" key={item.q}>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* =====================
          CTA
      ====================== */}
      <div className="cta-banner">
        <div className="cta-banner-inner">
          <h2>Start Focusing Today — It&apos;s Free</h2>
          <p>
            Create your free account in under a minute. No credit card
            required. Upgrade whenever you&apos;re ready.
          </p>
          <Link href="/login" className="cta-banner-btn">
            ▦ Create Free Account →
          </Link>
        </div>
      </div>

    </div>
  );
}
