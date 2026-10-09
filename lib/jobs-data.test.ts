import { describe, it, expect } from "vitest";
import { JOBS, PENDING } from "./jobs-data";

describe("jobs data", () => {
  it("lists the 8 current jobs, each with a holder", () => {
    expect(JOBS).toHaveLength(8);
    for (const j of JOBS) expect(j.holder.trim()).not.toBe("");
  });

  it("lists the 5 pending managers", () => {
    expect(PENDING).toEqual(["Borba", "Kap", "Jenk", "Jone", "Slagle"]);
  });

  it("does not list a pending manager as a job holder", () => {
    for (const j of JOBS) expect(PENDING).not.toContain(j.holder);
  });
});
