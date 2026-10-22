---
name: Blake's Shoes
description: A gritty sports-broadcast trophy case for a 14-season fantasy football league
colors:
  background: "#f5f5f0"
  foreground: "#151515"
  accent: "#2D5A3D"
  accent-light: "#6ba57e"
  accent-pale: "#c6dbcf"
  panel: "#232322"
  card: "#ffffff"
  rule: "#d8d8d0"
  hairline: "#e6e6e0"
  muted-dark: "#9a9a96"
  muted-light: "#7a7a76"
  dim: "#c4c4be"
  body-text: "#3a3a38"
  negative: "#a33a2f"
typography:
  display:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "clamp(2.5rem, 9vw, 7.75rem)"
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "clamp(2rem, 5vw, 2.875rem)"
    fontWeight: 400
    lineHeight: 1
  title:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.25rem)"
    fontWeight: 400
    lineHeight: 1
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  label:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.14em"
rounded:
  none: "0px"
  avatar: "9999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "22px"
  lg: "30px"
  xl: "44px"
components:
  nav-tab-active:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    padding: "16px 18px"
  nav-tab-inactive:
    backgroundColor: "transparent"
    textColor: "#a3a3a0"
    typography: "{typography.label}"
    padding: "16px 18px"
  list-row:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "20px"
  avatar:
    rounded: "{rounded.avatar}"
    backgroundColor: "{colors.rule}"
---

# Design System: Blake's Shoes

## 1. Overview

**Creative North Star: "The Trophy Case Broadcast"**

Blake's Shoes reads like a sports network's on-screen graphics package bolted onto a trophy case, not a web app. Sections are bands of solid color (ink black, forest green, warm off-white) stacked like broadcast lower-thirds, not cards floating on a canvas. Numerals and headlines run in Bebas Neue at a scale that would look absurd on a SaaS dashboard and exactly right on a Sunday pregame show. Every label is Geist Mono, uppercase, tracked wide, like a stat-bug caption. The palette is restrained on purpose: forest green is rare enough that when a whole section goes green (the Champion band), it registers as a real event, not decoration.

This system explicitly rejects the generic SaaS/startup landing-page look (soft pastel cards, gradient hero-metric tiles, rounded-everything) and the bland corporate/stock-photo sports-software look (dated league-management chrome, ad-heavy stock layouts). Nothing here is trying to look "modern" in the 2024-SaaS sense; it's trying to look like a broadcast graphic that happens to run in a browser.

**Key Characteristics:**
- Flat, banded sections in solid color, never floating shadowed cards
- Bebas Neue numerals as the loudest visual element on every screen
- Geist Mono for every label, always uppercase, always tracked out
- Radius zero everywhere except owner/champion photos, which are perfect circles
- Forest green accent used sparingly enough that full-bleed green sections feel earned

## 2. Colors

Mostly tinted neutrals (warm off-white, near-black ink, a near-black panel) with one committed accent that gets to take over an entire section when it wants to.

### Primary
- **Broadcast Green** (`#2D5A3D`): the one accent. Used deliberately and rarely, either as a full-bleed section background (Champion band) or as a small hit of color (active nav tab, year numerals, rule-row accents). Never a wash across the whole page.
- **Green Light** (`#6ba57e`): the green's louder sibling, reserved for numerals and highlights sitting on top of a solid `#2D5A3D` field (countdown digits, champion-band labels).
- **Green Pale** (`#c6dbcf`): the green's whisper, for secondary text sitting on top of a solid green field (eyebrow labels inside the Champion band).

### Neutral
- **Warm Paper** (`#f5f5f0`): the page background. Off-white, warm, never pure white.
- **Ink** (`#151515`): primary text and the dark masthead/nav/countdown-block background. Never pure black.
- **Panel** (`#232322`): the dark tile background inside dark sections (countdown digit tiles).
- **Card White** (`#ffffff`): the one true white, reserved for content blocks that need to read as "paper" against the warm background (Owners grid cells, Next Up card).
- **Rule** (`#d8d8d0`): 1px dividing lines and the hairline-grid background trick (a 0.5px gap of this color between grid cells reads as a shared border).
- **Hairline** (`#e6e6e0`): a step lighter than Rule, for the quietest dividers.
- **Muted Dark** (`#9a9a96`) / **Muted Light** (`#7a7a76`): secondary label text, on dark and light backgrounds respectively.
- **Dim** (`#c4c4be`): the quietest text, for footnotes.
- **Body Text** (`#3a3a38`): slightly softer than Ink, for longer runs of body copy.
- **Negative** (`#a33a2f`): reserved for a loss/negative-state accent; rarely used today.

### Named Rules
**The One Green Rule.** The accent fills either an entire section or almost nothing (a numeral, an active tab). It never tints a card border or a subtle wash. If green is showing, it's either the whole background of something or a single deliberate mark.

## 3. Typography

**Display Font:** Bebas Neue (fallback: sans-serif)
**Body Font:** Geist (fallback: Arial, Helvetica, sans-serif)
**Label/Mono Font:** Geist Mono (fallback: monospace)

