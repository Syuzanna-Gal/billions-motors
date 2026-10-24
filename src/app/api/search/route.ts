import { NextResponse, type NextRequest } from "next/server";
import { getDictionary, isLocale } from "@/i18n";
import { formatAmd, vehicleName } from "@/lib/format";
import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH } from "@/lib/search";
import { searchVehicles } from "@/lib/vehicles";

/*
 * Live suggestions for the header search: GET /api/search?q=zeekr&locale=hy
 * Returns at most 6 small, display-ready items (no full car records) so the dropdown stays light.
 */

export type Suggestion = {
  href: string;
  name: string;
  /** "2026 · Electric" */
  meta: string;
  /** Formatted price, or "Contact for price". */
  price: string;
  image: string | null;
  /** Close match rather than an exact one. */
  similar: boolean;
};

export type SuggestResponse = {
  query: string;
  suggestions: Suggestion[];
  /** All exact matches, including those not in `suggestions`. */
  total: number;
};

const LIMIT = 6;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const localeParam = params.get("locale") ?? "";
  const locale = isLocale(localeParam) ? localeParam : "hy";

  if (query.length < MIN_QUERY_LENGTH) return json({ query, suggestions: [], total: 0 });

  const t = getDictionary(locale);
  const { matches, similar, total } = await searchVehicles(locale, { q: query }, { limit: LIMIT, similarLimit: LIMIT });
  const items = [...matches.map((car) => ({ car, similar: false })), ...similar.map((car) => ({ car, similar: true }))];

  return json({
    query,
    total,
    suggestions: items.slice(0, LIMIT).map(({ car, similar: isSimilar }) => ({
      href: `/${locale}/cars/${car.slug}`,
      name: vehicleName(car),
      meta: `${car.year} · ${t.fuel[car.fuelType]}`,
      price: car.priceAmd ? formatAmd(car.priceAmd, locale) : t.car.contactForPrice,
      image: car.cover?.url ?? null,
      similar: isSimilar,
    })),
  });
}

// Stock and prices change from the admin at any time, so answers aren't cached.
const json = (body: SuggestResponse) => NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
