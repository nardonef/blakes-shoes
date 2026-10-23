"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface Props {
  label: string;
  param: string;
  value: string;
  options: { value: string; label: string }[];
  /** Params cleared when this one changes (e.g. a new season drops the selected week). */
  resets?: string[];
  className?: string;
}

export default function RostersSelect({ label, param, value, options, resets = [], className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(param, next);
    for (const r of resets) params.delete(r);
    router.push(`${pathname}?${params}`, { scroll: false });
  }

  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span
        className="text-[11px] font-semibold tracking-[.12em] text-[#6b6b63]"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 px-3 border border-[#d6d6cc] bg-white text-[15px] font-semibold text-[#151515]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
