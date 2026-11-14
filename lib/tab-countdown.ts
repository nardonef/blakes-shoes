// Trade-deadline countdown for the browser tab title (components/NavBar.tsx). Client-safe.

const HOUR = 3600e3;
const DAY = 24 * HOUR;
export const PREFIX = "⏱ ";

/** The tab label for `left` ms before the deadline, or null outside deadline week (or once it's passed). */
export function tabLabel(left: number): string | null {
  if (left <= 0 || left > 7 * DAY) return null;
  const d = Math.floor(left / DAY);
  const h = Math.floor((left % DAY) / HOUR);
  const m = Math.floor((left % HOUR) / 60e3);
  const s = Math.floor((left % 60e3) / 1e3);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/** The final hour, when the tab icon turns red. */
export const isFinalHour = (left: number) => left > 0 && left <= HOUR;

/** `title` with our countdown prefix replaced (or removed when label is null). */
export function withCountdown(title: string, label: string | null): string {
  const base = title.startsWith(PREFIX) ? title.slice(title.indexOf(" · ") + 3) : title;
  return label ? `${PREFIX}${label} · ${base}` : base;
}
