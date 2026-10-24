import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listCarsAdmin } from "@/lib/admin/cars";
import { rankCars } from "@/lib/search";
import { setStockAction, togglePublishedAction } from "../../actions";

export const metadata = { title: "Cars" };

const statusLabel: Record<string, string> = { IN_STOCK: "In stock", IN_TRANSIT: "In transit", PRE_ORDER: "Pre-order" };

const PAGE_SIZE = 50;
const SHOW = { all: "All", shown: "On the site", hidden: "Hidden" } as const;
type Show = keyof typeof SHOW;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CarsPage({ searchParams }: Props) {
  await requireUser("FULL");
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string).trim().slice(0, 80) : "");
  const q = one("q");
  const show: Show = one("show") in SHOW ? (one("show") as Show) : "all";
  const all = await listCarsAdmin();

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
          <h1 className="font-serif text-4xl font-medium">Cars</h1>
          <p className="mt-2 text-mute">
            {all.length} cars, {hiddenCount} hidden. Click a name to edit everything about it.
          </p>
        </div>
        <Link href="/admin/cars/new" className="btn-gold">+ Add a car</Link>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="label">Find a car</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Brand or model" className="field" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="show" className="label">Show</label>
          <select id="show" name="show" defaultValue={show} className="field">
            {Object.entries(SHOW).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-gold !min-h-12">Filter</button>
        {(q || show !== "all") && <Link href="/admin/cars" className="btn-outline !min-h-12">Clear</Link>}
      </form>
      {(q || show !== "all") && <p className="-mt-3 text-sm text-mute">{list.length} found</p>}

      <div className="overflow-x-auto rounded-[20px] border border-line">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-ink-2 text-xs uppercase tracking-wider text-mute-2">
            <tr>
              <th scope="col" className="p-4 font-medium">Car</th>
              <th scope="col" className="p-4 font-medium">Status</th>
              <th scope="col" className="p-4 font-medium">Stock</th>
              <th scope="col" className="p-4 font-medium">Price (AMD)</th>
              <th scope="col" className="p-4 font-medium">Photos</th>
              <th scope="col" className="p-4 font-medium">On site</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {cars.map((c) => (
              <tr key={c.id} className="align-middle">
                <td className="p-4">
                  <Link href={`/admin/cars/${c.id}`} className="font-medium text-ivory hover:text-gold">{c.name}</Link>
                  {c.featured && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] text-gold">Featured</span>}
                </td>
                <td className="p-4 text-mute">{statusLabel[c.status]}</td>
                <td className="p-4">
                  <form action={setStockAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <label className="sr-only" htmlFor={`stock-${c.id}`}>Stock for {c.name}</label>
                    <input id={`stock-${c.id}`} name="stock" type="number" min={0} defaultValue={c.stock ?? ""} placeholder="—"
                      className="field !min-h-9 w-20 !px-2 text-center" />
                    <button type="submit" className="rounded-full border border-line px-3 py-1.5 text-xs text-mute hover:text-ivory">Set</button>
                  </form>
                  {c.stock === 0 && <p className="mt-1 text-xs text-[#f0a58f]">Sold out · hidden</p>}
                </td>
                <td className="p-4 text-mute">{c.price_amd ? new Intl.NumberFormat("en-US").format(c.price_amd) : "On request"}</td>
                <td className={`p-4 ${c.photos ? "text-mute" : "text-[#f0a58f]"}`}>{c.photos || "none"}</td>
                <td className="p-4">
                  <form action={togglePublishedAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" aria-pressed={c.published}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${c.published ? "bg-gold/15 text-gold" : "border border-line text-mute"}`}>
                      {c.published ? "Shown" : "Hidden"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="Pages" className="flex flex-wrap items-center gap-2 text-sm">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={href({ page: n })} aria-current={n === page ? "page" : undefined}
              className={`flex size-10 items-center justify-center rounded-full border ${n === page ? "border-gold text-gold" : "border-line text-mute hover:text-ivory"}`}>
              {n}
            </Link>
          ))}
        </nav>
      )}
      <p className="text-xs text-mute-2">
        Stock: leave empty for cars that aren’t counted (pre-order / in transit). At 0 a car is hidden from the site automatically.
      </p>
    </div>
  );
}
