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
            Not recorded in the league data — add the real details below.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RuleCard title="Roster Requirements">
              <TbdBlock>Starting lineup, bench size, and IR slots — add roster positions here.</TbdBlock>
            </RuleCard>
            <RuleCard title="Scoring Settings">
              <TbdBlock>Points per reception, passing/rushing/receiving multipliers, etc. — add scoring rules here.</TbdBlock>
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
                ]}
              />
              <div className="mt-4">
                <TbdBlock>The actual Sacko punishment isn&apos;t recorded yet — add it here.</TbdBlock>
              </div>
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
