"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Home, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("FocusFlow global error:", error.message);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#fafbfc", color: "#0f172a", margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <h1
              style={{
                color: "#0f172a",
                fontSize: 30,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              Something went wrong.
            </h1>
            <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
              FocusFlow encountered an unexpected error. Your telemetry and account remain safe.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={reset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 44,
                  padding: "0 22px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #0d9488, #0891b2 80%)",
                  boxShadow: "0 4px 14px rgba(13, 148, 136, 0.3)",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={16} aria-hidden />
                Try Again
              </button>
              <Link
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 44,
                  padding: "0 22px",
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <Home size={16} aria-hidden />
                Return to FocusFlow
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
