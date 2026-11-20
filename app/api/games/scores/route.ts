import { leagueManagers } from "@/lib/games/managers";
import { getScoreStore } from "@/lib/games/redis-store";
import { allLeaderboards, parseSubmission, scoreKey } from "@/lib/games/scores";

export const dynamic = "force-dynamic";

const offline = () => Response.json({ error: "Leaderboard offline" }, { status: 503 });

export async function GET() {
  const store = getScoreStore();
  if (!store) return offline();
  return Response.json(await allLeaderboards(store));
}

export async function POST(req: Request) {
  const store = getScoreStore();
  if (!store) return offline();
  const body = await req.json().catch(() => null);
  const sub = parseSubmission(body, leagueManagers());
  if (!sub.ok) return Response.json({ error: sub.error }, { status: 400 });
  await store.addIfGreater(scoreKey(sub.game), sub.manager, sub.score);
  return Response.json(await allLeaderboards(store));
}
