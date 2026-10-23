// Yahoo Fantasy API access for scripts/yahoo-pull.ts (one-off history pull,
// not used by the site at runtime). OAuth app credentials come from env:
// YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET, YAHOO_REDIRECT_URI.

const AUTH_URL = "https://api.login.yahoo.com/oauth2/request_auth";
const TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token";
const API = "https://fantasysports.yahooapis.com/fantasy/v2";

export interface YahooConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface YahooToken {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
}

export function configFromEnv(env: Record<string, string | undefined> = process.env): YahooConfig {
  const { YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET, YAHOO_REDIRECT_URI } = env;
  if (!YAHOO_CLIENT_ID || !YAHOO_CLIENT_SECRET || !YAHOO_REDIRECT_URI) {
    throw new Error("Set YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET and YAHOO_REDIRECT_URI");
  }
  return { clientId: YAHOO_CLIENT_ID, clientSecret: YAHOO_CLIENT_SECRET, redirectUri: YAHOO_REDIRECT_URI };
}

export function authorizeUrl(cfg: YahooConfig): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: "fspt-r",
  });
  return `${AUTH_URL}?${params}`;
}

/** Accepts either the bare code or the full redirect URL Yahoo sent the browser to. */
export function extractCode(pasted: string): string {
  const s = pasted.trim();
  if (!s.includes("code=")) return s;
  const code = new URL(s).searchParams.get("code");
  if (!code) throw new Error("No code= in pasted URL");
  return code;
}

async function tokenRequest(cfg: YahooConfig, body: Record<string, string>, now: number): Promise<YahooToken> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ redirect_uri: cfg.redirectUri, ...body }),
  });
  if (!res.ok) throw new Error(`Yahoo token request failed: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: now + j.expires_in * 1000 };
}

export function exchangeCode(cfg: YahooConfig, code: string, now = Date.now()) {
  return tokenRequest(cfg, { grant_type: "authorization_code", code }, now);
}

export function refreshToken(cfg: YahooConfig, token: YahooToken, now = Date.now()) {
  return tokenRequest(cfg, { grant_type: "refresh_token", refresh_token: token.refresh_token }, now);
}

/** Refresh a minute early so a request never goes out with a just-expired token. */
export function needsRefresh(token: YahooToken, now = Date.now()): boolean {
  return token.expires_at - 60_000 <= now;
}

export class YahooApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }

  /** Rate limits (429, and Yahoo's 999) and server errors are worth retrying; other 4xx are not. */
  get retryable(): boolean {
    return this.status === 429 || this.status === 999 || this.status >= 500;
  }
}

export async function yahooGet(path: string, accessToken: string): Promise<unknown> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API}${path}${sep}format=json`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new YahooApiError(res.status, `Yahoo API ${res.status} ${path}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}
