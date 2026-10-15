import ChatBox from "@/components/ChatBox";

export const metadata = { title: "Ask | Blake's Shoes" };

export default function AskPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-8 md:py-[52px]">
        <div className="max-w-[1160px] mx-auto">
          <div
            className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)] mb-2.5"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            14 SEASONS OF RECEIPTS
          </div>
          <h1
            className="text-[48px] md:text-[88px] leading-[.86]"
            style={{ fontFamily: "var(--font-bebas-neue)" }}
          >
            ASK THE LEAGUE
          </h1>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-7 md:py-11 pb-14 md:pb-[88px]">
        <div className="max-w-[760px]">
          <ChatBox />
        </div>
      </main>
    </div>
  );
}
