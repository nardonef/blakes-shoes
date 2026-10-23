import { describe, it, expect } from "vitest";
import { JOBS, PENDING } from "./jobs-data";

describe("jobs data", () => {
  it("lists the 9 current jobs, each with a holder", () => {
    expect(JOBS).toHaveLength(9);
    for (const j of JOBS) expect(j.holder.trim()).not.toBe("");
  });

  it("lists the 4 pending managers", () => {
    expect(PENDING).toEqual(["Borba", "Kap", "Jone", "Slagle"]);
  });

  it("makes Jenk the Award Show czar", () => {
    expect(JOBS).toContainEqual({ holder: "Jenk", job: "Award Show czar" });
  });

  it("does not list a pending manager as a job holder", () => {
    for (const j of JOBS) expect(PENDING).not.toContain(j.holder);
  });
});
