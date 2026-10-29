"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "HOME" },
  { href: "/rules", label: "RULES" },
  { href: "/legacy", label: "LEGACY" },
  { href: "/stats", label: "STATS" },
  { href: "/rosters", label: "ROSTERS" },
  { href: "/draft", label: "DRAFT" },
  { href: "/jobs", label: "JOBS" },
  { href: "/shoesgpt", label: "SHOESGPT" },
  { href: "/feedback", label: "FEEDBACK" },
];

const MONO = { fontFamily: "var(--font-geist-mono)" };

export default function NavBar() {
  const pathname = usePathname();
  // The menu remembers the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const menuOpen = openOn === pathname;

  return (
    <nav
      className="sticky top-0 z-50 bg-[#151515] border-b-[3px] border-[var(--accent)]"
      onKeyDown={(e) => e.key === "Escape" && setOpenOn(null)}
    >
      <div className="max-w-[1160px] mx-auto px-4 md:px-10 flex items-center justify-between">
        <Link
          href="/"
          className="py-3.5 text-[19px] md:text-[24px] tracking-[.02em] text-white"
          style={{ fontFamily: "var(--font-bebas-neue)" }}
        >
          BLAKE&apos;S SHOES
          <span className="text-[var(--accent-light)]">.</span>
        </Link>

        <div className="hidden md:flex items-stretch flex-1 justify-end">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-center px-2 xl:px-[18px] py-4 text-[11px] font-semibold tracking-[.06em] xl:tracking-[.12em] whitespace-nowrap transition-colors duration-150 ${
                  isActive
                    ? "bg-[var(--accent)] text-white"
                    : "text-[#a3a3a0] hover:text-white"
                }`}
                style={MONO}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          className="md:hidden flex items-center gap-2 -mr-2 px-2 min-h-11 text-[12px] font-semibold tracking-[.12em] text-white"
          style={MONO}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setOpenOn(menuOpen ? null : pathname)}
        >
          {menuOpen ? "CLOSE" : "MENU"}
          <span aria-hidden="true" className="text-[16px] leading-none">
            {menuOpen ? "✕" : "☰"}
          </span>
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-nav" className="md:hidden border-t border-[#262624]">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpenOn(null)}
                className={`block px-4 py-3.5 text-[13px] font-semibold tracking-[.12em] border-b border-[#262624] last:border-b-0 ${
                  isActive ? "bg-[var(--accent)] text-white" : "text-[#d6d6cc] hover:text-white"
                }`}
                style={MONO}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
