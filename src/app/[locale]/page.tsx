import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/i18n";
import { getFeatured, listVehicles } from "@/lib/vehicles";
import { vehicleName } from "@/lib/format";
import { whatsappHref } from "@/lib/site";
import { CarCard } from "@/components/CarCard";
import { CarPhoto } from "@/components/CarPhoto";

// Car data comes from the database, so render on each request.
export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const [[hero], collection] = await Promise.all([getFeatured(locale, 1), listVehicles(locale, { sort: "newest" }, 6)]);

  return (
    <>
      {/* Hero */}
      <section className="container-page grid items-center gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-2 lg:gap-14 lg:pb-20 lg:pt-24">
        <div className="flex flex-col gap-7">
          <p className="eyebrow">{t.home.eyebrow}</p>
          <h1 className="font-serif text-[52px] font-medium leading-[1.02] sm:text-[68px] lg:text-[76px]">
            {t.home.titleStart} <em className="text-gold">{t.home.titleAccent}</em> {t.home.titleEnd}
          </h1>
          <p className="max-w-[30rem] text-lg leading-relaxed text-mute">{t.home.lead}</p>
          <div className="flex flex-wrap gap-3.5">
            <Link href={`/${locale}/cars`} className="btn-gold">
              {t.home.viewAll}
            </Link>
            <Link href={`/${locale}/loan-calculator`} className="btn-outline">
              {t.home.calcLoan}
            </Link>
          </div>
        </div>

        {hero && (
          <Link
            href={`/${locale}/cars/${hero.slug}`}
            className="group relative block h-[340px] overflow-hidden rounded-[28px] border border-line sm:h-[440px]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_20%,#2a2620_0%,#141416_55%,#0e0e10_100%)]">
              <CarPhoto image={hero.images[0]} alt={vehicleName(hero)} placeholder={t.car.photo} priority className="!bg-none" />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 bg-gradient-to-t from-ink/90 to-transparent p-7">
              <div>
                <p className="eyebrow !text-[11px]">{t.home.featured}</p>
                <p className="mt-1.5 font-serif text-[32px] leading-tight">{vehicleName(hero)}</p>
              </div>
              <p className="text-sm text-mute">
                {hero.year} · {t.fuel[hero.fuelType]} · {hero.horsepower} {t.units.hp}
              </p>
            </div>
          </Link>
        )}
      </section>

      <div className="container-page">
        <div className="gold-rule" />
      </div>

      {/* Collection */}
      <section className="container-page flex flex-col gap-9 py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-serif text-[40px] font-medium sm:text-5xl">{t.home.collection}</h2>
          <Link href={`/${locale}/cars`} className="text-sm text-gold hover:text-ivory">
            {t.home.browseAll}
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collection.map((car) => (
            <CarCard key={car.id} car={car} locale={locale} t={t} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-ink-2/60">
        <div className="container-page py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-serif text-[40px] font-medium leading-tight sm:text-5xl">{t.home.howTitle}</h2>
            <p className="mt-4 text-lg leading-relaxed text-mute">{t.home.howLead}</p>
          </div>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {t.home.steps.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-3">
                <span className="text-gold font-serif text-5xl leading-none">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-[15px] leading-relaxed text-mute">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why us */}
      <section className="container-page py-16 sm:py-20">
        <h2 className="font-serif text-[40px] font-medium sm:text-5xl">{t.home.whyTitle}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.why.map((item) => (
            <div key={item.title} className="rounded-[var(--radius-card)] border border-line bg-ink-2 p-6">
              <div className="gold-gradient mb-5 h-[3px] w-10 rounded-full" />
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-mute">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page">
        <div className="relative overflow-hidden rounded-[32px] border border-gold/25 bg-[radial-gradient(90%_140%_at_100%_0%,#2a2620_0%,#141416_60%)] px-7 py-12 sm:px-14 sm:py-16">
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="font-serif text-4xl font-medium sm:text-5xl">{t.home.ctaTitle}</h2>
              <p className="mt-3 text-lg text-mute">{t.home.ctaText}</p>
            </div>
            <div className="flex flex-wrap gap-3.5">
              <a href={whatsappHref()} className="btn-gold">
                WhatsApp
              </a>
              <Link href={`/${locale}/contact`} className="btn-outline">
                {t.nav.contact}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
