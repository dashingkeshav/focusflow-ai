import Link from "next/link";

export default function FeaturesPage() {
  return (
    <div className="public-page">

      {/* =====================
          HERO
      ====================== */}
      <section className="page-hero">
        <div className="page-hero-badge">
          ✦ Distraction Intelligence Platform
        </div>

        <h1 className="page-hero-title">
          Powerful Features for{" "}
          <span className="gradient-text">Better Focus</span>
        </h1>

        <p className="page-hero-subtitle">
          FocusFlow AI combines real-time browser activity monitoring,
          behavioral analytics, and AI-powered insights to help you
          understand and improve how you work and study.
        </p>

        <div className="page-hero-actions">
          <Link href="/login" className="hero-primary">
            ▦ Start Your Focus Journey →
          </Link>
          <Link href="/how-it-works" className="hero-secondary">
            See How It Works
          </Link>
        </div>
      </section>


      {/* =====================
          FEATURE OVERVIEW CARDS
      ====================== */}
      <section className="page-section">
        <div className="page-section-center" style={{ marginBottom: "48px" }}>
          <div className="section-label">Core Capabilities</div>
          <h2 className="section-title">Everything You Need to Stay Focused</h2>
          <p className="section-description" style={{ margin: "0 auto" }}>
            Eight purpose-built features that work together to give you a
            complete picture of your focus patterns.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >

          {/* Card 1 */}
          <div className="pub-card">
            <div className="pub-card-icon">◉</div>
            <h3>Real-Time Focus Detection</h3>
            <p>
              Continuously monitors your digital activity to generate a dynamic
              Focus Score while you work — updated in real time so you always
              know where your attention stands.
            </p>
          </div>

          {/* Card 2 */}
          <div className="pub-card">
            <div className="pub-card-icon pub-card-icon-cyan">⚡</div>
            <h3>Distraction Intelligence</h3>
            <p>
              Detects tab switches, window defocus events, and idle periods.
              Identifies patterns before they compound into lost productivity
              sessions.
            </p>
          </div>

          {/* Card 3 */}
          <div className="pub-card">
            <div className="pub-card-icon pub-card-icon-indigo">◈</div>
            <h3>Focus Score Engine</h3>
            <p>
              A weighted scoring system that balances keyboard activity, mouse
              interaction, tab switching frequency, and idle time into a single
              0–100 score.
            </p>
          </div>

          {/* Card 4 */}
          <div className="pub-card">
            <div className="pub-card-icon">⇄</div>
            <h3>Tab Switch Detection</h3>
            <p>
              Logs every tab activation event with a timestamp using the Chrome
              Extension API. Frequent switches trigger real-time distraction
              alerts so you can refocus immediately.
            </p>
          </div>

          {/* Card 5 */}
          <div className="pub-card">
            <div className="pub-card-icon pub-card-icon-cyan">⏱</div>
            <h3>Idle Time Analysis</h3>
            <p>
              Tracks idle periods using configurable thresholds (15 s – 120 s).
              Distinguishes intentional breaks from unplanned drift so your
              score reflects actual work habits.
            </p>
          </div>

          {/* Card 6 */}
          <div className="pub-card">
            <div className="pub-card-icon pub-card-icon-indigo">✦</div>
            <h3>AI-Powered Insights</h3>
            <p>
              Converts raw activity data into actionable recommendations.
              Identifies your peak focus windows and suggests changes to your
              study environment and schedule.
            </p>
          </div>

          {/* Card 7 */}
          <div className="pub-card">
            <div className="pub-card-icon pub-card-icon-green">▣</div>
            <h3>Study Session Tracking</h3>
            <p>
              Records every session from start to finish — duration, average
              Focus Score, distraction count, and productivity rating — stored
              securely for historical review.
            </p>
          </div>

          {/* Card 8 */}
          <div className="pub-card">
            <div className="pub-card-icon">◎</div>
            <h3>Behavioral Analytics</h3>
            <p>
              Visual charts and heatmaps reveal your weekly rhythm, peak hours,
              and long-term focus trends. Export as PDF or CSV for personal
              review.
            </p>
          </div>

        </div>
      </section>


      {/* =====================
          HOW FEATURES WORK
      ====================== */}
      <section
        className="page-section"
        style={{ background: "white", maxWidth: "100%", padding: "70px 0" }}
      >
        <div style={{ maxWidth: "1200px", margin: "auto", padding: "0 28px" }}>

          <div className="page-section-center" style={{ marginBottom: "48px" }}>
            <div className="section-label">Under the Hood</div>
            <h2 className="section-title">How the Features Work Together</h2>
            <p className="section-description" style={{ margin: "0 auto" }}>
              Four stages take raw browser signals and turn them into
              meaningful focus intelligence.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
            }}
          >
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 style={{ margin: "0 0 8px", color: "#172033", fontSize: "16px", fontWeight: 800 }}>
                Signal Collection
              </h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: 1.7 }}>
                The Chrome Extension captures tab events, window focus changes,
                and idle signals using Manifest V3 APIs — without reading page
                content or recording video.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <h3 style={{ margin: "0 0 8px", color: "#172033", fontSize: "16px", fontWeight: 800 }}>
                Score Calculation
              </h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: 1.7 }}>
                The backend processes incoming events, applies the weighted
                Focus Score formula, and pushes the updated score to the
                frontend via Socket.io in real time.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <h3 style={{ margin: "0 0 8px", color: "#172033", fontSize: "16px", fontWeight: 800 }}>
                Live Alerts
              </h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: 1.7 }}>
                When your score drops below the threshold, a toast notification
                appears prompting you to refocus — turning passive monitoring
                into active coaching.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">4</div>
              <h3 style={{ margin: "0 0 8px", color: "#172033", fontSize: "16px", fontWeight: 800 }}>
                Session Analytics
              </h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: 1.7 }}>
                After each session, results are stored in MongoDB. The dashboard
                surfaces charts, trends, and export options so you can review
                your progress over time.
              </p>
            </div>
          </div>

        </div>
      </section>


      {/* =====================
          PRIVACY
      ====================== */}
      <section className="page-section">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px",
            alignItems: "center",
          }}
        >
          <div>
            <div className="section-label">Privacy First</div>
            <h2 className="section-title" style={{ fontSize: "clamp(28px, 4vw, 42px)" }}>
              Built With Your
              <br />Privacy in Mind
            </h2>
            <p style={{ color: "#64748b", lineHeight: 1.8, marginBottom: "24px" }}>
              FocusFlow AI collects only the behavioral signals required to
              calculate your Focus Score — tab events, idle state, and
              interaction rates. It does not capture URLs, page content,
              screenshots, or audio.
            </p>
            <ul className="check-list">
              {[
                "No page content or URL recording",
                "No screenshots or screen recording",
                "No audio or video capture",
                "Activity data scoped to your account only",
                "Session data stored securely in MongoDB Atlas",
                "You can delete your data at any time",
              ].map((item) => (
                <li key={item}>
                  <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              {
                icon: "🔒",
                title: "Minimal Data Collection",
                desc: "Only behavioural signals needed for focus scoring are captured.",
              },
              {
                icon: "🖥",
                title: "Local-First Processing",
                desc: "The Chrome Extension processes events client-side before sending lightweight summaries.",
              },
              {
                icon: "🛡",
                title: "Secure Storage",
                desc: "All session data is encrypted in transit and stored in MongoDB Atlas with JWT-protected access.",
              },
            ].map((item) => (
              <div key={item.title} className="pub-card" style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                <div style={{ fontSize: "24px", lineHeight: 1, flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <h3 style={{ margin: "0 0 4px" }}>{item.title}</h3>
                  <p style={{ margin: 0 }}>{item.desc}</p>
                </div>
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
          <h2>Start Your Focus Journey</h2>
          <p>
            Create a free account and see your Focus Score in your first
            session. No credit card required.
          </p>
          <Link href="/login" className="cta-banner-btn">
            ▦ Launch FocusFlow AI →
          </Link>
        </div>
      </div>

    </div>
  );
}
