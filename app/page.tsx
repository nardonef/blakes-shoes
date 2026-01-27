"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

// Data structure matching the mockup
const owners = [
  { name: "Tyler Falcone", team: "Jone crib", image: "/placeholder-owner.svg" },
  { name: "Blake Kozloski", team: "Wizards of Koz", image: "/placeholder-owner.svg" },
  { name: "Eric Rios", team: "The Hullabaloos", image: "/placeholder-owner.svg" },
  { name: "Ryan Jenks", team: "Brianna's Red Carpet", image: "/placeholder-owner.svg" },
  { name: "Frankie Nardone", team: "Peter is Corrupt", image: "/placeholder-owner.svg" },
  { name: "Matt Borba", team: "Not Popular Boys", image: "/placeholder-owner.svg" },
  { name: "Jake Slagle", team: "POSTGRADAPARTMENTS.COM", image: "/placeholder-owner.svg" },
  { name: "Bryan Yatsko", team: "Bryan Yatsko's Team", image: "/placeholder-owner.svg" },
  { name: "Ryan Curran", team: "Loose Cannons", image: "/placeholder-owner.svg" },
  { name: "Peter Klensch", team: "All Business Pete", image: "/placeholder-owner.svg" },
  { name: "Anthony Bove", team: "Anthony's Nifty Team", image: "/placeholder-owner.svg" },
  { name: "Ryan Kaplan", team: "Jew Crew", image: "/placeholder-owner.svg" },
];

const championships = [
  { year: 2024, team: "Jone crib - Tyler Falcone" },
  { year: 2024, team: "Brianna's Red Carpet - Ryan Jenks" },
  { year: 2023, team: "Anthony's Nifty Team - Anthony Bove" },
  { year: 2022, team: "Brianna's Red Carpet - Ryan Jenks" },
  { year: 2021, team: "All Business Pete - Peter Klensch" },
  { year: 2020, team: "Mama Juju - Matt Borba" },
  { year: 2019, team: "Bryan Yatsko's Team - Bryan Yatsko" },
  { year: 2018, team: "All Business Pete - Peter Klensch" },
  { year: 2017, team: "Loose Cannons - Ryan Curran" },
  { year: 2016, team: "BearJews - Ryan Kaplan" },
  { year: 2015, team: "Peter is Corrupt - Frank Nardone" },
  { year: 2014, team: "Stacy's Mom - Jake Slagle" },
  { year: 2013, team: "Blake's Best Team - Blake Kozloski" },
  { year: 2012, team: "bigred - Chris Zolner" },

];

const leagueStats = {
  championships: 6,
  teams: 12,
  seasons: 13,
};

const leagueRecords = {
  mostPoints: "2,271",
  highestScoringWeek: "222",
  bestWinPercent: "",
};

