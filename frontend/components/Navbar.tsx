"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="site-navbar">
      <div className="navbar-container">

        {/* ================================
            LOGO
        ================================= */}

        <Link href="/" className="navbar-logo">
          <div className="logo-icon">
            ✦
          </div>

          <div className="logo-text-container">
            <div className="logo-title">
              FocusFlow{" "}
              <span className="logo-ai">
                AI
              </span>
            </div>

            <div className="logo-subtitle">
              Distraction Intelligence Platform
            </div>
          </div>
        </Link>


        {/* ================================
            NAVIGATION
        ================================= */}

        <nav className="navbar-links">

          <Link
            href="/features"
            className={
              isActive("/features")
                ? "active"
                : ""
            }
          >
            Features
          </Link>

          <Link
            href="/how-it-works"
            className={
              isActive("/how-it-works")
                ? "active"
                : ""
            }
          >
            How It Works
          </Link>

          <Link
            href="/pricing"
            className={
              isActive("/pricing")
                ? "active"
                : ""
            }
          >
            Pricing
          </Link>

          <Link
            href="/about"
            className={
              isActive("/about")
                ? "active"
                : ""
            }
          >
            About & Architecture
          </Link>

          <Link
            href="/contact"
            className={
              isActive("/contact")
                ? "active"
                : ""
            }
          >
            Contact
          </Link>

        </nav>


        {/* ================================
            RIGHT SIDE
        ================================= */}

        <div className="navbar-actions">

          {/* Sign In */}

          <Link
            href="/login"
            className="signin-link"
          >
            Sign In
          </Link>


          {/* Launch Dashboard */}

          <Link
            href="/login"
            className="dashboard-button"
          >
            <span className="dashboard-icon">
              ▦
            </span>

            <span>
              Launch Dashboard
            </span>

            <span className="dashboard-spark">
              ✦
            </span>
          </Link>

        </div>

      </div>
    </header>
  );
}