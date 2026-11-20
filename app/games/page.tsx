import GamesHub from "@/components/games/GamesHub";
import { leagueManagers } from "@/lib/games/managers";

export const metadata = {
  title: "Games | Blake's Shoes",
  description: "Four football games and a league-wide leaderboard. Pick your manager and play.",
};

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };

export default function GamesPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-8 md:py-[52px]">
        <div className="max-w-[1160px] mx-auto">
          <div className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)] mb-2.5" style={MONO}>
            GAMES
          </div>
          <h1 className="text-[48px] md:text-[88px] leading-[.86]" style={BEBAS}>
            BLAKE&apos;S SHOES FOOTBALL
          </h1>
          <p className="mt-3 text-sm md:text-base text-[#c9c9c2] max-w-[560px]">
            Pick your manager, play all four, and put your name on the league leaderboard. Only your best score counts.
          </p>
        </div>
      </header>
      <GamesHub managers={leagueManagers()} />
    </div>
  );
}
