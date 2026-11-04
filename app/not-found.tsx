import Link from "next/link";

export const metadata = { title: "Page not found | Blake's Shoes" };

const LINKS = [
  { href: "/", label: "HOME" },
  { href: "/stats", label: "STATS" },
  { href: "/legacy", label: "LEGACY" },
  { href: "/rosters", label: "ROSTERS" },
];

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-66px)]" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-12 md:py-20">
        <div className="max-w-[1160px] mx-auto">
          <div
            className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)] mb-2.5"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            ERROR 404 · INCOMPLETE PASS
          </div>
          <h1 className="text-[64px] md:text-[120px] leading-[.86] mb-4" style={{ fontFamily: "var(--font-bebas-neue)" }}>
            NOTHING HERE
          </h1>
          <p className="text-base text-[#b0b0aa] leading-[1.6] max-w-[52ch]">
            That page got dropped on waivers. The link may be old, or the address has a typo.
          </p>
        </div>
      </header>
      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-8 md:py-12">
        <div className="flex gap-2 flex-wrap">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="bg-[#151515] text-white px-5 py-3.5 min-h-11 text-[11px] font-semibold tracking-[.14em] hover:bg-[var(--accent)]"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {l.label} →
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
