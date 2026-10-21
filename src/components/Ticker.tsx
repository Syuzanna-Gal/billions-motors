import Link from "next/link";
import type { Dictionary, Locale } from "@/i18n";
import { vehicleName } from "@/lib/format";
import type { Vehicle } from "@/lib/types";

/**
 * Endless strip of latest cars and selling points. The list is rendered twice
 * so the -50% animation loops without a jump; hovering pauses it.
 */
export function Ticker({ cars, locale, t }: { cars: Vehicle[]; locale: Locale; t: Dictionary }) {
  const items: { key: string; label?: string; text: string; href?: string }[] = [];
  cars.forEach((car, i) => {
    items.push({ key: `car-${car.id}`, label: t.status[car.status], text: vehicleName(car), href: `/${locale}/cars/${car.slug}` });
    const point = t.ticker[i % t.ticker.length];
    if (i < t.ticker.length) items.push({ key: `pt-${i}`, text: point });
  });

  const row = (copy: number) =>
    items.map((item) => (
      <li key={`${copy}-${item.key}`} className="flex shrink-0 items-center gap-3 px-7 text-sm" aria-hidden={copy === 1 || undefined}>
        <span className="size-1.5 rotate-45 bg-gold-mid" aria-hidden="true" />
        {item.label && <span className="text-[11px] uppercase tracking-[0.2em] text-gold-mid">{item.label}</span>}
        {item.href ? (
          <Link href={item.href} tabIndex={copy === 1 ? -1 : undefined} className="text-ivory hover:text-gold">
            {item.text}
          </Link>
        ) : (
          <span className="text-mute">{item.text}</span>
        )}
      </li>
    ));

  return (
    <div className="marquee relative overflow-hidden border-y border-line bg-ink-2/70 py-4">
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink to-transparent" />
      <ul className="marquee-track flex w-max">
        {row(0)}
        {row(1)}
      </ul>
    </div>
  );
}
