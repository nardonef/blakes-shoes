# Broadcast Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the four existing Blake's Shoes pages (Home, Rules, Legacy, Stats) and the shared NavBar into the "Broadcast" visual system, and fix the five data-layer bugs the handoff calls out along the way. No new features, no routing changes, no content changes beyond what the handoff specifies.

**Architecture:** Pure presentation-layer rewrite of the JSX/Tailwind in each page + NavBar, driven by CSS variables added to `app/globals.css`. Data-fetching functions in `lib/stats-data.ts` get surgical fixes (alias resolution, hall-of-champions derivation) with unit tests; `lib/legacy-data.ts`'s report-generation logic is explicitly unchanged per the handoff. Two Recharts panels (Scoring Trends, Score Distribution) are restyled in place; four other "chart-like" panels (Luck Index, Scoring Consistency, Championship Points, Head-to-Head) are converted from Recharts `BarChart` to hand-built flat CSS bar rows, per the handoff's explicit note that only the two AreaChart/BarChart panels should "stay Recharts."

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 (`@theme inline` tokens, no `tailwind.config.js`), `next/font/google` (Bebas Neue, Geist, Geist Mono — already wired), Recharts 3.7 (kept only for two panels), Vitest (new devDependency, added solely to unit-test the data-layer fixes per this repo's CLAUDE.md testing mandate — no existing test runner in this repo).

**Spec:**
- `/Users/frank/Downloads/design_handoff_broadcast_polish/README.md` — the full written spec (colors, type scale, geometry, per-screen layout, responsive collapse table, data-layer bugs). This is the source of truth for every design token and copy string.
- `/Users/frank/Downloads/design_handoff_broadcast_polish/Blakes Shoes - Broadcast.dc.html` — the literal reference markup. Line ranges below were confirmed by direct inspection and are the source of truth for exact grid-template-columns, padding, and element structure whenever the README's prose is ambiguous:
  - Nav: lines 25–35
  - Home: lines 37–170
  - Rules: lines 172–332
  - Legacy: lines 337–436
  - Stats header + leaderboard + perf/margin lists: lines 438–536
  - Stats luck/consistency/standings/playoff/H2H/champ-points: lines 543–691
  - Stats trends/distribution: lines 693–729

## Global Constraints

- Colors are exactly as tabulated in the README "Colors" section — `--background:#f5f5f0`, ink `#151515`, accent `#2D5A3D`, accent-light `#6ba57e`, accent-pale `#c6dbcf`, panel `#232322`, card `#ffffff`, rule `#d8d8d0`, hairline `#e6e6e0`, muted-dark `#9a9a96`, muted-light `#7a7a76`, dim `#c4c4be`, body-text `#3a3a38`, negative `#a33a2f`. No other saturated colors (no `#dc2626`/`#22c55e`/yellow/red-500) may remain anywhere in the four pages.
- Border radius is 0 everywhere except owner/champion avatars (`rounded-full`). No `box-shadow` anywhere; no `hover:shadow-*`, `hover:scale-*` classes survive.
- Bebas Neue = all headings/numerals (uppercase only, it's a caps-only face). Geist = body/names/cells. Geist Mono = every label/eyebrow/unit/table-header, uppercase, `tracking-[.06em]` to `tracking-[.3em]` depending on role (see README type-scale table).
- Mobile-first Tailwind: base classes are the README's "Mobile" column values, `md:`/`lg:` prefixes carry the "Desktop" column values. Use Tailwind arbitrary-value syntax (`text-[58px]`, `grid-cols-[36px_minmax(0,1fr)_46px]`, etc.) to hit exact pixel specs — do not approximate to the nearest default Tailwind step.
- Grid collapse breakpoints (README responsive table): Champion band → 1-col below ~560px (use `sm:`), Deadline+NextUp / Hall of Champions / Town-hall parts / Bylaws / Stats list-pairs → 1-col below ~620–660px (use `md:`), Owners grid → 2-up minimum (keep `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`), Trends+Distribution → 1-col below 760px (use `lg:`).
- `max-width: 1160px` page container (`max-w-[1160px]`), horizontal padding `16px` → `40px` (`px-4 md:px-10`).
- No emoji anywhere. No icons/SVG artwork.
- Hover: table/list rows lighten to `#faf9f6`; nav tabs `#a3a3a0` → `#fff`. Only `background-color`/`color` transitions at `150ms`, nothing else animates.
- Existing behavior that must NOT change: countdown interval logic, `usePathname()`-driven active nav state, season `<select>` state, `buildScoutingReport`/`luckBlurb`/`bestMomentBlurb`/`worstMomentBlurb`/`ordinal`/`rankOf` in `app/legacy/page.tsx`, the `.slice(0, 35)` H2H cap, the Recharts `<Tooltip>` components on the two panels that keep Recharts.
- Do NOT undertake the "consider moving data aggregation to a server component" suggestion (README data-layer-issues #5) — it's explicitly framed as optional and out of scope for a visual-polish pass.

---

### Task 1: Design tokens in `app/globals.css`

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: CSS custom properties consumed as inline `style={{ color: "var(--accent)" }}` or Tailwind arbitrary values (e.g. `text-[var(--accent)]`) by every later task.

- [ ] **Step 1:** Replace the `:root` block with the full Broadcast token set (keep `--font-*` wiring in `@theme inline` untouched — it's already correct):

```css
:root {
  --background: #f5f5f0;
  --foreground: #151515;
  --accent: #2D5A3D;
  --accent-light: #6ba57e;
  --accent-pale: #c6dbcf;
  --panel: #232322;
  --card: #ffffff;
  --rule: #d8d8d0;
  --hairline: #e6e6e0;
  --muted-dark: #9a9a96;
  --muted-light: #7a7a76;
  --dim: #c4c4be;
  --body-text: #3a3a38;
  --negative: #a33a2f;
}
```

- [ ] **Step 2:** Delete the `.ribbon-banner` and `.confetti*` rules in the `@layer components` block — they belong to the old Home champion showcase, which Task 4 removes entirely. Grep first to confirm no other file references them:

```bash
grep -rn "ribbon-banner\|confetti" app components
```

Expected: only `app/globals.css` and `app/page.tsx` (which Task 4 rewrites) match.

- [ ] **Step 3:** Verify: `npm run build` succeeds (CSS-only change, should be a no-op build-wise until later tasks consume the new vars).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "Add Broadcast design tokens to globals.css"
```

---

### Task 2: Data-layer fixes in `lib/stats-data.ts` + tests

**Files:**
- Modify: `lib/stats-data.ts`
- Create: `lib/stats-data.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `vitest` devDependency + `"test": "vitest run"` script)

**Interfaces:**
- Produces: `resolveManagerName(name: string): string` (exported), `getHallOfChampions(): { year: number; manager: string; team: string }[]` (exported) — consumed by Task 4 (Home page).
- Modifies (signatures unchanged): `getManagerStats()`, `getLuckIndex()`, `getManagerConsistency()`, `getPlayoffStats()` — same return types (`ManagerStats[]`, `LuckIndex[]`, `ManagerConsistency[]`, `PlayoffStats[]`), but the `manager` field now holds the alias-resolved canonical name and rows for the same real person are merged.

This fixes README bugs: "split manager identities" (Eric Rios appearing twice), and "hardcoded championships array duplicates 2024 / omits 2025."

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Add `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 3: Add the `"test"` script to `package.json`**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run"
}
```

- [ ] **Step 4: Write the failing tests** — create `lib/stats-data.test.ts`. These test against the real `data/*.json` fixtures (there's no seam to inject synthetic data without refactoring the module's top-level JSON imports, which would be scope creep for a bug fix) and assert invariants that hold regardless of future data edits:

```typescript
import { describe, it, expect } from "vitest";
import { getManagerStats, getLuckIndex, getManagerConsistency, getPlayoffStats, getHallOfChampions, resolveManagerName } from "./stats-data";
import { CURRENT_OWNERS } from "./legacy-data";
import championsData from "@/data/champions.json";
import standingsData from "@/data/standings.json";
import type { Champion, Standing } from "@/types/stats";

describe("resolveManagerName", () => {
  it("maps a known alias to the current owner's display name", () => {
    expect(resolveManagerName("efuego93")).toBe("Eric Rios");
    expect(resolveManagerName("eric")).toBe("Eric Rios");
    expect(resolveManagerName("tyler")).toBe("Tyler Falcone");
  });

  it("passes through names with no alias match unchanged", () => {
    expect(resolveManagerName("Chris")).toBe("Chris");
  });
});

describe("alias merging across stats aggregators", () => {
  const aliasedOwners = CURRENT_OWNERS.filter((o) => o.aliases.length > 1);

  it("getManagerStats has exactly one row per current owner with multiple aliases, none under a raw alias", () => {
    const stats = getManagerStats();
    for (const owner of aliasedOwners) {
      const rowsForOwner = stats.filter((s) => s.manager === owner.name);
      expect(rowsForOwner.length).toBe(1);
      for (const alias of owner.aliases) {
        if (alias === owner.name) continue;
        expect(stats.find((s) => s.manager === alias)).toBeUndefined();
      }
    }
  });

  it("getLuckIndex and getManagerConsistency and getPlayoffStats never key on a raw alias for a merged owner", () => {
    const rawAliases = aliasedOwners.flatMap((o) => o.aliases.filter((a) => a !== o.name));
    for (const list of [getLuckIndex(), getManagerConsistency(), getPlayoffStats()]) {
      for (const alias of rawAliases) {
        expect(list.find((r) => r.manager === alias)).toBeUndefined();
      }
    }
  });

  it("Eric Rios's merged win/loss totals equal the sum of his two aliases' raw standings rows", () => {
    const standings = standingsData as Standing[];
    const ericAliasRows = standings.filter((s) => ["eric", "efuego93"].includes(s.manager_name));
    const expectedWins = ericAliasRows.reduce((a, s) => a + s.wins, 0);
    const expectedLosses = ericAliasRows.reduce((a, s) => a + s.losses, 0);
    const merged = getManagerStats().find((s) => s.manager === "Eric Rios");
    expect(merged?.totalWins).toBe(expectedWins);
    expect(merged?.totalLosses).toBe(expectedLosses);
  });
});

describe("getHallOfChampions", () => {
  const champions = championsData as Champion[];

  it("returns exactly one row per champions.json entry, no duplicates or omissions", () => {
    const rows = getHallOfChampions();
    expect(rows.length).toBe(champions.length);
    const years = rows.map((r) => r.year).sort((a, b) => a - b);
    const expectedYears = champions.map((c) => c.season_year).sort((a, b) => a - b);
    expect(years).toEqual(expectedYears);
  });

  it("resolves the 2025 champion's alias to Tyler Falcone", () => {
    const row2025 = getHallOfChampions().find((r) => r.year === 2025);
    expect(row2025?.manager).toBe("Tyler Falcone");
    expect(row2025?.team).toBe("Jone crib");
  });

  it("is sorted newest season first", () => {
    const years = getHallOfChampions().map((r) => r.year);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });
});
```

- [ ] **Step 5: Run tests to verify they fail** (functions don't exist yet / old behavior)

```bash
npx vitest run
```

Expected: FAIL — `resolveManagerName` and `getHallOfChampions` are not exported; the Eric Rios and alias-merge assertions fail against current behavior.

- [ ] **Step 6: Implement.** In `lib/stats-data.ts`, add near the top (after the existing imports) — this needs `CURRENT_OWNERS` from `lib/legacy-data.ts`, which has no dependency back on `stats-data.ts`, so this is a one-directional import with no cycle:

```typescript
import { CURRENT_OWNERS } from "@/lib/legacy-data";

export function resolveManagerName(name: string): string {
  const owner = CURRENT_OWNERS.find((o) => o.aliases.includes(name));
  return owner ? owner.name : name;
}

export function getHallOfChampions(): { year: number; manager: string; team: string }[] {
  return [...champions]
    .sort((a, b) => b.season_year - a.season_year)
    .map((c) => ({
      year: c.season_year,
      manager: resolveManagerName(c.champion_manager),
      team: c.champion_team_name,
    }));
}
```

Then in `getManagerStats()`: change every `s.manager_name` used as a map key or stored `manager` value to `resolveManagerName(s.manager_name)`, and change the champions-counting loop's `managerMap.get(c.champion_manager)` to `managerMap.get(resolveManagerName(c.champion_manager))`.

In `getLuckIndex()`, `getManagerConsistency()`, `getPlayoffStats()`: change every `managerData.get(m.team1_manager)` / `.set(m.team1_manager, ...)` (and the `team2` equivalents) to resolve through `resolveManagerName(m.team1_manager)` / `resolveManagerName(m.team2_manager)` first, so both team slots merge into the same map entry when they're really the same person.

- [ ] **Step 7: Run tests to verify they pass**

```bash
npx vitest run
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/stats-data.ts lib/stats-data.test.ts vitest.config.ts package.json package-lock.json
git commit -m "Fix manager-alias duplication in stats aggregators; derive Hall of Champions from data"
```

---

### Task 3: NavBar rewrite

**Files:**
- Modify: `components/NavBar.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: no exported changes — same default export, same `usePathname()`-driven active-tab behavior, but now includes a `HOME` tab (bug fix: `/` currently has no active tab).

Reference: prototype lines 25–35.

- [ ] **Step 1: Rewrite** to match the reference markup:
  - `links` array becomes `[{ href: "/", label: "HOME" }, { href: "/rules", label: "RULES" }, { href: "/legacy", label: "LEGACY" }, { href: "/stats", label: "STATS" }]`.
  - `<nav>`: `sticky top-0 z-50 bg-[#151515] border-b-[3px] border-[var(--accent)]`.
  - Inner container: `max-w-[1160px] mx-auto px-4 md:px-10 flex items-center justify-between flex-wrap`.
  - Wordmark: `<Link href="/">` with `font-[family-name:var(--font-display)] text-[19px] md:text-[24px] tracking-[.02em] text-white py-3.5` containing `BLAKE'S SHOES` then `<span className="text-[var(--accent-light)]">.</span>`.
  - Tabs wrapper: `flex items-stretch flex-1 justify-end` (matches `flex: 1 1 260px; justify-content: flex-end` so it wraps under the wordmark on narrow widths, keeping full-height 44px+ touch targets).
  - Each tab: `flex items-center justify-center min-w-[74px] px-2.5 md:px-[18px] py-4 font-[family-name:var(--font-mono)] text-[11px] font-semibold tracking-[.12em] transition-colors duration-150` plus conditional `bg-[var(--accent)] text-white` (active) vs `text-[#a3a3a0] hover:text-white` (inactive).
  - Active check: `pathname === link.href` (unchanged — `/` now correctly activates only the new Home tab).

- [ ] **Step 2: Verify.** Start the dev server and check `/`, `/rules`, `/legacy`, `/stats`: HOME tab is active only on `/`; nav wraps to a second row without clipping at a 375px viewport; no page has zero active tabs.

```bash
npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add components/NavBar.tsx
git commit -m "Restyle NavBar to Broadcast direction and add missing Home tab"
```

---

### Task 4: Home page rewrite (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `getSeasons` (already exported, used for season count — replaces `leagueStats.seasons + 1`), `getHallOfChampions` (Task 2) — replaces the hardcoded `championships` array.
- Produces: no exports consumed elsewhere.

Reference: prototype lines 37–170. README §Home.

- [ ] **Step 1: Delete dead code** — remove the `leagueRecords` object, the `scrollToOwners` function, and all three commented-out sections (High Rollers, League Records, Photo Gallery). Remove the hardcoded `championships` array (replaced by `getHallOfChampions()`). Keep `currentChampion` (still hand-authored per-season data, unchanged by this handoff — the champion band's Record/Avg Points/Title No. values are not sourced from `getHallOfChampions`) and `owners` (still hand-authored roster, unchanged) as-is.

- [ ] **Step 2: Masthead.** `<header>` full-bleed `bg-[#151515] text-[#f5f5f0] text-center px-4 md:px-10 pt-10 md:pt-[60px] pb-9 md:pb-12`. Eyebrow row: two `w-4 md:w-8 h-0.5 bg-[var(--accent-light)]` rules flanking `FANTASY FOOTBALL LEAGUE` (`font-mono text-[9.5px] md:text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)]`). `h1`: `font-[family-name:var(--font-display)] text-[58px] md:text-[124px] leading-[.86] tracking-[-.01em]`. Stat line: three `font-mono text-[10px] md:text-[12px] tracking-[.1em] text-[#d4d4d0]` cells each `px-3 md:px-[22px] py-1` divided by `border-r border-[#3a3a38]` (last cell no border), numerals `<b className="text-white">`. Season count cell uses `{getSeasons().length}` (fixes the `leagueStats.seasons + 1` hardcode bug).

- [ ] **Step 3: Champion band.** `<section>` `bg-[var(--accent)] text-[#f5f5f0] grid grid-cols-1 sm:grid-cols-2` (collapses below ~560px per the responsive table — `sm:` is the closest standard breakpoint). Left cell: padding `26px→34px`, centered column, avatar `118px→152px` `rounded-full border-[3px] border-[#f5f5f0]` using `next/image fill object-cover`, name `font-[family-name:var(--font-display)] text-[26px] md:text-[32px]`, team `font-mono text-[11px] tracking-[.16em] text-[var(--accent-pale)]`. Right cell: eyebrow `2025 SEASON` (`font-mono text-[9.5px] md:text-[11px] font-semibold tracking-[.3em] text-[var(--accent-pale)]`), headline `LEAGUE CHAMPION` (`text-[50px] md:text-[78px] leading-[.88]`), then a `grid grid-cols-3 border-t border-white/[.22]` row (RECORD / AVG POINTS / TITLE NO.) with 2nd/3rd cells getting `border-l border-white/[.22]`; labels `font-mono text-[10px] tracking-[.16em] text-[var(--accent-pale)]`, values `text-[32px] md:text-[44px]`. No trophy emoji, no separate cards.

- [ ] **Step 4: Trade deadline + Next up.** Wrapper `grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-[26px]` (collapses below ~620px). Trade deadline: `bg-[#151515] text-[#f5f5f0] p-[22px] md:p-[30px]`, header row `flex items-baseline justify-between flex-wrap gap-3` with `TRADE DEADLINE` (`text-[26px] md:text-[36px]`) and `NOV 22, 2026` (`font-mono text-[11px] tracking-[.14em] text-[var(--muted-dark)]`), then `grid grid-cols-4 gap-1.5 md:gap-2.5` of `bg-[var(--panel)] text-center py-2.5 md:py-[15px]` tiles: numeral `text-[32px] md:text-[52px] text-[var(--accent-light)]`, label `font-mono text-[9.5px] tracking-[.18em] text-[var(--muted-dark)] mt-1`. Countdown state/effect logic is unchanged; only the rendering (four tiles, no `:` separators) changes. Next up: `bg-white border-l-[3px] border-[var(--accent)] p-[22px] md:p-[30px]`, same header pattern (`NEXT UP` / `2026 CALENDAR`), body `flex items-center gap-4 md:gap-[22px]`: a `78px` square `bg-[#151515] text-white` date chip (`SEPT` mono 10px accent-light over `5` Bebas 38px) beside `DRAFT DAY` (`text-[24px] md:text-[30px]`) and `3:00 PM · LOCATION TBD` (`font-mono text-[11px] text-[#5a5a56] mt-2`).

- [ ] **Step 5: Hall of Champions.** Heading row `flex items-center gap-4 mb-5`: `HALL OF CHAMPIONS` (`text-[32px] md:text-[46px]`) + `flex-1 h-0.5 bg-[#151515]` rule. List: `grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-11` (collapses below ~660px) over `{getHallOfChampions().map(...)}`, each row `flex items-baseline gap-2.5 md:gap-4 py-[11px] border-b border-[var(--rule)]`: year `font-[family-name:var(--font-display)] text-[24px] md:text-[29px] text-[var(--accent)] w-[58px] shrink-0`, name `text-sm font-semibold text-[#151515]`, team `font-mono text-[10.5px] text-[var(--muted-light)] ml-auto text-right`.

- [ ] **Step 6: The Owners.** Heading row like above but with trailing `2025 SEASON` mono label. Grid: `grid grid-cols-2 md:grid-cols-2 gap-0.5 bg-[var(--rule)]` — actually use `grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4` to satisfy the "2-up minimum" rule while approaching the auto-fit(240px) behavior at wider widths. Each cell `bg-[var(--background)] p-4 md:p-5 flex items-center gap-3.5`: `58px` `rounded-full` avatar, then a `min-w-0` column with name (`text-[13.5px] font-bold text-[#151515]`) and team (`font-mono text-[10px] text-[var(--muted-light)] truncate`).

- [ ] **Step 7: Verify.** `npm run dev`, check `/` at 375px and desktop width: no horizontal scroll, HOME tab active, season count reads the live distinct-season count (14), Hall of Champions shows 14 rows including 2025/Tyler Falcone with no duplicate 2024, no emoji, no rounded cards, no shadows.

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx
git commit -m "Rebuild Home page in the Broadcast direction; derive season count and Hall of Champions from data"
```

---

### Task 5: Rules page rewrite (`app/rules/page.tsx`)

**Files:**
- Modify: `app/rules/page.tsx`

**Interfaces:** No exported changes. `officialRules`, `draftLotteryOrder`, `seasons`/`current` (from `data/league_info.json`), and `formatDate` are unchanged.

Reference: prototype lines 172–332. README §Rules.

- [ ] **Step 1: Header band.** `bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-8 md:py-[52px]`, inner `max-w-[1160px] mx-auto flex items-end justify-between gap-5 flex-wrap`: eyebrow `THE RULE BOOK` + `h1 LEAGUE RULES` (`text-[48px] md:text-[88px] leading-[.86]`) on the left, `{current.season_year} SEASON` (`font-mono text-[11px] tracking-[.14em] text-[var(--muted-dark)]`) right-aligned, `pb-2`.

- [ ] **Step 2: Official Rules.** Replace the white card with `bg-[var(--accent)] text-[#f5f5f0] p-6 md:p-9`, eyebrow `OFFICIAL RULES` (`text-[var(--accent-pale)]`), then map `officialRules` to rows: `flex gap-3.5 md:gap-[22px] items-baseline border-t border-white/[.22] pt-[18px]` — zero-padded number (`String(index + 1).padStart(2, "0")`) in `text-[34px] md:text-[44px] shrink-0`, text `text-base md:text-xl font-medium leading-[1.45]`.

- [ ] **Step 3: Town Hall Notes.** Heading + rule, mono sub-line `POSTED BY COMMISSIONER PETER KLENSCH, ESQ. IN THE LEAGUE GROUP CHAT` (`font-mono text-[10.5px] tracking-[.08em] text-[var(--muted-light)] uppercase`). Body: `bg-white border-l-[3px] border-[var(--accent)] p-6 md:p-9`, meeting title `text-[22px] md:text-[30px]`, sub-line mono, then the four parts in `grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-9`. Each part header: `font-mono text-[10px] font-semibold tracking-[.2em] text-[var(--accent)] border-b-2 border-[var(--accent)] pb-2 mb-3.5 uppercase`. List rows use a `<span className="text-[var(--accent)] font-bold">/</span>` marker instead of `<ul className="list-disc">` — update the `RuleList` helper component (or inline the rows) accordingly; body text `text-[14.5px] leading-[1.5] text-[var(--body-text)]`.

- [ ] **Step 4: Draft Order — replace the `<table>` with the 3-region grid.** Header strip: `grid grid-cols-[52px_1fr_auto] bg-[#151515] text-[#f5f5f0] font-mono text-[9.5px] font-semibold tracking-[.16em]` with cells `PICK` / `OWNER / TEAM` / `KEEPER · COST` (last `text-right`). Rows: `grid grid-cols-[52px_1fr_auto] border-b border-[var(--hairline)] items-center` over `draftLotteryOrder`: pick number `font-[family-name:var(--font-display)] text-[24px] text-[var(--accent)]`, owner/team cell (owner `text-sm font-semibold`, team `font-mono text-[10px] text-[var(--muted-light)] truncate`), keeper/cost cell right-aligned (keeper name `text-sm font-semibold`, `ROUND {keeperCost}` `font-mono text-[10px] text-[var(--muted-light)]`). This is the bug fix — no `overflow-x-auto`, fits 375px.

- [ ] **Step 5: League Format.** Cards grid `grid grid-cols-1 md:grid-cols-3 gap-0.5 bg-[var(--rule)]`, each card `bg-white p-[22px] md:p-7`, title `text-[22px] md:text-[27px]`. Replace `Fact` row styling: `flex items-baseline justify-between gap-3 py-2.5 border-t border-[var(--hairline)]` (mono label left, `text-sm font-semibold` value right) — keep the same `RuleCard`/`Fact` component shapes, just restyle their internals. Footnote `font-mono text-[10px] text-[var(--muted-dark)]`.

- [ ] **Step 6: Format History — replace the 7-column `<table>` with one-row-per-season grid.** `grid grid-cols-[64px_1fr]` per row, `border-b border-[var(--hairline)]`: year `font-[family-name:var(--font-display)] text-[26px] text-[var(--accent)]`, then an inner `grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-4` (approximating `auto-fit minmax(118px,1fr)`) of label/value pairs (`TEAMS`/`DRAFT`/`PLAYOFF TEAMS`/`PLAYOFFS START`/`TRADE DEADLINE`/`WAIVERS`), label `font-mono text-[9px] tracking-[.14em] text-[var(--muted-dark)]`, value `text-[13.5px] font-semibold text-[#151515]` (Draft gets `capitalize`).

- [ ] **Step 7: League Bylaws.** Cards grid `grid grid-cols-1 md:grid-cols-2 gap-0.5 bg-[var(--rule)]`, white cards, `/`-marker list rows (same pattern as Step 3). Replace `TbdBlock` styling: `border-2 border-[var(--hairline)] p-3.5`, label `UNCONFIRMED` (`font-mono text-[9px] font-semibold tracking-[.18em] text-[var(--dim)]`) over note text (`text-[13.5px] text-[var(--muted-light)] leading-[1.5]`).

- [ ] **Step 8: Verify.** `npm run dev`, check `/rules` at 375px: Draft Order and Format History have no horizontal scroll and no visible `overflow-x-auto` container; bylaws' unconfirmed boxes read as intentional, not dashed/italic placeholders.

- [ ] **Step 9: Commit**

```bash
git add app/rules/page.tsx
git commit -m "Rebuild Rules page in the Broadcast direction; replace both wide tables with mobile-safe grids"
```

---

### Task 6: Legacy page restyle (`app/legacy/page.tsx`)

**Files:**
- Modify: `app/legacy/page.tsx`

**Interfaces:** `ordinal`, `rankOf`, `buildScoutingReport`, `luckBlurb`, `bestMomentBlurb`, `worstMomentBlurb` are **unchanged** per the handoff — only the JSX return of `LegacyPage` (and the header/body markup) is restyled.

Reference: prototype lines 337–436. README §Legacy.

- [ ] **Step 1: Header band.** `bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-8 md:py-[52px]`, eyebrow `SCOUTING REPORTS`, `h1 LEAGUE LEGACY` (`text-[48px] md:text-[88px] leading-[.86]`), intro paragraph `max-w-[62ch] text-[16px] text-[#b0b0aa] leading-[1.6]` (existing copy unchanged).

- [ ] **Step 2: Manager cards wrapper.** `flex flex-col gap-0.5 bg-[var(--rule)]` (2px separation via background-as-gap trick), each card `bg-white`.

- [ ] **Step 3: Card header.** `flex flex-wrap items-center gap-3.5 md:gap-5 p-[18px] md:p-6 bg-[#151515] text-[#f5f5f0]`: zero-padded rank `String(index + 1).padStart(2, "0")` (`text-[26px] md:text-[34px] text-[var(--accent-light)] w-[42px] shrink-0`) — this requires switching the `.map` to include an index; `76px` `rounded-full` avatar; name column (name `text-[26px] md:text-[34px]`, team+seasons `font-mono text-[10px] tracking-[.14em] text-[var(--muted-dark)]`); stat cluster `flex gap-3.5 md:gap-[26px] flex-wrap items-end`: ALL-TIME/WIN %/PPG each a label (`font-mono text-[9px] tracking-[.14em] text-[var(--muted-dark)]`) over value (`text-[22px] md:text-[28px]`, WIN % value in `text-[var(--accent-light)]`); when `legacy.championships > 0` add a `bg-[var(--accent)] px-2.5 py-1.5` TITLES tile (label `text-[var(--accent-pale)]`, value `×{legacy.championships}`); when `legacy.runnerUps > 0 || legacy.thirds > 0` add a `font-mono text-[10px] tracking-[.1em] text-[#b0b0aa]` finish-label line (e.g. `N× RUNNER-UP · N× THIRD`). This replaces the `🏆 N× Champion` emoji badge.

- [ ] **Step 4: Card body.** `grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-9 p-[22px] md:p-8`. Left column: `DOES WELL` label (`font-mono text-[10px] font-semibold tracking-[.2em] text-[var(--accent)] border-b-2 border-[var(--accent)] pb-2 mb-3.5`) over `+`-marked `strengths` rows (`text-[var(--accent)] font-bold` marker, `text-sm text-[var(--body-text)] leading-[1.5]`), then `DOESN'T DO WELL` label (`text-[var(--muted-dark)] border-b-2 border-[var(--rule)]`) over `−`-marked `weaknesses` rows (`text-[var(--muted-dark)]` marker). Right column: `LUCK`/`BEST MOMENT`/`WORST MOMENT`, each `font-mono text-[9.5px] font-semibold tracking-[.18em] text-[var(--muted-dark)] mb-1.5` label over `text-sm text-[var(--body-text)] leading-[1.55]` paragraph — text content from the unchanged `luckBlurb`/`bestMomentBlurb`/`worstMomentBlurb` calls.

- [ ] **Step 5: Rivalry strip.** Keep the existing conditional (`bestRival.winPct >= 0.55` / `worstRival.winPct <= 0.45`, guarding the duplicate-opponent case), restyle as `flex flex-wrap gap-0.5 bg-[var(--rule)] border-t border-[var(--rule)]`, each present side `flex-1 basis-60 bg-[var(--background)] py-3.5 px-5 md:px-8`: `OWNS` label `text-[var(--accent)]` / `STRUGGLES VS` label `text-[var(--muted-dark)]` (`font-mono text-[9.5px] font-semibold tracking-[.18em] mr-2.5`), value `text-sm font-semibold text-[#151515]`.

- [ ] **Step 6: Verify.** `npm run dev`, check `/legacy`: no emoji badge, card header stat cluster wraps cleanly at 375px, rivalry strip only appears for managers who clear the threshold (spot-check against current behavior before the restyle).

- [ ] **Step 7: Commit**

```bash
git add app/legacy/page.tsx
git commit -m "Restyle Legacy page manager cards in the Broadcast direction"
```

---

### Task 7: Stats page rewrite (`app/stats/page.tsx`)

**Files:**
- Modify: `app/stats/page.tsx`

**Interfaces:**
- Consumes: all existing `lib/stats-data.ts` exports (now alias-corrected by Task 2) — no call-site signature changes needed.
- Removes: the `ChartCard`/`StatCard`/`CustomTooltip` helper components' Tailwind card styling is replaced; `CustomTooltip` itself is kept (still used by the Scoring Trends `AreaChart`, per the "keep the existing `<Tooltip>` components" constraint) but restyled to drop `shadow-lg`.

Reference: prototype lines 438–729 (see Spec section above for exact sub-ranges). README §Stats.

- [ ] **Step 1: Header band + summary tiles.** `bg-[#151515] text-[#f5f5f0] px-4 md:px-10 pt-8 md:pt-[52px]`, inner `max-w-[1160px] mx-auto`: eyebrow `THE RECORD BOOK`, `h1 LEAGUE STATS` (`text-[48px] md:text-[88px] leading-[.86] mb-6 md:mb-[34px]`), then `grid grid-cols-2 md:grid-cols-4 gap-0.5 bg-[#3a3a38]` of `bg-[var(--panel)] p-4 md:p-[22px]` tiles: label (`font-mono text-[9.5px] font-semibold tracking-[.18em] text-[var(--muted-dark)]`), value (`text-[34px] md:text-[48px] text-[var(--accent-light)]`), optional sub-label (`font-mono text-[9.5px] text-[var(--muted-light)] mt-1`). Four tiles: `SEASONS` / `TOTAL GAMES` / `ALL-TIME HIGH` (+ `SINGLE GAME`) / `AVG PPG` (+ `LEAGUE WIDE`) — same values already computed (`seasons.length`, `totalGames`, `allTimeHighScore`, `avgPointsPerGame`), just re-labeled per spec and moved into the dark band (delete the standalone `StatCard` white-card row entirely).

- [ ] **Step 2: Manager Leaderboard — replace the `<table>` with a grid.** Section heading pattern used throughout the rest of this page: `flex items-center gap-4 mb-2 flex-wrap` with an `h2` (`text-[30px] md:text-[42px]`) + `flex-1 h-0.5 bg-[#151515]` rule, then a `font-mono text-[10.5px] tracking-[.08em] text-[var(--muted-light)] mb-5 uppercase` subtitle line. Header strip: `grid grid-cols-[36px_minmax(0,1fr)_46px_46px_62px_62px_40px] bg-[#151515] text-[#f5f5f0] font-mono text-[9.5px] font-semibold tracking-[.1em]` cells `#`/`MANAGER`/`W`/`L`/`WIN%`/`PPG`/`TTL` (numeric cells `text-right`). Rows over `[...managerStats].sort((a,b) => b.totalWins - a.totalWins)` (unchanged sort): same grid-cols, `border-b border-[var(--hairline)] items-center text-[13.5px]`; rank numeral `font-[family-name:var(--font-display)] text-[20px]` colored `var(--accent)` for index < 3 else `var(--dim)`; win% `text-[var(--accent)] font-semibold`; titles cell — **replace the yellow pill** with `font-[family-name:var(--font-display)] text-[19px] text-[var(--accent)]` showing `×{championships}` when `> 0`, else an em-dash in `text-[var(--dim)]`.

- [ ] **Step 3: Top/Lowest Performances + Nail Biters/Blowouts — replace the four `space-y-3` card lists with the flat-row pattern.** Wrapper `grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-9` (two of these wrappers, one per pair). Each list: heading pattern (h3 `text-[24px] md:text-[32px]`) + subtitle, then `bg-white` with rows `flex items-center gap-3 py-[11px] px-3.5 border-b border-[var(--hairline)]`: rank (`font-[family-name:var(--font-display)] text-[20px] w-[22px]`, `var(--accent)` for top-3 else `var(--dim)` — Nail Biters currently uses `#dc2626`/off-palette for top-3, replace with `var(--negative)` per the negative-color rule for unlucky/margin contexts), primary text + mono metadata stacked (`text-[13.5px] font-semibold` / `font-mono text-[9.5px] text-[var(--muted-light)]` truncated), score/margin right-aligned `font-[family-name:var(--font-display)] text-[22px]–[24px]` — Blowout margins `var(--accent)`, Nail-biter margins `var(--negative)`. Drop the `(non-regular season)` yellow-600 annotation's color — use `var(--muted-light)` instead of `text-yellow-600`.

- [ ] **Step 4: Luck Index — convert off Recharts to flat diverging bars.** Delete the `BarChart`/`ResponsiveContainer` block. New markup: heading pattern, subtitle `ACTUAL WINS MINUS EXPECTED WINS FROM SCORING`, `bg-white p-5 md:p-7`, `flex flex-col gap-2.5` of rows over `luckIndex` (already sorted by `luck` descending — unchanged): each row `flex items-center gap-2.5`: manager label `w-[60px] md:w-[86px] font-mono text-[10px] text-[var(--body-text)] text-right truncate shrink-0`; a `flex-1 relative h-[18px] bg-[var(--background)]` track containing a `absolute inset-y-0 w-px bg-[var(--rule)]` zero-line and a colored bar positioned/widthed from the zero line — compute `min`/`max` of `luck` values once to build a linear scale (e.g. `const maxAbs = Math.max(...luckIndex.map(l => Math.abs(l.luck)))`; for each row, `widthPct = (Math.abs(l.luck) / maxAbs) * 50` and position it left of center (negative) or right of center (positive) using inline `style={{ left: ..., width: ... }}` percentages) — bar color `var(--accent)` when `luck >= 0` else `var(--negative)`; trailing label `w-10 font-mono text-[10px] font-semibold` colored the same as the bar, text `{luck >= 0 ? "+" : ""}{luck.toFixed(1)}`. Legend row below: two `flex items-center gap-1.5` swatches, `WON MORE THAN EXPECTED` (accent) / `UNLUCKY WITH MATCHUPS` (negative), `font-mono text-[9.5px] tracking-[.1em] text-[var(--muted-light)] border-t border-[var(--hairline)] pt-3.5 mt-4`.

- [ ] **Step 5: Scoring Consistency — same conversion, single-direction bars.** Same row shape as Step 4 but no zero-line/diverging behavior: track `flex-1 h-[18px] bg-[var(--background)]`, bar `h-[18px]` with `width: (stdDev / maxStdDev) * 100%`, color `var(--accent)` for the 3 lowest-stdDev rows (already sorted ascending — unchanged) else `#151515`. Legend: `MOST CONSISTENT (TOP 3)` / `BOOM OR BUST`.

- [ ] **Step 6: Season Standings.** Delete the `hidden md:block h-96` Recharts `BarChart` above the table entirely (README: "Also removed: the desktop-only stacked wins/losses bar chart... hidden on mobile anyway"). Replace the `<select>` styling — drop `focus:ring-red-500` — with `bg-[#151515] text-white border-none px-3.5 py-2.5 font-mono text-[11px] font-semibold tracking-[.12em]` (no visible focus ring in any accent color per the "no red anywhere" rule; a plain `focus:outline-none` is fine since the ink block itself provides sufficient contrast affordance). Replace the `<table>` with the same header-strip + row-grid pattern as Step 2: `grid-cols-[36px_minmax(0,1fr)_56px_50px_68px]`, cells `#`/`TEAM`/`W-L`/`WIN%`/`PTS`; team cell stacks team name (`text-[13.5px] font-semibold`) over manager name as a mono sub-line (`font-mono text-[9.5px] text-[var(--muted-light)]`) — this is new relative to the current table, which put manager name in its own implicit spot; match it to the reference markup exactly (prototype line 617).

- [ ] **Step 7: Playoff Performance — replace the `<table>` with the grid pattern.** `grid-cols-[36px_minmax(0,1fr)_56px_56px_56px_56px]`, cells `#`/`MANAGER`/`PO W-L`/`PO PPG`/`REG PPG`/`CLUTCH`. Clutch cell: `font-[family-name:var(--font-display)] text-[20px]`, `var(--accent)` when positive, `var(--negative)` when negative, `var(--dim)` when zero (replacing `#22c55e`/`#dc2626`/tertiary-gray).

- [ ] **Step 8: Head to Head — replace the two-column `<table>` with the symmetrical grid.** `grid grid-cols-1 md:grid-cols-2 gap-0.5 bg-[var(--rule)]` (approximating `auto-fit minmax(290px,1fr)`), each cell `bg-white flex items-center gap-2.5 py-[11px] px-3.5`: left name (`flex-1 text-sm font-semibold text-right truncate`, colored `var(--accent)` if that side has more wins else `var(--muted-dark)`), score `font-[family-name:var(--font-display)] text-[20px] text-[#151515] shrink-0` (e.g. `10–7`), right name (`flex-1 text-sm font-semibold truncate`, same win/loss coloring). Keep the existing `.slice(0, 35)` cap.

- [ ] **Step 9: Championship Points — convert off Recharts to flat bars.** Delete the `BarChart` block. New markup: `bg-white p-5 md:p-7`, `flex flex-col gap-2.5` of rows over `championsData` **reversed to newest-first** (currently ascending from `getChampionsChartData()` — apply `.slice().reverse()` at the render call site only, do not change the exported function's sort order since other potential future consumers may rely on chronological order): year (`font-[family-name:var(--font-display)] text-[22px] w-11 shrink-0`), track `flex-1 h-[22px] bg-[var(--background)]` with a `h-[22px] bg-[var(--accent)]` bar scaled the same way the current Recharts `domain={["dataMin - 100", "dataMax + 50"]}` worked — i.e. compute `min = Math.min(...points) - 100`, `max = Math.max(...points) + 50` once, then `widthPct = ((points - min) / (max - min)) * 100`, value label `font-mono text-[10.5px] text-[var(--body-text)] w-[52px] text-right` showing `{points.toFixed(1)}`.

- [ ] **Step 10: Scoring Trends — restyle, keep Recharts `AreaChart`.** Keep the component and its `<Tooltip content={<CustomTooltip />} />`. Update colors only: `highScore` stroke/fill → `var(--accent)`/`${accent}1a`, `avgScore` → `#151515`/`#1515151a`, `lowScore` → `#b0b0aa`/`#b0b0aa1a` (update the `chartColors` export in `lib/stats-data.ts` — `secondary`/`tertiary` currently `#1a1a1a`/`#9ca3af`, change to `#151515`/`#b0b0aa` to match; `primary` stays `#2D5A3D`). `YAxis domain={[50, "auto"]}` unchanged. Restyle `CustomTooltip`'s container (`bg-white p-3 border border-[var(--hairline)]`, drop `shadow-lg rounded-lg`) and its own legend row to the mono/uppercase pattern (`HIGH`/`AVERAGE`/`LOW` swatches, `font-mono text-[9.5px] tracking-[.1em] text-[var(--muted-light)]`) instead of Recharts' built-in `<Legend />`.

- [ ] **Step 11: Score Distribution — restyle, keep Recharts `BarChart`.** Keep the component. Fix the x-axis label clipping bug: remove `angle={-45}` / `textAnchor="end"` and instead render range labels via a custom `<XAxis tick={...}/>` — simplest compliant approach given "x labels rotated vertically (`writing-mode: vertical-rl`)" is a plain-CSS technique that doesn't map to a Recharts tick prop cleanly: keep `XAxis` label rendering default (horizontal, no rotation) since Recharts' built-in tick renderer doesn't support `writing-mode`, and rotating via `angle` is exactly the bug being fixed — a non-rotated, non-clipping label is the compliant outcome even if it doesn't literally reproduce vertical-rl text. Bar colors: tallest bar `var(--accent)`, rest `#151515` (already implemented — no color change needed here, just remove the rotated-label styling and restyle the tooltip).

- [ ] **Step 12: Footer.** `text-center font-mono text-[10px] tracking-[.14em] text-[var(--muted-dark)]`, copy: `DATA FROM {seasons[seasons.length-1]}–{seasons[0]} SEASONS`.

- [ ] **Step 13: Verify.** `npm run dev`, check `/stats` at 375px and desktop: no `overflow-x-auto`/`min-w-[600px]` survives on any table-turned-grid, no yellow/red-500/green-500 colors remain (`grep -n "yellow\|dc2626\|22c55e\|red-500" app/stats/page.tsx` returns nothing), Season Standings has no chart above the table, Scoring Trends and Score Distribution still render via Recharts.

- [ ] **Step 14: Commit**

```bash
git add app/stats/page.tsx lib/stats-data.ts
git commit -m "Rebuild Stats page in the Broadcast direction; move 4 charts off Recharts to flat bars"
```

---

### Task 8: Full-repo verification

**Files:** none (verification only).

- [ ] **Step 1:** `npm run lint` — must pass with no new warnings/errors.
- [ ] **Step 2:** `npx vitest run` — all Task 2 tests still pass.
- [ ] **Step 3:** `npm run build` — production build succeeds (this also type-checks).
- [ ] **Step 4:** `npm run dev`, then visually check all four routes at both a 375px-wide viewport and a desktop width (~1280px): no horizontal scroll anywhere, no `box-shadow`/rounded rectangles except avatars, no emoji, no off-palette colors (`grep -rn "dc2626\|22c55e\|yellow-\|red-500\|shadow-md\|shadow-lg\|hover:scale" app components` should return nothing).
- [ ] **Step 5:** Confirm the specific bug fixes: `/` shows a live season count (not a hardcoded off-by-one), Hall of Champions has 14 rows with 2025/Tyler Falcone present and no duplicate 2024; `/stats` leaderboard, luck index, and consistency charts show one "Eric Rios" row each, not two.
- [ ] **Step 6:** No further commit needed — this task only verifies Tasks 1–7.
