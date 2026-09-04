import Link from "next/link";
import leagueInfo from "@/data/league_info.json";

type LeagueSeason = {
  season_year: number;
  num_teams: number;
  scoring_type: string;
  start_week: string;
  end_week: string;
  playoff_start_week: string;
  num_playoff_teams: string;
  trade_end_date: string;
  waiver_type: string;
  waiver_rule: string;
  draft_type: string;
  num_playoff_consolation_teams: number;
};

const seasons = leagueInfo as LeagueSeason[];
const current = seasons[seasons.length - 1];

const officialRules = [
  "All draft pick trades must include keepers.",
];

const draftLotteryOrder = [
  { pick: 1, owner: "Anthony Bove", team: "Anthony's Nifty Team", keeper: "JSN", keeperCost: 3 },
  { pick: 2, owner: "Bryan Yatsko", team: "Bryan Yatsko's Team", keeper: "Gibbs", keeperCost: 1 },
  { pick: 3, owner: "Jake Slagle", team: "POSTGRADAPARTMENTS.COM", keeper: "Cook", keeperCost: 2 },
  { pick: 4, owner: "Peter Klensch", team: "All Business Pete", keeper: "Maye", keeperCost: 10 },
  { pick: 5, owner: "Matt Borba", team: "Not Popular Boys", keeper: "Puka", keeperCost: 1 },
  { pick: 6, owner: "Tyler Falcone", team: "Jone Crib", keeper: "Chase", keeperCost: 1 },
  { pick: 7, owner: "Ryan Kaplan", team: "Jew Crew", keeper: "Walker", keeperCost: 3 },
  { pick: 8, owner: "Ryan Curran", team: "Loose Cannons", keeper: "Rice", keeperCost: 7 },
  { pick: 9, owner: "Ryan Jenks", team: "Brianna's Red Carpet", keeper: "Javonte", keeperCost: 8 },
  { pick: 10, owner: "Frankie Nardone", team: "Peter is Corrupt", keeper: "Skatt", keeperCost: 9 },
  { pick: 11, owner: "Blake Kozloski", team: "Wizards of Koz", keeper: "Bijan", keeperCost: 1 },
  { pick: 12, owner: "Eric Rios", team: "The Hullabaloos", keeper: "Henry", keeperCost: 2 },
];

function formatDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function RuleCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-6 md:p-8 shadow-md hover:shadow-lg transition-shadow">
      <h3
        className="text-xl md:text-2xl font-bold mb-4"
        style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
    </div>
  );
}

function TbdBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500 italic">
      {children}
    </div>
  );
}

