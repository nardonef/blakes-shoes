import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Everything the site shows or ShoesGPT can query comes from these folders. Bad words in old
// Yahoo team names were censored at the source (e.g. "AlvinAndTheSh*tPumps"); this guards against
// them coming back, say from a full re-scrape of league history. The pattern is built from pieces
// so this file doesn't match itself. Real player names like Cameron Dicker are deliberately fine.
const BANNED = new RegExp(["ni" + "gg", "sh" + "it", "fu" + "ck", "va" + "gina", "\\bcu" + "nt", "\\bbi" + "tch"].join("|"), "i");
const ROOTS = ["app", "components", "lib", "data"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx|json|md)$/.test(name) ? [path] : [];
  });
}

describe("clean language", () => {
  it("has no bad words in site text or league data", () => {
    const offenders = ROOTS.flatMap((root) => files(join(process.cwd(), root)))
      .filter((f) => !f.endsWith("clean-language.test.ts"))
      .filter((f) => BANNED.test(readFileSync(f, "utf8")))
      .map((f) => f.replace(process.cwd() + "/", ""));
    expect(offenders).toEqual([]);
  });

  it("keeps the censored team names and real player names that only look rude", () => {
    const standings = readFileSync(join(process.cwd(), "data/standings.json"), "utf8");
    expect(standings).toContain("AlvinAndTheSh*tPumps");
    expect(standings).toContain("CoopWhatsAV*gina");
    expect(standings).toContain("Riley Coopers N*****");
    expect(BANNED.test("Cameron Dicker")).toBe(false);
    expect(BANNED.test("Kirk Cousins")).toBe(false);
  });
});
