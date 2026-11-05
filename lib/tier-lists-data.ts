// Tier lists posted to the league GroupMe by Lisan Al-Gaib (Borba, the Tier list czar).
// Images live in public/tier-lists/. Team names are transcribed as drawn on each image.

export type Tier = { name: string; teams: string[] };

export type TierList = {
  slug: string;
  postedOn: string; // ISO date the image was posted
  title: string;
  caption?: string; // the GroupMe message text that came with the image
  src: string;
  width: number;
  height: number;
  tiers?: Tier[];
};

const tiers = (...rows: [string, string[]][]): Tier[] =>
  rows.map(([name, teams]) => ({ name, teams }));

// League power rankings, newest first.
export const LEAGUE_TIER_LISTS: TierList[] = [
  {
    slug: "2026-week-8",
    postedOn: "2026-11-03",
    title: "Week 8",
    src: "/tier-lists/2026-11-03.jpeg",
    width: 667,
    height: 1000,
    tiers: tiers(
      ["Big Dogs", ["The Loose Cannons", "Bryan Yatskos Team", "Not Popular Boys"]],
      ["Watch Out!", ["Post Grad Apartments", "Wizards of Koz", "Anthony's Nifty Team"]],
      ["Hopes and Prayers", ["The Hullabaloos", "Jones Crib", "New Crew"]],
      ["GMR's", ["Peter is Corrupt", "All Business Pete", "Brianna Red Carpet"]],
    ),
  },
  {
    slug: "2026-week-7",
    postedOn: "2026-10-27",
    title: "Week 7",
    caption: "Week 7 Tier List",
    src: "/tier-lists/2026-10-27.jpeg",
    width: 667,
    height: 1000,
    tiers: tiers(
      ["Big Dogs", ["The Loose Cannons", "Not Popular Boys", "Bryan Yatskos Team"]],
      ["Watch Out!", ["Wizards of Koz", "Post Grad Apartments", "The Hullabaloos"]],
      ["Hopes and Prayers", ["Anthony's Nifty Team", "New Crew", "Jones Crib"]],
      ["GMR's", ["Peter is Corrupt", "Brianna Red Carpet", "All Business Pete"]],
    ),
  },
  {
    slug: "2026-week-6",
    postedOn: "2026-10-24",
    title: "Week 6",
    caption: "Peep your tier list",
    src: "/tier-lists/2026-10-24.jpeg",
    width: 667,
    height: 1000,
    tiers: tiers(
      ["Big Dogs", ["Bryan Yatskos Team", "The Hullabaloos", "The Loose Cannons"]],
      ["Watch Out!", ["Not Popular Boys", "Post Grad Apartments", "Wizards of Koz"]],
      ["Hopes and Prayers", ["New Crew", "Jones Crew", "Anthony's Nifty Team"]],
      ["GMR's", ["Peter is Corrupt", "Brianna Red Carpet", "All Business Pete"]],
    ),
  },
];

// Non-league tier lists from earlier years, newest first.
export const ARCHIVE_TIER_LISTS: TierList[] = [
  {
    slug: "2022-commercial-spokespeople",
    postedOn: "2022-11-07",
    title: "Commercial Spokespeople",
    src: "/tier-lists/2022-11-07.jpeg",
    width: 950,
    height: 408,
  },
  {
    slug: "2021-fast-food",
    postedOn: "2021-07-16",
    title: "Fast Food",
    src: "/tier-lists/2021-07-16.jpeg",
    width: 1400,
    height: 1500,
  },
];

// Team names that changed between images, mapped to the latest name.
const TEAM_ALIASES: Record<string, string> = { "Jones Crew": "Jones Crib" };

export type TeamPath = { team: string; ranks: number[]; tiers: string[] };
export type Movement = { weeks: string[]; tierNames: string[]; teams: TeamPath[] };

// Rank = position on the image: tier order, then left to right within the tier.
// Weeks run oldest to newest; teams are sorted by their latest rank.
export function tierMovement(lists: TierList[] = LEAGUE_TIER_LISTS): Movement {
  const ordered = [...lists].reverse();
  const paths = new Map<string, TeamPath>();
  ordered.forEach((list, w) => {
    let rank = 0;
    for (const tier of list.tiers ?? []) {
      for (const raw of tier.teams) {
        const team = TEAM_ALIASES[raw] ?? raw;
        const path = paths.get(team) ?? { team, ranks: [], tiers: [] };
        path.ranks[w] = ++rank;
        path.tiers[w] = tier.name;
        paths.set(team, path);
      }
    }
  });
  const last = ordered.length - 1;
  return {
    weeks: ordered.map((l) => l.title),
    tierNames: ordered[last]?.tiers?.map((t) => t.name) ?? [],
    teams: [...paths.values()].sort((a, b) => a.ranks[last] - b.ranks[last]),
  };
}

export function formatPostedOn(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function altText(list: TierList): string {
  if (!list.tiers) return `${list.title} tier list`;
  return `${list.title} tier list. ${list.tiers
    .map((t) => `${t.name}: ${t.teams.join(", ")}`)
    .join(". ")}.`;
}
