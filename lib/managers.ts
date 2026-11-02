// Everyone who has managed a team, by full name. Yahoo keys managers by account name, and people
// changed accounts over the years (Eric Rios was "eric", then "efuego93"). Some early seasons hide
// the manager entirely ("--hidden--"); those that are known are listed by season and team name.
// Account names are case-sensitive: "Ryan" is Ryan Kaplan, "ryan" is Ryan Jenks.

export const HIDDEN = "--hidden--";

interface Person {
  name: string;
  accounts: string[];
  /** Hidden-manager team-seasons this person ran, as [season, team name]. */
  hidden?: [number, string][];
}

const PEOPLE: Person[] = [
  { name: "Tyler Falcone", accounts: ["tyler"] },
  { name: "Blake Kozloski", accounts: ["Blake"] },
  { name: "Eric Rios", accounts: ["eric", "efuego93"] },
  { name: "Ryan Jenks", accounts: ["ryan"], hidden: [[2012, "Brianas red carpet"]] },
  { name: "Frankie Nardone", accounts: ["Frankie Nardone"] },
  { name: "Matt Borba", accounts: ["matt"] },
  { name: "Jake Slagle", accounts: ["jake", "Jake"] },
  { name: "Bryan Yatsko", accounts: ["Bryan Yatsko"] },
  { name: "Ryan Curran", accounts: ["Ryan Curran"] },
  { name: "Peter Klensch", accounts: ["Peter"] },
  { name: "Anthony Bove", accounts: ["AB"], hidden: [[2013, "anthony's Nifty Team"]] },
  { name: "Ryan Kaplan", accounts: ["Ryan"] },
  { name: "Chris Zolner", accounts: ["Chris"] },
  { name: "Kyle Cost", accounts: ["Kyle"], hidden: [[2013, "Riley Coopers Niggas"]] },
  { name: "John Cox", accounts: ["John", "john"], hidden: [[2017, "Cam Shoopton"]] },
  { name: "Fusco", accounts: [], hidden: [[2017, "Fusco x 12"]] },
];

const byAccount = new Map(PEOPLE.flatMap((p) => [...p.accounts, p.name].map((a) => [a, p.name] as const)));
const byHiddenTeam = new Map(PEOPLE.flatMap((p) => (p.hidden ?? []).map(([y, t]) => [`${y}|${t}`, p.name] as const)));

/** Full name for a raw Yahoo manager; unknown hidden managers stay HIDDEN, unlisted names pass through. */
export function personFor(season: number, team: string, raw: string): string {
  if (raw === HIDDEN) return byHiddenTeam.get(`${season}|${team}`) ?? HIDDEN;
  return byAccount.get(raw) ?? raw;
}

/** Full name for an account name (or a full name, unchanged) when the season and team aren't known. */
export function personForAccount(raw: string): string {
  return byAccount.get(raw) ?? raw;
}

/** Whether a name is an account or full name in the registry. */
export function isKnownManager(name: string): boolean {
  return byAccount.has(name);
}

/** Every hidden team-season the registry identifies, for checks against the data. */
export function identifiedHiddenTeams(): { season: number; team: string; name: string }[] {
  return PEOPLE.flatMap((p) => (p.hidden ?? []).map(([season, team]) => ({ season, team, name: p.name })));
}
