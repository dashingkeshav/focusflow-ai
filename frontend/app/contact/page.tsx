"use client";

import { FormEvent, useState } from "react";

export default function ContactPage() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setStatus(null);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus({
        type: "error",
        text: "Please fill in all fields.",
      });

      return;
    }

    setLoading(true);

    try {

      const response = await fetch(
        "/api/contact",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name,
            email,
            message,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
          "Unable to send your message."
        );
      }

      setStatus({
        type: "success",
        text:
          "Message sent successfully. We will get back to you soon.",
      });

      setName("");
      setEmail("");
      setMessage("");

    } catch (error) {

      setStatus({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
      });

    } finally {

      setLoading(false);

    }
  }


  return (
    <div className="contact-page">

      {/* HERO */}

      <section className="contact-hero">

        <div className="contact-badge">
          ✦ We are here to help
        </div>

        <h1 className="contact-title">
          Let's{" "}
          <span className="gradient-text">
            Connect.
          </span>
        </h1>

        <p className="contact-description">
          Have a question, feedback, or need help with
          FocusFlow AI? Send us a message and our team
          will get back to you.
        </p>

      </section>


      {/* CONTENT */}

      <section className="contact-content">

        {/* LEFT */}

        <div className="contact-info">

          <div className="section-label">
            Contact Us
          </div>

          <h2>
            We'd love to
            <br />
            hear from you.
          </h2>

          <p>
            Whether you have a question about FocusFlow AI,
            want to report an issue, or simply want to share
            your feedback, we're here to help.
          </p>


          <div className="contact-email">

            <div className="contact-email-label">
              Email
            </div>

            <div className="contact-email-address">
              marutijogdankar233@gmail.com
            </div>

          </div>

        </div>


        {/* RIGHT */}

        <div className="contact-form-card">

          <div className="section-label">
            Send Message
          </div>

          <h2 className="section-title">
            Get in touch
          </h2>

          <p className="section-description">
            Fill out the form and we'll respond as soon
            as possible.
          </p>


          <form
            onSubmit={handleSubmit}
            style={{ marginTop: "30px" }}
          >

            {/* NAME */}

            <div className="form-group">

              <label
                htmlFor="name"
                className="form-label"
              >
                Your Name
              </label>

              <input
                id="name"
                type="text"
                className="form-input"
                placeholder="Enter your name"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                disabled={loading}
              />

            </div>


            {/* EMAIL */}

            <div className="form-group">

              <label
                htmlFor="email"
                className="form-label"
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                disabled={loading}
              />

            </div>


            {/* MESSAGE */}

            <div className="form-group">

              <label
                htmlFor="message"
                className="form-label"
              >
                Message
              </label>

              <textarea
                id="message"
                className="form-textarea"
                placeholder="Tell us how we can help..."
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                disabled={loading}
              />

            </div>


            {/* BUTTON */}

            <button
              type="submit"
              className="form-submit"
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : "✈ Send Message"}
            </button>


            {/* STATUS */}

            {status && (
              <div
                className={`form-message ${
                  status.type === "success"
                    ? "form-success"
                    : "form-error"
                }`}
              >
                {status.text}
              </div>
            )}

          </form>

        </div>

      </section>

    </div>
  );
}