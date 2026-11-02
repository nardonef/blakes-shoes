# Refreshing the current season's data

The Yahoo Fantasy API refuses this app (403), so league data is read from the Yahoo website in a
logged-in Chrome tab, slowly, and rebuilt into `data/`. A refresh takes about 5 minutes.

## Steps
1. `npm run yahoo:receiver`: a local sink on 127.0.0.1:8787 that only accepts posts from the Yahoo Fantasy site.
2. In a logged-in `https://football.fantasysports.yahoo.com` tab, open the console and run:
   ```js
   window.__bsSeasons = [[2026, 65895, 17, true]]; // [season, league id, last week, in progress]
   ```
   then paste `scripts/yahoo-scrape.browser.js`. Watch `window.__bs` until `status` is `"done"`.
   Chrome asks once to allow local-network access for the Yahoo site; allow it.
3. `npm run yahoo:build`: rebuilds `data/` from the cache in `~/.cache/blakes-shoes-yahoo/html`.
   It ends with a score check; it should report 0 problems.
4. `npm test`, then commit the changed `data/*.json` files and open a PR.

## What an in-progress season does
- Transactions, standings and draft results are re-fetched every time. Matchups are only fetched
  for weeks every team has finished, and finished weeks are never re-fetched.
- `scripts/yahoo-build.ts` writes that season's rows into `standings.json`, `matchups.json`,
  `league_info.json` and `draft_history.json`, replacing only that season. Its settings (league id,
  Yahoo game number, playoff weeks) live in `LIVE` at the top of the script.
- Until `champions.json` has an entry for the season, the site treats it as in progress
  (`lib/season-status.ts`): standings show the current rank, rosters say "Latest", the draft board
  shows "In progress", and ShoesGPT is told there's no champion yet.

## When the season ends
Scrape once more after week 17 so the playoff weeks are in, then add the season's champion,
runner-up and third place to `data/champions.json`, set its `final_rank` values in `standings.json`
to the playoff finish, and add it to `HISTORY` in the browser script. Once `champions.json` has the
season, `npm run yahoo:build` leaves its standings, matchups and settings alone, so the hand-set
finishes survive later rebuilds.

## A new season
Find the league id on the Yahoo league page (`/f1/<id>`) and the 3-digit game number in any league
page's source (`<game>.l.<id>`). Add the season to `LIVE` in `scripts/yahoo-build.ts`.
