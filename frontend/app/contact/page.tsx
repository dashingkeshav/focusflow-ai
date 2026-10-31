"use client";

import { FormEvent, useState } from "react";
import { Mail, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import Badge from "@/components/ui/Badge";
import { getApiBaseUrl, fetchWithFallback } from "@/lib/api";


export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanMessage = message.trim();

    if (!cleanName || !cleanEmail || !cleanMessage) {
      setStatus({
        type: "error",
        text: "Please complete all fields before sending.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithFallback('/api/contact', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          message: cleanMessage,
        }),
      });

      const responseText = await response.text();
      let data: { success?: boolean; message?: string; error?: string } = {};

      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error("The server returned an unexpected response.");
        }
      }

      if (!response.ok) {
        throw new Error(
          data.message || data.error || `Server responded with code ${response.status}.`
        );
      }

      setStatus({
        type: "success",
        text: data.message || "Message delivered successfully. Our studio will reply shortly.",
      });

      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      console.error("Contact form error:", error);
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to deliver message.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-transparent text-white selection:bg-[#FF4500] selection:text-white">

      {/* HERO */}
      <section className="relative z-10 pt-36 pb-20">
        <Reveal>
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto px-6">
            <Badge accent>Engineering & Studio Support</Badge>
            <h1 className="mt-6 font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              Let&apos;s{" "}
              <span className="serif-italic text-gradient-teal">connect.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base text-gray-400 sm:text-lg font-light leading-relaxed">
              Have questions regarding FocusFlow AI, extension deployment, custom institutions, or account access? Send us a direct dispatch.
            </p>
          </div>
        </Reveal>
      </section>

      {/* CONTENT */}
      <section className="relative z-10 pb-24 px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr] max-w-6xl mx-auto">
          {/* info panel */}
          <Reveal delay={0.1}>
            <div className="glass-card flex h-full flex-col rounded-3xl border border-[#262832] bg-[#12131A] p-8 shadow-2xl">
              <span className="section-label">Direct Inquiries</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white font-serif">
                We&apos;re eager to{" "}
                <span className="serif-italic text-gradient-teal">assist you.</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-400 font-light">
                Whether you have technical queries about the Chrome extension, subscription billing questions, or design partnership inquiries, our team responds directly.
              </p>

              <div className="mt-auto pt-10">
                <div className="flex items-center gap-4 rounded-2xl border border-[#262832] bg-white/5 p-4 shadow-sm">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#262832] bg-white/5 text-[#FF4500]">
                    <Mail className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                      Engineering & Studio
                    </div>
                    <div className="mt-0.5 truncate text-sm font-semibold text-white">
                      <a
                        href="mailto:keerav2007@gmail.com"
                        className="transition-colors hover:text-[#FF4500] hover:underline"
                      >
                        keerav2007@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* form panel */}
          <Reveal delay={0.2}>
            <div className="glass-card rounded-3xl border border-[#262832] bg-[#12131A] p-8 shadow-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-white font-serif">
                Send a Message
              </h2>
              <p className="mt-1 text-xs text-gray-400 font-light">
                We typically respond within one business day.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-semibold text-gray-300 mb-2">
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    className="form-input"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-xs font-semibold text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    className="form-input"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-semibold text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    className="form-textarea"
                    placeholder="Tell us what you need help with…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={loading}
                    required
                    rows={5}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full justify-center shadow-lg shadow-[#FF4500]/25 mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" aria-hidden />
                      Send Message
                    </>
                  )}
                </button>

                {status && (
                  <div
                    role="alert"
                    className={`mt-4 flex items-start gap-2.5 rounded-xl border p-4 text-xs font-medium ${
                      status.type === "success"
                        ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                        : "border-rose-500/30 bg-rose-950/40 text-rose-300"
                    }`}
                  >
                    {status.type === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden />
                    )}
                    <span>{status.text}</span>
                  </div>
                )}
              </form>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
