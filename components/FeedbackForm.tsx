"use client";

import { useState } from "react";
import {
  FEEDBACK_EMAIL,
  MAX_MESSAGE_LENGTH,
  buildFeedbackMailto,
} from "@/lib/feedback";

const fieldClass =
  "w-full bg-[var(--background)] border border-[var(--rule)] px-4 py-3 text-base text-[#151515] focus:outline-none focus:border-[var(--accent)]";
const labelClass = "block text-[11px] font-semibold tracking-[.16em] text-[var(--muted-light)] mb-2";

export default function FeedbackForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [opened, setOpened] = useState(false);

  const canSubmit = name.trim() !== "" && message.trim() !== "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    window.location.href = buildFeedbackMailto(name, message);
    setOpened(true);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-9 flex flex-col gap-5">
      <div>
        <label htmlFor="feedback-name" className={labelClass} style={{ fontFamily: "var(--font-geist-mono)" }}>
          YOUR NAME
        </label>
        <input
          id="feedback-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className={`${fieldClass} min-h-12`}
        />
      </div>

      <div>
        <label htmlFor="feedback-message" className={labelClass} style={{ fontFamily: "var(--font-geist-mono)" }}>
          FEEDBACK
        </label>
        <textarea
          id="feedback-message"
          required
          rows={7}
          maxLength={MAX_MESSAGE_LENGTH}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${fieldClass} resize-y`}
        />
        <div
          className="mt-1.5 text-right text-[10.5px] tracking-[.06em] text-[var(--muted-light)]"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {message.length}/{MAX_MESSAGE_LENGTH}
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="min-h-12 bg-[var(--accent)] text-[#f5f5f0] text-[13px] font-semibold tracking-[.16em] px-6 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        SEND FEEDBACK
      </button>

      {opened && (
        <p className="text-sm text-[var(--body-text)] leading-[1.45]">
          Your mail app should open with the message ready. Press send there to finish.
        </p>
      )}

      <p className="text-[12px] text-[var(--muted-light)] leading-[1.45]">
        Nothing opening? Email{" "}
        <a href={`mailto:${FEEDBACK_EMAIL}`} className="underline text-[var(--accent)]">
          {FEEDBACK_EMAIL}
        </a>{" "}
        directly.
      </p>
    </form>
  );
}