const currentChampion = {
  year: 2025,
  name:  "Tyler Falcone",
  team: "Jone crib",
  avatar: "/placeholder-owner.svg",
  record: "9-5",
  avgPoints: "107.1",
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

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  const scrollToOwners = () => {
    const ownersSection = document.getElementById("owners");
    if (ownersSection) {
      ownersSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 md:px-16">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link
              href="/"
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              BLAKE'S SHOES
            </Link>

            {/* Nav Links */}
            <div className="flex items-center gap-6">
              <Link
                href="#owners"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
              >
                Owners
              </Link>
              <Link
                href="#champions"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
              >
                Champions
              </Link>
              <Link
                href="/stats"
                className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors text-white"
                style={{ background: "var(--accent)" }}
              >
                Stats
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 md:px-16 py-12 md:py-16">
        {/* Header Section */}
        <section className="text-center mb-16">
          {/* Subtitle */}
          <p className="text-xs md:text-sm font-semibold tracking-[0.2em] text-gray-500 uppercase mb-3">
            Fantasy Football League
          </p>

          {/* Main Title */}
          <h1
            className="text-6xl md:text-8xl lg:text-9xl font-bold mb-4 tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
          >
            BLAKE'S SHOES
          </h1>

          {/* Stats Line */}
          <p className="text-sm text-gray-500 tracking-wide">
            <span className="font-semibold text-gray-700">{leagueStats.teams}</span> Teams
            <span className="mx-3 text-gray-300">·</span>
            <span className="font-semibold text-gray-700">{leagueStats.seasons + 1}</span> Seasons
            <span className="mx-3 text-gray-300">·</span>
            Est. <span className="font-semibold text-gray-700">2012</span>
          </p>
        </section>

        {/* Champion Showcase Section */}
        <section className="mb-20">
          <div
            className="rounded-xl p-8 md:p-12 relative overflow-hidden"
            style={{ background: "#e8e8e0" }}
          >
            {/* Year Heading */}
            <div className="text-center mb-6">
              <h2
                className="text-5xl md:text-6xl font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
              >
                {currentChampion.year}
              </h2>
            </div>

            {/* Champion Ribbon */}
            <div className="flex justify-center mb-8">
              <div className="ribbon-banner text-2xl md:text-3xl">
                CHAMPION
              </div>
            </div>

            {/* Champion Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {/* Trophy Card */}
              <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="text-7xl mb-4">🏆</div>
                  <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    BLAKE'S SHOES<br />FANTASY FOOTBALL<br />LEAGUE CHAMPION
                  </div>
                </div>
              </div>

              {/* Champion Avatar Card */}
              <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gray-300 overflow-hidden relative">
                    <Image
                      src={currentChampion.avatar}
                      alt={currentChampion.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="font-bold text-gray-800 text-lg mb-1">
                    {currentChampion.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {currentChampion.team}
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="flex flex-col gap-4">
                {/* Record Card */}
                <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                  <div className="text-center">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Record
                    </div>
                    <div
                      className="text-4xl font-bold"
                      style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}
                    >
                      {currentChampion.record}
                    </div>
                  </div>
                </div>

                {/* Avg Points Card */}
                <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                  <div className="text-center">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Regular Season Avg Points
                    </div>
                    <div
                      className="text-4xl font-bold"
                      style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}
                    >
                      {currentChampion.avgPoints}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Top Cards Section */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {/* Trade Deadline Card */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="text-center mb-6">
                <h3
                  className="text-2xl md:text-3xl font-bold mb-2"
                  style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
                >
                  TRADE DEADLINE
                </h3>
                <div className="text-xs text-gray-500">NOVEMBER 22, 2026</div>
              </div>
              <div className="flex justify-center items-center gap-2 md:gap-4">
                {/* Days */}
                <div className="text-center min-w-[60px] md:min-w-[70px]">
                  <div
                    className="text-3xl md:text-5xl font-bold mb-1"
                    style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}
                  >
                    {String(countdown.days).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] md:text-xs font-semibold text-gray-600 uppercase tracking-wide">DAYS</div>
                </div>
                <div className="text-2xl md:text-4xl font-bold text-gray-300 -mt-4">:</div>
                {/* Hours */}
                <div className="text-center min-w-[60px] md:min-w-[70px]">
                  <div
                    className="text-3xl md:text-5xl font-bold mb-1"
                    style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}
                  >
                    {String(countdown.hours).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] md:text-xs font-semibold text-gray-600 uppercase tracking-wide">HRS</div>
                </div>
                <div className="text-2xl md:text-4xl font-bold text-gray-300 -mt-4">:</div>
                {/* Minutes */}
                <div className="text-center min-w-[60px] md:min-w-[70px]">
                  <div
                    className="text-3xl md:text-5xl font-bold mb-1"
                    style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}
                  >
                    {String(countdown.minutes).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] md:text-xs font-semibold text-gray-600 uppercase tracking-wide">MIN</div>
                </div>
                <div className="text-2xl md:text-4xl font-bold text-gray-300 -mt-4">:</div>
                {/* Seconds */}
                <div className="text-center min-w-[60px] md:min-w-[70px]">
                  <div
                    className="text-3xl md:text-5xl font-bold mb-1"
                    style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}
                  >
                    {String(countdown.seconds).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] md:text-xs font-semibold text-gray-600 uppercase tracking-wide">SEC</div>
                </div>
              </div>
            </div>

            {/* Calendar Card */}
            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="mb-6">
                <h3
                  className="text-3xl font-bold mb-6"
                  style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
                >
                  CALENDAR
                </h3>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-xl flex flex-col items-center justify-center shadow-sm">
                    <div className="text-xs font-bold text-gray-600 uppercase mb-1">
                      JUNE
                    </div>
                    <div
                      className="text-3xl font-bold"
                      style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
                    >
                      1
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-800 mb-2 text-lg">
                    Owners Meeting
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">TIME:</span> TBD
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">LOCATION:</span> TBD
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Hall of Champions and League Records Section */}
        <div id="champions" className="flex justify-center mb-20 scroll-mt-20">
          {/* Hall of Champions */}
          <section className="bg-white rounded-xl p-8 shadow-md">
            <h2
              className="text-3xl md:text-4xl font-bold mb-8 uppercase"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              HALL OF CHAMPIONS
            </h2>
            <div className="space-y-4">
              {championships.map((champ, index) => (
                <div
                  key={index}
                  className="flex items-baseline gap-3 pb-3 border-b border-gray-200 last:border-0"
                >
                  <div
                    className="text-2xl font-bold min-w-[60px]"
                    style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}
                  >
                    {champ.year}
                  </div>
                  <div className="text-gray-800 text-sm md:text-base font-medium">
                    {champ.team}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* High Rollers */}
          {/* <section className="bg-white rounded-xl p-8 shadow-md">
            <h2
              className="text-3xl md:text-4xl font-bold mb-8 uppercase"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              2025 HIGH ROLLERS
            </h2>
            <div className="space-y-4">
              {championships.slice(0, 5).map((champ, index) => (
                <div
                  key={index}
                  className="flex items-baseline gap-3 pb-3 border-b border-gray-200 last:border-0"
                >
                  <div
                    className="text-2xl font-bold min-w-[60px]"
                    style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}
                  >
                    {index + 1}
                  </div>
                  <div className="text-gray-800 text-sm md:text-base font-medium">
                    {champ.team}
                  </div>
                </div>
              ))}
            </div>
          </section> */}

          {/* League Records */}
          {/* <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 uppercase">
              LEAGUE RECORDS
            </h2>
            <div className="space-y-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  MOST POINTS IN A SEASON
                </div>
                <div className="text-4xl font-bold text-gray-800">
                  {leagueRecords.mostPoints}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  HIGHEST SCORING WEEK
                </div>
                <div className="text-4xl font-bold text-gray-800">
                  {leagueRecords.highestScoringWeek}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">BEST WIN %</div>
                <div className="text-4xl font-bold text-gray-800">
                  {leagueRecords.bestWinPercent || "—"}
                </div>
              </div>
            </div>
          </section> */}
        </div>

        {/* The Owners Section - 2025 Season */}
        <section id="owners" className="mb-20 scroll-mt-8">
          <h2
            className="text-4xl md:text-5xl font-bold mb-10 uppercase text-center"
            style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
          >
            THE OWNERS
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {owners.map((owner, index) => (
              <div key={index} className="text-center group">
                <div className="w-32 h-32 md:w-36 md:h-36 mx-auto mb-4 rounded-full bg-gray-300 overflow-hidden relative shadow-md hover:shadow-lg transition-all hover:scale-105">
                  <Image
                    src={owner.image}
                    alt={owner.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="text-sm font-bold text-gray-800 mb-1">
                  {owner.name}
                </div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">
                  {owner.team}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Photo Gallery Section */}
        {/* <section>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 uppercase">
            PHOTO GALLERY
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="aspect-video bg-gray-200 rounded border border-gray-300"></div>
            <div className="aspect-video bg-gray-200 rounded border border-gray-300"></div>
          </div>
        </section> */}
      </main>
    </div>
  );
}
