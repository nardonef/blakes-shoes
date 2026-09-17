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

function SectionHeading({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-4 flex-wrap">
        <h2
          className="text-[30px] md:text-[42px] text-[#151515]"
          style={{ fontFamily: "var(--font-bebas-neue)" }}
        >
          {children}
        </h2>
        <span className="flex-1 min-w-[20px] h-0.5 bg-[#151515]" />
      </div>
      {subtitle && (
        <p
          className="text-[10.5px] tracking-[.08em] text-[var(--muted-light)] uppercase mt-2"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function RuleCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-[22px] md:p-7">
      <h3
        className="text-[22px] md:text-[27px] mb-4 text-[#151515]"
        style={{ fontFamily: "var(--font-bebas-neue)" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 border-t border-[var(--hairline)] first:border-t-0">
      <span
        className="text-[10px] tracking-[.1em] text-[var(--muted-light)]"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        {label.toUpperCase()}
      </span>
      <span className="text-sm font-semibold text-[#151515] text-right">{value}</span>
    </div>
  );
}

function TbdBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-2 border-[var(--hairline)] p-3.5">
      <div
        className="text-[9px] font-semibold tracking-[.18em] text-[var(--dim)] mb-1.5"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        UNCONFIRMED
      </div>
      <div className="text-[13.5px] text-[var(--muted-light)] leading-[1.5]">{children}</div>
    </div>
  );
}

function MarkerList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2.5 text-[14px] text-[var(--body-text)] leading-[1.5]">
          <span className="text-[var(--accent)] font-bold">/</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function RulesPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-8 md:py-[52px]">
        <div className="max-w-[1160px] mx-auto flex items-end justify-between gap-5 flex-wrap">
          <div>
            <div
              className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)] mb-2.5"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              THE RULE BOOK
            </div>
            <h1
              className="text-[48px] md:text-[88px] leading-[.86]"
              style={{ fontFamily: "var(--font-bebas-neue)" }}
            >
              LEAGUE RULES
            </h1>
          </div>
          <div
            className="text-[11px] tracking-[.14em] text-[var(--muted-dark)] pb-2"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {current.season_year} SEASON
          </div>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-7 md:py-11 pb-14 md:pb-[88px] flex flex-col gap-9 md:gap-14">
        {/* Official Rules */}
        <section className="bg-[var(--accent)] text-[#f5f5f0] p-6 md:p-9">
          <div
            className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-pale)] mb-[18px]"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            OFFICIAL RULES
          </div>
          <div className="flex flex-col gap-0">
            {officialRules.map((rule, index) => (
              <div
                key={index}
                className="flex gap-3.5 md:gap-[22px] items-baseline border-t border-white/[.22] pt-[18px]"
              >
                <span
                  className="text-[34px] md:text-[44px] leading-none shrink-0 text-[#f5f5f0]"
                  style={{ fontFamily: "var(--font-bebas-neue)" }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-base md:text-xl font-medium leading-[1.45]">{rule}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Town Hall Meeting Notes */}
        <section>
          <SectionHeading subtitle="Posted by Commissioner Peter Klensch, Esq. in the league group chat">
            TOWN HALL NOTES
          </SectionHeading>
          <div className="bg-white border-l-[3px] border-[var(--accent)] p-6 md:p-9 mt-5">
            <h3
              className="text-[22px] md:text-[30px] mb-1 text-[#151515]"
              style={{ fontFamily: "var(--font-bebas-neue)" }}
            >
              JUNE 1, 2026 — FIRST ANNUAL BICENTENNIAL MEMORIAL J1 TOWN HALL
            </h3>
            <p
              className="text-[10.5px] tracking-[.08em] text-[var(--muted-light)] uppercase mb-7"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              League changes and decisions announced after the meeting
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-9">
              <div>
                <h4
                  className="text-[10px] font-semibold tracking-[.2em] text-[var(--accent)] border-b-2 border-[var(--accent)] pb-2 mb-3.5"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  PART 1 — RULE CHANGES
                </h4>
                <MarkerList
                  items={[
                    "Trade deadline moved from November 28 to November 14.",
                    "Interceptions changed from -1 to -2.",
                    "All missed kicks (including extra points) changed from 0 to -1.",
                    "Total bench spots changed from 7 to 6 (still 1 IR spot).",
                  ]}
                />
              </div>

              <div>
                <h4
                  className="text-[10px] font-semibold tracking-[.2em] text-[var(--accent)] border-b-2 border-[var(--accent)] pb-2 mb-3.5"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  PART 2 — WEEKLY LOSER PARLAY
                </h4>
                <p className="text-[14.5px] text-[var(--body-text)] leading-[1.6]">
                  Starting this season, the lowest-scoring player each regular season week owes $10 toward an
                  NFL parlay. Any player may submit one optional leg to AB, the Weekly Loser Parlay Czar —
                  submissions are due by noon each Sunday, and AB places the parlay. If it hits, the league
                  decides what to do with the winnings then; a smaller payout goes toward a future destination
                  draft or league dinner, a larger one gets split up.
                </p>
              </div>

              <div>
                <h4
                  className="text-[10px] font-semibold tracking-[.2em] text-[var(--accent)] border-b-2 border-[var(--accent)] pb-2 mb-3.5"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  PART 3 — SACKO PUNISHMENT
                </h4>
                <p className="text-[14.5px] text-[var(--body-text)] leading-[1.6]">
                  Starting this season, the Sacko chooses between two options: plan the entire draft day
                  (food, drink, location, draft board, printed single-sided ranking sheets, etc. — costs
                  covered by the league except printing), or take a &quot;legit&quot; punishment instead.
                </p>
              </div>

              <div>
                <h4
                  className="text-[10px] font-semibold tracking-[.2em] text-[var(--accent)] border-b-2 border-[var(--accent)] pb-2 mb-3.5"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  PART 4 — OTHER ANNOUNCEMENTS
                </h4>
                <MarkerList
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
        <section>
          <SectionHeading subtitle="Result of the draft-position lottery">DRAFT ORDER</SectionHeading>
          <div className="mt-5">
            <div
              className="grid grid-cols-[52px_1fr_auto] bg-[#151515] text-[#f5f5f0] text-[9.5px] font-semibold tracking-[.16em]"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              <div className="py-3 px-3.5">PICK</div>
              <div className="py-3 px-3.5">OWNER / TEAM</div>
              <div className="py-3 px-3.5 text-right">KEEPER &middot; COST</div>
            </div>
            <div className="bg-white">
              {draftLotteryOrder.map((slot) => (
                <div
                  key={slot.pick}
                  className="grid grid-cols-[52px_1fr_auto] border-b border-[var(--hairline)] items-center"
                >
                  <div
                    className="py-3 px-3.5 text-[24px] text-[var(--accent)] leading-none"
                    style={{ fontFamily: "var(--font-bebas-neue)" }}
                  >
                    {slot.pick}
                  </div>
                  <div className="py-3 px-3.5 min-w-0">
                    <div className="text-sm font-semibold text-[#151515]">{slot.owner}</div>
                    <div
                      className="text-[10px] tracking-[.06em] text-[var(--muted-light)] truncate"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {slot.team.toUpperCase()}
                    </div>
                  </div>
                  <div className="py-3 px-3.5 text-right">
                    <div className="text-sm font-semibold text-[#151515]">{slot.keeper}</div>
                    <div
                      className="text-[10px] tracking-[.06em] text-[var(--muted-light)]"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {`ROUND ${slot.keeperCost}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* League Format */}
        <section>
          <SectionHeading subtitle="Pulled from this season's recorded league settings">LEAGUE FORMAT</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5 bg-[var(--rule)] mt-5">
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
          <p
            className="text-[10px] tracking-[.04em] text-[var(--muted-dark)] mt-3 leading-[1.6]"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Waiver type/processing codes (e.g. &quot;FR&quot;, &quot;gametime&quot;) are shown as recorded
            in the league&apos;s settings export — confirm exact mechanics with the commissioner if unsure.
          </p>
        </section>

        {/* Format History */}
        <section>
          <SectionHeading>FORMAT HISTORY</SectionHeading>
          <div className="bg-white mt-5">
            {[...seasons].reverse().map((s) => (
              <div
                key={s.season_year}
                className="grid grid-cols-[64px_1fr] border-b border-[var(--hairline)] items-start"
              >
                <div
                  className="p-3.5 text-[26px] text-[var(--accent)] leading-none"
                  style={{ fontFamily: "var(--font-bebas-neue)" }}
                >
                  {s.season_year}
                </div>
                <div className="py-3.5 pr-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-4">
                  <div>
                    <div
                      className="text-[9px] tracking-[.14em] text-[var(--muted-dark)]"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      TEAMS
                    </div>
                    <div className="text-[13.5px] font-semibold text-[#151515]">{s.num_teams}</div>
                  </div>
                  <div>
                    <div
                      className="text-[9px] tracking-[.14em] text-[var(--muted-dark)]"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      DRAFT
                    </div>
                    <div className="text-[13.5px] font-semibold text-[#151515] capitalize">{s.draft_type}</div>
                  </div>
                  <div>
                    <div
                      className="text-[9px] tracking-[.14em] text-[var(--muted-dark)]"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      PLAYOFF TEAMS
                    </div>
                    <div className="text-[13.5px] font-semibold text-[#151515]">{s.num_playoff_teams}</div>
                  </div>
                  <div>
                    <div
                      className="text-[9px] tracking-[.14em] text-[var(--muted-dark)]"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      PLAYOFFS START
                    </div>
                    <div className="text-[13.5px] font-semibold text-[#151515]">{`Week ${s.playoff_start_week}`}</div>
                  </div>
                  <div>
                    <div
                      className="text-[9px] tracking-[.14em] text-[var(--muted-dark)]"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      TRADE DEADLINE
                    </div>
                    <div className="text-[13.5px] font-semibold text-[#151515]">{formatDate(s.trade_end_date)}</div>
                  </div>
                  <div>
                    <div
                      className="text-[9px] tracking-[.14em] text-[var(--muted-dark)]"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      WAIVERS
                    </div>
                    <div className="text-[13.5px] font-semibold text-[#151515]">{`${s.waiver_type} · ${s.waiver_rule}`}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* League Bylaws */}
        <section>
          <SectionHeading subtitle="Outlined boxes are still unconfirmed">LEAGUE BYLAWS</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0.5 bg-[var(--rule)] mt-5">
            <RuleCard title="Roster Requirements">
              <MarkerList
                items={[
                  "Starters: QB, 2 RB, 2 WR, TE, FLEX, K, DEF.",
                  "Bench spots: 6.",
                  "IR spots: 1.",
                ]}
              />
            </RuleCard>
            <RuleCard title="Scoring Settings">
              <MarkerList
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
              <MarkerList
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
              <MarkerList
                items={[
                  "First-time keeper: cost is round-sensitive, based on where the player was drafted or picked up off waivers.",
                  "A player kept before (already a keeper): cost is set by consensus ADP (Average Draft Position).",
                  "Any draft-pick trade must include a keeper (Official Rule 1, above).",
                ]}
              />
            </RuleCard>
            <RuleCard title="Sacko & Loser's Bracket">
              <MarkerList
                items={[
                  "The league runs a Loser's Bracket (consolation bracket) each season.",
                  "The \"Sacko\" (last place) is the team with the worst regular season record — not necessarily the Loser's Bracket's ultimate loser.",
                  "Winning the Loser's Bracket earns the best odds in next year's draft-position lottery.",
                  "Sacko Punishment: the Sacko chooses between planning the entire draft day (food, drink, location, draft board, printed single-sided ranking sheets, etc. — costs covered by the league except printing) or taking a \"legit\" punishment instead.",
                ]}
              />
            </RuleCard>
            <RuleCard title="Weekly Loser Parlay">
              <MarkerList
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
