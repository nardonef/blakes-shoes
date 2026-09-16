"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getSeasons, getHallOfChampions } from "@/lib/stats-data";

// Data structure matching the mockup
const owners = [
  { name: "Tyler Falcone", team: "Jone crib", image: "/owners/falcone.jpg" },
  { name: "Blake Kozloski", team: "Wizards of Koz", image: "/owners/blake.jpg" },
  { name: "Eric Rios", team: "The Hullabaloos", image: "/owners/rios.jpg" },
  { name: "Ryan Jenks", team: "Brianna's Red Carpet", image: "/owners/jenks.jpg" },
  { name: "Frankie Nardone", team: "Peter is Corrupt", image: "/owners/frankie.jpg" },
  { name: "Matt Borba", team: "Not Popular Boys", image: "/owners/borba.jpg" },
  { name: "Jake Slagle", team: "POSTGRADAPARTMENTS.COM", image: "/owners/jake.jpg" },
  { name: "Bryan Yatsko", team: "Bryan Yatsko's Team", image: "/owners/yatsko.jpg" },
  { name: "Ryan Curran", team: "Loose Cannons", image: "/owners/curran.jpg" },
  { name: "Peter Klensch", team: "All Business Pete", image: "/owners/peter.jpg" },
  { name: "Anthony Bove", team: "Anthony's Nifty Team", image: "/owners/anthony.jpg" },
  { name: "Ryan Kaplan", team: "Jew Crew", image: "/owners/kaplan.jpg" },
];

const currentChampion = {
  year: 2025,
  name: "Tyler Falcone",
  team: "Jone crib",
  avatar: "/owners/falcone.jpg",
  record: "9-5",
  avgPoints: "107.1",
  titleNo: "01",
};

