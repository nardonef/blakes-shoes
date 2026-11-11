// Client-safe helpers for components/CountUp.tsx: animate the first number inside a display string
// ("+102.1", "$100", "1,762", "7 of 14") while keeping the text around it.

export interface ParsedNumber {
  prefix: string;
  value: number;
  decimals: number;
  grouped: boolean;
  pad: number; // minimum integer digits, for zero-padded text like "01"
  suffix: string;
}

export function parseNumber(text: string): ParsedNumber | null {
  const m = /^(.*?)(\d[\d,]*(?:\.\d+)?)([\s\S]*)$/.exec(text);
  if (!m) return null;
  const digits = m[2];
  const whole = digits.split(".")[0];
  return {
    prefix: m[1],
    value: Number(digits.replace(/,/g, "")),
    decimals: digits.includes(".") ? digits.split(".")[1].length : 0,
    grouped: digits.includes(","),
    pad: whole.length > 1 && whole.startsWith("0") ? whole.length : 1,
    suffix: m[3],
  };
}

/** The display string with the number replaced by `value`, in the original's format. */
export function formatAt(p: ParsedNumber, value: number): string {
  const n = value.toLocaleString("en-US", {
    minimumFractionDigits: p.decimals,
    maximumFractionDigits: p.decimals,
    useGrouping: p.grouped,
    minimumIntegerDigits: p.pad,
  });
  return `${p.prefix}${n}${p.suffix}`;
}

/** Ease-out cubic: fast start, gentle landing. */
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
