import Link from "next/link";
import type { Dictionary, Locale } from "@/i18n";
import { formatAmd, formatNumber, vehicleName } from "@/lib/format";
import type { Vehicle } from "@/lib/types";
import { CarPhoto } from "./CarPhoto";
import { StatusBadge } from "./StatusBadge";

export function CarCard({ car, locale, t }: { car: Vehicle; locale: Locale; t: Dictionary }) {
  const name = vehicleName(car);
  const href = `/${locale}/cars/${car.slug}`;
  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-ink-2 transition-[transform,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-gold/40 hover:shadow-[0_24px_60px_-30px_rgb(230_207_158/0.35)]">
      <div className="relative aspect-[16/10] overflow-hidden">
        <CarPhoto image={car.images[0]} alt={name} placeholder={t.car.photo} className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]" />
        <StatusBadge status={car.status} t={t} className="absolute left-4 top-4" />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div>
          <h3 className="font-serif text-[26px] leading-tight">
            {/* The link covers the whole card for an easy tap target. */}
            <Link href={href} className="after:absolute after:inset-0">
              {name}
            </Link>
          </h3>
          <p className="mt-1 text-[13px] text-mute-2">
            {car.year} · {t.fuel[car.fuelType]} · {t.body[car.bodyType]}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-xs uppercase tracking-wider text-mute-2">
          <div>
            <dt>{t.car.range}</dt>
            <dd className="mt-1 text-[15px] normal-case tracking-normal text-ivory">
              {car.evRangeKm ? `${formatNumber(car.evRangeKm, locale)} ${t.units.km}` : "—"}
            </dd>
          </div>
          <div>
            <dt>{t.car.power}</dt>
            <dd className="mt-1 text-[15px] normal-case tracking-normal text-ivory">{car.horsepower} {t.units.hp}</dd>
          </div>
          <div>
            <dt>{t.car.warranty}</dt>
            <dd className="mt-1 text-[15px] normal-case tracking-normal text-ivory">
              {car.warrantyYears} {t.car.years}
            </dd>
          </div>
        </dl>
        <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
          <span className="text-[15px] text-gold">
            {car.priceAmd ? formatAmd(car.priceAmd, locale) : t.car.contactForPrice}
          </span>
          <span className="text-[13px] text-ivory" aria-hidden="true">
            {t.car.details}
          </span>
        </div>
      </div>
    </article>
  );
}
