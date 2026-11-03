// Bebas Neue for next/og images (icons, link previews). ImageResponse needs a TTF/OTF, so this asks
// Google Fonts for just the glyphs used. Returns null if the fetch fails so the build falls back to
// next/og's default font instead of breaking.
export async function bebasNeue(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Bebas+Neue&text=${encodeURIComponent(text)}`)).text();
    const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export const fontOption = (data: ArrayBuffer | null) =>
  data ? [{ name: "Bebas Neue", data, style: "normal" as const, weight: 400 as const }] : undefined;
