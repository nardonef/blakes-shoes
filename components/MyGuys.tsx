import Image from "next/image";
import Link from "next/link";
import type { Guy, GuyCategory, MyGuys as MyGuysData } from "@/lib/my-guys-data";
import { playerHref } from "@/lib/player-slug";
import CountUp from "./CountUp";

const MONO = { fontFamily: "var(--font-geist-mono)" };

const CATEGORIES: { key: GuyCategory; label: string; unit: (g: Guy) => string }[] = [
  { key: "starts", label: "SHOWED UP · MOST STARTS", unit: (g) => `${g.starts} starts` },
  { key: "points", label: "PERFORMED · MOST POINTS", unit: (g) => `${Math.round(g.points).toLocaleString("en-US")} pts` },
  { key: "weeks", label: "ON ROSTER · MOST WEEKS", unit: (g) => `${g.weeks} wks` },
];

export default function MyGuys({ managers }: { managers: MyGuysData[] }) {
  return (
    <section>
      <div className="flex items-center gap-4 flex-wrap mb-2">
        <h2 className="text-[30px] md:text-[42px] text-[#151515]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
          MY GUYS
        </h2>
        <span className="flex-1 min-w-[20px] h-0.5 bg-[#151515]" />
      </div>
      <p className="text-sm text-[var(--body-text)] leading-[1.55] max-w-[68ch] mb-4">
        The players each manager kept coming back to across every season they&apos;ve played: who started the most,
        who scored the most while starting for them, and who sat on the roster longest. Playoffs included; kickers
        and defenses count.
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4">
        {managers.map((m, i) => (
          <div key={m.manager} data-reveal="" style={{ "--i": i % 3 } as React.CSSProperties} className="bg-white">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--hairline)]">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-[#e2e2da] shrink-0 relative">
                <Image src={m.image} alt={m.manager} fill sizes="36px" className="object-cover" />
              </div>
              <span className="text-[15px] font-semibold text-[#151515]">{m.manager}</span>
            </div>
            {CATEGORIES.map((c) => {
              const [guy, ...next] = m.top[c.key];
              if (!guy) return null;
              return (
                <div key={c.key} className="px-4 py-3 border-b border-[var(--hairline)] last:border-b-0">
                  <div className="text-[10px] font-semibold tracking-[.1em] text-[var(--muted-light)] mb-1" style={MONO}>
                    {c.label}
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <Link href={playerHref(guy.player)} className="text-[15px] font-semibold text-[#151515] hover:underline">
                        {guy.player}
                      </Link>{" "}
                      <span className="text-[10px] font-semibold text-[var(--muted-light)]" style={MONO}>
                        {guy.pos}
                      </span>
                    </span>
                    <span className="text-[15px] font-bold text-[#151515] tabular-nums whitespace-nowrap">
                      <CountUp text={c.unit(guy)} />
                    </span>
                  </div>
                  <div className="text-[12px] text-[var(--muted-light)] mt-0.5">
                    {guy.seasons} season{guy.seasons === 1 ? "" : "s"}
                    {next.length > 0 && (
                      <>
                        {" · Next: "}
                        {next.map((g, i) => (
                          <span key={g.player}>
                            {i > 0 && ", "}
                            <Link href={playerHref(g.player)} className="hover:underline">
                              {g.player}
                            </Link>{" "}
                            <span className="tabular-nums">({c.unit(g)})</span>
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
