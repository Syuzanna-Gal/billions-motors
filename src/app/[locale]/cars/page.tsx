import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, languageAlternates, type Dictionary, type Locale } from "@/i18n";
import { filterOptions, getBrands, listVehicles, parseFilters, searchVehicles } from "@/lib/vehicles";
import type { Vehicle } from "@/lib/types";
import { interpolate } from "@/lib/format";
import { CarCard } from "@/components/CarCard";
import { PageHeader } from "@/components/PageHeader";
import { reveal, stagger } from "@/lib/reveal";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const { q } = parseFilters(await searchParams);
  return {
    title: q ? `${interpolate(t.search.resultsFor, { q })} · ${t.nav.cars}` : t.nav.cars,
    description: t.catalog.lead,
    alternates: { canonical: `/${locale}/cars`, languages: languageAlternates("/cars") },
    // Search result pages are endless variations of the catalogue: keep them out of search engines.
    ...(q && { robots: { index: false, follow: true } }),
  };
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const filters = parseFilters(await searchParams);
  const { q } = filters;
  // "Best match" is offered, and is the default, only while searching.
  const sorts = filterOptions.sort.filter((s) => q || s !== "relevance");
  const sort = filters.sort && sorts.includes(filters.sort) ? filters.sort : q ? "relevance" : "newest";

  const [results, brands] = await Promise.all([
    q
      ? searchVehicles(locale, { ...filters, sort })
      : listVehicles(locale, { ...filters, sort }).then((cars) => ({ matches: cars, similar: [], total: cars.length })),
    getBrands(),
  ]);
  const cars = results.matches;

  const sortLabels = {
    relevance: t.search.sortRelevance,
    newest: t.catalog.sortNewest,
    price_asc: t.catalog.sortPriceAsc,
    price_desc: t.catalog.sortPriceDesc,
  };

  let summary = interpolate(t.catalog.showing, { count: cars.length });
  if (q) summary = cars.length ? interpolate(t.search.resultsFor, { q }) + ` · ${cars.length}` : results.similar.length ? interpolate(t.search.noExact, { q }) : interpolate(t.search.nothing, { q });

  return (
    <>
      <PageHeader title={t.catalog.title} lead={t.catalog.lead} />

      <section className="container-page">
        {/* Plain GET form: filters are shareable URLs and work without JavaScript. */}
        <form
          method="get"
          action={`/${locale}/cars`}
          {...reveal(240)}
          className="grid gap-4 rounded-[24px] border border-line bg-ink-2 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]"
        >
          <div role="search" className="sm:col-span-2 lg:col-span-6">
            <label htmlFor="q" className="label">{t.search.label}</label>
            <input id="q" name="q" type="search" defaultValue={q ?? ""} placeholder={t.search.placeholder}
              maxLength={80} autoComplete="off" spellCheck={false} enterKeyHint="search" className="field text-base" />
          </div>
          <Select name="brand" label={t.catalog.brand} value={filters.brand} any={t.catalog.any}
            options={brands.map((b) => [b, b])} />
          <Select name="body" label={t.catalog.body} value={filters.body} any={t.catalog.any}
            options={filterOptions.body.map((b) => [b, t.body[b]])} />
          <Select name="fuel" label={t.catalog.fuel} value={filters.fuel} any={t.catalog.any}
            options={filterOptions.fuel.map((f) => [f, t.fuel[f]])} />
          <Select name="status" label={t.catalog.status} value={filters.status} any={t.catalog.any}
            options={filterOptions.status.map((s) => [s, t.status[s]])} />
          <Select name="sort" label={t.catalog.sort} value={sort}
            options={sorts.map((s) => [s, sortLabels[s]])} />
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
            <button type="submit" className="btn-gold flex-1 lg:flex-none">{t.catalog.apply}</button>
            <Link href={`/${locale}/cars`} className="btn-outline !px-5">{t.catalog.reset}</Link>
          </div>
        </form>

        <p className="mt-8 text-sm text-mute" aria-live="polite">{summary}</p>

        {cars.length > 0 && <CarGrid cars={cars} locale={locale} t={t} />}
        {cars.length === 0 && results.similar.length === 0 && (
          <p className="mt-5 rounded-[var(--radius-card)] border border-line bg-ink-2 p-10 text-center text-mute">
            {q ? interpolate(t.search.nothing, { q }) : t.catalog.empty}
          </p>
        )}

        {results.similar.length > 0 && (
          <div className="mt-14">
            {cars.length > 0 && <h2 className="font-serif text-3xl font-medium" {...reveal()}>{t.search.similar}</h2>}
            <CarGrid cars={results.similar} locale={locale} t={t} />
          </div>
        )}
      </section>
    </>
  );
}

function CarGrid({ cars, locale, t }: { cars: Vehicle[]; locale: Locale; t: Dictionary }) {
  return (
    <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((car, i) => (
        <div key={car.id} className="flex" {...reveal(stagger(i))}>
          <CarCard car={car} locale={locale} t={t} />
        </div>
      ))}
    </div>
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
