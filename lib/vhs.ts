// VCR on-screen-display helpers for components/VhsVideo.tsx. Client-safe.

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "2026-08-08" -> "AUG 08 2026", the way a camcorder stamps a tape. */
export function vcrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${d} ${y}`;
}

export type TapeState = "stop" | "play" | "pause";

/** The OSD label for each player state. */
export function osdLabel(state: TapeState): string {
  return { stop: "■ STOP", play: "▶ PLAY", pause: "❚❚ PAUSE" }[state];
}
