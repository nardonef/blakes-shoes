"use client";

import { useEffect, useState } from "react";

const UNITS = [
  { label: "DAYS", ms: 864e5 },
  { label: "HRS", ms: 36e5 },
  { label: "MIN", ms: 6e4 },
  { label: "SEC", ms: 1e3 },
];

/** Live countdown to `at` (epoch ms); after it passes, says trades are closed. */
export default function Countdown({ at }: { at: number }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (now != null && now >= at) {
    return (
      <div className="bg-[var(--panel)] text-center py-5 text-[28px] md:text-[40px] leading-none text-[var(--accent-light)]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
        TRADES ARE CLOSED
      </div>
    );
  }

  // Before hydration (and on the server) show zeros rather than a time that would immediately change.
  const left = now == null ? 0 : at - now;
  const values = UNITS.map((u, i) => ({
    label: u.label,
    // Whole units left after the larger units are taken out.
    value: Math.floor((i === 0 ? left : left % UNITS[i - 1].ms) / u.ms),
  }));

  return (
    <div className="grid grid-cols-4 gap-1.5 md:gap-2.5">
      {values.map((item) => (
        <div key={item.label} className="bg-[var(--panel)] text-center py-2.5 md:py-[15px]">
          <div
            className="text-[32px] md:text-[52px] leading-none text-[var(--accent-light)]"
            style={{ fontFamily: "var(--font-bebas-neue)" }}
          >
            {String(item.value).padStart(2, "0")}
          </div>
          <div
            className="text-[9.5px] tracking-[.18em] text-[var(--muted-dark)] mt-1"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
