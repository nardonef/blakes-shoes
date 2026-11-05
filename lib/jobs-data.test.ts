import { describe, it, expect } from "vitest";
import { JOBS, PENDING } from "./jobs-data";

describe("jobs data", () => {
  it("lists the 11 current jobs, each with a holder", () => {
    expect(JOBS).toHaveLength(11);
    for (const j of JOBS) expect(j.holder.trim()).not.toBe("");
  });

  it("lists the 2 pending managers", () => {
    expect(PENDING).toEqual(["Jone", "Slagle"]);
  });

  it("makes Borba the Tier list czar", () => {
    expect(JOBS).toContainEqual({ holder: "Borba", job: "Tier list czar", href: "/tier-lists" });
  });

  it("makes Kap the Penny for your thoughts czar", () => {
    expect(JOBS).toContainEqual({ holder: "Kap", job: "Penny for your thoughts czar" });
  });

  it("lists kozzy with the kozzypredicts job", () => {
    expect(JOBS).toContainEqual({ holder: "kozzy", job: "kozzypredicts" });
  });

  it("makes yatty the Pickem czar", () => {
    expect(JOBS).toContainEqual({ holder: "yatty", job: "Pickem czar" });
  });

  it("makes Jenk the Award Show czar", () => {
    expect(JOBS).toContainEqual({ holder: "Jenk", job: "Award Show czar" });
  });

  it("does not list a pending manager as a job holder", () => {
    for (const j of JOBS) expect(PENDING).not.toContain(j.holder);
  });
});
