"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BrandWordmark } from "@/components/brand";

const LINKS = [
  { label: "Product", href: "/product" },
  { label: "Features", href: "/features" },
  { label: "Focus Rooms", href: "/focus-rooms" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Solutions", href: "/solutions" },
  { label: "Pricing", href: "/pricing" },
  { label: "Downloads", href: "/download" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "py-4 bg-bg/85 backdrop-blur-md border-b border-white/5 shadow-2xl"
            : "py-6 sm:py-8 bg-transparent"
        }`}
      >
        <div className="container mx-auto px-6 flex items-center justify-between max-w-7xl">
          {/* ================= BRAND LOGO ================= */}
          <BrandWordmark size="md" />

          {/* ================= DESKTOP LINKS ================= */}
          <div className="hidden md:flex items-center space-x-8">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-sm tracking-wide transition-colors duration-300 ${
                    active
                      ? "text-[#FF4500] font-medium"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* ================= ACTIONS ================= */}
          <div className="flex items-center gap-4">
            {isLoading ? (
              <div
                className="h-9.5 w-35 md:w-46.25 opacity-0 pointer-events-none"
                aria-hidden="true"
              />
            ) : user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  id="nav-dashboard-link"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-white text-black hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-sm"
                  style={{ color: "#000000" }}
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
                  className="hidden md:inline-flex items-center justify-center text-xs font-mono text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-full hover:bg-white/5"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  id="nav-login-link"
                  className="hidden text-sm text-gray-300 hover:text-white transition-colors duration-300 md:block font-medium"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  id="nav-cta-link"
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold bg-white text-black hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-md"
                  style={{ color: "#000000" }}
                >
                  Get Started
                </Link>
              </>
            )}

            {/* Mobile Hamburger Trigger */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open mobile menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 md:hidden transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ================= MOBILE DRAWER ================= */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-2xl md:hidden text-white"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <BrandWordmark size="md" href="/" onClick={() => setOpen(false)} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Links List */}
            <nav className="flex flex-1 flex-col justify-center space-y-4 px-8">
              {LINKS.map((link, idx) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + idx * 0.04 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block py-2 font-serif text-3xl font-medium tracking-tight text-white/90 hover:text-[#FF4500] transition-colors"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

            {/* Mobile Footer CTAs */}
            <div className="space-y-3 border-t border-white/10 px-8 pb-10 pt-6">
              {isLoading ? (
                <div className="h-12 w-full opacity-0" aria-hidden="true" />
              ) : user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center w-full px-6 py-3.5 rounded-full text-sm font-semibold bg-white text-black hover:bg-gray-100 transition-colors gap-2"
                    style={{ color: "#000000" }}
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
                    className="inline-flex items-center justify-center w-full px-6 py-3 rounded-full text-xs font-mono text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    Sign Out ({user.email})
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center w-full px-6 py-3.5 rounded-full text-sm font-semibold bg-white text-black hover:bg-gray-100 transition-colors"
                    style={{ color: "#000000" }}
                  >
                    Get Started
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center w-full px-6 py-3.5 rounded-full text-sm font-medium border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-colors"
                  >
                    Log In
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
