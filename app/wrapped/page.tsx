import Link from "next/link";
import RostersSelect from "@/components/RostersSelect";
import { gradeColor } from "@/lib/draft-board-view";
import { managerSlug } from "@/lib/rosters-data";
import { getWrapped, wrappedManagers, wrappedSeasons, type Wrapped, type WrappedPick } from "@/lib/wrapped-data";

export const metadata = { title: "Wrapped | Blake's Shoes" };

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };
const f1 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${f1(Math.abs(n))}`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : w.endsWith("s") ? "es" : "s"}`;

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function WrappedPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const managers = wrappedManagers();
  const manager =
    managers.find((m) => managerSlug(m) === one(sp.mgr)) ?? (managers.includes("Blake Kozloski") ? "Blake Kozloski" : managers[0]);
  const seasons = wrappedSeasons(manager);
  const season = seasons.includes(Number(one(sp.season))) ? Number(one(sp.season)) : seasons[0];
  const w = getWrapped(manager, season)!;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 pt-8 md:pt-[52px] pb-8 md:pb-10">
        <div className="max-w-[1160px] mx-auto flex items-center gap-5 flex-wrap">
          <div
            className="w-[72px] h-[72px] md:w-[96px] md:h-[96px] rounded-full bg-[#3a3a38] bg-cover bg-center shrink-0"
            style={{ backgroundImage: `url("${w.photo ?? "/placeholder-owner.svg"}")` }}
            role="img"
            aria-label={manager}
          />
          <div className="min-w-0">
            <div className="text-[11px] tracking-[.14em] text-[var(--accent-light)] mb-1.5" style={MONO}>
              {season} WRAPPED
            </div>
            <h1 className="text-[clamp(40px,7vw,76px)] leading-[.92] tracking-[.01em]" style={BEBAS}>
              {manager}
            </h1>
            <p className="mt-1.5 text-[15px] text-[#b5b5ad]">
              {w.team}
              {w.finish?.champion && (
                <span className="ml-2 align-middle px-2 py-0.5 bg-[var(--accent)] text-white text-[11px] font-semibold tracking-[.12em]" style={MONO}>
                  CHAMPION
                </span>
              )}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-4 md:px-10 pt-7 pb-16 flex flex-col gap-6">
        <div className="flex flex-wrap gap-3 items-end">
          <RostersSelect
            label="MANAGER"
            param="mgr"
            value={managerSlug(manager)}
            options={managers.map((m) => ({ value: managerSlug(m), label: m }))}
            className="flex-[1_1_220px] max-w-[320px]"
          />
          <RostersSelect
            label="SEASON"
            param="season"
            value={String(season)}
            options={seasons.map((y) => ({ value: String(y), label: String(y) }))}
            className="flex-[0_1_130px]"
          />
        </div>
        <Cards w={w} />
      </main>
    </div>
  );
}

