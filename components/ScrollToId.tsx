"use client";

import { useEffect } from "react";

/**
 * Scrolls the element with this id into view. In-app links ("…#id") don't jump to their anchor after
 * a client-side navigation, so pages that focus one item (the trade log's ?trade=) render this.
 */
export default function ScrollToId({ id }: { id: string }) {
  useEffect(() => {
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [id]);
  return null;
}
