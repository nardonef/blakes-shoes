// Videos Peter Klensch, Esq. posted to the league GroupMe, newest first.
// Files live in public/peter-videos/ (re-encoded H.264, all metadata stripped, poster frame alongside).
// Videos without likes came from files Frank supplied rather than the GroupMe pull; their dates
// come from the phone's recording timestamp. 2016-07-22, 2017-07-17 and 2019-07-01 are Frank's
// originals of videos that were also posted to GroupMe (the first two were purged there).

export type PeterVideo = {
  slug: string;
  postedOn: string; // ISO date, US Eastern: when posted, or recorded for supplied files
  part?: string; // when several are from the same day
  caption?: string; // Peter's message text, links removed
  likes?: number; // GroupMe likes; absent for videos never posted to the chat
  width: number;
  height: number;
  seconds: number;
};

export const PETER_VIDEOS: PeterVideo[] = [
  { slug: "2026-08-08", postedOn: "2026-08-08", width: 320, height: 568, seconds: 142 },
  { slug: "2026-03-29", postedOn: "2026-03-29", likes: 8, width: 540, height: 960, seconds: 23 },
  { slug: "2025-08-18-b", postedOn: "2025-08-18", part: "2 of 2", likes: 5, width: 540, height: 960, seconds: 159 },
  { slug: "2025-08-18-a", postedOn: "2025-08-18", part: "1 of 2", likes: 5, width: 540, height: 960, seconds: 130 },
  { slug: "2024-09-27", postedOn: "2024-09-27", likes: 6, width: 320, height: 568, seconds: 8.5 },
  { slug: "2024-08-19", postedOn: "2024-08-19", likes: 7, width: 320, height: 568, seconds: 171 },
  { slug: "2023-08-24", postedOn: "2023-08-24", likes: 3, width: 320, height: 568, seconds: 160 },
  { slug: "2022-08-15", postedOn: "2022-08-15", width: 540, height: 960, seconds: 107 },
  { slug: "2021-08-01", postedOn: "2021-08-01", width: 540, height: 960, seconds: 103 },
  { slug: "2020-07-27", postedOn: "2020-07-27", likes: 3, width: 320, height: 568, seconds: 52 },
  { slug: "2019-07-01", postedOn: "2019-07-01", likes: 3, width: 960, height: 540, seconds: 47 },
  {
    slug: "2018-06-08",
    postedOn: "2018-06-08",
    caption: "By the way don’t give a fuck about the caps but was still pretty wild",
    likes: 3,
    width: 320,
    height: 568,
    seconds: 12,
  },
  { slug: "2018-05-27-b", postedOn: "2018-05-27", part: "2 of 2", likes: 1, width: 320, height: 568, seconds: 14 },
  { slug: "2018-05-27-a", postedOn: "2018-05-27", part: "1 of 2", width: 540, height: 960, seconds: 49 },
  { slug: "2017-07-17", postedOn: "2017-07-17", likes: 5, width: 540, height: 960, seconds: 36 },
  {
    slug: "2016-07-22",
    postedOn: "2016-07-22",
    caption: "Happy fantasy football season fellas. Get mocking",
    likes: 0,
    width: 540,
    height: 960,
    seconds: 67,
  },
];

export const videoSrc = (v: PeterVideo) => `/peter-videos/${v.slug}.mp4`;
export const posterSrc = (v: PeterVideo) => `/peter-videos/${v.slug}.jpg`;

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
