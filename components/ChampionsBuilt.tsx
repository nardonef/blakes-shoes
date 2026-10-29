import { SOURCES, type ChampionBuild } from "@/lib/champions-built-data";

// Categorical colors in fixed order (draft, waiver, free agent, trade), validated with the dataviz
// palette checker for CVD separation on white. Aqua and yellow are below 3:1 contrast, so every bar
// also has a visible text breakdown.
const COLORS = { draft: "#2a78d6", waiver: "#eb6834", fa: "#1baf7a", trade: "#eda100" } as const;
const MONO = { fontFamily: "var(--font-geist-mono)" };

const pct = (part: number, total: number) => Math.round((part / total) * 100);

export default function ChampionsBuilt({ builds }: { builds: ChampionBuild[] }) {
  return (
    <section className="max-w-[1160px] mx-auto px-4 md:px-10 pb-14 md:pb-[88px]">
      <div className="flex items-center gap-4 flex-wrap mb-2">
        <h2 className="text-[30px] md:text-[42px] text-[#151515]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
          HOW CHAMPIONS WERE BUILT
        </h2>
        <span className="flex-1 min-w-[20px] h-0.5 bg-[#151515]" />
      </div>
      <p className="text-sm text-[var(--body-text)] leading-[1.55] max-w-[68ch] mb-4">
        Where every title team&apos;s starting points came from over its championship season, playoffs included. The
        draft usually does the heavy lifting; the bars show who won it on the waiver wire and in trades.
      </p>
      <div className="flex gap-4 flex-wrap mb-4 text-[11px] text-[var(--body-text)]" style={MONO}>
        {SOURCES.map((s) => (
          <span key={s.kind} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[s.kind] }} />
            {s.label.toUpperCase()}
          </span>
        ))}
      </div>
      <div className="bg-white">
        {builds.map((b) => (
          <div
            key={b.season}
            className="grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-x-5 gap-y-2 px-4 md:px-6 py-3.5 border-b border-[var(--hairline)]"
          >
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-[#151515] truncate">
                <span className="tabular-nums">{b.season}</span> · {b.manager}
              </div>
              <div className="text-[10px] tracking-[.08em] text-[var(--muted-light)] truncate" style={MONO}>
                {b.team.toUpperCase()}
              </div>
            </div>
            <div className="min-w-0 flex flex-col gap-1.5">
              <div className="flex h-[22px] gap-[2px]" role="img" aria-label={breakdown(b)}>
                {SOURCES.filter((s) => b.points[s.kind] > 0).map((s, i, arr) => {
                  const share = pct(b.points[s.kind], b.total);
                  return (
                    <div
                      key={s.kind}
                      title={`${s.label}: ${b.points[s.kind].toLocaleString("en-US")} pts (${share}%)`}
                      className={`h-full flex items-center justify-start px-1.5 text-[10px] font-semibold text-white overflow-hidden ${
                        i === 0 ? "rounded-l" : ""
                      } ${i === arr.length - 1 ? "rounded-r" : ""}`}
                      style={{ width: `${(b.points[s.kind] / b.total) * 100}%`, background: COLORS[s.kind], ...MONO }}
                    >
                      {share >= 12 ? `${share}%` : ""}
                    </div>
                  );
                })}
              </div>
              <div className="text-[11px] text-[var(--muted-light)] leading-snug">
                {breakdown(b)}
                {b.topAdd && (
                  <>
                    {" "}
                    · Best pickup: <span className="text-[#151515] font-semibold">{b.topAdd.player}</span> (
                    {SOURCES.find((s) => s.kind === b.topAdd!.kind)!.label.toLowerCase()},{" "}
                    {Math.round(b.topAdd.points)} pts)
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function breakdown(b: ChampionBuild): string {
  return SOURCES.map((s) => `${s.label} ${pct(b.points[s.kind], b.total)}%`).join(" · ");
}
