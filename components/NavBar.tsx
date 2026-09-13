"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/rules", label: "Rules" },
  { href: "/legacy", label: "Legacy" },
  { href: "/stats", label: "Stats" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 md:px-16">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
          >
            BLAKE&apos;S SHOES
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-2">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                    isActive ? "text-white" : "text-gray-700 hover:text-gray-900"
                  }`}
                  style={isActive ? { background: "var(--accent)" } : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
