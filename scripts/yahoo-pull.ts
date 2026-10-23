/**
 * One-off pull of Yahoo league history (transactions + weekly lineups) into data/.
 * Yahoo app credentials come from env, or from the file named by YAHOO_ENV_FILE
 * (fantasy-hub's api/.env has them):
 *
 *   export YAHOO_ENV_FILE=~/Desktop/fantasy-hub/api/.env
 *   npx vite-node scripts/yahoo-pull.ts auth-url          # open, approve, copy the URL you land on
 *   npx vite-node scripts/yahoo-pull.ts exchange '<url>'  # saves token outside the repo
 *   npx vite-node scripts/yahoo-pull.ts get '<path>'      # fetch one raw response (debugging)
 *   npx vite-node scripts/yahoo-pull.ts pull              # fetch everything into the raw cache (resumable)
 *   npx vite-node scripts/yahoo-pull.ts build             # raw cache -> data/*.json (no network)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import leagueInfo from "../data/league_info.json";
import {
  authorizeUrl,
  configFromEnv,
  exchangeCode,
  extractCode,
  needsRefresh,
  refreshToken,
  yahooGet,
  YahooApiError,
  type YahooToken,
} from "../lib/yahoo/client";

const TOKEN_FILE = join(homedir(), ".config/blakes-shoes/yahoo-token.json");
const CACHE_DIR = join(homedir(), ".cache/blakes-shoes-yahoo");

const transactionsPath = (leagueKey: string) => `/league/${leagueKey}/transactions`;
const lineupsPath = (leagueKey: string, week: number) =>
  `/league/${leagueKey}/teams/roster;week=${week}/players/stats;type=week;week=${week}`;

function saveToken(t: YahooToken) {
  mkdirSync(join(TOKEN_FILE, ".."), { recursive: true });
  writeFileSync(TOKEN_FILE, JSON.stringify(t), { mode: 0o600 });
}

async function accessToken(): Promise<string> {
  if (!existsSync(TOKEN_FILE)) throw new Error("No token yet: run auth-url then exchange");
  let t = JSON.parse(readFileSync(TOKEN_FILE, "utf8")) as YahooToken;
  if (needsRefresh(t)) {
    t = await refreshToken(configFromEnv(), t);
    saveToken(t);
  }
  return t.access_token;
}

const cacheFile = (path: string) => join(CACHE_DIR, `${path.replace(/[^A-Za-z0-9.=]+/g, "_")}.json`);

async function cachedGet(path: string): Promise<unknown> {
  const f = cacheFile(path);
  if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8"));
  for (let attempt = 1; ; attempt++) {
    try {
      const body = await yahooGet(path, await accessToken());
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(f, JSON.stringify(body));
      return body;
    } catch (e) {
      if (attempt >= 4 || (e instanceof YahooApiError && !e.retryable)) throw e;
      const wait = 5_000 * 2 ** attempt;
      console.warn(`  retry ${attempt} in ${wait / 1000}s: ${(e as Error).message}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function pull() {
  for (const s of leagueInfo) {
    const paths = [transactionsPath(s.league_key)];
    for (let w = Number(s.start_week); w <= Number(s.end_week); w++) paths.push(lineupsPath(s.league_key, w));
    let fetched = 0;
    for (const p of paths) {
      if (existsSync(cacheFile(p))) continue;
      await cachedGet(p);
      fetched++;
      await new Promise((r) => setTimeout(r, 500));
    }
    console.log(`${s.season_year}: ${paths.length} responses (${fetched} fetched)`);
  }
}

async function main() {
  if (process.env.YAHOO_ENV_FILE) process.loadEnvFile(process.env.YAHOO_ENV_FILE);
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "auth-url") console.log(authorizeUrl(configFromEnv()));
  else if (cmd === "exchange") {
    saveToken(await exchangeCode(configFromEnv(), extractCode(arg)));
    console.log(`token saved to ${TOKEN_FILE}`);
  } else if (cmd === "get") console.log(cacheFile(arg), JSON.stringify(await cachedGet(arg)).length, "bytes");
  else if (cmd === "pull") await pull();
  else throw new Error("usage: auth-url | exchange <url> | get <path> | pull | build");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
