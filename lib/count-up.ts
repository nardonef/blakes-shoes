// Client-safe helpers for components/CountUp.tsx: animate the first number inside a display string
// ("+102.1", "$100", "1,762", "7 of 14") while keeping the text around it.

export interface ParsedNumber {
  prefix: string;
  value: number;
  decimals: number;
  grouped: boolean;
  suffix: string;
}

export function parseNumber(text: string): ParsedNumber | null {
  const m = /^(.*?)(\d[\d,]*(?:\.\d+)?)([\s\S]*)$/.exec(text);
  if (!m) return null;
  const digits = m[2];
  return {
    prefix: m[1],
    value: Number(digits.replace(/,/g, "")),
    decimals: digits.includes(".") ? digits.split(".")[1].length : 0,
    grouped: digits.includes(","),
    suffix: m[3],
  };
}

/** The display string with the number replaced by `value`, in the original's format. */
export function formatAt(p: ParsedNumber, value: number): string {
  const n = value.toLocaleString("en-US", {
    minimumFractionDigits: p.decimals,
    maximumFractionDigits: p.decimals,
    useGrouping: p.grouped,
  });
  return `${p.prefix}${n}${p.suffix}`;
}

/** Ease-out cubic: fast start, gentle landing. */
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
