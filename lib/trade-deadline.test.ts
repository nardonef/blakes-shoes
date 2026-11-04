import { describe, expect, it } from "vitest";
import { deadlineLabel, endOfDayEastern, getTradeDeadline } from "./trade-deadline";

describe("trade deadline", () => {
  it("uses the league's 2026 deadline, Nov 14", () => {
    const d = getTradeDeadline();
    expect(d.date).toBe("2026-11-14");
    expect(deadlineLabel(d.date)).toBe("NOV 14, 2026");
  });

  it("ends at 11:59:59 PM Eastern, standard or daylight time", () => {
    expect(new Date(endOfDayEastern("2026-11-14")).toISOString()).toBe("2026-11-15T04:59:59.000Z"); // EST
    expect(new Date(endOfDayEastern("2026-10-20")).toISOString()).toBe("2026-10-21T03:59:59.000Z"); // EDT
  });
});
