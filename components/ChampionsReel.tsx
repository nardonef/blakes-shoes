"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

export type ReelChampion = { year: number; manager: string; image: string | null };

/**
 * Endless strip of every champion, newest first, along the bottom of the home masthead. The list
 * is rendered twice and the track slides by exactly half its width, so the loop is seamless.
 * Hovering slows it to 15%; with reduced motion it stays still.
 */
export default function ChampionsReel({ champions }: { champions: ReelChampion[] }) {
  const track = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    anim.current = el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }], {
      duration: 70000,
      iterations: Infinity,
    });
    return () => anim.current?.cancel();
  }, []);

  const item = (c: ReelChampion, copy: number) => (
    <div
      key={`${copy}-${c.year}`}
      aria-hidden={copy === 1 || undefined}
      className="flex items-center gap-3 px-7 py-3.5 border-r border-[#262624] whitespace-nowrap"
    >
      <div className="relative w-[34px] h-[34px] rounded-full overflow-hidden shrink-0 bg-[var(--accent)] flex items-center justify-center">
        {c.image ? (
          <Image src={c.image} alt={copy === 0 ? c.manager : ""} fill sizes="34px" className="object-cover" />
        ) : (
          <span className="text-[16px] text-[#f5f5f0]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
            {c.manager.charAt(0)}
          </span>
        )}
      </div>
      <span className="text-[24px] leading-none text-[var(--accent-light)]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
        {c.year}
      </span>
      <span className="text-[11px] tracking-[.12em] text-[#d4d4d0]" style={{ fontFamily: "var(--font-geist-mono)" }}>
        {c.manager.toUpperCase()}
      </span>
    </div>
  );

  return (
    <div
      data-hero="reel"
      aria-label="League champions"
      onMouseEnter={() => anim.current?.updatePlaybackRate(0.15)}
      onMouseLeave={() => anim.current?.updatePlaybackRate(1)}
      className="relative mt-[clamp(32px,4vw,44px)] border-t border-[#262624] overflow-hidden text-left [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
    >
      <div ref={track} className="flex w-max">
        {champions.map((c) => item(c, 0))}
        {champions.map((c) => item(c, 1))}
      </div>
    </div>
  );
}
