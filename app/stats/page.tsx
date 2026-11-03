import { getFrontOffice } from "@/lib/front-office-data";
import { getLuckAndLineups } from "@/lib/luck-lineups-data";
import { getPerfectSeasons } from "@/lib/perfect-lineup-data";
import { getCoreStats } from "@/lib/stats-data";
import StatsClient from "./StatsClient";

export const metadata = { title: "League Stats | Blake's Shoes" };

// Every stat is computed here on the server; only the summaries reach the client, never the raw
// matchups, standings, lineups or transactions.
export default function StatsPage() {
  return (
    <StatsClient
      core={getCoreStats()}
      frontOffice={getFrontOffice()}
      luck={getLuckAndLineups()}
      perfect={getPerfectSeasons()}
    />
  );
}
