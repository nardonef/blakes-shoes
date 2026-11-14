// Server-only: retro trading cards for the current owners (app/cards), built from the legacy data.
// Only the small card summaries reach the client.
import { getManagerLegacies, slug, type ManagerLegacy } from "@/lib/legacy-data";

export type Rarity = "gold" | "foil" | "base";

export type CardData = {
  number: string; // "01", by all-time win %
  name: string;
  slug: string;
  team: string;
  image: string;
  rarity: Rarity;
  record: string;
  winPct: string; // ".578"
  ppg: string;
  seasons: number;
  rookieYear: number;
  titleYears: number[];
  bestFinish: string | null; // "1st · 2018"
};

/** Two titles or more: gold foil. One: foil. None: base. */
export const rarityFor = (titles: number): Rarity => (titles >= 2 ? "gold" : titles === 1 ? "foil" : "base");

/** 0.5781 -> ".578", the way a baseball card prints it (1 -> "1.000"). */
export const cardPct = (p: number) => (p >= 1 ? "1.000" : p.toFixed(3).replace(/^0/, ""));

const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
};

export function buildCards(legacies: ManagerLegacy[]): CardData[] {
  return [...legacies]
    .sort((a, b) => b.winPct - a.winPct)
    .map((l, i) => ({
      number: String(i + 1).padStart(2, "0"),
      name: l.owner.name,
      slug: slug(l.owner.name),
      team: l.owner.team,
      image: l.owner.image,
      rarity: rarityFor(l.championships),
      record: `${l.wins}-${l.losses}${l.ties ? `-${l.ties}` : ""}`,
      winPct: cardPct(l.winPct),
      ppg: l.avgPointsPerGame.toFixed(1),
      seasons: l.seasonsPlayed,
      rookieYear: l.firstSeason,
      titleYears: l.championshipYears,
      bestFinish: l.bestSeason ? `${ordinal(l.bestSeason.finalRank)} · ${l.bestSeason.year}` : null,
    }));
}

export const getCards = () => buildCards(getManagerLegacies());
