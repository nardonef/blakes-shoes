# Feedback page design

## Goal
Let anyone send the commissioner feedback from the site. Submissions are not anonymous and are free text. Delivery is a client-side `mailto:` with no backend.

## Scope
- New `/feedback` page with a form (Name, Message).
- Call-to-action on the home page linking to `/feedback`.
- Out of scope: server route, database, email provider, auth, NavBar link (five links already barely fit at 375px).

## Components
- `lib/feedback.ts`
  - `FEEDBACK_EMAIL = "franknardone95@gmail.com"` (recipient; published in the public page source, approved by the owner).
  - `MAX_MESSAGE_LENGTH = 1500`.
  - `buildFeedbackMailto(name, message)`: trims both; throws if either is empty or the message exceeds the cap; returns `mailto:<FEEDBACK_EMAIL>?subject=<encoded>&body=<encoded>`. Subject: `Blake's Shoes feedback from <name>`. Body: the message, then a blank line and `- <name>`. Uses `encodeURIComponent` for all values.
- `components/FeedbackForm.tsx` (`"use client"`)
  - Controlled Name input and Message textarea (`maxLength` = cap), both required, with a live character count.
  - Submit calls `buildFeedbackMailto` and sets `window.location.href`.
  - Always shows a fallback line with the plain address, for people with no mail client.
  - After submit shows "Your mail app should open. Press send there to finish." The site cannot confirm delivery.
- `app/feedback/page.tsx`: server component, same header and container style as `/jobs`, renders `FeedbackForm`. Exports metadata title `Feedback | Blake's Shoes`.
- `app/page.tsx`: add a small "Got feedback?" card linking to `/feedback`, placed after reading the page for the best spot (probably after the owners grid). No change to existing sections.

## Limits (accepted)
- Nothing happens without a configured mail client (fallback address shown).
- No delivery confirmation.
- "Not anonymous" is enforced only by the required Name field; the mail also carries the sender's own address.
- Very long mailto URLs may be truncated by some clients, hence the 1500-character cap.

## Testing
- Unit (`lib/feedback.test.ts`): encoding of `&`, `?`, `#`, newlines, unicode and apostrophes; trims whitespace; rejects empty name, empty message, and message over the cap; accepts exactly the cap; recipient and subject are correct.
- Manual: 375px viewport (no horizontal overflow, 44px touch targets, form usable), home CTA visible and linked, `mailto:` href produced on submit.
- Gates: `vitest`, `eslint` on changed files, `tsc --noEmit`, `next build` lists `/feedback`.

## Process
Branch `feedback-page` off updated `main`. PR opened only when the owner asks; not merged without the owner's review.
