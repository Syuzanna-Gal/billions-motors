import Link from "next/link";
import type { Locale } from "@/i18n";

export function Logo({ locale }: { locale: Locale }) {
  return (
    <Link
      href={`/${locale}`}
      className="text-gold font-serif text-[26px] font-semibold tracking-[0.22em] sm:text-[30px]"
      aria-label="Billions — home"
    >
      BILLIONS
    </Link>
  );
}
