import { describe, it, expect } from "vitest";
import { getCards, rarityFor, cardPct } from "./cards-data";
import { getManagerLegacies } from "./legacy-data";

describe("rarityFor", () => {
  it("is gold for two or more titles, foil for one, base for none", () => {
    expect(rarityFor(0)).toBe("base");
    expect(rarityFor(1)).toBe("foil");
    expect(rarityFor(2)).toBe("gold");
    expect(rarityFor(3)).toBe("gold");
  });
});

describe("cardPct", () => {
  it("prints win % like a baseball card", () => {
    expect(cardPct(0.5781)).toBe(".578");
    expect(cardPct(0.5)).toBe(".500");
    expect(cardPct(0)).toBe(".000");
    expect(cardPct(1)).toBe("1.000");
  });
});

describe("getCards (real league data)", () => {
  const cards = getCards();
  const legacies = getManagerLegacies();
  const card = (name: string) => cards.find((c) => c.name === name)!;

  it("has one card per current owner, numbered 01-12 by win %", () => {
    expect(cards).toHaveLength(12);
    expect(cards.map((c) => c.number)).toEqual(Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")));
    const pcts = cards.map((c) => Number(c.winPct));
    expect(pcts).toEqual([...pcts].sort((a, b) => b - a));
  });

  it("matches each owner's legacy record and titles", () => {
    for (const l of legacies) {
      const c = card(l.owner.name);
      expect(c.record.startsWith(`${l.wins}-${l.losses}`)).toBe(true);
      expect(c.titleYears).toEqual(l.championshipYears);
      expect(c.rarity).toBe(rarityFor(l.championships));
    }
  });

  it("gives the two-time champs gold foil", () => {
    expect(card("Peter Klensch").rarity).toBe("gold");
    expect(card("Ryan Jenks").rarity).toBe("gold");
    expect(card("Peter Klensch").bestFinish).toMatch(/^1st · /);
  });
});
