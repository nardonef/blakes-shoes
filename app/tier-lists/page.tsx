import Image from "next/image";
import {
  LEAGUE_TIER_LISTS,
  ARCHIVE_TIER_LISTS,
  altText,
  formatPostedOn,
  type TierList,
} from "@/lib/tier-lists-data";

export const metadata = {
  title: "Tier Lists | Blake's Shoes",
  description: "Weekly power-ranking tier lists from the league's Tier list czar.",
};

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };

function Kicker({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[10.5px] font-semibold tracking-[.18em] ${className}`} style={MONO}>
      {children}
    </div>
  );
}

function TierImage({ list, sizes, priority }: { list: TierList; sizes: string; priority?: boolean }) {
  return (
    <a href={list.src} target="_blank" rel="noopener" className="block bg-[#151515]">
      <Image
        src={list.src}
        alt={altText(list)}
        width={list.width}
        height={list.height}
        sizes={sizes}
        priority={priority}
        className="w-full h-auto"
      />
    </a>
  );
}

function Lineup({ list }: { list: TierList }) {
  if (!list.tiers) return null;
  return (
    <dl className="mt-3 flex flex-col gap-2">
      {list.tiers.map((t) => (
        <div key={t.name}>
          <dt className="text-[10px] font-semibold tracking-[.16em] text-[var(--accent)]" style={MONO}>
            {t.name.toUpperCase()}
          </dt>
          <dd className="text-sm font-medium leading-[1.4]">{t.teams.join(" · ")}</dd>
        </div>
      ))}
    </dl>
  );
}

function Card({ list, priority, sizes }: { list: TierList; priority?: boolean; sizes: string }) {
  return (
    <article id={list.slug} className="bg-white p-3 md:p-4 scroll-mt-20">
      <TierImage list={list} sizes={sizes} priority={priority} />
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[28px] md:text-[34px] leading-none" style={BEBAS}>
          {list.title}
        </h3>
        <Kicker className="text-[#6b6b66] shrink-0">{formatPostedOn(list.postedOn).toUpperCase()}</Kicker>
      </div>
      {list.caption && <p className="mt-1 text-sm italic text-[#55554f]">&ldquo;{list.caption}&rdquo;</p>}
      <Lineup list={list} />
    </article>
  );
}

export default function TierListsPage() {
  const [latest, ...older] = LEAGUE_TIER_LISTS;
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-8 md:py-[52px]">
        <div className="max-w-[1160px] mx-auto">
          <Kicker className="text-[11px] tracking-[.26em] text-[var(--accent-light)] mb-2.5">
            BY THE TIER LIST CZAR
          </Kicker>
          <h1 className="text-[48px] md:text-[88px] leading-[.86]" style={BEBAS}>
            TIER LISTS
          </h1>
          <p className="mt-3 text-sm md:text-base text-[#c9c9c2] max-w-[560px]">
            Lisan Al-Gaib&apos;s rankings, straight from the GroupMe. Tap any list for full size.
          </p>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-7 md:py-11 pb-14 md:pb-[88px] flex flex-col gap-9 md:gap-14">
        <section>
          <Kicker className="text-[var(--accent)] mb-3">LATEST · 2026</Kicker>
          <div className="max-w-[560px]">
            <Card list={latest} priority sizes="(min-width: 768px) 560px, 100vw" />
          </div>
        </section>

        {older.length > 0 && (
          <section>
            <Kicker className="text-[var(--accent)] mb-3">EARLIER THIS SEASON</Kicker>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {older.map((l) => (
                <Card key={l.slug} list={l} sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" />
              ))}
            </div>
          </section>
        )}

        <section>
          <Kicker className="text-[var(--accent)] mb-3">THE ARCHIVES</Kicker>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 items-start">
            {ARCHIVE_TIER_LISTS.map((l) => (
              <Card key={l.slug} list={l} sizes="(min-width: 640px) 50vw, 100vw" />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
