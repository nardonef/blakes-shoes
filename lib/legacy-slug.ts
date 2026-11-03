// Client-safe: /legacy manager card anchors. lib/legacy-data.ts is server-only (it reads lineups).

// URL-safe anchor slug for a manager's display name, e.g. "Jake Slagle" -> "mgr-jake-slagle".
export function slug(name: string): string {
  return "mgr-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
