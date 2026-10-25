import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { countNewLeads } from "@/lib/admin/leads";
import { logoutAction } from "../actions";
import { Flash } from "../_components/Flash";
import { NavLink } from "../_components/NavLink";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const full = user.role === "FULL";
  const newLeads = full ? await countNewLeads() : 0;

  const items = [
    { href: "/admin/sell", label: "Sell a car" },
    ...(full
      ? [
          { href: "/admin/cars", label: "Cars" },
          { href: "/admin/leads", label: newLeads ? `Requests (${newLeads} new)` : "Requests" },
          { href: "/admin/contact", label: "Contact info" },
          { href: "/admin/texts", label: "Site texts" },
          { href: "/admin/users", label: "Users" },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="border-b border-line bg-ink-2 lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4 p-5 lg:block">
          <Link href="/admin" aria-label="Admin home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-horizontal.svg" alt="Billions Motors" className="h-9 w-auto" />
          </Link>
          <p className="text-xs text-mute-2 lg:mt-3">
            {user.name || user.email} · <span className="text-gold-mid">{full ? "Full" : "Sales"}</span>
          </p>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3">
          {items.map((i) => (
            <NavLink key={i.href} href={i.href}>{i.label}</NavLink>
          ))}
          <a href="/hy" target="_blank" rel="noopener" className="whitespace-nowrap rounded-xl px-3 py-2.5 text-sm text-mute hover:bg-ink-3 hover:text-ivory">
            View site ↗
          </a>
          <form action={logoutAction}>
            <button type="submit" className="w-full whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm text-mute hover:bg-ink-3 hover:text-ivory">
              Sign out
            </button>
          </form>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-5 sm:p-8">
        <Suspense>
          <Flash />
        </Suspense>
        {children}
      </main>
    </div>
  );
}
