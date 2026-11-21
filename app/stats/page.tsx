import { Doto } from "next/font/google";
import { getFrontOffice } from "@/lib/front-office-data";
import { getLuckAndLineups } from "@/lib/luck-lineups-data";
import { getPerfectSeasons } from "@/lib/perfect-lineup-data";
import { getCoreStats } from "@/lib/stats-data";
import { getScoreboard } from "@/lib/scoreboard";
import ScoreboardTicker from "@/components/ScoreboardTicker";
import StatsClient from "./StatsClient";

export const metadata = { title: "League Stats | Blake's Shoes" };

// Dot-matrix font for the scoreboard ticker.
const dot = Doto({ subsets: ["latin"], weight: "800", variable: "--font-dot", display: "swap" });

// Every stat is computed here on the server; only the summaries reach the client, never the raw
// matchups, standings, lineups or transactions.
export default function StatsPage() {
  const board = getScoreboard();
  return (
    <div className={dot.variable}>
      {board && <ScoreboardTicker board={board} />}
      <StatsClient
        core={getCoreStats()}
        frontOffice={getFrontOffice()}
        luck={getLuckAndLineups()}
        perfect={getPerfectSeasons()}
      />
    </div>
  );
}
