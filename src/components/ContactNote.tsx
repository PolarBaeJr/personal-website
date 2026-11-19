"use client";

import { useRef, useState } from "react";

// A note composer that never sends anything itself: "Open in Gmail" opens a
// pre-filled Gmail draft in a new tab, and "Copy note" puts the text on the
// clipboard to paste anywhere. Nothing is stored or posted by this site.
export function ContactNote({ to }: { to: string }) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const subject = name.trim() ? `Hello from ${name.trim()}` : "Hello";

  function note() {
    const sign = [name.trim(), from.trim()].filter(Boolean).join("\n");
    return sign ? `${message.trim()}\n\n${sign}` : message.trim();
  }

  function openGmail(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({
      view: "cm",
      to,
      su: subject,
      body: note(),
    });
    window.open(
      `https://mail.google.com/mail/?${params.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function copyNote() {
    try {
      await navigator.clipboard.writeText(
        `To: ${to}\nSubject: ${subject}\n\n${note()}`,
      );
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <form className="contact-note" onSubmit={openGmail}>
      <label className="field">
        <span className="field-label">Name</span>
        <input
          className="field-input"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="field">
        <span className="field-label">Email</span>
        <input
          className="field-input"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
      </label>
      <label className="field">
        <span className="field-label">Message</span>
        <textarea
          className="field-input field-input--area"
          name="message"
          rows={6}
          required
          placeholder="A role, a case competition, or a project you want to talk about"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </label>
      <div className="btn-row">
        <button type="submit" className="btn btn--primary">
          Open in Gmail
        </button>
        <button
          type="button"
          className="btn btn--outline"
          onClick={copyNote}
          disabled={!message.trim()}
        >
          {copied ? "Copied" : "Copy note"}
        </button>
      </div>
      <p className="contact-note-hint">
        Nothing is sent from this page. Gmail opens a draft in a new tab, or
        copy the note and paste it anywhere.
      </p>
    </form>
  );
}
