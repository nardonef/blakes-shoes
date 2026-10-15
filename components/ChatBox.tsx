"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";

const EXAMPLES = [
  "Who has won the most championships?",
  "What's Frankie's all-time record against Kaplan?",
  "What's the highest score ever in a single week?",
];

const mono = { fontFamily: "var(--font-geist-mono)" };

export default function ChatBox() {
  const { messages, sendMessage, status, error } = useChat();
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  function send(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="bg-white p-4 md:p-9 flex flex-col gap-5">
      {messages.length === 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-[var(--body-text)]">Ask anything about league history, 2012-2025. Try:</p>
          {EXAMPLES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="min-h-11 text-left text-sm px-4 py-2 border border-[var(--rule)] hover:border-[var(--accent)]"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {messages.map((m) => {
        const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
        const lookingUp = m.role === "assistant" && !text && busy;
        return (
          <div key={m.id} className={m.role === "user" ? "self-end max-w-[85%]" : "max-w-full"}>
            <div className="text-[10.5px] font-semibold tracking-[.16em] text-[var(--muted-light)] mb-1" style={mono}>
              {m.role === "user" ? "YOU" : "LEAGUE"}
            </div>
            <div
              className={`text-[15px] leading-[1.5] whitespace-pre-wrap break-words ${
                m.role === "user" ? "bg-[var(--accent)] text-[#f5f5f0] px-4 py-2.5" : "text-[#151515]"
              }`}
            >
              {lookingUp ? <span className="text-[var(--muted-light)]">Looking up stats…</span> : text}
            </div>
          </div>
        );
      })}

      {status === "submitted" && messages.at(-1)?.role === "user" && (
        <div className="text-sm text-[var(--muted-light)]">Looking up stats…</div>
      )}

      {error && (
        <p className="text-sm text-[var(--negative)]">Something went wrong answering that. Try again.</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <label htmlFor="chat-input" className="sr-only">
          Your question
        </label>
        <textarea
          id="chat-input"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="e.g. Who won in 2019?"
          className="flex-1 bg-[var(--background)] border border-[var(--rule)] px-4 py-3 text-base text-[#151515] resize-none focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="min-h-12 bg-[var(--accent)] text-[#f5f5f0] text-[13px] font-semibold tracking-[.16em] px-6 disabled:opacity-40 disabled:cursor-not-allowed"
          style={mono}
        >
          ASK
        </button>
      </form>
    </div>
  );
}
