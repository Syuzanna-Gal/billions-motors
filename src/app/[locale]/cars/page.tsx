import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/i18n";
import { filterOptions, getBrands, listVehicles, parseFilters } from "@/lib/vehicles";
import { interpolate } from "@/lib/format";
import { CarCard } from "@/components/CarCard";
import { PageHeader } from "@/components/PageHeader";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: t.nav.cars,
    description: t.catalog.lead,
    alternates: { canonical: `/${locale}/cars`, languages: { hy: "/hy/cars", en: "/en/cars" } },
  };
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const filters = parseFilters(await searchParams);
  const [cars, brands] = await Promise.all([listVehicles(filters), getBrands()]);

  const sortLabels = { newest: t.catalog.sortNewest, price_asc: t.catalog.sortPriceAsc, price_desc: t.catalog.sortPriceDesc };

  return (
    <>
      <PageHeader title={t.catalog.title} lead={t.catalog.lead} />

      <section className="container-page">
        {/* Plain GET form: filters are shareable URLs and work without JavaScript. */}
        <form
          method="get"
          action={`/${locale}/cars`}
          className="grid gap-4 rounded-[24px] border border-line bg-ink-2 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]"
        >
          <Select name="brand" label={t.catalog.brand} value={filters.brand} any={t.catalog.any}
            options={brands.map((b) => [b, b])} />
          <Select name="body" label={t.catalog.body} value={filters.body} any={t.catalog.any}
            options={filterOptions.body.map((b) => [b, t.body[b]])} />
          <Select name="fuel" label={t.catalog.fuel} value={filters.fuel} any={t.catalog.any}
            options={filterOptions.fuel.map((f) => [f, t.fuel[f]])} />
          <Select name="status" label={t.catalog.status} value={filters.status} any={t.catalog.any}
            options={filterOptions.status.map((s) => [s, t.status[s]])} />
          <Select name="sort" label={t.catalog.sort} value={filters.sort ?? "newest"}
            options={filterOptions.sort.map((s) => [s, sortLabels[s]])} />
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
            <button type="submit" className="btn-gold flex-1 lg:flex-none">{t.catalog.apply}</button>
            <Link href={`/${locale}/cars`} className="btn-outline !px-5">{t.catalog.reset}</Link>
          </div>
        </form>

        <p className="mt-8 text-sm text-mute" aria-live="polite">
          {interpolate(t.catalog.showing, { count: cars.length })}
        </p>

        {cars.length ? (
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car) => (
              <CarCard key={car.id} car={car} locale={locale} t={t} />
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-[var(--radius-card)] border border-line bg-ink-2 p-10 text-center text-mute">
            {t.catalog.empty}
          </p>
        )}
      </section>
    </>
  );
}

function Select({
  name,
  label,
  value,
  options,
  any,
}: {
  name: string;
  label: string;
  value?: string;
  options: [string, string][];
  any?: string;
}) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} name={name} defaultValue={value ?? ""} className="field">
        {any !== undefined && <option value="">{any}</option>}
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );
}
