import TradingCard from "@/components/TradingCard";
import { getCards } from "@/lib/cards-data";

export const metadata = {
  title: "Trading Cards | Blake's Shoes",
  description: "Every current owner as a retro trading card, with their career stats on the back.",
};

const MONO = { fontFamily: "var(--font-geist-mono)" };

export default function CardsPage() {
  const cards = getCards();
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-8 md:py-[52px]">
        <div className="max-w-[1160px] mx-auto">
          <div className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)] mb-2.5" style={MONO}>
            SERIES 2026 · {cards.length} CARDS
          </div>
          <h1 className="text-[48px] md:text-[88px] leading-[.86] mb-4" style={{ fontFamily: "var(--font-bebas-neue)" }}>
            TRADING CARDS
          </h1>
          <p className="text-base text-[#b0b0aa] leading-[1.6] max-w-[62ch]">
            Every current owner, numbered by all-time win percentage. Tap a card to flip it for the stats. Champions
            come in foil; two-time champs in gold.
          </p>
        </div>
      </header>
      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-8 md:py-12 pb-14 md:pb-[88px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
          {cards.map((c) => (
            <TradingCard key={c.slug} card={c} />
          ))}
        </div>
      </main>
    </div>
  );
}