function Card({
  label,
  big,
  bigColor,
  children,
  href,
  dark,
}: {
  label: string;
  big: string;
  bigColor?: string;
  children: React.ReactNode;
  href?: string;
  dark?: boolean;
}) {
  const body = (
    <>
      <div className={`text-[10px] font-semibold tracking-[.16em] mb-2 ${dark ? "text-[var(--accent-light)]" : "text-[#6b6b63]"}`} style={MONO}>
        {label}
      </div>
      <div
        className="text-[clamp(34px,5vw,52px)] leading-[.95] tracking-[.01em] break-words"
        style={{ ...BEBAS, color: bigColor ?? (dark ? "#f5f5f0" : "#151515") }}
      >
        {big}
      </div>
      <div className={`mt-2 text-[14px] leading-snug ${dark ? "text-[#b5b5ad]" : "text-[#4a4a44]"}`}>{children}</div>
    </>
  );
  const cls = `block p-5 md:p-6 min-h-[150px] ${dark ? "bg-[#151515]" : "bg-white border border-[#e2e2da]"}`;
  return href ? (
    <Link href={href} className={`${cls} hover:outline hover:outline-2 hover:outline-[var(--accent)]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const pickLine = (p: WrappedPick) =>
  `Round ${p.round}, pick ${p.pick}${p.finish ? ` → finished ${ord(p.finish)}` : ""}${p.value != null ? ` (${p.value > 0 ? "+" : ""}${p.value})` : ""}`;

function Cards({ w }: { w: Wrapped }) {
  const mgr = managerSlug(w.manager);
  const cards: React.ReactNode[] = [];

  if (w.finish) {
    cards.push(
      <Card key="finish" dark label="THE FINISH" big={w.finish.champion ? "Champion" : ord(w.finish.rank)}>
        {w.finish.wins}–{w.finish.losses}
        {w.finish.ties ? `–${w.finish.ties}` : ""} in the regular season with {f1(w.finish.pointsFor)} points for.
      </Card>,
    );
  }
  if (w.draft) {
    cards.push(
      <Card key="grade" label="DRAFT GRADE" big={w.draft.grade} bigColor={gradeColor(w.draft.grade)} href={`/draft?season=${w.season}&mgr=${mgr}`}>
        Your picks started for {f1(w.draft.points)} points, {ord(w.draft.rank)} of {w.draft.n} teams.
        {w.draft.first && ` First pick: ${w.draft.first.player}.`}
      </Card>,
    );
    if (w.draft.best && (w.draft.best.value ?? 0) > 0) {
      cards.push(
        <Card key="steal" label="DRAFT STEAL" big={w.draft.best.player} bigColor="var(--accent)" href={`/draft?season=${w.season}&pick=${w.draft.best.pick}`}>
          {pickLine(w.draft.best)}.
        </Card>,
      );
    }
    if (w.draft.worst && (w.draft.worst.value ?? 0) < 0) {
      cards.push(
        <Card key="miss" label="DRAFT MISS" big={w.draft.worst.player} bigColor="var(--negative)" href={`/draft?season=${w.season}&pick=${w.draft.worst.pick}`}>
          {pickLine(w.draft.worst)}.
        </Card>,
      );
    }
  }
  if (w.mvp) {
    cards.push(
      <Card key="mvp" dark label="TEAM MVP" big={w.mvp.player}>
        {f1(w.mvp.points)} points in {plural(w.mvp.starts, "start")} for you.
      </Card>,
    );
  }
  cards.push(
    <Card key="pickup" label="BEST PICKUP" big={w.pickup?.player ?? "None"} href={`/rosters?season=${w.season}&mgr=${mgr}`}>
      {w.pickup
        ? `${w.pickup.how} in week ${w.pickup.week}. ${signed(w.pickup.aboveAvg)} points above a typical starting ${w.pickup.pos || "player"} over ${plural(w.pickup.starts, "start")}.`
        : "No pickup started a game for you this year."}
    </Card>,
  );
  cards.push(
    <Card
      key="trades"
      label="TRADES"
      big={w.trades.count ? `${w.trades.won}–${w.trades.lost}` : "None"}
      bigColor={w.trades.net > 0 ? "var(--accent)" : w.trades.net < 0 ? "var(--negative)" : undefined}
      href={w.trades.count ? `/rosters?tab=trades&season=${w.season}&mgr=${mgr}` : undefined}
    >
      {w.trades.count
        ? `${plural(w.trades.count, "trade")}, ${signed(w.trades.net)} starting points for you vs the other side.`
        : "You stood pat all season."}
    </Card>,
  );
  if (w.luck) {
    cards.push(
      <Card
        key="luck"
        dark
        label="SCHEDULE LUCK"
        big={`${signed(w.luck.luck)} wins`}
        bigColor={w.luck.luck >= 0 ? "var(--accent-light)" : "#e4846f"}
      >
        You went {w.luck.wins}–{w.luck.losses}; playing every team every week, your scores were worth{" "}
        {f1(w.luck.expectedWins)} wins.
      </Card>,
    );
  }
  if (w.lineups) {
    cards.push(
      <Card key="eff" label="LINEUP EFFICIENCY" big={`${(w.lineups.efficiency * 100).toFixed(1)}%`} href={`/rosters?season=${w.season}&mgr=${mgr}`}>
        Of the best lineup you could have started each week. {f1(w.lineups.benchPerWeek)} points a week left on the bench
        {w.lineups.couldaWon ? `, and ${plural(w.lineups.couldaWon, "loss")} your bench could have won.` : "."}
      </Card>,
    );
    if (w.lineups.worst && w.lineups.worst.left > 0) {
      cards.push(
        <Card
          key="bench"
          label="COSTLIEST BENCHING"
          big={`${f1(w.lineups.worst.left)} pts`}
          bigColor="var(--negative)"
          href={`/rosters?season=${w.season}&mgr=${mgr}&week=${w.lineups.worst.week}`}
        >
          Left on the bench in week {w.lineups.worst.week}
          {w.lineups.worst.costGame ? ", and it cost you the game." : ". You got away with it."}
        </Card>,
      );
    }
  }
  if (w.bestWeek) {
    cards.push(
      <Card key="best" label="BEST WEEK" big={f1(w.bestWeek.points)} bigColor="var(--accent)">
        Week {w.bestWeek.week} vs {w.bestWeek.opponent.replace(" (unknown manager)", "")}:{" "}
        {w.bestWeek.result === "W" ? "won" : w.bestWeek.result === "L" ? "lost" : "tied"} {f1(w.bestWeek.points)}–{f1(w.bestWeek.opponentPoints)}.
      </Card>,
    );
  }
  if (w.worstWeek && w.worstWeek !== w.bestWeek) {
    cards.push(
      <Card key="worst" label="WORST WEEK" big={f1(w.worstWeek.points)} bigColor="var(--negative)">
        Week {w.worstWeek.week} vs {w.worstWeek.opponent.replace(" (unknown manager)", "")}:{" "}
        {w.worstWeek.result === "W" ? "won anyway" : w.worstWeek.result === "L" ? "lost" : "tied"} {f1(w.worstWeek.points)}–{f1(w.worstWeek.opponentPoints)}.
      </Card>,
    );
  }

  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">{cards}</div>;
}
