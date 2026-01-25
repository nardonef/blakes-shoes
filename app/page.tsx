"use client";

import { useState, useEffect } from "react";

// Data structure matching the mockup
const owners = [
  { name: "FMa-Javnes", team: "Buckeyes", image: "/placeholder-owner.svg" },
  { name: "Bulldogs", team: "Bulldogs", image: "/placeholder-owner.svg" },
  { name: "Pack Attack", team: "PackParks", image: "/placeholder-owner.svg" },
  { name: "Unit 203", team: "Unit 203", image: "/placeholder-owner.svg" },
  { name: "Snake Eyes", team: "Wilchories", image: "/placeholder-owner.svg" },
  { name: "The Warriors", team: "Rurning Chudias", image: "/placeholder-owner.svg" },
];

const championships = [
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
  seasons: 12,
};

const leagueRecords = {
  mostPoints: "2,271",
  highestScoringWeek: "222",
  bestWinPercent: "",
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
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-7xl mx-auto px-8 md:px-16 py-16 md:py-24">
        {/* Header Section */}
        <section className="text-center mb-24">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-6 uppercase tracking-tight">
            BLAKES SHOES
          </h1>
          {/* <button
            onClick={scrollToOwners}
            className="bg-gray-800 text-white px-8 py-3 rounded hover:bg-gray-700 transition-colors font-medium"
          >
            MEET THE OWNERS
          </button> */}
        </section>
         {/* About The League Section */}
        <section className="hidden min-[500px]:block">
          <div className="flex items-center gap-3">
            {/* <div className="flex items-center gap-3"> */}
              {/* <div className="text-2xl">🏆</div>
              <div>
                <div className="font-semibold text-gray-800">
                  {leagueStats.championships} Championships
                </div>
              </div>
            </div> */}
            <div className="flex items-center gap-3">
              <div className="text-2xl">👥</div>
              <div>
                <div className="font-semibold text-gray-800">
                  {leagueStats.teams} Teams
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-2xl">🏟️</div>
              <div>
                <div className="font-semibold text-gray-800">
                  {leagueStats.seasons + 1} Seasons
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-2xl">📅</div>
              <div>
                <div className="font-semibold text-gray-800">Established 2012</div>
              </div>
            </div>
          </div>
        </section>

        {/* Top Cards Section */}
        <section> 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-24">
            {/* Trade Deadline Card */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold text-gray-800">
                    TRADE DEADLINE
                  </h3>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-800 mb-1">
                    {String(countdown.days).padStart(2, "0")}
                  </div>
                  <div className="text-xs text-gray-600">DAYS</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-800 mb-1">
                    {String(countdown.hours).padStart(2, "0")}
                  </div>
                  <div className="text-xs text-gray-600">HRS</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-800 mb-1">
                    {String(countdown.minutes).padStart(2, "0")}
                  </div>
                  <div className="text-xs text-gray-600">MIN</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-800 mb-1">
                    {String(countdown.seconds).padStart(2, "0")}
                  </div>
                  <div className="text-xs text-gray-600">SEC</div>
                </div>
              </div>
            </div>

            {/* Calendar Card */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  CALENDAR
                </h3>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex flex-col items-center justify-center mb-2">
                    <div className="text-xs font-semibold text-gray-600 mb-1">
                      JUNE
                    </div>
                    <div className="text-2xl font-bold text-gray-800">1</div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 mb-1">
                    Owners Meeting
                  </div>
                  <div className="text-sm text-gray-600">TIME: TBD</div>
                  <div className="text-sm text-gray-600">LOCATION: TBD</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Owners Section */}
        <section id="owners" className="mb-24 scroll-mt-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 uppercase">
            THE OWNERS
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 md:gap-10">
            {owners.map((owner, index) => (
              <div key={index} className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-300 overflow-hidden flex items-center justify-center">
                  <img
                    src={owner.image}
                    alt={owner.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {owner.name}
                </div>
                <div className="text-xs text-gray-600">{owner.team}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Hall of Champions and League Records Section */}
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 mb-24">
          {/* Hall of Champions */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 uppercase">
              HALL OF CHAMPIONS
            </h2>
            <div className="space-y-3">
              {championships.map((champ, index) => (
                <div key={index} className="text-gray-800 text-base md:text-lg">
                  {champ.year} {champ.team}
                </div>
              ))}
            </div>
          </section>

          {/* Hall of Champions */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 uppercase">
              2025 HIGH ROLLERS
            </h2>
            <div className="space-y-3">
              {championships.map((champ, index) => (
                <div key={index} className="text-gray-800 text-base md:text-lg">
                  {champ.year} {champ.team}
                </div>
              ))}
            </div>
          </section>

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
