"use client";

import { useEffect } from "react";
import ArcadeMode from "@/components/ArcadeMode";

const SELECTOR = "[data-reveal], [data-bar]";
const EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
const POP = "cubic-bezier(0.34, 1.56, 0.64, 1)";

/**
 * Site-wide scroll reveals. globals.css holds [data-reveal] and [data-bar] elements in their start
 * state; the first time one scrolls into view this plays its entrance with the Web Animations API,
 * whose end state then sticks. Nothing is written to the DOM's attributes, so React hydration and
 * re-renders never disagree with it. Watches for elements added later, such as a new tab's content.
 */
export default function Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const play = (el: Element) => {
      if (el.matches("[data-bar]")) {
        el.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 800, easing: EASE, fill: "forwards" });
        return;
      }
      const i = Math.min(Number(getComputedStyle(el).getPropertyValue("--i")) || 0, 8);
      el.animate(
        [
          { opacity: 0, transform: "translateY(14px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 500, delay: i * 60, easing: EASE, fill: "both" },
      );
      // Extras that play with their revealed parent: data-pop (overshoot pop) and data-sweep
      // (a light sweeping across once).
      el.querySelectorAll("[data-pop]").forEach((p) =>
        p.animate(
          [
            { opacity: 0, transform: "scale(.6) rotate(-8deg)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 750, delay: 200, easing: POP, fill: "both" },
        ),
      );
      el.querySelectorAll("[data-sweep]").forEach((s) =>
        s.animate([{ transform: "translateX(-120%)" }, { transform: "translateX(320%)" }], {
          duration: 1400,
          delay: 500,
          easing: EASE,
          fill: "both",
        }),
      );
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          play(e.target);
        }
      },
      { threshold: 0.15 },
    );
    const watch = (root: ParentNode) => root.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    watch(document);
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches(SELECTOR)) io.observe(n);
          watch(n);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  // The hidden Konami-code Arcade mode rides along with the site-wide motion layer.
  return <ArcadeMode />;
}
