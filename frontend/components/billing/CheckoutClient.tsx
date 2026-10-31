"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useEntitlements } from "@/lib/useEntitlements";
import { AuthBrand, AuthShell } from "@/components/auth/AuthShell";

interface SubscriptionResponse {
  success: boolean;
  code?: string;
  message?: string;
  keyId?: string;
  subscription: {
    id: string;
    status: string;
    planKey: string;
    title: string;
  };
}

interface VerifyResponse {
  success: boolean;
  verified?: boolean;
  status?: string;
  isPro?: boolean;
  message: string;
}

interface RazorpayResult {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface RazorpayFailure {
  error?: {
    description?: string;
  };
}

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (result: RazorpayResult) => void;
  modal: { ondismiss: () => void };
}

interface RazorpayCheckout {
  open: () => void;
  on: (event: "payment.failed", handler: (failure: RazorpayFailure) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

export default function CheckoutClient() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { refresh: refreshEntitlements } = useEntitlements();
  const [planKey, setPlanKey] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const selectedPlan = new URLSearchParams(window.location.search).get("plan");
      setPlanKey(selectedPlan === "student_pro" ? "pro" : selectedPlan);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const startCheckout = async () => {
    if (!user || planKey !== "pro" || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await apiRequest<SubscriptionResponse>(
        "/api/billing/subscriptions",
        {
          method: "POST",
          body: JSON.stringify({ planKey: "pro" }),
        },
      );

      if (result.code === "SUBSCRIPTION_EXISTS") {
        router.push("/billing/manage");
        return;
      }

      if (!result.keyId || !result.subscription?.id) {
        throw new Error("The billing server returned an incomplete checkout response.");
      }
      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout did not load. Please refresh and try again.");
      }

      const checkout = new window.Razorpay({
        key: result.keyId,
        subscription_id: result.subscription.id,
        name: "FocusFlow AI",
        description: "FocusFlow Pro · ₹399 per month",
        prefill: { name: user.name, email: user.email },
        theme: { color: "#FF4500" },
        handler: async (payment) => {
          try {
            const verification = await apiRequest<VerifyResponse>(
              "/api/billing/verify",
              {
                method: "POST",
                body: JSON.stringify(payment),
              },
            );
            await refreshEntitlements();

            if (verification.isPro && verification.status === "active") {
              setMessage(verification.message);
              router.push("/billing/manage?status=activated");
            } else if (verification.status === "authenticated") {
              setError(
                verification.message ||
                  "Recurring mandate authorized. The ₹399 monthly charge has not been captured yet. Your account remains on Free until payment is confirmed.",
              );
              router.push("/billing/manage?status=authenticated");
            } else {
              setError(
                verification.message ||
                  "Payment authorization is pending bank confirmation. Your account remains on Free until payment is verified.",
              );
              router.push(`/billing/manage?status=${verification.status || "pending"}`);
            }
          } catch (verificationError) {
            setError(
              verificationError instanceof Error
                ? verificationError.message
                : "Payment verification failed. Contact support before trying again.",
            );
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setMessage(null);
            setError("Checkout was closed without completing authorization. No charges were made, and your account remains on the Free plan.");
          },
        },
      });

      checkout.on("payment.failed", (failure) => {
        setError(
          failure.error?.description ||
            "Payment or mandate authorization could not be completed. Your account was not charged and remains on the Free plan.",
        );
        setBusy(false);
      });
      checkout.open();
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start checkout. Please try again.",
      );
      setBusy(false);
    }
  };

  const nextPath = "/billing/checkout?plan=pro";
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <AuthShell>
      <AuthBrand />
      <section className="glass-card rounded-[26px] border border-white/10 bg-card/95 p-8 shadow-2xl backdrop-blur-xl">
        <Link
          href="/pricing"
          className="mb-7 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to pricing
        </Link>

        {!planKey ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-white font-serif">
              Choose a plan to continue
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Choose FocusFlow Pro from pricing to start a secure Razorpay subscription.
            </p>
            <Link href="/pricing" className="btn btn-primary mt-7 w-full bg-[#FF4500] hover:bg-[#FF4500]/90 text-white">
              View plans
            </Link>
          </>
        ) : planKey !== "pro" ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-white font-serif">
              That plan is not available
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Choose one of the current FocusFlow plans to continue.
            </p>
            <Link href="/pricing" className="btn btn-primary mt-7 w-full bg-[#FF4500] hover:bg-[#FF4500]/90 text-white">
              View available plans
            </Link>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-3 py-1 text-xs font-mono font-semibold text-[#FF4500]">
              FocusFlow Pro
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-white font-serif">
              Complete your subscription
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              ₹399 per month, billed by Razorpay. Your account will be linked
              to this subscription.
            </p>

            {error && (
              <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden />
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div role="status" className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                <span>{message}</span>
              </div>
            )}

            {isLoading ? (
              <div className="mt-8 flex items-center justify-center gap-3 text-sm text-white/50 font-mono">
                <LoaderCircle className="h-4 w-4 animate-spin text-[#FF4500]" aria-hidden />
                Checking your account…
              </div>
            ) : user ? (
              <>
                <div className="mt-6 rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3">
                  <p className="text-xs text-white/40 font-mono">Account</p>
                  <p className="mt-1 text-sm font-medium text-white">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={busy || !scriptReady}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF4500] hover:bg-[#FF4500]/90 py-3 text-sm font-bold text-white shadow-md shadow-[#FF4500]/25 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                      Connecting to Razorpay…
                    </>
                  ) : (
                    "Continue to secure payment"
                  )}
                </button>
                {!scriptReady && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-white/40 font-mono">Loading secure checkout…</p>
                    {error && (
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-2 text-xs font-medium text-[#FF4500] underline underline-offset-4"
                      >
                        Reload checkout
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-7 grid gap-3">
                <Link
                  href="/register?plan=pro"
                  className="btn btn-primary w-full bg-[#FF4500] hover:bg-[#FF4500]/90 text-white"
                >
                  Create an account to continue
                </Link>
                <Link
                  href={loginHref}
                  className="btn btn-ghost w-full border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                >
                  Already have an account? Log in
                </Link>
              </div>
            )}

            <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-white/40 font-mono">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#FF4500]" aria-hidden />
              Payment details are entered securely with Razorpay.
            </p>
          </>
        )}
      </section>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setError("Secure Razorpay Checkout could not be loaded. Please check your connection and retry.")}
      />
    </AuthShell>
  );
}
