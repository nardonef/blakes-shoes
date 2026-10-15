import { describe, it, expect, vi } from "vitest";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};

// Step 1: the model calls getHeadToHead. Step 2: it answers in text.
let step = 0;
const model = new MockLanguageModelV4({
  doStream: async () => ({
    stream: simulateReadableStream<LanguageModelV4StreamPart>({
      chunks:
        step++ === 0
          ? [
              {
                type: "tool-call",
                toolCallId: "call-1",
                toolName: "getHeadToHead",
                input: '{"managerA":"Frankie","managerB":"Kaplan"}',
              },
              { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
            ]
          : [
              { type: "text-start", id: "t1" },
              { type: "text-delta", id: "t1", delta: "Frankie and Kaplan are 9-9." },
              { type: "text-end", id: "t1" },
              { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
            ],
    }),
  }),
});

vi.mock("@ai-sdk/anthropic", () => ({ anthropic: () => model }));

const { POST } = await import("./route");

describe("POST /api/chat", () => {
  it("runs a league tool against real data and streams the answer", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [
          { id: "u1", role: "user", parts: [{ type: "text", text: "Frankie vs Kaplan all time?" }] },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const body = await res.text();

    // Tool output computed from data/h2h_records.json
    expect(body).toContain('"opponent":"Ryan Kaplan"');
    expect(body).toContain('"games":18');
    // Final text from the second step
    expect(body).toContain("Frankie and Kaplan are 9-9.");
    expect(step).toBe(2);
  });

  function post(messages: unknown[]) {
    return POST(new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ messages }) }));
  }
  const userMsg = (i: number, text = "hi") => ({ id: `u${i}`, role: "user", parts: [{ type: "text", text }] });

  it("rejects more than 20 messages without calling the model", async () => {
    const before = step;
    const res = await post(Array.from({ length: 21 }, (_, i) => userMsg(i)));
    expect(res.status).toBe(400);
    expect(step).toBe(before);
  });

  it("rejects a user message over 2000 characters", async () => {
    const res = await post([userMsg(0, "x".repeat(2001))]);
    expect(res.status).toBe(400);
  });

  it("accepts a long assistant reply in history (cap is on user questions only)", async () => {
    const res = await post([
      userMsg(0),
      { id: "a0", role: "assistant", parts: [{ type: "text", text: "y".repeat(4000) }] },
      userMsg(1),
    ]);
    expect(res.status).toBe(200);
  });

  it("rejects oversized non-text parts that bypass the text cap", async () => {
    const before = step;
    const res = await post([
      {
        id: "a0",
        role: "assistant",
        parts: [
          {
            type: "tool-getChampions",
            toolCallId: "c0",
            state: "output-available",
            input: {},
            output: "x".repeat(200_001),
          },
        ],
      },
      userMsg(1),
    ]);
    expect(res.status).toBe(400);
    expect(step).toBe(before);
  });
});
