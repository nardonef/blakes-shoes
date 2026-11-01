// Client-safe: player page URLs are /players/<playerSlug(name)>.
export function playerSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const playerHref = (name: string) => `/players/${playerSlug(name)}`;
