"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, CreditCard, LoaderCircle, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Subscription {
  plan_key: string;
  status: string;
  current_start: string | null;
  current_end: string | null;
  created_at: string;
}

interface SubscriptionResponse {
  success: boolean;
  subscription: Subscription | null;
}

interface ActionResponse {
  success: boolean;
  message: string;
}

export default function BillingManagementPage() {
  const { user, isLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [statusParam, setStatusParam] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const checkout = params.get("checkout");
    if (status === "activated") {
      setMessage("FocusFlow Pro is now active! All Pro features are unlocked.");
    } else if (status === "authenticated") {
      // Mandate is authorized but charge is uncaptured; the dedicated amber section below explains this clearly.
      setMessage(null);
    } else if (status === "pending") {
      setError("Payment authorization is pending bank confirmation. Pro will activate once verified.");
    } else if (checkout === "cancelled") {
      setError("Checkout was closed without completing authorization. No charges were made.");
    }
    setStatusParam(status);
  }, []);

  const loadSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<SubscriptionResponse>("/api/billing/subscription");
      setSubscription(response.subscription);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load billing details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const timer = window.setTimeout(() => setLoading(false), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => void loadSubscription(), 0);
    return () => window.clearTimeout(timer);
  }, [isLoading, user, loadSubscription]);

  const cancelSubscription = async () => {
    if (
      !window.confirm(
        "Schedule FocusFlow Pro to cancel at the end of the current billing cycle?",
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiRequest<ActionResponse>(
        "/api/billing/subscription/cancel",
        { method: "POST", body: JSON.stringify({}) },
      );
      setMessage(response.message);
      await loadSubscription();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Could not cancel the subscription.");
    } finally {
      setBusy(false);
    }
  };

  const dateLabel = (date: string | null) =>
    date ? new Date(date).toLocaleDateString(undefined, { dateStyle: "long" }) : null;

  const isProActive =
    subscription &&
    (subscription.status === "active" ||
      (subscription.status === "cancel_pending" &&
        (!subscription.current_end || new Date(subscription.current_end) > new Date())));

  const isPendingMandate = subscription && subscription.status === "authenticated";
  const isUncompletedAttempt =
    subscription && (subscription.status === "created" || subscription.status === "pending");

  return (
    <div className="public-page min-h-screen px-4 pb-20 pt-32 text-white bg-transparent">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/pricing"
          className="mb-7 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to pricing
        </Link>
        <section className="rounded-[26px] border border-white/10 bg-card p-8 shadow-2xl sm:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/30 px-3 py-1 text-xs font-mono font-medium text-[#FF4500]">
            Account Billing
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white font-serif">
            Manage your subscription
          </h1>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/60">
            Review your FocusFlow Pro billing status and renewal parameters.
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

          {isLoading || loading ? (
            <div className="mt-9 flex items-center justify-center gap-3 text-sm text-white/50">
              <LoaderCircle className="h-4 w-4 animate-spin text-[#FF4500]" aria-hidden />
              Loading verified subscription state…
            </div>
          ) : !user ? (
            <div className="mt-7 rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 text-center">
              <p className="text-sm font-medium text-white/70">Log in to view active billing details.</p>
              <Link href="/login?next=%2Fbilling%2Fmanage" className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#FF4500] hover:bg-[#FF4500]/90 px-6 py-2.5 text-xs font-bold text-white shadow-xs">
                Log in to Account
              </Link>
            </div>
          ) : isProActive ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500]">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-white/40">Active Plan</p>
                    <h2 className="text-lg font-bold text-white font-serif">FocusFlow Pro</h2>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-bold capitalize text-emerald-400">
                  {subscription.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-4 text-xs font-mono text-white/80">₹399 per month · billed by Razorpay</p>
              {subscription.current_end && (
                <p className="mt-1 text-xs text-white/50">
                  Current billing period concludes on {dateLabel(subscription.current_end)}.
                </p>
              )}
              {subscription.status === "cancel_pending" ? (
                <p className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-300">
                  Your subscription is scheduled to end after the current billing cycle. You maintain full Pro access until then.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={cancelSubscription}
                  disabled={busy}
                  className="mt-6 rounded-xl border border-white/10 bg-card px-5 py-2.5 text-xs font-bold text-white/70 shadow-xs transition-colors hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-60"
                >
                  {busy ? "Updating subscription…" : "Cancel at period end"}
                </button>
              )}
            </div>
          ) : isPendingMandate ? (
            <div className="mt-8 rounded-2xl border border-amber-500/20 bg-[#0a0a0a] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-amber-400/80">Mandate Authorized</p>
                  <h2 className="text-base font-bold text-white font-serif">Awaiting Payment Confirmation</h2>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/70">
                Your recurring payment mandate has been authorized. Razorpay is confirming the monthly ₹399 charge. Your workspace remains on the Free tier and will automatically unlock Pro once verified.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => void loadSubscription()}
                  disabled={loading}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Refresh Status
                </button>
                <Link
                  href="/pricing"
                  className="rounded-xl bg-[#FF4500] px-4 py-2 text-xs font-bold text-white hover:bg-[#FF4500]/90"
                >
                  View Plans
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 text-center">
              <h2 className="text-base font-bold text-white font-serif">Free Workspace Active</h2>
              <p className="mt-2 text-xs leading-relaxed text-white/60">
                You are currently on the free plan with core focus sessions, tasks, and analytics.
                {isUncompletedAttempt && (
                  <span className="block mt-2 text-amber-400/80">
                    A previous checkout was not completed. No charges were made to your account.
                  </span>
                )}
              </p>
              <Link href="/pricing" className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#FF4500] hover:bg-[#FF4500]/90 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#FF4500]/25">
                Upgrade to FocusFlow Pro (₹399/mo)
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
