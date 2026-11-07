// Videos Peter Klensch, Esq. posted to the league GroupMe, newest first.
// Files live in public/peter-videos/ (re-encoded H.264, poster frame alongside).
// Two older videos (2017-07-17, 2016-07-22) were purged by GroupMe and could not be recovered.

export type PeterVideo = {
  slug: string;
  postedOn: string; // ISO date
  part?: string; // when several were posted the same day
  caption?: string; // Peter's message text, links removed
  likes: number;
  width: number;
  height: number;
  seconds: number;
};

export const PETER_VIDEOS: PeterVideo[] = [
  { slug: "2026-03-29", postedOn: "2026-03-29", likes: 8, width: 540, height: 960, seconds: 23 },
  { slug: "2025-08-19-a", postedOn: "2025-08-19", part: "2 of 2", likes: 5, width: 540, height: 960, seconds: 159 },
  { slug: "2025-08-19-b", postedOn: "2025-08-19", part: "1 of 2", likes: 5, width: 540, height: 960, seconds: 130 },
  { slug: "2024-09-27", postedOn: "2024-09-27", likes: 6, width: 320, height: 568, seconds: 8.5 },
  { slug: "2024-08-20", postedOn: "2024-08-20", likes: 7, width: 320, height: 568, seconds: 171 },
  { slug: "2023-08-25", postedOn: "2023-08-25", likes: 3, width: 320, height: 568, seconds: 160 },
  { slug: "2020-07-27", postedOn: "2020-07-27", likes: 3, width: 320, height: 568, seconds: 52 },
  { slug: "2019-07-01", postedOn: "2019-07-01", likes: 3, width: 568, height: 320, seconds: 47 },
  {
    slug: "2018-06-08",
    postedOn: "2018-06-08",
    caption: "By the way don’t give a fuck about the caps but was still pretty wild",
    likes: 3,
    width: 320,
    height: 568,
    seconds: 12,
  },
  { slug: "2018-05-28", postedOn: "2018-05-28", likes: 1, width: 320, height: 568, seconds: 14 },
];

export const videoSrc = (v: PeterVideo) => `/peter-videos/${v.slug}.mp4`;
export const posterSrc = (v: PeterVideo) => `/peter-videos/${v.slug}.jpg`;

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
