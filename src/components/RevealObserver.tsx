"use client";

import { useEffect } from "react";

/*
 * Watches every element marked with `data-reveal` and sets data-reveal="in" when it
 * scrolls into view, which triggers the CSS transition. One observer for the whole page;
 * a MutationObserver picks up elements added later (client navigation, filters).
 * With "reduce motion" turned on in the OS, everything is shown immediately.
 */
export function RevealObserver() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = "in";
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    // Every element not yet shown. Observing an element twice is a no-op, and this also
    // re-attaches after React's dev-mode effect remount (mount → cleanup → mount).
    const scan = () => {
      document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal="in"])').forEach((el) => {
        if (reduce) el.dataset.reveal = "in";
        else io.observe(el);
      });
    };

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
