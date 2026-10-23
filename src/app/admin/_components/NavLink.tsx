"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname()?.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition-colors ${
        active ? "bg-ivory font-semibold text-ink" : "text-mute hover:bg-ink-3 hover:text-ivory"
      }`}
    >
      {children}
    </Link>
  );
}
