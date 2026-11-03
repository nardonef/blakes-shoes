import { ImageResponse } from "next/og";
import { bebasNeue, fontOption } from "@/lib/og-font";

// Home-screen icon for iOS (which ignores SVG icons).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const font = await bebasNeue("BS.");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#151515",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f5f5f0",
          fontSize: 120,
          fontFamily: font ? "Bebas Neue" : undefined,
          fontWeight: 700,
          paddingTop: 12,
        }}
      >
        BS<span style={{ color: "#6ba57e" }}>.</span>
      </div>
    ),
    { ...size, fonts: fontOption(font) },
  );
}
