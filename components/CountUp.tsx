"use client";

import { useEffect, useRef } from "react";
import { easeOut, formatAt, parseNumber } from "@/lib/count-up";

const DURATION = 900;

/**
 * Renders `text` as-is (so the server HTML has the real value), then counts its number up from 0
 * the first time it scrolls into view. Hidden until then by globals.css; skipped for reduced motion.
 */
export default function CountUp({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parsed = parseNumber(text);
    // Write to React's own text node so later prop changes still land on it.
    const node = el?.firstChild;
    if (!el) return;
    if (!parsed || !(node instanceof Text) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.setAttribute("data-shown", "");
      return;
    }
    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION);
          node.nodeValue = formatAt(parsed, parsed.value * easeOut(t));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        node.nodeValue = formatAt(parsed, 0);
        el.setAttribute("data-shown", "");
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      node.nodeValue = text;
    };
  }, [text]);

  return (
    <span ref={ref} data-count="">
      {text}
    </span>
  );
}
