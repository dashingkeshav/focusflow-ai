import Link from "next/link";

export default function HomePage() {
  return (
    <div className="home-page">

      {/* HERO */}
      <section className="hero">

        <div className="hero-badge">
          ✦ Phase-II Production Release
          <span>•</span>
          AI Focus Engine Active
        </div>

        <h1 className="hero-title">
          Turn Digital Activity Into
          <br />
          <span className="gradient-text">
            Better Focus.
          </span>
        </h1>

        <p className="hero-description">
          Understand how you work. FocusFlow AI monitors
          tab switching, idle time, keyboard and mouse
          interaction in real-time, calculating dynamic
          Focus Scores and predicting distraction loops
          before they happen.
        </p>

        <div className="hero-buttons">

          <Link
            href="/dashboard"
            className="hero-primary"
          >
            ▦ Launch Dashboard →
          </Link>

          <Link
            href="/about"
            className="hero-secondary"
          >
            View System Architecture
          </Link>

        </div>

      </section>


      {/* DASHBOARD PREVIEW */}
      <section className="dashboard-preview">

        <div className="preview-window">

          <div className="preview-header">

            <div className="preview-dots">
              <span />
              <span />
              <span />
            </div>

            <span>
              focusflow-ai // live-dashboard.v2
            </span>

            <span>
              Extension Stream Active
            </span>

          </div>

          <div className="preview-body">

            <div className="preview-card">
              <h3>Current Focus Score</h3>
              <div className="preview-number preview-green">
                87 / 100
              </div>
            </div>

            <div className="preview-card">
              <h3>Today's Study Session</h3>
              <div className="preview-number">
                3h 42m
              </div>
            </div>

            <div className="preview-card">
              <h3>Distractions Blocked</h3>
              <div className="preview-number">
                12
              </div>
            </div>

          </div>

        </div>

      </section>


      {/* FEATURES */}
      <section
        id="how-it-works"
        className="features-section"
      >

        <div className="section-label">
          Why FocusFlow AI
        </div>

        <h2 className="section-title">
          Engineered For Focus Excellence
        </h2>

        <p className="section-description">
          FocusFlow AI combines behavioral intelligence,
          real-time activity analysis and distraction
          detection to help you understand and improve
          your study habits.
        </p>

        <div className="feature-grid">

          <div className="feature-card">

            <div className="feature-icon">
              ◉
            </div>

            <h3>
              Real-Time Focus Detection
            </h3>

            <p>
              Analyze your digital activity and generate
              a dynamic focus score while you work.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              ⚡
            </div>

            <h3>
              Distraction Intelligence
            </h3>

            <p>
              Identify tab switching, idle periods and
              distraction patterns before they become
              productivity problems.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              ✦
            </div>

            <h3>
              AI-Powered Insights
            </h3>

            <p>
              Turn your activity data into practical
              recommendations for better study sessions.
            </p>

          </div>

        </div>

      </section>

    </div>
  );
}