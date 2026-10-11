import { JOBS, PENDING } from "@/lib/jobs-data";

export const metadata = { title: "Jobs | Blake's Shoes" };

export default function JobsPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-8 md:py-[52px]">
        <div className="max-w-[1160px] mx-auto">
          <div
            className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)] mb-2.5"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            LEAGUE OPERATIONS
          </div>
          <h1
            className="text-[48px] md:text-[88px] leading-[.86]"
            style={{ fontFamily: "var(--font-bebas-neue)" }}
          >
            JOBS
          </h1>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-7 md:py-11 pb-14 md:pb-[88px] flex flex-col gap-9 md:gap-14">
        <section>
          <div className="bg-white">
            <div
              className="grid grid-cols-[140px_1fr] md:grid-cols-[260px_1fr] bg-[#151515] text-[#f5f5f0] text-[9.5px] font-semibold tracking-[.16em]"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              <div className="px-4 md:px-6 py-3">HOLDER</div>
              <div className="px-4 md:px-6 py-3">JOB</div>
            </div>
            {JOBS.map((j) => (
              <div
                key={j.holder}
                className="grid grid-cols-[140px_1fr] md:grid-cols-[260px_1fr] border-t border-[var(--rule)] items-baseline"
              >
                <div
                  className="px-4 md:px-6 py-4 text-[20px] md:text-[28px] leading-none"
                  style={{ fontFamily: "var(--font-bebas-neue)" }}
                >
                  {j.holder}
                </div>
                <div className="px-4 md:px-6 py-4 text-sm md:text-base font-medium leading-[1.45]">
                  {j.job || "—"}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[var(--accent)] text-[#f5f5f0] p-6 md:p-9">
          <div
            className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-pale)] mb-[18px]"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            JOBS PENDING
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {PENDING.map((name) => (
              <span
                key={name}
                className="text-[30px] md:text-[44px] leading-none"
                style={{ fontFamily: "var(--font-bebas-neue)" }}
              >
                {name}
              </span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
