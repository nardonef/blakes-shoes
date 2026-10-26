import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  listManagers,
  getChampions,
  getSeasonStandings,
  getCareerStats,
  getHeadToHead,
  getRecords,
  queryMatchups,
  getLeagueSettings,
  RECORD_KINDS,
} from "@/lib/chat-tools";
import { runSql, SQL_SCHEMA, MAX_SQL_ROWS } from "@/lib/league-sql";

export const maxDuration = 30;

const SYSTEM = `You are ShoesGPT. You answer questions about the history of "Blake's Shoes", a 12-team Yahoo fantasy football league, seasons 2012-2025.

Rules:
- Every number, name, record or result you state must come from a tool call in this conversation. Never guess or use outside knowledge.
- Manager names: pass what the user typed (e.g. "Kaplan", "Frankie") to the tools. If a tool says a name is ambiguous, ask the user which one they mean.
- Use the specific tools first (champions, standings, career stats, head-to-head, records incl. streaks, matchups). Use runSql only for questions they can't answer, such as counts, thresholds, splits by week or opponent, or anything spanning many seasons. Questions about players, who started or benched whom, rosters, waiver pickups, FAAB, trades or draft picks need runSql (lineups, transactions and draft tables).
- Never answer from partial data. If a result says truncated: true, or a queryMatchups totalMatches is larger than the rows returned, aggregate in SQL instead or tell the user you couldn't get the full answer.
- If a tool returns an error, fix the input (e.g. pick a valid season or correct the SQL) or tell the user what's unavailable.
- Data the league does NOT have: keepers, auction prices, and player stats other than their fantasy points in league lineups. Say so plainly if asked.
- Some early-season managers are hidden by Yahoo privacy settings and are excluded from all stats.
- Keep answers short and direct. Reply in plain text (no markdown); use one line per row when listing several items.`;

const season = z.number().int().describe("Season year, e.g. 2019");
const managerName = z.string().describe("Manager name as the user wrote it, e.g. 'Kaplan'");

const tools = {
  listManagers: tool({
    description: "List current owners (with current team names) and every manager who has ever played.",
    inputSchema: z.object({}),
    execute: async () => listManagers(),
  }),
  getChampions: tool({
    description: "Champion, runner-up and third place for every season.",
    inputSchema: z.object({}),
    execute: async () => getChampions(),
  }),
  getSeasonStandings: tool({
    description: "Final standings for one season: rank, manager, team, record, points for/against, playoff seed.",
    inputSchema: z.object({ year: season }),
    execute: async ({ year }) => getSeasonStandings(year),
  }),
  getCareerStats: tool({
    description:
      "All-time career stats per manager: seasons, W-L, win %, points, championships, playoff record, best/worst season and game. Omit manager for everyone.",
    inputSchema: z.object({ manager: managerName.optional() }),
    execute: async ({ manager }) => getCareerStats(manager),
  }),
  getHeadToHead: tool({
    description:
      "All-time head-to-head record (regular season + playoffs). Give both managers for one rivalry, or only managerA for their record against every opponent.",
    inputSchema: z.object({ managerA: managerName, managerB: managerName.optional() }),
    execute: async ({ managerA, managerB }) => getHeadToHead(managerA, managerB),
  }),
  getRecords: tool({
    description:
      "League-wide leaderboards: highest/lowest single-week scores, biggest blowouts, closest games, luck index (wins vs expected), scoring consistency (lowest std dev first), playoff performance (clutch rating), winless season starts (games without a win from week 1, ties count as winless), and longest win/losing streaks within a regular season.",
    inputSchema: z.object({
      kind: z.enum(RECORD_KINDS),
      limit: z.number().int().min(1).max(25).default(10),
    }),
    execute: async ({ kind, limit }) => getRecords(kind, limit),
  }),
  queryMatchups: tool({
    description:
      "Search individual weekly games. All filters optional and combinable. When manager is given, each row is from that manager's side (result = their win/loss). Returns at most 50 rows plus totalMatches.",
    inputSchema: z.object({
      season: season.optional(),
      week: z.number().int().optional(),
      manager: managerName.optional(),
      opponent: managerName.optional(),
      type: z.enum(["regular", "playoff"]).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    execute: async (q) => queryMatchups(q),
  }),
  runSql: tool({
    description: `Run one read-only SQLite SELECT over the whole league history. Returns at most ${MAX_SQL_ROWS} rows; aggregate (COUNT, SUM, GROUP BY, ORDER BY ... LIMIT) instead of fetching raw rows. 3 second limit.

Tables:
${SQL_SCHEMA}`,
    inputSchema: z.object({ sql: z.string().describe("A single SELECT or WITH query") }),
    execute: async ({ sql }) => runSql(sql),
  }),
  getLeagueSettings: tool({
    description: "League settings for a season: team count, playoff start week, playoff teams, trade deadline, draft and waiver type.",
    inputSchema: z.object({ year: season }),
    execute: async ({ year }) => getLeagueSettings(year),
  }),
};

// Bound per-request input cost; the endpoint is public. The total cap counts
// every part (tool inputs/outputs included) since clients send full history.
// The largest single tool output is ~11k chars, so 200k fits 10 normal turns.
const MAX_MESSAGES = 20;
const MAX_USER_MESSAGE_CHARS = 2000;
const MAX_TOTAL_CHARS = 200_000;

function textChars(m: UIMessage): number {
  return m.parts.reduce((n, p) => n + (p.type === "text" ? p.text.length : 0), 0);
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  if (
    messages.length > MAX_MESSAGES ||
    JSON.stringify(messages).length > MAX_TOTAL_CHARS ||
    messages.some((m) => m.role === "user" && textChars(m) > MAX_USER_MESSAGE_CHARS)
  ) {
    return Response.json(
      { error: `Limit is ${MAX_MESSAGES} messages and ${MAX_USER_MESSAGE_CHARS} characters per question.` },
      { status: 400 }
    );
  }

  const result = streamText({
    model: anthropic("claude-haiku-5-5"),
    system: SYSTEM,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: isStepCount(8),
    // Haiku's reasoning counts against this; 1024 cut off multi-tool steps mid-call.
    maxOutputTokens: 4096,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
