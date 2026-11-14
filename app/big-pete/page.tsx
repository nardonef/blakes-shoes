import { DRAFT_ORDER_VIDEOS, BONUS_VIDEOS, videoSrc, posterSrc, formatDuration } from "@/lib/big-pete-data";
import { formatPostedOn } from "@/lib/tier-lists-data";
import VhsVideo from "@/components/VhsVideo";

export const metadata = {
  title: "Big Pete Draft Order Announcement Archives | Blake's Shoes",
  description: "Every year Big Pete reveals the draft order. Every reveal since 2016.",
};

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };

type Clip = { slug: string; date: string; likes?: number; width: number; height: number; seconds: number; caption?: string };

function VideoCard({ v, title }: { v: Clip; title: React.ReactNode }) {
  return (
    <article id={v.slug} className="bg-white p-3 md:p-4 scroll-mt-20">
      <div className="bg-[#151515] flex justify-center">
        <VhsVideo
          src={videoSrc(v)}
          poster={posterSrc(v)}
          width={v.width}
          height={v.height}
          date={v.date}
          className={v.width > v.height ? "w-full" : "w-full max-w-[340px]"}
        />
      </div>
      <h3 className="mt-3 text-[28px] md:text-[32px] leading-none" style={BEBAS}>
        {title}
      </h3>
      <div className="mt-1.5 text-[10.5px] font-semibold tracking-[.14em] text-[var(--muted-light)]" style={MONO}>
        {formatPostedOn(v.date).toUpperCase()} · {formatDuration(v.seconds)}
        {v.likes !== undefined && ` · ${v.likes} ${v.likes === 1 ? "LIKE" : "LIKES"}`}
      </div>
      {v.caption && <p className="mt-1.5 text-sm italic text-[#55554f]">&ldquo;{v.caption}&rdquo;</p>}
    </article>
  );
}

const GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 items-start";

export default function BigPetePage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-8 md:py-[52px]">
        <div className="max-w-[1160px] mx-auto">
          <div className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)] mb-2.5" style={MONO}>
            BIG PETE
          </div>
          <h1 className="text-[48px] md:text-[88px] leading-[.86]" style={BEBAS}>
            DRAFT ORDER ANNOUNCEMENT ARCHIVES
          </h1>
          <p className="mt-3 text-sm md:text-base text-[#c9c9c2] max-w-[560px]">
            Every year Big Pete reveals the draft order. Every reveal since 2016, newest first.
          </p>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-7 md:py-11 pb-14 md:pb-[88px] flex flex-col gap-10 md:gap-14">
        <section>
          <h2 className="sr-only">Draft order announcements</h2>
          <div className={GRID}>
            {DRAFT_ORDER_VIDEOS.map((v) => (
              <VideoCard
                key={v.slug}
                v={v}
                title={
                  <>
                    {v.season} Draft Order
                    {v.part && <span className="text-[var(--muted-light)]"> · {v.part}</span>}
                  </>
                }
              />
            ))}
          </div>
        </section>

        <section>
          <div className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent)] mb-1" style={MONO}>
            NOT A DRAFT ORDER
          </div>
          <h2 className="text-[34px] md:text-[48px] leading-none mb-4" style={BEBAS}>
            Bonus footage
          </h2>
          <div className={GRID}>
            {BONUS_VIDEOS.map((v) => (
              <VideoCard key={v.slug} v={v} title={v.title} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
