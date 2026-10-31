"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BrandWordmark } from "@/components/brand";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Downloads", href: "/download" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close menu on route change
  useEffect(() => {
    const id = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  // Hide landing navbar on dashboard routes (handled by DashboardLayout)
  if (pathname.startsWith("/dashboard")) return null;

  return (
    <>
      <nav
        id="main-nav"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "py-3 bg-[#08090D]/88 backdrop-blur-xl border-b border-[#262832] shadow-2xl shadow-black/80"
            : "py-5 sm:py-6 bg-transparent border-b border-transparent"
        }`}
      >
        <div className="container mx-auto px-6 flex items-center justify-between max-w-7xl">
          {/* ================= BRAND LOGO ================= */}
          <div className="flex items-center gap-3">
            <BrandWordmark size="md" href="/" />
          </div>

          {/* ================= CENTER NAVIGATION ================= */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#12131A]/70 border border-[#262832] backdrop-blur-md">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                    active
                      ? "text-white bg-[#FF4500] font-semibold shadow-[0_2px_12px_rgba(255,69,0,0.35)]"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* ================= RIGHT ACTIONS ================= */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div
                className="h-9 w-32 opacity-0 pointer-events-none"
                aria-hidden="true"
              />
            ) : user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/dashboard"
                  id="nav-dashboard-link"
                  className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs font-semibold bg-[#FF4500] text-white hover:bg-[#e03e00] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-[0_0_20px_rgba(255,69,0,0.3)]"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  id="nav-logout-btn"
                  aria-label="Sign out"
                  title="Sign out"
                  className="hidden md:inline-flex items-center justify-center text-xs font-mono text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/5 border border-transparent hover:border-[#262832]"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/login"
                  id="nav-login-link"
                  className="hidden md:inline-flex items-center justify-center text-xs font-medium text-zinc-300 hover:text-white px-4 py-2 rounded-full hover:bg-white/5 border border-transparent hover:border-[#262832] transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  id="nav-cta-link"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#FF4500] text-white hover:bg-[#e03e00] hover:shadow-[0_0_22px_rgba(255,69,0,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Trigger */}
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              aria-label="Open mobile menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#262832] bg-[#12131A] text-zinc-300 hover:text-white md:hidden transition-colors"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ================= MOBILE DRAWER ================= */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#08090D]/98 backdrop-blur-2xl md:hidden text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-[#262832] px-6 py-4">
            <BrandWordmark size="md" href="/" onClick={() => setOpen(false)} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#262832] bg-[#12131A] text-zinc-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Links List */}
          <nav className="flex flex-1 flex-col justify-center space-y-3 px-8">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block py-3 text-2xl font-serif tracking-tight transition-colors ${
                    active ? "text-[#FF4500] font-semibold" : "text-zinc-300 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Footer CTAs */}
          <div className="space-y-3 border-t border-[#262832] px-8 pb-10 pt-6">
            {isLoading ? (
              <div className="h-12 w-full opacity-0" aria-hidden="true" />
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center w-full px-6 py-3.5 rounded-full text-sm font-semibold bg-[#FF4500] text-white hover:bg-[#e03e00] transition-colors gap-2 shadow-[0_0_20px_rgba(255,69,0,0.35)]"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="inline-flex items-center justify-center w-full px-6 py-3 rounded-full text-xs font-mono text-zinc-400 hover:text-white border border-[#262832] hover:bg-white/5 transition-colors"
                >
                  Sign Out ({user.email})
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center w-full px-6 py-3.5 rounded-full text-sm font-semibold bg-[#FF4500] text-white hover:bg-[#e03e00] transition-colors shadow-[0_0_20px_rgba(255,69,0,0.35)]"
                >
                  Get Started
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center w-full px-6 py-3.5 rounded-full text-sm font-medium border border-[#262832] bg-[#12131A] text-zinc-300 hover:text-white hover:bg-[#1A1C24] transition-colors"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
