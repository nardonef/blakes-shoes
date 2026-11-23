// Bebas Neue for next/og images (icons, link previews). ImageResponse needs a TTF/OTF, so this asks
// Google Fonts for just the glyphs used. Returns null if the fetch fails so the build falls back to
// next/og's default font instead of breaking.
export async function bebasNeue(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Bebas+Neue&text=${encodeURIComponent(text)}`)).text();
    const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    // A non-font response (an error page, WOFF2) crashes next/og's renderer and fails the build.
    return isTtfOrOtf(data) ? data : null;
  } catch {
    return null;
  }
}

/** TrueType (0x00010000 or "true") or OpenType ("OTTO") magic bytes. */
export function isTtfOrOtf(data: ArrayBuffer): boolean {
  if (data.byteLength < 4) return false;
  const tag = new DataView(data).getUint32(0);
  return tag === 0x00010000 || tag === 0x74727565 || tag === 0x4f54544f;
}

export const fontOption = (data: ArrayBuffer | null) =>
  data ? [{ name: "Bebas Neue", data, style: "normal" as const, weight: 400 as const }] : undefined;
