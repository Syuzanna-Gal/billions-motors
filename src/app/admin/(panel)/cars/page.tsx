import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listCarsAdmin } from "@/lib/admin/cars";
import { rankCars } from "@/lib/search";
import { daysLeft, today } from "@/lib/transit";
import { setStockAction, togglePublishedAction } from "../../actions";
import { defaultDictionary } from "@/i18n";
import { adminT, getAdminLang } from "@/lib/admin/lang";
import { interpolate } from "@/lib/format";

export async function generateMetadata() {
  return { title: (await adminT()).cars.title };
}

const PAGE_SIZE = 50;
const SHOW = ["all", "shown", "hidden"] as const;
type Show = (typeof SHOW)[number];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CarsPage({ searchParams }: Props) {
  await requireUser("FULL");
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string).trim().slice(0, 80) : "");
  const q = one("q");
  const show: Show = SHOW.find((s) => s === one("show")) ?? "all";
  const [all, t, lang] = await Promise.all([listCarsAdmin(), adminT(), getAdminLang()]);
  const tc = t.cars;
  const statusLabel = defaultDictionary(lang).status;
  const showLabels: Record<Show, string> = { all: tc.showAll, shown: tc.showShown, hidden: tc.showHidden };

  // Same search as the site (typos, Armenian/Russian spellings), then the visibility filter.
  let list = all;
  if (q.length >= 2) {
    const byId = new Map(all.map((c) => [c.id, c]));
    list = rankCars(q, all.map((c) => ({ id: c.id, brand: c.brand, model: c.model, trim: c.trim_level, year: c.year })), {
      limit: all.length,
    }).matches.map((id) => byId.get(id)!);
  }
  if (show !== "all") list = list.filter((c) => c.published === (show === "shown"));
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(one("page")) || 1), pages);
  const cars = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hiddenCount = all.filter((c) => !c.published).length;
  const href = (changes: Record<string, string | number>) => {
    const qs = new URLSearchParams({ ...(q && { q }), ...(show !== "all" && { show }), ...Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, String(v)])) });
    for (const [k, v] of [...qs]) if (!v || (k === "page" && v === "1") || (k === "show" && v === "all")) qs.delete(k);
    return `/admin/cars${qs.size ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-medium">{tc.title}</h1>
          <p className="mt-2 text-mute">{interpolate(tc.summary, { total: all.length, hidden: hiddenCount })}</p>
        </div>
        <Link href="/admin/cars/new" className="btn-gold">{tc.add}</Link>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="label">{tc.find}</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder={tc.findPlaceholder} className="field" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="show" className="label">{tc.show}</label>
          <select id="show" name="show" defaultValue={show} className="field">
            {SHOW.map((k) => <option key={k} value={k}>{showLabels[k]}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-gold !min-h-12">{t.common.filter}</button>
        {(q || show !== "all") && <Link href="/admin/cars" className="btn-outline !min-h-12">{t.common.clear}</Link>}
      </form>
      {(q || show !== "all") && <p className="-mt-3 text-sm text-mute">{interpolate(t.common.found, { count: list.length })}</p>}

      <div className="overflow-x-auto rounded-[20px] border border-line">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-ink-2 text-xs uppercase tracking-wider text-mute-2">
            <tr>
              <th scope="col" className="p-4 font-medium">{tc.colCar}</th>
              <th scope="col" className="p-4 font-medium">{tc.colStatus}</th>
              <th scope="col" className="p-4 font-medium">{tc.colStock}</th>
              <th scope="col" className="p-4 font-medium">{tc.colPrice}</th>
              <th scope="col" className="p-4 font-medium">{tc.colPhotos}</th>
              <th scope="col" className="p-4 font-medium">{tc.colOnSite}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {cars.map((c) => (
              <tr key={c.id} className="align-middle">
                <td className="p-4">
                  <Link href={`/admin/cars/${c.id}`} className="font-medium text-ivory hover:text-gold">{c.name}</Link>
                  {c.featured && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] text-gold">{tc.featured}</span>}
                </td>
                <td className="p-4 text-mute">
                  {statusLabel[c.status]}
                  {c.status === "IN_TRANSIT" && c.arrival_date && (
                    // Due (arrival date reached): the site keeps showing "1 day" until the status changes.
                    c.arrival_date <= today() ? (
                      <span className="block text-xs text-[#f0a58f]">{tc.due}</span>
                    ) : (
                      <span className="block text-xs text-mute-2">{interpolate(tc.daysLeft, { count: daysLeft(c.arrival_date) })}</span>
                    )
                  )}
                </td>
                <td className="p-4">
                  <form action={setStockAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <label className="sr-only" htmlFor={`stock-${c.id}`}>{interpolate(tc.stockFor, { car: c.name })}</label>
                    <input id={`stock-${c.id}`} name="stock" type="number" min={0} defaultValue={c.stock ?? ""} placeholder="—"
                      className="field !min-h-9 w-20 !px-2 text-center" />
                    <button type="submit" className="rounded-full border border-line px-3 py-1.5 text-xs text-mute hover:text-ivory">{tc.set}</button>
                  </form>
                  {c.stock === 0 && <p className="mt-1 text-xs text-[#f0a58f]">{tc.soldOutHidden}</p>}
                </td>
                <td className="p-4 text-mute">{c.price_amd ? new Intl.NumberFormat("en-US").format(c.price_amd) : tc.onRequest}</td>
                <td className={`p-4 ${c.photos ? "text-mute" : "text-[#f0a58f]"}`}>{c.photos || tc.noPhotos}</td>
                <td className="p-4">
                  <form action={togglePublishedAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" aria-pressed={c.published}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${c.published ? "bg-gold/15 text-gold" : "border border-line text-mute"}`}>
                      {c.published ? tc.shown : tc.hidden}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label={tc.pages} className="flex flex-wrap items-center gap-2 text-sm">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={href({ page: n })} aria-current={n === page ? "page" : undefined}
              className={`flex size-10 items-center justify-center rounded-full border ${n === page ? "border-gold text-gold" : "border-line text-mute hover:text-ivory"}`}>
              {n}
            </Link>
          ))}
        </nav>
      )}
      <p className="text-xs text-mute-2">
        {tc.stockNote}
      </p>
    </div>
  );
}
