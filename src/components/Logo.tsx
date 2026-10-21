import Link from "next/link";
import type { Locale } from "@/i18n";

/*
 * Brand logo (gold versions from the Billions Motors logo set, public/brand/).
 * Header: monogram on phones, horizontal lockup from `sm` up — the thin
 * "MOTORS" line is unreadable below ~40px tall, so small screens get the BM mark.
 */
export function Logo({ locale }: { locale: Locale }) {
  return (
    <Link href={`/${locale}`} aria-label="Billions Motors" className="flex shrink-0 items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-monogram.svg" alt="" width={48} height={42} className="h-10 w-auto sm:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-horizontal.svg" alt="" width={205} height={50} className="hidden h-11 w-auto sm:block" />
    </Link>
  );
}

export function LogoStacked({ locale }: { locale: Locale }) {
  return (
    <Link href={`/${locale}`} aria-label="Billions Motors" className="inline-flex">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-stacked.svg" alt="" width={140} height={128} className="h-28 w-auto" />
    </Link>
  );
}
