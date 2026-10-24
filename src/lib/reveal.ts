import type { CSSProperties } from "react";

/**
 * Scroll-reveal props. Spread onto any element: `<div {...reveal(100)}>`.
 * The element fades and slides up when it scrolls into view (see RevealObserver
 * and the [data-reveal] rules in globals.css). `delayMs` staggers items in a row.
 */
export function reveal(delayMs = 0): { "data-reveal": string; suppressHydrationWarning: true; style?: CSSProperties } {
  // The early script in the layout may already have set data-reveal="in" before React hydrates.
  const props = { "data-reveal": "", suppressHydrationWarning: true } as const;
  return delayMs ? { ...props, style: { transitionDelay: `${delayMs}ms` } } : props;
}

/** Stagger for grids: items in the same row arrive 100ms apart. */
export const stagger = (index: number, perRow = 3) => (index % perRow) * 100;
