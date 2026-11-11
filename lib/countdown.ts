// Client-safe countdown math for components/Countdown.tsx.

export const UNITS = [
  { label: "DAYS", ms: 864e5 },
  { label: "HRS", ms: 36e5 },
  { label: "MIN", ms: 6e4 },
  { label: "SEC", ms: 1e3 },
];

/** Whole days, hours, minutes and seconds in `left` ms (each after the larger units are taken out). */
export function unitsLeft(left: number): number[] {
  const ms = Math.max(left, 0);
  return UNITS.map((u, i) => Math.floor((i === 0 ? ms : ms % UNITS[i - 1].ms) / u.ms));
}
