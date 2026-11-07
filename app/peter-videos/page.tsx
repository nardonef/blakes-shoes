import { PETER_VIDEOS, videoSrc, posterSrc, formatDuration } from "@/lib/peter-videos-data";
import { formatPostedOn } from "@/lib/tier-lists-data";

export const metadata = {
  title: "Peter's Videos | Blake's Shoes",
  description: "Every video Peter Klensch, Esq. has sent to the league GroupMe.",
};

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };

export default function PeterVideosPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-8 md:py-[52px]">
        <div className="max-w-[1160px] mx-auto">
          <div className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)] mb-2.5" style={MONO}>
            FROM THE GROUPME
          </div>
          <h1 className="text-[48px] md:text-[88px] leading-[.86]" style={BEBAS}>
            PETER&apos;S VIDEOS
          </h1>
          <p className="mt-3 text-sm md:text-base text-[#c9c9c2] max-w-[560px]">
            Every video Peter Klensch, Esq. has sent to the chat, newest first.
          </p>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-7 md:py-11 pb-14 md:pb-[88px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 items-start">
          {PETER_VIDEOS.map((v) => (
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
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <h2 className="text-[26px] md:text-[30px] leading-none" style={BEBAS}>
                  {formatPostedOn(v.postedOn)}
                  {v.part && <span className="text-[var(--muted-light)]"> · {v.part}</span>}
                </h2>
                <div className="text-[10.5px] font-semibold tracking-[.14em] text-[var(--muted-light)] shrink-0" style={MONO}>
                  {formatDuration(v.seconds)}
                  {v.likes !== undefined && ` · ${v.likes} ${v.likes === 1 ? "LIKE" : "LIKES"}`}
                </div>
              </div>
              {v.caption && <p className="mt-1.5 text-sm italic text-[#55554f]">&ldquo;{v.caption}&rdquo;</p>}
            </article>
          ))}
        </div>

        <p className="mt-8 text-[13px] text-[var(--muted-light)]">
          Two older videos, from July 2016 and July 2017, are no longer available from GroupMe.
        </p>
      </main>
    </div>
  );
}
