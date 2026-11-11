"use client";

import { useEffect, useRef, useState } from "react";
import { UNITS, unitsLeft } from "@/lib/countdown";

/** Live countdown to `at` (epoch ms); after it passes, says trades are closed. */
export default function Countdown({ at }: { at: number }) {
  const [now, setNow] = useState<number | null>(null);
  const digits = useRef<(HTMLDivElement | null)[]>([]);
  const prev = useRef<number[] | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Flip a unit's number in when it changes. Not on the first real tick, and never with reduced motion.
  useEffect(() => {
    if (now == null) return;
    const current = unitsLeft(at - now);
    const before = prev.current;
    prev.current = current;
    if (!before || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    current.forEach((v, i) => {
      if (v === before[i]) return;
      digits.current[i]?.animate(
        [
          { transform: "translateY(-60%)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 380, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
      );
    });
  }, [now, at]);

  if (now != null && now >= at) {
    return (
      <div className="bg-[var(--panel)] text-center py-5 text-[28px] md:text-[40px] leading-none text-[var(--accent-light)]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
        TRADES ARE CLOSED
      </div>
    );
  }

  // Before hydration (and on the server) show zeros rather than a time that would immediately change.
  const values = unitsLeft(now == null ? 0 : at - now);

  return (
    <div className="grid grid-cols-4 gap-1.5 md:gap-2.5">
      {UNITS.map((u, i) => (
        <div key={u.label} className="bg-[var(--panel)] text-center py-2.5 md:py-[15px] overflow-hidden">
          <div
            ref={(el) => {
              digits.current[i] = el;
            }}
            className="text-[32px] md:text-[52px] leading-none text-[var(--accent-light)]"
            style={{ fontFamily: "var(--font-bebas-neue)" }}
          >
            {String(values[i]).padStart(2, "0")}
          </div>
          <div
            className="text-[9.5px] tracking-[.18em] text-[var(--muted-dark)] mt-1"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {u.label}
          </div>
        </div>
      ))}
    </div>
  );
}
