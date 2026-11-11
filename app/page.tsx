import Image from "next/image";
import Link from "next/link";
import { getSeasons, getHallOfChampions } from "@/lib/stats-data";
import { slug } from "@/lib/legacy-slug";
import Countdown from "@/components/Countdown";
import CountUp from "@/components/CountUp";
import Masthead from "@/components/Masthead";
import ChampionsReel from "@/components/ChampionsReel";
import LeagueRace from "@/components/LeagueRace";
import { getLeagueRace } from "@/lib/league-race-data";
import { deadlineLabel, getTradeDeadline } from "@/lib/trade-deadline";

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
  const deadline = getTradeDeadline();

  const seasonCount = getSeasons().length;
  const champions = getHallOfChampions();
  const titleCounts = new Map<string, number>();
  champions.forEach((c) => titleCounts.set(c.manager, (titleCounts.get(c.manager) ?? 0) + 1));

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Masthead, with the champions reel along its bottom */}
      <Masthead seasonCount={seasonCount}>
        <ChampionsReel
          champions={champions.map((c) => ({
            year: c.year,
            manager: c.manager,
            image: owners.find((o) => o.name === c.manager)?.image ?? null,
          }))}
        />
      </Masthead>

      <LeagueRace race={getLeagueRace()} />

      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-7 md:py-11 pb-14 md:pb-[88px] flex flex-col gap-8 md:gap-12">
        {/* Champion band */}
        <section data-reveal="" className="relative overflow-hidden bg-[var(--accent)] text-[#f5f5f0] grid grid-cols-1 sm:grid-cols-2">
          <div
            data-sweep=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-[40%] bg-[linear-gradient(100deg,transparent,rgb(255_255_255/0.10),transparent)]"
          />
          <div className="p-[26px] md:p-[34px] flex flex-col items-center gap-4 border-b sm:border-b-0 sm:border-r border-white/[.18]">
            <div data-pop="" className="w-[118px] h-[118px] md:w-[152px] md:h-[152px] rounded-full overflow-hidden border-[3px] border-[#f5f5f0] relative">
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
                style={{ fontFamily: "var(--font-bebas-neue)" }}
              >
                {currentChampion.name.toUpperCase()}
              </div>
              <div
                className="text-[11px] tracking-[.16em] text-[var(--accent-pale)]"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {currentChampion.team.toUpperCase()}
              </div>
            </div>
          </div>
          <div className="p-[26px] md:p-[34px] flex flex-col justify-center gap-5 md:gap-[26px]">
            <div>
              <div
                className="text-[9.5px] md:text-[11px] font-semibold tracking-[.3em] text-[var(--accent-pale)] mb-1.5"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {currentChampion.year} SEASON
              </div>
              <div
                className="text-[50px] md:text-[78px] leading-[.88]"
                style={{ fontFamily: "var(--font-bebas-neue)" }}
              >
                LEAGUE CHAMPION
              </div>
            </div>
            <div className="grid grid-cols-3 border-t border-white/[.22] gap-3 md:gap-6">
              <div className="pt-[18px]">
                <div
                  className="text-[10px] tracking-[.16em] text-[var(--accent-pale)] mb-1"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  RECORD
                </div>
                <div className="text-[32px] md:text-[44px] leading-none" style={{ fontFamily: "var(--font-bebas-neue)" }}>
                  {currentChampion.record}
                </div>
              </div>
              <div className="pt-[18px] border-l border-white/[.22] pl-3 md:pl-6">
                <div
                  className="text-[10px] tracking-[.16em] text-[var(--accent-pale)] mb-1"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  AVG POINTS
                </div>
                <div className="text-[32px] md:text-[44px] leading-none" style={{ fontFamily: "var(--font-bebas-neue)" }}>
                  <CountUp text={currentChampion.avgPoints} delay={400} duration={1000} />
                </div>
              </div>
              <div className="pt-[18px] border-l border-white/[.22] pl-3 md:pl-6">
                <div
                  className="text-[10px] tracking-[.16em] text-[var(--accent-pale)] mb-1"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  TITLE NO.
                </div>
                <div className="text-[32px] md:text-[44px] leading-none" style={{ fontFamily: "var(--font-bebas-neue)" }}>
                  <CountUp text={currentChampion.titleNo} delay={400} duration={1000} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trade deadline + Next up */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-[26px]">
          <section data-reveal="" style={{ "--i": 0 } as React.CSSProperties} className="bg-[#151515] text-[#f5f5f0] p-[22px] md:p-[30px]">
            <div className="flex items-baseline justify-between gap-3 mb-5 flex-wrap">
              <h3 className="text-[26px] md:text-[36px]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
                TRADE DEADLINE
              </h3>
              <span
                className="text-[11px] tracking-[.14em] text-[var(--muted-dark)]"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {deadlineLabel(deadline.date)}
              </span>
            </div>
            <Countdown at={deadline.at} />
          </section>

          <section data-reveal="" style={{ "--i": 1 } as React.CSSProperties} className="bg-white p-[22px] md:p-[30px] border-l-[3px] border-[var(--accent)]">
            <div className="flex items-baseline justify-between gap-3 mb-5 flex-wrap">
              <h3 className="text-[26px] md:text-[36px] text-[#151515]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
                NEXT UP
              </h3>
              <span
                className="text-[11px] tracking-[.14em] text-[var(--muted-light)]"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                2027 CALENDAR
              </span>
            </div>
            <div className="flex items-center gap-4 md:gap-[22px]">
              <div className="w-[78px] h-[78px] bg-[#151515] text-white flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] tracking-[.16em] text-[var(--accent-light)]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                  JUNE
                </span>
                <span className="text-[38px] leading-[.9]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
                  1
                </span>
              </div>
              <div>
                <div className="text-[24px] md:text-[30px] text-[#151515] leading-none" style={{ fontFamily: "var(--font-bebas-neue)" }}>
                  J1 MEETING
                </div>
                <div
                  className="text-[11px] tracking-[.1em] text-[#5a5a56] mt-2"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  TIME TBD &middot; LOCATION TBD
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Hall of Champions */}
        <section>
          <div className="flex items-center gap-4 mb-5">
            <h2 data-reveal="" className="text-[32px] md:text-[46px] text-[#151515]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
              HALL OF CHAMPIONS
            </h2>
            <span data-bar="" className="flex-1 h-0.5 bg-[#151515] origin-left" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-11">
            {champions.map((c, index) => {
              const champOwner = owners.find((o) => o.name === c.manager);
              return (
                <div
                  key={c.year}
                  data-reveal=""
                  style={{ "--i": Math.floor(index / 2) } as React.CSSProperties}
                  className="flex items-center gap-3 md:gap-4 py-2.5 border-b border-[var(--rule)]"
                >
                  <div className="w-[44px] h-[44px] md:w-[50px] md:h-[50px] rounded-full overflow-hidden shrink-0 relative bg-[var(--accent)]">
                    {champOwner ? (
                      <Image src={champOwner.image} alt={c.manager} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span
                          className="text-[18px] text-[#f5f5f0]"
                          style={{ fontFamily: "var(--font-bebas-neue)" }}
                        >
                          {c.manager.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span
                    className="text-[22px] md:text-[26px] text-[var(--accent)] w-[46px] shrink-0"
                    style={{ fontFamily: "var(--font-bebas-neue)" }}
                  >
                    {c.year}
                  </span>
                  <span className="text-[15px] font-semibold text-[#151515]">{c.manager}</span>
                  {(titleCounts.get(c.manager) ?? 0) > 1 && (
                    <span
                      className="text-[9.5px] font-semibold tracking-[.08em] text-[var(--accent)]"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      ×{titleCounts.get(c.manager)}
                    </span>
                  )}
                  <span
                    className="text-[10.5px] text-[var(--muted-light)] ml-auto text-right"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {c.team}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* The Owners */}
        <section>
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <h2 data-reveal="" className="text-[32px] md:text-[46px] text-[#151515]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
              THE OWNERS
            </h2>
            <span data-bar="" className="flex-1 min-w-[20px] h-0.5 bg-[#151515] origin-left" />
            <span
              className="text-[11px] tracking-[.14em] text-[var(--muted-light)]"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              TAP FOR SCOUTING REPORT
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0.5 bg-[var(--rule)]">
            {owners.map((owner, index) => (
              <Link
                key={owner.name}
                data-reveal=""
                style={{ "--i": index % 3 } as React.CSSProperties}
                href={`/legacy#${slug(owner.name)}`}
                className="bg-[var(--background)] hover:bg-white transition-colors duration-150 p-5 md:p-6 min-h-12 flex items-center gap-4 md:gap-5"
              >
                <div className="w-[88px] h-[88px] md:w-[104px] md:h-[104px] rounded-full overflow-hidden shrink-0 bg-[var(--rule)] relative">
                  <Image src={owner.image} alt={owner.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-[16px] md:text-[17px] font-bold text-[#151515]">{owner.name}</div>
                  <div
                    className="text-[10.5px] tracking-[.06em] text-[var(--muted-light)] truncate"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {owner.team.toUpperCase()}
                  </div>
                </div>
                <span
                  className="text-[13px] text-[var(--accent)] ml-auto shrink-0"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  ›
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Feedback CTA */}
        <section data-reveal="">
          <Link
            href="/feedback"
            className="bg-[var(--accent)] text-[#f5f5f0] p-6 md:p-9 min-h-12 flex items-center justify-between gap-4 hover:opacity-90 transition-opacity duration-150"
          >
            <div>
              <div
                className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-pale)] mb-2"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                GOT FEEDBACK?
              </div>
              <div
                className="text-[30px] md:text-[44px] leading-none"
                style={{ fontFamily: "var(--font-bebas-neue)" }}
              >
                TELL THE COMMISH
              </div>
            </div>
            <span
              className="text-[22px] shrink-0"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              ›
            </span>
          </Link>
        </section>
      </main>
    </div>
  );
}
