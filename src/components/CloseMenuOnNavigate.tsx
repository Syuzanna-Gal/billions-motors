"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Closes the surrounding <details> mobile menu when the page changes (and on Escape). */
export function CloseMenuOnNavigate() {
  const ref = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.closest("details")?.removeAttribute("open");
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ref.current?.closest("details")?.removeAttribute("open");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return <span ref={ref} hidden />;
}
