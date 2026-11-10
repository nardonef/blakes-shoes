// Big Pete's draft order announcements, one per draft season (2025 came in two parts), newest first.
// Files live in public/big-pete/ (re-encoded H.264, all metadata stripped, poster frame alongside).
// Found by scanning Peter Klensch's GroupMe videos and confirmed from the chat's replies; videos
// without likes are originals Frank supplied, dated by the phone's recording timestamp.

export type DraftOrderVideo = {
  slug: string; // file name in public/big-pete/
  season: number;
  date: string; // ISO date, US Eastern: when posted to GroupMe, or recorded for supplied files
  part?: string;
  caption?: string; // Peter's message text, links removed
  likes?: number; // GroupMe likes; absent for videos never posted to the chat
  width: number;
  height: number;
  seconds: number;
};

export const DRAFT_ORDER_VIDEOS: DraftOrderVideo[] = [
  { slug: "2026-08-08", season: 2026, date: "2026-08-08", width: 320, height: 568, seconds: 142 },
  { slug: "2025-08-18-b", season: 2025, date: "2025-08-18", part: "Part 2", likes: 5, width: 540, height: 960, seconds: 159 },
  { slug: "2025-08-18-a", season: 2025, date: "2025-08-18", part: "Part 1", likes: 5, width: 540, height: 960, seconds: 130 },
  { slug: "2024-08-19", season: 2024, date: "2024-08-19", likes: 7, width: 320, height: 568, seconds: 171 },
  { slug: "2023-08-24", season: 2023, date: "2023-08-24", likes: 3, width: 320, height: 568, seconds: 160 },
  { slug: "2022-08-15", season: 2022, date: "2022-08-15", width: 540, height: 960, seconds: 107 },
  { slug: "2021-08-01", season: 2021, date: "2021-08-01", width: 540, height: 960, seconds: 103 },
  { slug: "2020-07-27", season: 2020, date: "2020-07-27", likes: 3, width: 320, height: 568, seconds: 52 },
  { slug: "2019-07-01", season: 2019, date: "2019-07-01", likes: 3, width: 960, height: 540, seconds: 47 },
  { slug: "2018-05-27", season: 2018, date: "2018-05-27", width: 540, height: 960, seconds: 49 },
  { slug: "2017-07-17", season: 2017, date: "2017-07-17", likes: 5, width: 540, height: 960, seconds: 36 },
  {
    slug: "2016-07-22",
    season: 2016,
    date: "2016-07-22",
    caption: "Happy fantasy football season fellas. Get mocking",
    likes: 0,
    width: 540,
    height: 960,
    seconds: 67,
  },
];

export const videoSrc = (v: DraftOrderVideo) => `/big-pete/${v.slug}.mp4`;
export const posterSrc = (v: DraftOrderVideo) => `/big-pete/${v.slug}.jpg`;

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