export default function Home() {
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date("November 22, 2026").getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance > 0) {
        setCountdown({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const seasonCount = getSeasons().length;
  const champions = getHallOfChampions();

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Masthead */}
      <header className="bg-[#151515] text-[#f5f5f0] text-center px-4 md:px-10 pt-10 md:pt-[60px] pb-9 md:pb-12">
        <div className="flex items-center justify-center gap-3.5 mb-4 flex-wrap">
          <span className="w-4 md:w-8 h-0.5 bg-[var(--accent-light)]" />
          <span
            className="text-[9.5px] md:text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            FANTASY FOOTBALL LEAGUE
          </span>
          <span className="w-4 md:w-8 h-0.5 bg-[var(--accent-light)]" />
        </div>
        <h1
          className="text-[58px] md:text-[124px] leading-[.86] tracking-[-.01em] mb-5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          BLAKE&apos;S SHOES
        </h1>
        <div
          className="flex justify-center flex-wrap text-[10px] md:text-[12px] tracking-[.1em] text-[#d4d4d0]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <span className="px-3 md:px-[22px] py-1 border-r border-[#3a3a38]">
            <b className="text-white">12</b> TEAMS
          </span>
          <span className="px-3 md:px-[22px] py-1 border-r border-[#3a3a38]">
            <b className="text-white">{seasonCount}</b> SEASONS
          </span>
          <span className="px-3 md:px-[22px] py-1">
            EST. <b className="text-white">2012</b>
          </span>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-7 md:py-11 pb-14 md:pb-[88px] flex flex-col gap-8 md:gap-12">
        {/* Champion band */}
        <section className="bg-[var(--accent)] text-[#f5f5f0] grid grid-cols-1 sm:grid-cols-2">
          <div className="p-[26px] md:p-[34px] flex flex-col items-center gap-4 border-b sm:border-b-0 sm:border-r border-white/[.18]">
            <div className="w-[118px] h-[118px] md:w-[152px] md:h-[152px] rounded-full overflow-hidden border-[3px] border-[#f5f5f0] relative">
              <Image
                src={currentChampion.avatar}
                alt={currentChampion.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="text-center">
              <div
                className="text-[26px] md:text-[32px] leading-[1.05]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {currentChampion.name.toUpperCase()}
              </div>
              <div
                className="text-[11px] tracking-[.16em] text-[var(--accent-pale)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {currentChampion.team.toUpperCase()}
              </div>
            </div>
          </div>
          <div className="p-[26px] md:p-[34px] flex flex-col justify-center gap-5 md:gap-[26px]">
            <div>
              <div
                className="text-[9.5px] md:text-[11px] font-semibold tracking-[.3em] text-[var(--accent-pale)] mb-1.5"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {currentChampion.year} SEASON
              </div>
              <div
                className="text-[50px] md:text-[78px] leading-[.88]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                LEAGUE CHAMPION
              </div>
            </div>
            <div className="grid grid-cols-3 border-t border-white/[.22] gap-3 md:gap-6">
              <div className="pt-[18px]">
                <div
                  className="text-[10px] tracking-[.16em] text-[var(--accent-pale)] mb-1"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  RECORD
                </div>
                <div className="text-[32px] md:text-[44px] leading-none" style={{ fontFamily: "var(--font-display)" }}>
                  {currentChampion.record}
                </div>
              </div>
              <div className="pt-[18px] border-l border-white/[.22] pl-3 md:pl-6">
                <div
                  className="text-[10px] tracking-[.16em] text-[var(--accent-pale)] mb-1"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  AVG POINTS
                </div>
                <div className="text-[32px] md:text-[44px] leading-none" style={{ fontFamily: "var(--font-display)" }}>
                  {currentChampion.avgPoints}
                </div>
              </div>
              <div className="pt-[18px] border-l border-white/[.22] pl-3 md:pl-6">
                <div
                  className="text-[10px] tracking-[.16em] text-[var(--accent-pale)] mb-1"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  TITLE NO.
                </div>
                <div className="text-[32px] md:text-[44px] leading-none" style={{ fontFamily: "var(--font-display)" }}>
                  {currentChampion.titleNo}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trade deadline + Next up */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-[26px]">
          <section className="bg-[#151515] text-[#f5f5f0] p-[22px] md:p-[30px]">
            <div className="flex items-baseline justify-between gap-3 mb-5 flex-wrap">
              <h3 className="text-[26px] md:text-[36px]" style={{ fontFamily: "var(--font-display)" }}>
                TRADE DEADLINE
              </h3>
              <span
                className="text-[11px] tracking-[.14em] text-[var(--muted-dark)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                NOV 22, 2026
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 md:gap-2.5">
              {[
                { value: countdown.days, label: "DAYS" },
                { value: countdown.hours, label: "HRS" },
                { value: countdown.minutes, label: "MIN" },
                { value: countdown.seconds, label: "SEC" },
              ].map((item) => (
                <div key={item.label} className="bg-[var(--panel)] text-center py-2.5 md:py-[15px]">
                  <div
                    className="text-[32px] md:text-[52px] leading-none text-[var(--accent-light)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {String(item.value).padStart(2, "0")}
                  </div>
                  <div
                    className="text-[9.5px] tracking-[.18em] text-[var(--muted-dark)] mt-1"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-[22px] md:p-[30px] border-l-[3px] border-[var(--accent)]">
            <div className="flex items-baseline justify-between gap-3 mb-5 flex-wrap">
              <h3 className="text-[26px] md:text-[36px] text-[#151515]" style={{ fontFamily: "var(--font-display)" }}>
                NEXT UP
              </h3>
              <span
                className="text-[11px] tracking-[.14em] text-[var(--muted-light)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                2026 CALENDAR
              </span>
            </div>
            <div className="flex items-center gap-4 md:gap-[22px]">
              <div className="w-[78px] h-[78px] bg-[#151515] text-white flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] tracking-[.16em] text-[var(--accent-light)]" style={{ fontFamily: "var(--font-mono)" }}>
                  SEPT
                </span>
                <span className="text-[38px] leading-[.9]" style={{ fontFamily: "var(--font-display)" }}>
                  5
                </span>
              </div>
              <div>
                <div className="text-[24px] md:text-[30px] text-[#151515] leading-none" style={{ fontFamily: "var(--font-display)" }}>
                  DRAFT DAY
                </div>
                <div
                  className="text-[11px] tracking-[.1em] text-[#5a5a56] mt-2"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  3:00 PM &middot; LOCATION TBD
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Hall of Champions */}
        <section>
          <div className="flex items-center gap-4 mb-5">
            <h2 className="text-[32px] md:text-[46px] text-[#151515]" style={{ fontFamily: "var(--font-display)" }}>
              HALL OF CHAMPIONS
            </h2>
            <span className="flex-1 h-0.5 bg-[#151515]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-11">
            {champions.map((c) => (
              <div
                key={c.year}
                className="flex items-baseline gap-2.5 md:gap-4 py-[11px] border-b border-[var(--rule)]"
              >
                <span
                  className="text-[24px] md:text-[29px] text-[var(--accent)] w-[58px] shrink-0"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {c.year}
                </span>
                <span className="text-sm font-semibold text-[#151515]">{c.manager}</span>
                <span
                  className="text-[10.5px] text-[var(--muted-light)] ml-auto text-right"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {c.team}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* The Owners */}
        <section>
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <h2 className="text-[32px] md:text-[46px] text-[#151515]" style={{ fontFamily: "var(--font-display)" }}>
              THE OWNERS
            </h2>
            <span className="flex-1 min-w-[20px] h-0.5 bg-[#151515]" />
            <span
              className="text-[11px] tracking-[.14em] text-[var(--muted-light)]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              2025 SEASON
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0.5 bg-[var(--rule)]">
            {owners.map((owner) => (
              <div
                key={owner.name}
                className="bg-[var(--background)] p-4 md:p-5 flex items-center gap-3.5"
              >
                <div className="w-[58px] h-[58px] rounded-full overflow-hidden shrink-0 bg-[var(--rule)] relative">
                  <Image src={owner.image} alt={owner.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-bold text-[#151515]">{owner.name}</div>
                  <div
                    className="text-[10px] tracking-[.06em] text-[var(--muted-light)] truncate"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {owner.team.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
