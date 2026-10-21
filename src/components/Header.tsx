import Link from "next/link";
import type { Dictionary, Locale } from "@/i18n";
import { telHref } from "@/lib/site";
import { LangSwitch } from "./LangSwitch";
import { Logo } from "./Logo";

export function navItems(locale: Locale, t: Dictionary) {
  return [
    { href: `/${locale}/cars`, label: t.nav.cars },
    { href: `/${locale}/financing`, label: t.nav.financing },
    { href: `/${locale}/import-process`, label: t.nav.importProcess },
    { href: `/${locale}/warranty`, label: t.nav.warranty },
    { href: `/${locale}/contact`, label: t.nav.contact },
  ];
}

export function Header({ locale, t }: { locale: Locale; t: Dictionary }) {
  const items = navItems(locale, t);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="container-page flex items-center justify-between gap-5 py-4">
        <Logo locale={locale} />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex gap-7 text-sm tracking-wide">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-mute transition-colors hover:text-ivory">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <LangSwitch locale={locale} />
          <a href={telHref()} className="btn-gold hidden !min-h-11 !px-5 !text-sm sm:inline-flex">
            {t.nav.callUs}
          </a>

          {/* Mobile menu: native <details>, works without JavaScript */}
          <details className="group relative lg:hidden">
            <summary
              className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full border border-line [&::-webkit-details-marker]:hidden"
              aria-label={t.nav.menu}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path className="group-open:hidden" d="M4 7h16M4 12h16M4 17h16" />
                <path className="hidden group-open:block" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 top-14 w-64 rounded-2xl border border-line bg-ink-2 p-3 shadow-2xl"
            >
              <ul className="flex flex-col">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="block rounded-xl px-4 py-3 text-ivory hover:bg-ink-3">
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={`/${locale}/loan-calculator`} className="block rounded-xl px-4 py-3 text-ivory hover:bg-ink-3">
                    {t.nav.loan}
                  </Link>
                </li>
                <li className="mt-2">
                  <a href={telHref()} className="btn-gold w-full">
                    {t.nav.callUs}
                  </a>
                </li>
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
