import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, type Dictionary, type Locale } from "@/i18n";
import { getAllSlugs, getSimilar, getVehicle } from "@/lib/vehicles";
import { formatAmd, formatNumber, vehicleName } from "@/lib/format";
import { calculateLoan } from "@/lib/loan";
import { telHref, whatsappHref } from "@/lib/site";
import type { Vehicle } from "@/lib/types";
import { CarCard } from "@/components/CarCard";
import { Gallery } from "@/components/Gallery";
import { LeadForm } from "@/components/LeadForm";
import { StatusBadge } from "@/components/StatusBadge";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return ["hy", "en"].flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const car = await getVehicle(slug);
  if (!car) return {};
  const t = getDictionary(locale);
  const name = vehicleName(car);
  return {
    title: `${name} ${car.year}`,
    description: `${name} ${car.year} · ${t.fuel[car.fuelType]} · ${car.horsepower} hp · ${t.status[car.status]}`,
    alternates: {
      canonical: `/${locale}/cars/${slug}`,
      languages: { hy: `/hy/cars/${slug}`, en: `/en/cars/${slug}` },
    },
    openGraph: car.images[0] ? { images: [car.images[0].url] } : undefined,
  };
}

export default async function CarPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const car = await getVehicle(slug);
  if (!car) notFound();
  const t = getDictionary(locale);
  const name = vehicleName(car);
  const similar = await getSimilar(car);

  // Same defaults as the loan calculator page: 30% down, 48 months.
  const monthly = car.priceAmd ? calculateLoan(car.priceAmd, car.priceAmd * 0.3, 14, 48).monthly : null;

  return (
    <>
      <nav aria-label="Breadcrumb" className="container-page pt-8 text-sm text-mute-2">
        <Link href={`/${locale}/cars`} className="hover:text-ivory">{t.nav.cars}</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-mute">{name}</span>
      </nav>

      <section className="container-page grid gap-10 pt-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12">
        <div className="flex flex-col gap-10">
          <Gallery
            images={car.images}
            alt={name}
            labels={{ exterior: t.car.exterior, interior: t.car.interior, photo: t.car.photo, previous: t.car.previous, next: t.car.next }}
          />
          <Specs car={car} t={t} locale={locale} />
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[24px] border border-line bg-ink-2 p-6 sm:p-7">
            <StatusBadge status={car.status} t={t} />
            <h1 className="mt-4 font-serif text-[40px] font-medium leading-[1.05]">{name}</h1>
            <p className="mt-2 text-sm text-mute">
              {car.year} · {t.fuel[car.fuelType]} · {t.body[car.bodyType]}
            </p>
            <div className="gold-rule my-6 opacity-60" />
            <p className="text-gold font-serif text-[34px] leading-none">
              {car.priceAmd ? formatAmd(car.priceAmd, locale) : t.car.contactForPrice}
            </p>
            {monthly && (
              <p className="mt-2 text-sm text-mute">
                {t.car.monthlyFrom} {formatAmd(monthly, locale)}
              </p>
            )}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a href={whatsappHref()} className="btn-gold">WhatsApp</a>
              <a href={telHref()} className="btn-outline">{t.car.callNow}</a>
              <Link
                href={`/${locale}/loan-calculator${car.priceAmd ? `?price=${car.priceAmd}` : ""}`}
                className="btn-outline sm:col-span-2"
              >
                {t.car.calcLoan}
              </Link>
            </div>
          </div>

          <div id="offer" className="rounded-[24px] border border-line bg-ink-2 p-6 sm:p-7">
            <h2 className="font-serif text-3xl font-medium">{t.car.requestOffer}</h2>
            <p className="mb-5 mt-1 text-sm text-mute">{name}</p>
            <LeadForm t={t.form} type="OFFER" vehicleSlug={car.slug} locale={locale} />
          </div>
        </aside>
      </section>

      {similar.length > 0 && (
        <section className="container-page mt-20 flex flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-serif text-4xl font-medium">{t.car.similar}</h2>
            <Link href={`/${locale}/cars`} className="text-sm text-gold hover:text-ivory">{t.home.browseAll}</Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((c) => (
              <CarCard key={c.id} car={c} locale={locale} t={t} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Specs({ car, t, locale }: { car: Vehicle; t: Dictionary; locale: Locale }) {
  const s = t.car.spec;
  const mm = (v: number | null) => (v ? `${formatNumber(v, locale)} mm` : null);
  const rows: [string, string | null][] = [
    [s.year, String(car.year)],
    [s.bodyType, t.body[car.bodyType]],
    [s.fuelType, t.fuel[car.fuelType]],
    [s.horsepower, `${car.horsepower} hp`],
    [s.transmission, car.transmission],
    [s.drive, t.drive[car.drive]],
    [s.accel, car.accel0100 ? `${car.accel0100} s` : null],
    [s.topSpeed, car.topSpeedKmh ? `${car.topSpeedKmh} km/h` : null],
    [s.battery, car.batteryKwh ? `${car.batteryKwh} kWh` : null],
    [s.evRange, car.evRangeKm ? `${formatNumber(car.evRangeKm, locale)} km` : null],
    [s.seats, String(car.seats)],
    [s.length, mm(car.lengthMm)],
    [s.width, mm(car.widthMm)],
    [s.height, mm(car.heightMm)],
    [s.warranty, `${car.warrantyYears} ${t.car.years} / ${formatNumber(car.warrantyKm, locale)} km`],
  ];

  return (
    <section>
      <h2 className="font-serif text-4xl font-medium">{t.car.specs}</h2>
      <dl className="mt-6 grid overflow-hidden rounded-[24px] border border-line sm:grid-cols-2">
        {rows
          .filter((r): r is [string, string] => r[1] != null)
          .map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4 even:sm:border-l">
              <dt className="text-sm text-mute-2">{label}</dt>
              <dd className="text-right text-[15px] text-ivory">{value}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}