function RuleList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 leading-relaxed">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export default function RulesPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <main className="max-w-6xl mx-auto px-4 md:px-16 py-8 md:py-16">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-8 transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Home
        </Link>

        {/* Page Title */}
        <h1
          className="text-5xl md:text-7xl font-bold mb-2 text-center"
          style={{ fontFamily: "var(--font-display)" }}
        >
          LEAGUE RULES
        </h1>
        <p className="text-xs md:text-sm font-semibold tracking-[0.2em] text-gray-500 uppercase text-center mb-12">
          Blake&apos;s Shoes &middot; {current.season_year} Season
        </p>

        {/* Official Numbered Rules */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 uppercase">
            Official Rules
          </h2>
          <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
            <ol className="space-y-4">
              {officialRules.map((rule, index) => (
                <li key={index} className="flex gap-4">
                  <span
                    className="font-bold text-lg shrink-0"
                    style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}
                  >
                    {index + 1}.
                  </span>
                  <span className="text-gray-800 text-sm md:text-base pt-0.5">{rule}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Town Hall Meeting Notes */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 uppercase">
            Town Hall Meeting Notes
          </h2>
          <p className="text-xs text-gray-500 mb-6">
            Posted by Commissioner Peter Klensch, Esq. in the league group chat.
          </p>
          <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
            <h3
              className="text-xl md:text-2xl font-bold mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              June 1, 2026 — First Annual Bicentennial Memorial J1 Town Hall
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              League changes and decisions announced after the meeting.
            </p>

            <div className="space-y-8">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
                  Part 1 — Rule Changes
                </h4>
                <RuleList
                  items={[
                    "Trade deadline moved from November 28 to November 14.",
                    "Interceptions changed from -1 to -2.",
                    "All missed kicks (including extra points) changed from 0 to -1.",
                    "Total bench spots changed from 7 to 6 (still 1 IR spot).",
                  ]}
                />
              </div>

              <div>
                <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
                  Part 2 — Weekly Loser Parlay
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Starting this season, the lowest-scoring player each regular season week owes $10 toward an
                  NFL parlay. Any player may submit one optional leg to AB, the Weekly Loser Parlay Czar —
                  submissions are due by noon each Sunday, and AB places the parlay. If it hits, the league
                  decides what to do with the winnings then; a smaller payout goes toward a future destination
                  draft or league dinner, a larger one gets split up.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
                  Part 3 — Sacko Punishment
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Starting this season, the Sacko chooses between two options: plan the entire draft day
                  (food, drink, location, draft board, printed single-sided ranking sheets, etc. — costs
                  covered by the league except printing), or take a &quot;legit&quot; punishment instead.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
                  Part 4 — Other Announcements
                </h4>
                <RuleList
                  items={[
                    "A season-ending League Dinner is under consideration — details TBD.",
                    "Lil Ant named the league's 1st Commissioner's Apprentice, starting with \"leather working.\"",
                    "The league was officially renewed and mock draft season is underway.",
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Draft Order */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 uppercase">
            Draft Order
          </h2>
          <p className="text-xs text-gray-500 mb-6">
            Result of the draft-position lottery.
          </p>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left font-semibold text-gray-600 uppercase text-xs tracking-wide px-4 py-3">Pick</th>
                    <th className="text-left font-semibold text-gray-600 uppercase text-xs tracking-wide px-4 py-3">Owner</th>
                    <th className="text-left font-semibold text-gray-600 uppercase text-xs tracking-wide px-4 py-3">Team</th>
                    <th className="text-left font-semibold text-gray-600 uppercase text-xs tracking-wide px-4 py-3">Keeper</th>
                    <th className="text-left font-semibold text-gray-600 uppercase text-xs tracking-wide px-4 py-3">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {draftLotteryOrder.map((slot) => (
                    <tr key={slot.pick} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}
                      >
                        {slot.pick}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{slot.owner}</td>
                      <td className="px-4 py-3 text-gray-600">{slot.team}</td>
                      <td className="px-4 py-3 text-gray-800">{slot.keeper}</td>
                      <td className="px-4 py-3 text-gray-600">{`Round ${slot.keeperCost}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Verified League Settings */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 uppercase">
            League Format
          </h2>
          <p className="text-xs text-gray-500 mb-6">
            Pulled from this season&apos;s recorded league settings.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RuleCard title="Teams & Scoring">
              <Fact label="Number of teams" value={current.num_teams} />
              <Fact
                label="Scoring type"
                value={current.scoring_type === "head" ? "Head-to-Head" : current.scoring_type}
              />
              <Fact label="Regular season" value={`Weeks ${current.start_week}–${Number(current.playoff_start_week) - 1}`} />
            </RuleCard>

            <RuleCard title="Playoffs">
              <Fact label="Playoff teams" value={current.num_playoff_teams} />
              <Fact
                label="Playoff weeks"
                value={`${current.playoff_start_week}–${current.end_week}`}
              />
              <Fact
                label="Consolation teams"
                value={current.num_playoff_consolation_teams || "None"}
              />
            </RuleCard>

            <RuleCard title="Deadlines">
              <Fact label="Trade deadline" value={formatDate(current.trade_end_date)} />
              <Fact label="Waiver type" value={current.waiver_type} />
              <Fact label="Waiver processing" value={current.waiver_rule} />
            </RuleCard>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Waiver type/processing codes (e.g. &quot;FR&quot;, &quot;gametime&quot;) are shown as recorded
            in the league&apos;s settings export — confirm exact mechanics with the commissioner if unsure.
          </p>
        </section>

        {/* Season-by-Season History */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 uppercase">
            Format History
          </h2>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left font-semibold text-gray-600 uppercase text-xs tracking-wide px-4 py-3">Season</th>
                    <th className="text-left font-semibold text-gray-600 uppercase text-xs tracking-wide px-4 py-3">Teams</th>
                    <th className="text-left font-semibold text-gray-600 uppercase text-xs tracking-wide px-4 py-3">Draft</th>
                    <th className="text-left font-semibold text-gray-600 uppercase text-xs tracking-wide px-4 py-3">Playoff Teams</th>
                    <th className="text-left font-semibold text-gray-600 uppercase text-xs tracking-wide px-4 py-3">Playoffs Start</th>
                    <th className="text-left font-semibold text-gray-600 uppercase text-xs tracking-wide px-4 py-3">Trade Deadline</th>
                    <th className="text-left font-semibold text-gray-600 uppercase text-xs tracking-wide px-4 py-3">Waivers</th>
                  </tr>
                </thead>
                <tbody>
                  {[...seasons].reverse().map((s) => (
                    <tr key={s.season_year} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-800">{s.season_year}</td>
                      <td className="px-4 py-3 text-gray-600">{s.num_teams}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{s.draft_type}</td>
                      <td className="px-4 py-3 text-gray-600">{s.num_playoff_teams}</td>
                      <td className="px-4 py-3 text-gray-600">Week {s.playoff_start_week}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(s.trade_end_date)}</td>
                      <td className="px-4 py-3 text-gray-600">{s.waiver_type} &middot; {s.waiver_rule}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Bylaws - not present anywhere in the repo, left as editable placeholders */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 uppercase">
            League Bylaws
          </h2>
          <p className="text-xs text-gray-500 mb-6">
            Dashed boxes are still unconfirmed — add the real details where you see one.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RuleCard title="Roster Requirements">
              <RuleList
                items={[
                  "Starters: QB, 2 RB, 2 WR, TE, FLEX, K, DEF.",
                  "Bench spots: 6.",
                  "IR spots: 1.",
                ]}
              />
            </RuleCard>
            <RuleCard title="Scoring Settings">
              <RuleList
                items={[
                  "Half-PPR (0.5 points per reception).",
                  "Interceptions: -2.",
                  "Missed kicks, including extra points: -1.",
                ]}
              />
              <div className="mt-4">
                <TbdBlock>Full scoring breakdown (TD/yardage points, bonuses, etc.) not yet recorded — add here.</TbdBlock>
              </div>
            </RuleCard>
            <RuleCard title="Dues & Payouts">
              <RuleList
                items={[
                  "League dues: $200 per team.",
                  "Weekly high roller earns a bonus payout.",
                  "Regular season champion gets their buy-in back.",
                  "3rd place gets their buy-in back.",
                  "2nd place gets double their buy-in back.",
                  "1st place takes the remainder of the pot.",
                ]}
              />
            </RuleCard>
            <RuleCard title="Keeper Rules">
              <RuleList
                items={[
                  "First-time keeper: cost is round-sensitive, based on where the player was drafted or picked up off waivers.",
                  "A player kept before (already a keeper): cost is set by consensus ADP (Average Draft Position).",
                  "Any draft-pick trade must include a keeper (Official Rule 1, above).",
                ]}
              />
            </RuleCard>
            <RuleCard title="Sacko & Loser's Bracket">
              <RuleList
                items={[
                  "The league runs a Loser's Bracket (consolation bracket) each season.",
                  "The \"Sacko\" (last place) is the team with the worst regular season record — not necessarily the Loser's Bracket's ultimate loser.",
                  "Winning the Loser's Bracket earns the best odds in next year's draft-position lottery.",
                  "Sacko Punishment: the Sacko chooses between planning the entire draft day (food, drink, location, draft board, printed single-sided ranking sheets, etc. — costs covered by the league except printing) or taking a \"legit\" punishment instead.",
                ]}
              />
            </RuleCard>
            <RuleCard title="Weekly Loser Parlay">
              <RuleList
                items={[
                  "The lowest scorer each regular season week owes $10 toward an NFL parlay.",
                  "Any player may submit one optional leg to the Weekly Loser Parlay Czar (AB) by noon each Sunday.",
                  "If the parlay hits, the league decides how to use or split the winnings.",
                ]}
              />
            </RuleCard>
            <RuleCard title="Trades & Collusion">
              <TbdBlock>Trade review/veto process and collusion policy — add here.</TbdBlock>
            </RuleCard>
            <RuleCard title="Tiebreakers">
              <TbdBlock>How ties in standings or playoff seeding are broken — add here.</TbdBlock>
            </RuleCard>
          </div>
        </section>
      </main>
    </div>
  );
}
