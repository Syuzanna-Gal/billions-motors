"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/*
 * Light / dark switch. The theme lives on <html data-theme>: set before the first paint by
 * THEME_SCRIPT (the visitor's saved choice, else their device setting), changed here and saved.
 * Which icon shows is pure CSS (`light:`), so the server-rendered button never mismatches.
 */

export const THEME_KEY = "bm-theme";
const BG = { dark: "#0b0b0c", light: "#f6f1e7" } as const;

/** Runs in <head> before the page is painted, so there's no flash of the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");
if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";
document.documentElement.dataset.theme=t;}catch(e){}})();`;

/** This visit's choice, for when the browser won't let us save it (private mode). */
let chosen: "light" | "dark" | null = null;

/** The visitor's choice, else the device setting. */
function preferred(): "light" | "dark" {
  if (chosen) return chosen;
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "light" || t === "dark") return t;
  } catch {
    /* storage blocked */
  }
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/**
 * Switching language swaps the whole <html> (a new root layout) without a page load, so the
 * head script doesn't run again. This puts the theme back before the new page is painted.
 */
export function ThemeSync() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    const t = preferred();
    if (document.documentElement.dataset.theme !== t) document.documentElement.dataset.theme = t;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BG[t]);
  }, [pathname]);
  return null;
}

export function ThemeToggle({ toLight, toDark }: { toLight: string; toDark: string }) {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    chosen = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode: the choice lasts for this page only */
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BG[next]);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex size-11 flex-none items-center justify-center rounded-full border border-line text-mute transition-colors hover:border-gold/50 hover:text-ivory"
    >
      {/* In dark mode: a sun ("switch to light"); in light mode: a moon. */}
      <span className="light:hidden">
        <span className="sr-only">{toLight}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </span>
      <span className="hidden light:inline">
        <span className="sr-only">{toDark}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" />
        </svg>
      </span>
    </button>
  );
}
