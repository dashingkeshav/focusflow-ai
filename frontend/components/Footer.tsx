import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">

      <div className="footer-container">

        {/* Brand */}
        <div className="footer-brand">

          <Link href="/" className="footer-logo">
            <div className="footer-logo-icon">
              ✦
            </div>

            <span>
              FocusFlow AI
            </span>
          </Link>

          <p>
            AI-powered study focus and
            distraction intelligence.
          </p>

          <p className="footer-copy">
            © {new Date().getFullYear()} FocusFlow AI.
            All rights reserved.
          </p>

        </div>

        {/* Product */}
        <div className="footer-column">

          <h3>PRODUCT</h3>

          <Link href="/features">
            Features
          </Link>

          <Link href="/pricing">
            Pricing
          </Link>

          <Link href="/dashboard">
            Dashboard
          </Link>

        </div>

        {/* Company */}
        <div className="footer-column">

          <h3>COMPANY</h3>

          <Link href="/about">
            About & Architecture
          </Link>

          <Link href="/contact">
            Contact
          </Link>

        </div>

        {/* Privacy */}
        <div className="footer-column">

          <h3>PRIVACY & TRUST</h3>

          <p>
            Privacy-first local processing.
            No invasive recording or
            unnecessary data collection.
          </p>

        </div>

      </div>

    </footer>
  );
}