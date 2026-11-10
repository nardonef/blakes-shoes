import { DRAFT_ORDER_VIDEOS, videoSrc, posterSrc, formatDuration } from "@/lib/big-pete-data";
import { formatPostedOn } from "@/lib/tier-lists-data";

export const metadata = {
  title: "Big Pete Draft Order Announcement Archives | Blake's Shoes",
  description: "Every year Big Pete reveals the draft order. Every reveal since 2016.",
};

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };

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

      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-7 md:py-11 pb-14 md:pb-[88px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 items-start">
          {DRAFT_ORDER_VIDEOS.map((v) => (
            <article key={v.slug} id={v.slug} className="bg-white p-3 md:p-4 scroll-mt-20">
              <div className="bg-[#151515] flex justify-center">
                <video
                  controls
                  playsInline
                  preload="none"
                  poster={posterSrc(v)}
                  width={v.width}
                  height={v.height}
                  className={`h-auto ${v.width > v.height ? "w-full" : "w-full max-w-[340px]"}`}
                >
                  <source src={videoSrc(v)} type="video/mp4" />
                </video>
              </div>
              <h2 className="mt-3 text-[28px] md:text-[32px] leading-none" style={BEBAS}>
                {v.season} Draft Order
                {v.part && <span className="text-[var(--muted-light)]"> · {v.part}</span>}
              </h2>
              <div className="mt-1.5 text-[10.5px] font-semibold tracking-[.14em] text-[var(--muted-light)]" style={MONO}>
                {formatPostedOn(v.date).toUpperCase()} · {formatDuration(v.seconds)}
                {v.likes !== undefined && ` · ${v.likes} ${v.likes === 1 ? "LIKE" : "LIKES"}`}
              </div>
              {v.caption && <p className="mt-1.5 text-sm italic text-[#55554f]">&ldquo;{v.caption}&rdquo;</p>}
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
