# Feedback Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/feedback` page with a name + message form that opens the user's mail app via `mailto:`, and a call-to-action on the home page.

**Architecture:** A pure function `buildFeedbackMailto` in `lib/feedback.ts` builds and validates the `mailto:` URL. A client component `FeedbackForm` calls it on submit and sets `window.location.href`. A server-component page renders the form in the same style as `/jobs`. The home page gets one new CTA section after "The Owners". No backend, API route, or env var.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS v4, vitest.

**Spec:** `docs/superpowers/specs/2026-10-11-feedback-page-design.md`

## Global Constraints

- Recipient is `franknardone95@gmail.com` (public in page source; approved by owner).
- Message cap is 1500 characters (`MAX_MESSAGE_LENGTH`).
- Name and message are both required; name is not anonymous.
- Subject is `Blake's Shoes feedback from <name>`; body is the message, a blank line, then `- <name>`.
- A NavBar `FEEDBACK` link was added after the plan was executed (see spec); six links needed tighter mobile spacing. `NavBar` is rendered in `app/layout.tsx`; pages must not render it themselves.
- Mobile-first: verify at a real 375px viewport (use emulate's viewport, not `resize_page`); touch targets at least 44px.
- Fonts: use `var(--font-bebas-neue)` and `var(--font-geist-mono)` only. `var(--font-display)`, `var(--font-mono)`, `var(--font-sans)` never resolve.
- Commit messages carry no AI attribution trailer (user rule). Do not open a PR or merge without the owner asking; never auto-merge.
- Branch is `feedback-page` (already created from updated `main`).

## Review Focus

- Name that is only whitespace: rejected like an empty name (Task 1 test).
- Name containing newlines or tabs: collapsed to single spaces so it cannot break the subject line (Task 1 test).
- Message containing `&`, `?`, `#`, `=` or the literal text `&subject=`: stays inside the body and cannot add or override mailto parameters (Task 1 test).
- Message of exactly 1500 characters is accepted, including when padded with trailing spaces that trim to 1500; 1501 is rejected (Task 1 tests).
- Apostrophes, unicode and emoji round-trip intact through encoding (Task 1 test).

---

### Task 1: mailto builder

**Files:**
- Create: `lib/feedback.ts`
- Test: `lib/feedback.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `FEEDBACK_EMAIL: string`, `MAX_MESSAGE_LENGTH: number` (1500), `buildFeedbackMailto(name: string, message: string): string` which throws `Error("Name is required")`, `Error("Message is required")`, or `Error("Message is too long")`.

- [ ] **Step 1: Write the failing test**

Create `lib/feedback.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/feedback.test.ts`
Expected: FAIL (cannot resolve `./feedback`).

- [ ] **Step 3: Write minimal implementation**

Create `lib/feedback.ts`:

```ts
export const FEEDBACK_EMAIL = "franknardone95@gmail.com";
export const MAX_MESSAGE_LENGTH = 1500;

export function buildFeedbackMailto(name: string, message: string): string {
  const cleanName = name.replace(/\s+/g, " ").trim();
  const cleanMessage = message.trim();
  if (!cleanName) throw new Error("Name is required");
  if (!cleanMessage) throw new Error("Message is required");
  if (cleanMessage.length > MAX_MESSAGE_LENGTH) throw new Error("Message is too long");

  const subject = `Blake's Shoes feedback from ${cleanName}`;
  const body = `${cleanMessage}\n\n- ${cleanName}`;
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/feedback.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/feedback.ts lib/feedback.test.ts
git commit -m "Add mailto builder for feedback form"
```

---

### Task 2: Feedback form and page

**Files:**
- Create: `components/FeedbackForm.tsx`
- Create: `app/feedback/page.tsx`

**Interfaces:**
- Consumes: `FEEDBACK_EMAIL`, `MAX_MESSAGE_LENGTH`, `buildFeedbackMailto(name, message): string` from `@/lib/feedback`.
- Produces: default export `FeedbackForm` (no props); route `/feedback`.

- [ ] **Step 1: Create the form component**

Create `components/FeedbackForm.tsx`:

```tsx
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
```

- [ ] **Step 2: Create the page**

Create `app/feedback/page.tsx`:

```tsx
import FeedbackForm from "@/components/FeedbackForm";

export const metadata = { title: "Feedback | Blake's Shoes" };

export default function FeedbackPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-8 md:py-[52px]">
        <div className="max-w-[1160px] mx-auto">
          <div
            className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)] mb-2.5"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            TALK TO THE COMMISH
          </div>
          <h1
            className="text-[48px] md:text-[88px] leading-[.86]"
            style={{ fontFamily: "var(--font-bebas-neue)" }}
          >
            FEEDBACK
          </h1>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-7 md:py-11 pb-14 md:pb-[88px]">
        <div className="max-w-[640px]">
          <FeedbackForm />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Lint, typecheck, build**

