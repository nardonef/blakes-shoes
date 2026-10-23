import { afterEach, describe, expect, it, vi } from "vitest";
import { authorizeUrl, configFromEnv, exchangeCode, extractCode, needsRefresh, yahooGet } from "./client";

const cfg = { clientId: "cid", clientSecret: "secret", redirectUri: "https://localhost:3443/cb" };

afterEach(() => vi.unstubAllGlobals());

describe("yahoo client", () => {
  it("requires all three env vars", () => {
    expect(() => configFromEnv({ YAHOO_CLIENT_ID: "a" })).toThrow(/YAHOO_CLIENT_SECRET/);
    expect(configFromEnv({ YAHOO_CLIENT_ID: "a", YAHOO_CLIENT_SECRET: "b", YAHOO_REDIRECT_URI: "c" })).toEqual({
      clientId: "a",
      clientSecret: "b",
      redirectUri: "c",
    });
  });

  it("builds a read-only authorize URL", () => {
    const u = new URL(authorizeUrl(cfg));
    expect(u.searchParams.get("client_id")).toBe("cid");
    expect(u.searchParams.get("redirect_uri")).toBe(cfg.redirectUri);
    expect(u.searchParams.get("scope")).toBe("fspt-r");
  });

  it("extracts the code from a pasted redirect URL or bare code", () => {
    expect(extractCode("https://localhost:3443/cb?code=abc123&state=x")).toBe("abc123");
    expect(extractCode("  abc123 \n")).toBe("abc123");
  });

  it("refreshes within a minute of expiry", () => {
    const t = { access_token: "a", refresh_token: "r", expires_at: 100_000 };
    expect(needsRefresh(t, 30_000)).toBe(false);
    expect(needsRefresh(t, 40_000)).toBe(true);
  });

  it("exchanges a code for a token with basic auth", async () => {
    const fetchMock = vi.fn(async () => Response.json({ access_token: "A", refresh_token: "R", expires_in: 3600 }));
    vi.stubGlobal("fetch", fetchMock);
    const t = await exchangeCode(cfg, "abc", 1_000);
    expect(t).toEqual({ access_token: "A", refresh_token: "R", expires_at: 3_601_000 });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa("cid:secret")}`);
    expect(String(init.body)).toContain("grant_type=authorization_code");
  });

  it("does not retry auth errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 403 })));
    await expect(yahooGet("/game/nfl", "tok")).rejects.toMatchObject({ status: 403, retryable: false });
  });

  it("appends format=json and surfaces API errors", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(yahooGet("/league/x/transactions", "tok")).rejects.toThrow(/Yahoo API 429/);
    await expect(yahooGet("/league/x/transactions", "tok")).rejects.toMatchObject({ status: 429, retryable: true });
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(
      "https://fantasysports.yahooapis.com/fantasy/v2/league/x/transactions?format=json",
    );
  });
});
