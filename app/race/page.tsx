import LeagueRace from "@/components/LeagueRace";
import { getLeagueRace } from "@/lib/league-race-data";

export const metadata = {
  title: "All-Time Wins Race | Blake's Shoes",
  description: "Every owner's all-time wins, season by season since 2012, as a race.",
};

export default function RacePage() {
  return (
    <div className="min-h-screen bg-[#151515]">
      <LeagueRace race={getLeagueRace()} />
    </div>
  );
}
