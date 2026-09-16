"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "HOME" },
  { href: "/rules", label: "RULES" },
  { href: "/legacy", label: "LEGACY" },
  { href: "/stats", label: "STATS" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-[#151515] border-b-[3px] border-[var(--accent)]">
      <div className="max-w-[1160px] mx-auto px-4 md:px-10 flex items-center justify-between flex-wrap">
        <Link
          href="/"
          className="py-3.5 text-[19px] md:text-[24px] tracking-[.02em] text-white"
          style={{ fontFamily: "var(--font-bebas-neue)" }}
        >
          BLAKE&apos;S SHOES
          <span className="text-[var(--accent-light)]">.</span>
        </Link>

        <div className="flex items-stretch flex-1 justify-end">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-center min-w-[74px] px-2.5 md:px-[18px] py-4 text-[11px] font-semibold tracking-[.12em] transition-colors duration-150 ${
                  isActive
                    ? "bg-[var(--accent)] text-white"
                    : "text-[#a3a3a0] hover:text-white"
                }`}
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
