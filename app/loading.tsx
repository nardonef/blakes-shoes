// Shown while a page's data loads during navigation: the shape of a page (dark header, then cards)
// so the switch doesn't flash blank. The pulse only runs without reduced motion.
export default function Loading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }} aria-busy="true" aria-label="Loading">
      <div className="bg-[#151515] px-4 md:px-10 py-8 md:py-[52px]">
        <div className="max-w-[1160px] mx-auto flex flex-col gap-4">
          <div className="h-3 w-40 bg-[#2a2a28] motion-safe:animate-pulse" />
          <div className="h-14 md:h-20 w-72 max-w-full bg-[#2a2a28] motion-safe:animate-pulse" />
          <div className="h-4 w-[min(560px,100%)] bg-[#2a2a28] motion-safe:animate-pulse" />
        </div>
      </div>
      <div className="max-w-[1160px] mx-auto px-4 md:px-10 py-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-40 bg-white motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}
