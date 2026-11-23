"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type RivalryGameType from "./RivalryGame";

// three.js only on this page, and only in the browser.
const RivalryGame = dynamic(() => import("./RivalryGame"), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100svh-58px)] bg-[#06090f] flex items-center justify-center">
      <div className="text-[28px] text-white tracking-[.04em] animate-pulse" style={{ fontFamily: "var(--font-bebas-neue)" }}>
        TAKING THE FIELD...
      </div>
    </div>
  ),
});

export default function RivalryLoader(props: ComponentProps<typeof RivalryGameType>) {
  return <RivalryGame {...props} />;
}
