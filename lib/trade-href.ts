// Client-safe: link to one trade in the Rosters trade log.
export const tradeHref = (id: string) => `/rosters?tab=trades&trade=${id}#${id}`;
