import { describe, it, expect } from "vitest";
import {
  FEEDBACK_EMAIL,
  MAX_MESSAGE_LENGTH,
  buildFeedbackMailto,
} from "./feedback";

function parse(url: string) {
  const [head, query] = url.split("?");
  const params = new URLSearchParams(query);
  return { to: head, subject: params.get("subject"), body: params.get("body"), keys: [...params.keys()] };
}

describe("buildFeedbackMailto", () => {
  it("addresses the commissioner with the expected subject and body", () => {
    const p = parse(buildFeedbackMailto("Frank", "Nice site"));
    expect(p.to).toBe(`mailto:${FEEDBACK_EMAIL}`);
    expect(p.subject).toBe("Blake's Shoes feedback from Frank");
    expect(p.body).toBe("Nice site\n\n- Frank");
  });

  it("trims name and message", () => {
    const p = parse(buildFeedbackMailto("  Frank  ", "  hi  "));
    expect(p.subject).toBe("Blake's Shoes feedback from Frank");
    expect(p.body).toBe("hi\n\n- Frank");
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(() => buildFeedbackMailto("", "hi")).toThrow("Name is required");
    expect(() => buildFeedbackMailto("   ", "hi")).toThrow("Name is required");
  });

  it("rejects an empty or whitespace-only message", () => {
    expect(() => buildFeedbackMailto("Frank", "")).toThrow("Message is required");
    expect(() => buildFeedbackMailto("Frank", " \n ")).toThrow("Message is required");
  });

  it("collapses newlines and tabs in the name so the subject stays one line", () => {
    const p = parse(buildFeedbackMailto("Frank\nNardone\tJr", "hi"));
    expect(p.subject).toBe("Blake's Shoes feedback from Frank Nardone Jr");
  });

  it("keeps reserved characters inside the body and adds no extra params", () => {
    const msg = "a&b?c#d=e &subject=evil &to=x@y.com";
    const p = parse(buildFeedbackMailto("Frank", msg));
    expect(p.keys).toEqual(["subject", "body"]);
    expect(p.body).toBe(`${msg}\n\n- Frank`);
  });

  it("round-trips apostrophes, unicode and emoji", () => {
    const msg = "It's great — café 🏈";
    expect(parse(buildFeedbackMailto("Zoë", msg)).body).toBe(`${msg}\n\n- Zoë`);
  });

  it("replaces a lone surrogate (half an emoji) instead of throwing", () => {
    const halfEmoji = "\ud83c";
    const p = parse(buildFeedbackMailto("Frank", `hi ${halfEmoji}`));
    expect(p.body).toBe("hi \ufffd\n\n- Frank");
    expect(parse(buildFeedbackMailto(`Zo${halfEmoji}`, "hi")).subject).toBe("Blake's Shoes feedback from Zo\ufffd");
  });

  it("accepts a message of exactly the cap, including trailing padding that trims to it", () => {
    const exact = "x".repeat(MAX_MESSAGE_LENGTH);
    expect(() => buildFeedbackMailto("Frank", exact)).not.toThrow();
    expect(() => buildFeedbackMailto("Frank", exact + "   ")).not.toThrow();
  });

  it("rejects a message over the cap", () => {
    expect(() => buildFeedbackMailto("Frank", "x".repeat(MAX_MESSAGE_LENGTH + 1))).toThrow(
      "Message is too long",
    );
  });
});
