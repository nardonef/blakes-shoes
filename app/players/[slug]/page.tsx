import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayers, type PlayerHistory } from "@/lib/player-data";
import { managerSlug } from "@/lib/rosters-data";

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };
const f1 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const acqColor = (kind: string) => (kind === "trade" ? "#8a5a14" : kind === "draft" ? "#6b6b63" : "var(--accent)");

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const [p] = getPlayers((await params).slug);
  return { title: p ? `${p.name} | Blake's Shoes` : "Player | Blake's Shoes" };
}

export default async function PlayerPage({ params }: { params: Promise<Params> }) {
  const players = getPlayers((await params).slug);
  if (!players.length) notFound();
  const main = players[0];
  const years = main.seasons;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-8 md:py-[52px]">
        <div className="max-w-[1160px] mx-auto">
          <div className="text-[11px] tracking-[.14em] text-[var(--accent-light)] mb-2.5" style={MONO}>
            PLAYER FILE
          </div>
          <h1 className="text-[clamp(44px,7vw,76px)] leading-[.92] mb-3 tracking-[.01em]" style={BEBAS}>
            {main.name}
          </h1>
          <p className="text-[15px] text-[#b5b5ad]">
            {[main.position, main.nflTeam].filter(Boolean).join(" · ")}
            {years.length > 0 && ` · In Blake's Shoes ${years[0]}${years.length > 1 ? `–${years[years.length - 1]}` : ""}`}
          </p>
          {players.length > 1 && (
            <p className="mt-2 text-[13px] text-[#b5b5ad]">
              {players.length} different players named {main.name} have been in the league; each has his own section below.
            </p>
          )}
        </div>
      </header>
      <main className="max-w-[1160px] mx-auto px-4 md:px-10 pt-7 pb-16 flex flex-col gap-12">
        {players.map((p, i) => (
          <PlayerSection key={p.key} p={p} label={players.length > 1 ? `PLAYER ${i + 1} OF ${players.length}` : null} />
        ))}
      </main>
    </div>
  );
}

