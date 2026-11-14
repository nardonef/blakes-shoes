"use client";

import { useRef, useState } from "react";
import { osdLabel, vcrDate, type TapeState } from "@/lib/vhs";

const OSD = {
  fontFamily: "var(--font-geist-mono)",
  textShadow: "0 0 2px rgb(0 0 0 / 0.9), 1px 1px 0 rgb(0 0 0 / 0.8), 0 0 6px rgb(120 255 160 / 0.35)",
};

/**
 * A <video> dressed as an old VHS tape: scanlines, a vignette and a slightly hot picture, a VCR
 * on-screen display (state top-left, tape date top-right) and a tracking glitch each time play is
 * pressed (skipped with reduced motion). Every overlay ignores the pointer, so the native controls
 * work as normal.
 */
export default function VhsVideo({
  src,
  poster,
  width,
  height,
  date,
  className,
}: {
  src: string;
  poster: string;
  width: number;
  height: number;
  date: string;
  className?: string;
}) {
  const [state, setState] = useState<TapeState>("stop");
  const glitch = useRef<HTMLDivElement>(null);

  const onPlay = () => {
    setState("play");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    glitch.current?.animate(
      [
        { transform: "translateY(-30%)", opacity: 0.9 },
        { transform: "translateY(60%)", opacity: 0.7, offset: 0.6 },
        { transform: "translateY(120%)", opacity: 0 },
      ],
      { duration: 650, easing: "cubic-bezier(.3,.1,.3,1)" },
    );
  };

  return (
    <div className={`vhs relative overflow-hidden ${className ?? ""}`}>
      <video
        controls
        playsInline
        preload="none"
        poster={poster}
        width={width}
        height={height}
        onPlay={onPlay}
        onPause={(e) => setState(e.currentTarget.ended ? "stop" : "pause")}
        onEnded={() => setState("stop")}
        className="block w-full h-auto [filter:saturate(1.25)_contrast(1.06)_brightness(1.03)]"
      >
        <source src={src} type="video/mp4" />
      </video>
      {/* Scanlines + vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background:repeating-linear-gradient(0deg,rgb(0_0_0/0.16)_0px,rgb(0_0_0/0.16)_1px,transparent_1px,transparent_3px),radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.45)_100%)] mix-blend-multiply"
      />
      {/* Tracking glitch band, swept down on play */}
      <div
        ref={glitch}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[22%] opacity-0 [background:repeating-linear-gradient(90deg,rgb(255_255_255/0.5)_0px,rgb(255_255_255/0.08)_2px,rgb(255_255_255/0.6)_3px,transparent_6px),linear-gradient(180deg,transparent,rgb(255_255_255/0.35),transparent)] mix-blend-screen"
      />
      {/* VCR on-screen display */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-2.5 pt-2 text-[11px] md:text-[12px] font-bold tracking-[.12em] text-white"
        style={OSD}
      >
        <span className={state === "play" ? "" : "vhs-blink"}>{osdLabel(state)}</span>
        <span>{vcrDate(date)}</span>
      </div>
    </div>
  );
}