**Character:** Bebas Neue is the broadcast voice: tall, condensed, all-caps by construction, used for every number and every heading that needs to shout. Geist carries names and body copy quietly underneath it. Geist Mono is the stat-bug: every label, eyebrow, and unit runs through it in uppercase with wide tracking, which is what makes the Bebas Neue numerals next to it read as "data" rather than just "big text."

### Hierarchy
- **Display** (400, `58px → 124px`, line-height 0.86): the masthead h1 only. One per site.
- **Headline** (400, `32px → 46px`, line-height 1): section titles (HALL OF CHAMPIONS, THE OWNERS, LEAGUE CHAMPION).
- **Title** (400, `24px → 36px`, line-height 1): card-level headings (TRADE DEADLINE, NEXT UP) and champion-band name.
- **Body** (600–700, `13.5px → 17px`, line-height 1.2–1.4): owner names, manager names, anything that's a person's name.
- **Label** (600, `9.5px → 11px`, letter-spacing `.06em–.3em`, uppercase): every eyebrow, unit, table header, and mono caption. Always Geist Mono, always uppercase.

### Named Rules
**The All-Caps Numeral Rule.** Bebas Neue is a caps-only face; nothing set in it is ever mixed-case. If a headline needs mixed case for readability, it isn't a headline, it's body text at the wrong size.

## 4. Elevation

Flat by design. There is no `box-shadow` anywhere in the codebase and none should be added. Depth is conveyed entirely through solid color blocks stacked against the warm-paper background (a black band next to a green band next to white paper reads as layered without any shadow) and through 1px hairline rules, including a "hairline grid" trick where a `2px` gap of `--rule` color between white grid cells does the work a `border` normally would.

### Named Rules
**The Flat-By-Default Rule.** Nothing lifts, glows, or casts a shadow, ever, including on hover. State changes are color-only (background/text swaps at 150ms).

## 5. Components

### Navigation
Sticky dark bar (`#151515`) with a 3px solid `--accent` bottom border. Tabs are Geist Mono 11px, uppercase, `.12em` tracking. Active tab gets a solid `--accent` fill with white text; inactive tabs are `#a3a3a0` and brighten to white on hover. Only `background-color`/`color` transition, at 150ms.

### List Rows
The dominant content pattern (Hall of Champions, Owners grid, Draft Order). Flat rows separated by a 1px `--rule` or `--hairline` bottom border, or by a shared-hairline grid (cells at `--background`, `2px` gaps at `--rule` acting as borders). Rows lighten to `#faf9f6` or `white` on hover; nothing else changes.

### Avatars
The only rounded element in the entire system (`border-radius: 9999px`). Sizes scale by context: 44–58px in dense rows, 88–104px in the Owners grid, up to 152px in the Champion band. A missing photo falls back to a solid `--accent` circle with a single Bebas Neue initial in white, never a broken image or a generic placeholder icon.

### Content Blocks
Solid-color sections used as the page's primary structure: full-bleed `--panel`-on-`--foreground` dark blocks, full-bleed `--accent` green blocks, and white blocks on the warm-paper background. **Two of these currently use a `border-left: 3px` accent stripe** (Next Up card on Home, Town Hall Notes on Rules) to separate them from a plain white card, which is inconsistent with the block-based, non-decorative-border language everywhere else in the system, and reads as a generic "highlighted card" pattern rather than a broadcast band. Flag for the polish pass (see Do's and Don'ts).

## 6. Do's and Don'ts

### Do:
- **Do** keep radius at 0 everywhere except owner/champion avatars (`rounded-full`).
- **Do** keep the accent green rare: a full-bleed section or a single mark, never a border, wash, or tint.
- **Do** build hierarchy and depth with solid color blocks and 1px hairlines, never `box-shadow`.
- **Do** set every label, eyebrow, unit, and table header in Geist Mono, uppercase, tracked `.06em–.3em`.
- **Do** reference the CSS custom properties (`var(--accent)`, `var(--rule)`, etc.) instead of repeating hex literals in new code, so the token set stays the single source of truth.

### Don't:
- **Don't** use a `border-left`/`border-right` accent stripe on a card, list item, or callout. It's currently present on the Home "Next Up" card and Rules "Town Hall Notes" card; rewrite with a full border, a solid color block, or a leading rule/number instead.
- **Don't** add `box-shadow`, `hover:shadow-*`, or `hover:scale-*` anywhere; the system is flat by design, at rest and on hover.
- **Don't** introduce a second border-radius value. Avatars are circles; everything else is square corners.
- **Don't** reach for the generic SaaS/startup landing-page look: no soft pastel cards, no gradient hero-metric tiles, nothing that reads as a templated dashboard.
- **Don't** reach for the corporate/stock-photo sports-software look: no dated league-management chrome, no ad-heavy stock layouts.
- **Don't** introduce near-duplicate grays. `#a3a3a0` (nav inactive text), `#5a5a56`, and `#d4d4d0` currently drift slightly from the named `--muted-dark` / `--muted-light` / `--rule` tokens without being formalized; consolidate onto the existing 14 tokens rather than adding new one-offs.
