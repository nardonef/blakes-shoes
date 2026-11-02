/**
 * Live seasons the build should rewrite from the scrape cache. A season with a recorded champion
 * is finished: its final standings are set by hand and must survive later rebuilds.
 */
export function seasonsToRebuild(live: number[], champions: { season_year: number }[]): number[] {
  return live.filter((year) => !champions.some((c) => c.season_year === year));
}
