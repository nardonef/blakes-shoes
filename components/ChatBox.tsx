"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";

const EXAMPLES = [
  "Who has won the most championships?",
  "What's Frankie's all-time record against Kaplan?",
  "What's the highest score ever in a single week?",
  "Who won the 2019 title?",
];

const mono = { fontFamily: "var(--font-geist-mono)" };

export default function ChatBox() {
  const { messages, sendMessage, setMessages, stop, status, error } = useChat();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const empty = messages.length === 0;

  // Follow the answer as it streams in.
  useEffect(() => {
    if (!empty) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status, empty]);

  // Grow the textarea with its content, up to a cap.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  function send(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  }

  function newChat() {
    stop();
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div className="max-w-[760px] mx-auto px-4 flex flex-col min-h-[calc(100dvh-110px)] md:min-h-[calc(100dvh-68px)]">
      {empty ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
          <h1 className="text-[56px] md:text-[80px] leading-[.9] text-[#151515]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
            SHOES<span className="text-[var(--accent)]">GPT</span>
          </h1>
          <p className="mt-2 mb-8 text-[15px] text-[var(--body-text)]">
            Ask anything about Blake&apos;s Shoes history, 2012-2025.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            {EXAMPLES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="min-h-14 text-left text-sm px-4 py-3 bg-white border border-[var(--rule)] rounded-xl hover:border-[var(--accent)]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6 pt-6 pb-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={newChat}
              className="min-h-11 px-4 text-[11px] font-semibold tracking-[.16em] text-[var(--muted-light)] border border-[var(--rule)] rounded-full hover:text-[#151515] hover:border-[#151515]"
              style={mono}
            >
              + NEW CHAT
            </button>
          </div>

          {messages.map((m) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            if (m.role === "user") {
              return (
                <div key={m.id} className="self-end max-w-[85%] bg-white border border-[var(--hairline)] rounded-2xl px-4 py-2.5 text-[15px] leading-[1.5] text-[#151515] whitespace-pre-wrap break-words">
                  {text}
                </div>
              );
            }
            return (
              <div key={m.id} className="flex gap-3">
                <Avatar />
                <div className="flex-1 min-w-0 pt-1 text-[15px] leading-[1.6] text-[#151515] whitespace-pre-wrap break-words">
                  {text || (busy ? <Thinking /> : null)}
                </div>
              </div>
            );
          })}

          {status === "submitted" && messages.at(-1)?.role === "user" && (
            <div className="flex gap-3">
              <Avatar />
              <div className="pt-1">
                <Thinking />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-[var(--negative)]">Something went wrong answering that. Try again.</p>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="sticky bottom-0 pb-4 pt-2" style={{ background: "var(--background)" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 bg-white border border-[var(--rule)] rounded-3xl pl-4 pr-2 py-2 focus-within:border-[var(--accent)]"
        >
          <label htmlFor="chat-input" className="sr-only">
            Ask ShoesGPT
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            maxLength={2000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask ShoesGPT"
            className="flex-1 resize-none bg-transparent py-2.5 text-base text-[#151515] focus:outline-none"
          />
          {busy ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Stop answering"
              className="shrink-0 w-11 h-11 rounded-full bg-[#151515] flex items-center justify-center"
            >
              <span className="block w-3.5 h-3.5 bg-white rounded-[2px]" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="shrink-0 w-11 h-11 rounded-full bg-[var(--accent)] text-white flex items-center justify-center disabled:opacity-30"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          )}
        </form>
        <p className="mt-2 text-center text-[11px] text-[var(--muted-light)]">
          ShoesGPT only knows league results. No drafts, trades or player stats.
        </p>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div
      aria-hidden="true"
      className="shrink-0 w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-[15px]"
      style={{ fontFamily: "var(--font-bebas-neue)" }}
    >
      SG
    </div>
  );
}

function Thinking() {
  return <span className="text-[var(--muted-light)]">Looking up stats…</span>;
}
