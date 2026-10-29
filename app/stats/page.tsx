import { getFrontOffice } from "@/lib/front-office-data";
import { getLuckAndLineups } from "@/lib/luck-lineups-data";
import StatsClient from "./StatsClient";

// Front Office and Luck & Lineups stats come from the full lineups/transactions tables, so they're
// computed here on the server and only the summaries reach the client.
export default function StatsPage() {
  return <StatsClient frontOffice={getFrontOffice()} luck={getLuckAndLineups()} />;
}
