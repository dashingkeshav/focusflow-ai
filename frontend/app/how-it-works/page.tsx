import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div className="public-page">

      {/* =====================
          HERO
      ====================== */}
      <section className="page-hero">
        <div className="page-hero-badge">
          ✦ Simple Setup. Powerful Results.
        </div>

        <h1 className="page-hero-title">
          How{" "}
          <span className="gradient-text">FocusFlow AI</span>
          {" "}Works
        </h1>

        <p className="page-hero-subtitle">
          From account creation to actionable focus insights — here is
          exactly how FocusFlow AI helps you study smarter.
        </p>

        <div className="page-hero-actions">
          <Link href="/login" className="hero-primary">
            ▦ Get Started Free →
          </Link>
          <Link href="/features" className="hero-secondary">
            Explore Features
          </Link>
        </div>
      </section>


      {/* =====================
          USER JOURNEY STEPS
      ====================== */}
      <section className="page-section">
        <div className="page-section-center" style={{ marginBottom: "52px" }}>
          <div className="section-label">User Journey</div>
          <h2 className="section-title">Five Steps to Better Focus</h2>
          <p className="section-description" style={{ margin: "0 auto" }}>
            FocusFlow AI is designed to be up and running in minutes,
            with insights appearing during your very first session.
          </p>
        </div>

        <div className="hiw-steps">

          {[
            {
              icon: "👤",
              title: "Create Your Account",
              desc: "Sign up with your email address. No credit card required. Your account is created instantly and you land directly in your personal dashboard.",
            },
            {
              icon: "🧩",
              title: "Install the Chrome Extension",
              desc: "Add the FocusFlow AI Chrome Extension from the dashboard. It runs silently in the background, requiring no configuration — just install and start working.",
            },
            {
              icon: "▶",
              title: "Start a Focus Session",
              desc: "Click 'Start Session' in your dashboard. The extension begins capturing tab events, window focus changes, and idle periods immediately.",
            },
            {
              icon: "📊",
              title: "FocusFlow AI Analyses Your Activity",
              desc: "As you work, the backend processes your activity signals in real time. Your Focus Score updates live, and distraction alerts appear the moment your focus drops below threshold.",
            },
            {
              icon: "✦",
              title: "Receive Your Focus Score and Insights",
              desc: "At the end of each session, FocusFlow AI shows your Focus Score, distraction breakdown, and AI-powered recommendations for your next session.",
            },
            {
              icon: "📈",
              title: "Track Your Progress and Improve",
              desc: "Review your session history, weekly trends, and peak focus hours on the analytics dashboard. Export reports as PDF or CSV to track your improvement over time.",
            },
          ].map((step, index, arr) => (
            <div className="hiw-step" key={step.title}>
              <div className="hiw-step-line">
                <div className="hiw-step-dot">{index + 1}</div>
                {index < arr.length - 1 && (
                  <div className="hiw-step-connector" />
                )}
              </div>
              <div className="hiw-step-content">
                <div style={{ fontSize: "28px", lineHeight: 1 }}>{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}

        </div>
      </section>


      {/* =====================
          BEHIND THE SCENES
      ====================== */}
      <section
        className="page-section"
        style={{ background: "white", maxWidth: "100%", padding: "70px 0" }}
      >
        <div style={{ maxWidth: "1200px", margin: "auto", padding: "0 28px" }}>

          <div className="page-section-center" style={{ marginBottom: "48px" }}>
            <div className="section-label">Behind the Scenes</div>
            <h2 className="section-title">From Browser Activity to Insights</h2>
            <p className="section-description" style={{ margin: "0 auto" }}>
              Here is how your raw browser activity becomes a meaningful
              Focus Score on your dashboard.
            </p>
          </div>

          {/* Flow */}
          <div className="bts-flow" style={{ marginBottom: "48px" }}>
            {[
              { icon: "🧩", title: "Chrome Extension", desc: "Tab events & idle signals" },
              { icon: "⚡", title: "Activity Stream", desc: "Events sent to backend" },
              { icon: "⚙", title: "Score Engine", desc: "Weighted algorithm" },
              { icon: "🔌", title: "Socket.io", desc: "Real-time push" },
              { icon: "▣", title: "Dashboard", desc: "Live score display" },
              { icon: "✦", title: "Insights", desc: "AI recommendations" },
            ].map((node, index, arr) => (
              <div key={node.title} style={{ display: "flex", alignItems: "center" }}>
                <div className="bts-node">
                  <div className="bts-node-icon">{node.icon}</div>
                  <h4>{node.title}</h4>
                  <p>{node.desc}</p>
                </div>
                {index < arr.length - 1 && (
                  <div className="bts-arrow">→</div>
                )}
              </div>
            ))}
          </div>

          {/* Detail cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "20px",
            }}
          >
            {[
              {
                icon: "🧩",
                title: "What the Extension Captures",
                points: [
                  "Tab activation timestamps",
                  "Window focus & defocus events",
                  "Idle state (configurable threshold)",
                  "Keyboard & mouse interaction rates",
                ],
              },
              {
                icon: "⚙",
                title: "How Focus Score Is Calculated",
                points: [
                  "Starts at 100 (baseline)",
                  "Deductions for tab switches",
                  "Deductions for idle drift",
                  "Boosts for sustained keyboard activity",
                ],
              },
              {
                icon: "🔌",
                title: "Real-Time Delivery",
                points: [
                  "Socket.io WebSocket connection",
                  "Score updates pushed live",
                  "Distraction alerts below threshold",
                  "Break reminders at intervals",
                ],
              },
              {
                icon: "✦",
                title: "Session Analytics",
                points: [
                  "Session stored in MongoDB Atlas",
                  "Duration and average Focus Score",
                  "Distraction event timeline",
                  "PDF / CSV export available",
                ],
              },
            ].map((card) => (
              <div className="pub-card" key={card.title}>
                <div className="pub-card-icon" style={{ fontSize: "20px" }}>{card.icon}</div>
                <h3>{card.title}</h3>
                <ul className="check-list" style={{ marginTop: "12px" }}>
                  {card.points.map((pt) => (
                    <li key={pt}>
                      <svg
                        className="check-icon"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>
      </section>


      {/* =====================
          QUICK SETUP
      ====================== */}
      <section className="page-section">
        <div className="page-section-center" style={{ marginBottom: "40px" }}>
          <div className="section-label">Quick Setup</div>
          <h2 className="section-title">Up and Running in Minutes</h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          {[
            {
              step: "1",
              title: "Create Account",
              desc: "Sign up at focusflow.ai. Takes under a minute — just email and password.",
            },
            {
              step: "2",
              title: "Install Extension",
              desc: "Download the FocusFlow AI Chrome Extension from your dashboard with one click.",
            },
            {
              step: "3",
              title: "Start Session",
              desc: "Hit 'Start Session' on the dashboard. The extension activates automatically.",
            },
            {
              step: "4",
              title: "See Your Score",
              desc: "Your live Focus Score appears on the dashboard and updates in real time as you work.",
            },
          ].map((item) => (
            <div className="step-card" key={item.step}>
              <div className="step-number">{item.step}</div>
              <h3 style={{ margin: "0 0 8px", color: "#172033", fontSize: "17px", fontWeight: 800 }}>
                {item.title}
              </h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: 1.7 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>


      {/* =====================
          CTA
      ====================== */}
      <div className="cta-banner">
        <div className="cta-banner-inner">
          <h2>Launch FocusFlow AI</h2>
          <p>
            Everything you need to understand and improve your focus is
            waiting in the dashboard. Free to start, no credit card needed.
          </p>
          <Link href="/login" className="cta-banner-btn">
            ▦ Open the Dashboard →
          </Link>
        </div>
      </div>

    </div>
  );
}