function PlayerSection({ p, label }: { p: PlayerHistory; label: string | null }) {
  const bestDraft = [...p.draft].sort((a, b) => a.pick - b.pick)[0];
  const facts = [
    { k: "SEASONS", v: String(p.seasons.length), sub: p.seasons.length ? `${p.seasons[0]}–${p.seasons[p.seasons.length - 1]}` : "—" },
    { k: "MANAGERS", v: String(p.managers.length), sub: p.managers.length === 1 ? p.managers[0] : "different owners" },
    { k: "STARTING PTS", v: f1(p.totalPoints), sub: plural(p.totalStarts, "start") },
    {
      k: "DRAFTED",
      v: p.draft.length ? `${p.draft.length}×` : "Never",
      sub: bestDraft ? `highest: ${bestDraft.season} Rd ${bestDraft.round}, pick ${bestDraft.pick}` : "always a pickup",
    },
    { k: "TRADED", v: `${new Set(p.trades.map((t) => t.id)).size}×`, sub: "between managers" },
  ];

  return (
    <section className="flex flex-col gap-5">
      {label && (
        <div className="text-[11px] font-semibold tracking-[.12em] text-[#6b6b63]" style={MONO}>
          {label} · {[p.position, p.nflTeam].filter(Boolean).join(" · ")}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-0.5 bg-[var(--rule)]">
        {facts.map((f) => (
          <div key={f.k} className="bg-white p-4 md:p-5">
            <div className="text-[9.5px] font-semibold tracking-[.18em] text-[var(--muted-light)] mb-1.5" style={MONO}>
              {f.k}
            </div>
            <div className="text-[30px] md:text-[38px] leading-none text-[#151515]" style={BEBAS}>
              {f.v}
            </div>
            <div className="text-[11px] text-[var(--muted-light)] mt-1 truncate">{f.sub}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-[26px] md:text-[32px] text-[#151515] mb-2" style={BEBAS}>
          Every stint
        </h2>
        <div className="bg-white border border-[#e2e2da]">
          <div
            className="grid grid-cols-[48px_minmax(0,1fr)_64px] md:grid-cols-[64px_minmax(0,1fr)_200px_70px_70px_90px] gap-3 px-4 md:px-6 py-2.5 text-[10px] font-semibold tracking-[.12em] text-[#6b6b63] border-b border-[#e2e2da]"
            style={MONO}
          >
            <span>YEAR</span>
            <span>MANAGER</span>
            <span className="hidden md:block">ACQUIRED</span>
            <span className="hidden md:block text-right">WEEKS</span>
            <span className="hidden md:block text-right">STARTS</span>
            <span className="text-right">PTS</span>
          </div>
          {[...p.stints].reverse().map((s) => (
            <div
              key={`${s.season}-${s.manager}-${s.firstWeek}`}
              className="grid grid-cols-[48px_minmax(0,1fr)_64px] md:grid-cols-[64px_minmax(0,1fr)_200px_70px_70px_90px] gap-3 items-center px-4 md:px-6 py-2.5 border-b border-[#efefe8] text-[14px]"
            >
              <span className="font-bold tabular-nums">{s.season}</span>
              <span className="min-w-0 flex flex-col gap-0.5">
                <Link
                  href={`/rosters?season=${s.season}&mgr=${managerSlug(s.manager)}&week=${s.firstWeek}`}
                  className="font-semibold text-[#151515] truncate hover:text-[var(--accent)]"
                >
                  {s.manager}
                </Link>
                <span className="text-[12px] text-[#6b6b63] truncate">
                  {s.team} · wk {s.firstWeek}–{s.lastWeek}
                </span>
                <span className="md:hidden text-[12px] text-[#6b6b63]">
                  <span style={{ color: acqColor(s.acquired.kind) }}>{s.acquired.label}</span> · {plural(s.starts, "start")}
                </span>
              </span>
              <span className="hidden md:block text-[13px] font-medium" style={{ color: acqColor(s.acquired.kind) }}>
                {s.acquired.label}
                {s.acquired.week ? ` · wk ${s.acquired.week}` : ""}
              </span>
              <span className="hidden md:block text-right tabular-nums text-[#4a4a44]">{s.weeks}</span>
              <span className="hidden md:block text-right tabular-nums text-[#4a4a44]">{s.starts}</span>
              <span className="text-right font-bold tabular-nums">{f1(s.points)}</span>
            </div>
          ))}
        </div>
      </div>

      {(p.draft.length > 0 || p.trades.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {p.draft.length > 0 && (
            <div>
              <h2 className="text-[26px] md:text-[32px] text-[#151515] mb-2" style={BEBAS}>
                Drafted
              </h2>
              <div className="bg-white border border-[#e2e2da]">
                {[...p.draft].reverse().map((d) => (
                  <Link
                    key={`${d.season}-${d.pick}`}
                    href={`/draft?season=${d.season}&pick=${d.pick}`}
                    className="flex justify-between gap-3 px-4 md:px-6 py-2.5 border-b border-[#efefe8] text-[14px] hover:bg-[#fafaf6]"
                  >
                    <span>
                      <strong className="tabular-nums">{d.season}</strong> · {d.manager}
                    </span>
                    <span className="text-[#6b6b63] tabular-nums whitespace-nowrap">
                      Rd {d.round}, pick {d.pick}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {p.trades.length > 0 && (
            <div>
              <h2 className="text-[26px] md:text-[32px] text-[#151515] mb-2" style={BEBAS}>
                Traded
              </h2>
              <div className="bg-white border border-[#e2e2da]">
                {[...p.trades].reverse().map((t) => (
                  <Link
                    key={t.id}
                    href={`/rosters?tab=trades&trade=${t.id}#${t.id}`}
                    className="flex justify-between gap-3 px-4 md:px-6 py-2.5 border-b border-[#efefe8] text-[14px] hover:bg-[#fafaf6]"
                  >
                    <span className="min-w-0 truncate">
                      <strong className="tabular-nums">{t.season}</strong> · {t.from} → {t.to}
                    </span>
                    <span className="text-[var(--accent)] font-semibold whitespace-nowrap">wk {t.week} →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
