"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LOCALE_COOKIE, localeLabels, locales, type Locale } from "@/i18n/config";

/** Remembers the visitor's pick for a year, so billions.am opens in it next time. */
const remember = (l: Locale) => {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
};

function Switch({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? `/${locale}`;
  const search = useSearchParams()?.toString();
  const rest = pathname.split("/").slice(2).join("/");

  return (
    <div className="flex rounded-full border border-gold/30 p-[3px] text-xs" role="group" aria-label="Language">
      {locales.map((l) => {
        const active = l === locale;
        const href = `/${l}${rest ? `/${rest}` : ""}${search ? `?${search}` : ""}`;
        return (
          <Link
            key={l}
            href={href}
            hrefLang={l}
            onClick={() => remember(l)}
            aria-current={active ? "true" : undefined}
            className={`flex min-h-9 min-w-11 items-center justify-center rounded-full px-3 transition-colors ${
              active ? "bg-ivory font-semibold text-ink" : "text-mute hover:text-ivory"
            }`}
          >
            {localeLabels[l]}
          </Link>
        );
      })}
    </div>
  );
}

export function LangSwitch({ locale }: { locale: Locale }) {
  return (
    <Suspense fallback={<div className="h-[42px] w-[96px]" />}>
      <Switch locale={locale} />
    </Suspense>
  );
}
