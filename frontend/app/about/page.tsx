import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="public-page">

      {/* =====================
          HERO
      ====================== */}
      <section className="page-hero">
        <div className="page-hero-badge">
          ✦ Phase-II Production Release
        </div>

        <h1 className="page-hero-title">
          Built for{" "}
          <span className="gradient-text">Better Focus</span>
        </h1>

        <p className="page-hero-subtitle">
          FocusFlow AI is a full-stack distraction intelligence platform that
          transforms raw browser activity into actionable focus insights for
          students and knowledge workers.
        </p>

        <div className="page-hero-actions">
          <Link href="/login" className="hero-primary">
            ▦ Launch Dashboard →
          </Link>
          <Link href="/how-it-works" className="hero-secondary">
            See How It Works
          </Link>
        </div>
      </section>


      {/* =====================
          MISSION
      ====================== */}
      <section
        className="page-section"
        style={{ background: "white", maxWidth: "100%", padding: "70px 0" }}
      >
        <div style={{ maxWidth: "1200px", margin: "auto", padding: "0 28px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "48px",
              alignItems: "center",
            }}
          >
            <div>
              <div className="section-label">Our Mission</div>
              <h2 className="section-title" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>
                Turning Digital Activity Into
                <br />Real Productivity
              </h2>
              <p style={{ color: "#64748b", lineHeight: 1.8 }}>
                Modern study environments are full of digital distractions —
                tab switching, social media, idle drifting. FocusFlow AI was
                built to give students and professionals a clear, objective view
                of how they actually spend their attention.
              </p>
              <p style={{ color: "#64748b", lineHeight: 1.8, marginTop: "16px" }}>
                Rather than relying on self-reported time tracking or simple
                Pomodoro timers, FocusFlow AI captures micro-behavioural
                signals and calculates a dynamic Focus Score that reflects the
                quality — not just the quantity — of your study time.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                {
                  icon: "🎯",
                  title: "Objective Focus Measurement",
                  desc: "Focus Score is derived from real behavioural signals, not self-assessment.",
                },
                {
                  icon: "🔍",
                  title: "Distraction Awareness",
                  desc: "Understand exactly when and why your focus breaks down each session.",
                },
                {
                  icon: "📈",
                  title: "Long-Term Improvement",
                  desc: "Track your focus trends week over week and build better study habits.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="pub-card"
                  style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}
                >
                  <div style={{ fontSize: "24px", lineHeight: 1, flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 4px" }}>{item.title}</h3>
                    <p style={{ margin: 0 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* =====================
          SYSTEM ARCHITECTURE
      ====================== */}
      <section className="page-section">
        <div className="page-section-center" style={{ marginBottom: "48px" }}>
          <div className="section-label">System Architecture</div>
          <h2 className="section-title">How FocusFlow AI Is Built</h2>
          <p className="section-description" style={{ margin: "0 auto" }}>
            A four-layer stack that takes raw browser signals and delivers
            focus insights to your dashboard.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "28px",
            marginBottom: "48px",
          }}
        >
          {[
            {
              num: "01",
              title: "Chrome Extension — Manifest V3",
              color: "#7c3aed",
              bg: "#ede9fe",
              desc: "Runs unobtrusively in the browser. Uses chrome.tabs and chrome.idle APIs to capture tab activation switches, window focus changes, and idle periods. No page content or URLs are read.",
              items: [
                "Tab switch timestamp logging",
                "Window focus/defocus events",
                "Configurable idle detection (15s – 120s)",
                "Client-side interaction rate aggregation",
              ],
            },
            {
              num: "02",
              title: "Node.js + Express.js Backend",
              color: "#4f46e5",
              bg: "#eef2ff",
              desc: "Receives activity events from the extension, handles user authentication with bcrypt and JWT, calculates Focus Scores, and persists session data to MongoDB Atlas.",
              items: [
                "JWT-based authentication",
                "Focus Score calculation engine",
                "RESTful session management API",
                "MongoDB Atlas persistence",
              ],
            },
            {
              num: "03",
              title: "Socket.io Real-Time Layer",
              color: "#0891b2",
              bg: "#ecfeff",
              desc: "Maintains a bi-directional WebSocket connection between backend and frontend. Streams live Focus Score updates and triggers distraction alert toasts when focus drops below threshold.",
              items: [
                "Low-latency event streaming",
                "Live Focus Score updates",
                "Real-time distraction alerts",
                "Automatic reconnection handling",
              ],
            },
            {
              num: "04",
              title: "Next.js Dashboard Frontend",
              color: "#059669",
              bg: "#ecfdf5",
              desc: "A responsive Next.js App Router application with interactive Recharts dashboards, session management, analytics exports, and a fully responsive design.",
              items: [
                "Next.js 16 App Router",
                "Recharts analytics visualizations",
                "PDF & CSV report export",
                "Responsive Tailwind CSS design",
              ],
            },
          ].map((layer) => (
            <div key={layer.num} className="pub-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: layer.bg,
                    color: layer.color,
                    display: "grid",
                    placeItems: "center",
                    fontSize: "12px",
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {layer.num}
                </div>
                <h3 style={{ margin: 0, fontSize: "16px" }}>{layer.title}</h3>
              </div>
              <p style={{ marginBottom: "14px" }}>{layer.desc}</p>
              <ul className="check-list">
                {layer.items.map((item) => (
                  <li key={item}>
                    <svg
                      className="check-icon"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Architecture Flow */}
        <div className="page-section-center" style={{ marginBottom: "32px" }}>
          <div className="section-label">Data Flow</div>
          <h3 className="section-title" style={{ fontSize: "clamp(22px, 3vw, 32px)" }}>
            End-to-End Signal Pipeline
          </h3>
        </div>

        <div className="arch-flow">
          {[
            { title: "Chrome Extension", desc: "Captures tab events, idle state, interaction signals" },
            { title: "Activity Collection", desc: "Events batched and sent to the backend API" },
            { title: "Backend / API", desc: "Node.js + Express processes and scores events" },
            { title: "Focus Analysis", desc: "Weighted algorithm produces real-time Focus Score" },
            { title: "Dashboard", desc: "Next.js frontend displays score, alerts, and analytics" },
            { title: "User Insights", desc: "Session history, trends, and export reports" },
          ].map((node, index, arr) => (
            <div key={node.title} style={{ width: "100%" }}>
              <div className={`arch-node ${index % 2 === 0 ? "arch-node-highlight" : ""}`}>
                <h4>{node.title}</h4>
                <p>{node.desc}</p>
              </div>
              {index < arr.length - 1 && <div className="arch-arrow" />}
            </div>
          ))}
        </div>
      </section>


      {/* =====================
          TECHNOLOGY STACK
      ====================== */}
      <section
        className="page-section"
        style={{ background: "white", maxWidth: "100%", padding: "70px 0" }}
      >
        <div style={{ maxWidth: "1200px", margin: "auto", padding: "0 28px" }}>
          <div className="page-section-center" style={{ marginBottom: "40px" }}>
            <div className="section-label">Technology Stack</div>
            <h2 className="section-title">Built With Production-Grade Tools</h2>
            <p className="section-description" style={{ margin: "0 auto" }}>
              Every technology listed here is actually present in the
              repository.
            </p>
          </div>

          <div className="tech-grid">
            {[
              { icon: "▲", name: "Next.js 16", role: "Frontend framework" },
              { icon: "⚛", name: "React 19", role: "UI component model" },
              { icon: "🔷", name: "TypeScript", role: "Type safety" },
              { icon: "🎨", name: "Tailwind CSS", role: "Utility styling" },
              { icon: "🟢", name: "Node.js", role: "Backend runtime" },
              { icon: "⚡", name: "Express.js", role: "REST API server" },
              { icon: "🍃", name: "MongoDB Atlas", role: "Database" },
              { icon: "🔌", name: "Socket.io", role: "Real-time events" },
              { icon: "🧩", name: "Chrome MV3", role: "Browser extension" },
              { icon: "📊", name: "Recharts", role: "Analytics charts" },
              { icon: "🔑", name: "JWT + bcrypt", role: "Authentication" },
              { icon: "✉", name: "Resend", role: "Contact email" },
            ].map((tech) => (
              <div className="tech-chip" key={tech.name}>
                <div className="tech-chip-icon">{tech.icon}</div>
                <h4>{tech.name}</h4>
                <p>{tech.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* =====================
          PRIVACY & SECURITY
      ====================== */}
      <section className="page-section">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "48px",
            alignItems: "start",
          }}
        >
          <div>
            <div className="section-label">Privacy & Security</div>
            <h2 className="section-title" style={{ fontSize: "clamp(28px, 4vw, 42px)" }}>
              Minimal Data,
              <br />Maximum Trust
            </h2>
            <p style={{ color: "#64748b", lineHeight: 1.8 }}>
              FocusFlow AI was designed with a minimal data footprint. The
              system collects only the behavioural signals necessary to
              compute your Focus Score — nothing more.
            </p>
            <p style={{ color: "#64748b", lineHeight: 1.8, marginTop: "16px" }}>
              Authentication uses industry-standard bcrypt password hashing
              and JWT tokens with expiry. All API routes on the backend are
              protected by the auth middleware, and session data is scoped
              per user.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { label: "No page content or URL recording", ok: true },
              { label: "No screenshots or screen recording", ok: true },
              { label: "No audio or video capture", ok: true },
              { label: "bcrypt + JWT authentication", ok: true },
              { label: "Per-user data isolation", ok: true },
              { label: "HTTPS encrypted API communication", ok: true },
            ].map((row) => (
              <div
                key={row.label}
                className="pub-card"
                style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px" }}
              >
                <span style={{ fontSize: "18px" }}>{row.ok ? "✅" : "❌"}</span>
                <span style={{ color: "#172033", fontWeight: 700, fontSize: "14px" }}>
                  {row.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* =====================
          DEVELOPMENT PHASES
      ====================== */}
      <section
        className="page-section"
        style={{ background: "white", maxWidth: "100%", padding: "70px 0" }}
      >
        <div style={{ maxWidth: "1200px", margin: "auto", padding: "0 28px" }}>
          <div className="page-section-center" style={{ marginBottom: "40px" }}>
            <div className="section-label">Development Roadmap</div>
            <h2 className="section-title">Project Phases</h2>
          </div>

          <div className="phase-grid">
            <div className="phase-card">
              <div className="phase-tag phase-tag-complete">✓ Complete</div>
              <h3>Phase I — Foundation</h3>
              <p>
                Core authentication system (register, login, JWT), basic
                session tracking, MongoDB data models, and the initial
                Next.js dashboard UI with Tailwind styling.
              </p>
            </div>

            <div className="phase-card">
              <div className="phase-tag phase-tag-active">⚡ Active</div>
              <h3>Phase II — Intelligence Layer</h3>
              <p>
                Chrome Extension Manifest V3 integration, real-time
                Socket.io Focus Score streaming, weighted distraction
                algorithm, AI-powered insights dashboard, and PDF/CSV
                export capabilities.
              </p>
            </div>

            <div className="phase-card" style={{ borderStyle: "dashed", background: "#fafafa" }}>
              <div
                className="phase-tag"
                style={{ background: "#f1f5f9", color: "#94a3b8" }}
              >
                Planned
              </div>
              <h3>Phase III — Team Features</h3>
              <p>
                Multi-user workspaces, team focus leaderboards, group
                session analytics, shared goals, and institution-level
                admin dashboards.
              </p>
            </div>

            <div className="phase-card" style={{ borderStyle: "dashed", background: "#fafafa" }}>
              <div
                className="phase-tag"
                style={{ background: "#f1f5f9", color: "#94a3b8" }}
              >
                Planned
              </div>
              <h3>Phase IV — Mobile & API</h3>
              <p>
                Public REST API for third-party integrations, mobile
                companion app, advanced ML distraction prediction, and
                calendar/LMS integrations.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* =====================
          CTA
      ====================== */}
      <div className="cta-banner">
        <div className="cta-banner-inner">
          <h2>Ready to Understand Your Focus?</h2>
          <p>
            Join FocusFlow AI and start measuring what actually matters —
            the quality of your attention.
          </p>
          <Link href="/login" className="cta-banner-btn">
            ▦ Launch FocusFlow AI →
          </Link>
        </div>
      </div>

    </div>
  );
}
