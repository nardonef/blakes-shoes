import { ImageResponse } from "next/og";
import { bebasNeue, fontOption } from "@/lib/og-font";
import { getHallOfChampions, getSeasons } from "@/lib/stats-data";

// Link preview image for every page (group chats, iMessage, Slack, etc.).
export const alt = "Blake's Shoes fantasy football league";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const seasons = getSeasons();
  const champs = getHallOfChampions();
  const tagline = `FANTASY FOOTBALL · EST. ${seasons[seasons.length - 1]}`;
  const facts = `${seasons.length} SEASONS · ${champs.length} CHAMPIONS · REIGNING: ${champs[0].manager.toUpperCase()}`;
  const font = await bebasNeue(`BLAKE'S SHOES.${tagline}${facts}`);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#151515",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#f5f5f0",
          fontFamily: font ? "Bebas Neue" : undefined,
        }}
      >
        <div style={{ fontSize: 40, letterSpacing: 6, color: "#6ba57e" }}>{tagline}</div>
        <div style={{ display: "flex", fontSize: 210, lineHeight: 0.9, fontWeight: 700 }}>
          BLAKE&apos;S SHOES<span style={{ color: "#6ba57e" }}>.</span>
        </div>
        <div style={{ display: "flex", fontSize: 44, letterSpacing: 3, color: "#b0b0aa", borderTop: "3px solid #2D5A3D", paddingTop: 28 }}>
          {facts}
        </div>
      </div>
    ),
    { ...size, fonts: fontOption(font) },
  );
}