Run: `npx eslint components/FeedbackForm.tsx app/feedback && npx tsc --noEmit && npm run build 2>&1 | grep -E "feedback|rror"`
Expected: no lint or type errors; build output lists `/feedback`.

- [ ] **Step 4: Verify in the browser at 375px**

Start `npm run dev -- -p 3111` in the background. Open `http://localhost:3111/feedback` with chrome-devtools `emulate` viewport `375x812x2,mobile,touch`. Check with `evaluate_script`:
- `document.documentElement.scrollWidth === 375` (no horizontal overflow).
- The submit button is disabled while name or message is empty, and its height is at least 44px.
- Intercept navigation to avoid launching a mail client: run `window.addEventListener("click", e => e.preventDefault(), true)` is not enough for `location.href`; instead run `Object.defineProperty(window, "location", ...)` is not allowed, so verify the URL by evaluating `buildFeedbackMailto` indirectly: fill both fields, then read the form's state by confirming the "Your mail app should open" text appears after submit (the navigation to `mailto:` does not unload the page).
Take a screenshot and confirm the layout, then stop the dev server (`pkill -f "next dev -p 3111"`).

- [ ] **Step 5: Commit**

```bash
git add components/FeedbackForm.tsx app/feedback/page.tsx
git commit -m "Add feedback page and form"
```

---

### Task 3: Home page CTA, full verification, memory

**Files:**
- Modify: `app/page.tsx` (insert after the closing `</section>` of "The Owners", immediately before `</main>`, currently around line 362)

**Interfaces:**
- Consumes: route `/feedback` from Task 2; `Link` is already imported in `app/page.tsx` (line 5).
- Produces: nothing later tasks use.

- [ ] **Step 1: Add the CTA section**

Insert between the end of the Owners `</section>` and `</main>`:

```tsx
        {/* Feedback CTA */}
        <section>
          <Link
            href="/feedback"
            className="bg-[var(--accent)] text-[#f5f5f0] p-6 md:p-9 min-h-12 flex items-center justify-between gap-4 hover:opacity-90 transition-opacity duration-150"
          >
            <div>
              <div
                className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-pale)] mb-2"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                GOT FEEDBACK?
              </div>
              <div
                className="text-[30px] md:text-[44px] leading-none"
                style={{ fontFamily: "var(--font-bebas-neue)" }}
              >
                TELL THE COMMISH
              </div>
            </div>
            <span
              className="text-[22px] shrink-0"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              ›
            </span>
          </Link>
        </section>
```

- [ ] **Step 2: Run the full gates**

Run: `npx vitest run 2>&1 | grep -E "Tests|Test Files|FAIL"; npx eslint app/page.tsx app/feedback components/FeedbackForm.tsx lib/feedback.ts lib/feedback.test.ts; npx tsc --noEmit; npm run build 2>&1 | grep -E "feedback|rror"`
Expected: all tests pass, no new lint or type errors (note `app/page.tsx` may already have pre-existing warnings; only new ones matter), build lists `/feedback`.

- [ ] **Step 3: Verify the CTA at 375px**

Start `npm run dev -- -p 3111`; open `http://localhost:3111/` with emulate viewport `375x812x2,mobile,touch`. Confirm: `scrollWidth === 375`, the CTA renders below the owners grid, its anchor `href` is `/feedback`, and its height is at least 44px. Click it and confirm navigation to `/feedback`. Screenshot. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "Add feedback CTA to home page"
```

- [ ] **Step 5: Update memory**

Write `/Users/frank/.claude/projects/-Users-frank/memory/project_blakes_shoes_feedback_page.md` (type project): the `/feedback` page uses a client-side `mailto:` to `franknardone95@gmail.com`, no backend; code in `lib/feedback.ts`, `components/FeedbackForm.tsx`, `app/feedback/page.tsx`, CTA at the end of `app/page.tsx`; branch `feedback-page`; PR state. Add a one-line pointer to `MEMORY.md`. Do not open a PR until the owner asks.
