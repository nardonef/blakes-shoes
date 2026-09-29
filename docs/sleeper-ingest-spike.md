# Sleeper ingest spike

Goal: given a Sleeper league ID, rebuild full league history into the blakes-shoes data shapes
(`types/stats.ts`) with no manual steps. Step 1 of the "commissioner pastes a username, gets a site" plan.

Code: `lib/sleeper/{client,ingest,transform}.ts` (37 tests), `scripts/sleeper-spike.ts` (live runner).

## Results (5 real leagues, 33 seasons, run 2026-09-29)

| League | Teams | Seasons | API calls | Time |
|---|---|---|---|---|
| Asian American Association | 10 | 6 | 112 | 9.3s |
| D201 (dynasty) | 14 | 8 | 151 | 12.1s |
| Dynasty Warriors | 12 | 9 | 172 | 14.6s |
| No Money League | 10-12 | 9 | 175 | 14.4s |
| 40 Yard Dashers | 10-12 | 5 | 91 | 7.3s |

- ~20 calls per season, ~1.5s per season at the client's 80ms request spacing (~750 calls/min).
- Every chain walked to its first season; every completed season produced a champion and unique final ranks.
- Independent check: 2025 champion, runner-up and third place match the separately recorded
  fantasy-wrapped fixture for the same league.
- Playoff-classified matchups equal decided winners-bracket games in every season.
- Regular-season W-L recomputed from matchups matches Sleeper roster records exactly in 2 of 5 leagues.

## Gaps the product must handle

1. **Roster totals vs matchup points disagree in old seasons** (2018-2019 mostly). PF differs by small,
   mostly whole numbers; in the few team-seasons where the record is off by a win, the closest game
   was under 1 point. Consistent with later score corrections reaching the matchup endpoint but not the
   frozen roster totals. Not proven. Decide which source the standings page and stats pages each use.
2. **Median / extra-result leagues.** No Money League 2018 shows 28 results in a 14-week season. Matchups
   only carry the head-to-head game, so derived records cannot match Sleeper's. Detectable by comparing
   games played per team against matchup count.
3. **Ownerless rosters.** 40 Yard Dashers 2025 has 2 rosters with no `owner_id` (managers left).
   Currently labelled `Unknown (roster N)`. Sleeper keeps no ownership history to recover the name.
4. **Renames.** 3 users across the dynasty leagues changed display name over the years; history uses
   each user's newest display name, keyed by `user_id`.
5. **Team count and playoff format change across seasons** (10 to 12 teams; 4 to 7 bracket games).
   The template cannot assume a fixed shape.
6. **Chain only covers Sleeper.** Leagues imported from ESPN/Yahoo start at their first Sleeper season.
   No chain ended for a reason other than "no previous league" in these five, so the frequency of
   truncated history is unmeasured.

## Not covered by the spike

- Transactions, drafts, and player-level points (not needed by the current blakes-shoes pages).
- Manager aliases (blakes-shoes merges usernames by hand; Sleeper `user_id` makes this mostly automatic).
- Persistence: the spike writes JSON to a directory the caller chooses. It never writes league data to the repo.
- Sleeper terms of use for commercial use were not reviewed.
