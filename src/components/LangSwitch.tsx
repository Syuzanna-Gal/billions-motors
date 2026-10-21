"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { localeLabels, locales, type Locale } from "@/i18n/config";

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
