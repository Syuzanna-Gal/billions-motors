import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { carName, getCarForEdit, listCarsAdmin, type CarForEdit } from "@/lib/admin/cars";
import {
  addColorAction, deleteCarAction, deleteColorAction, deletePhotoAction, saveColorStockAction, saveRelatedAction, setCoverAction, updateColorAction,
  updatePhotoAction, uploadPhotosAction,
} from "../../../actions";
import { ConfirmSubmit } from "../../../_components/ConfirmSubmit";
import { CarForm } from "../CarForm";
import { adminT, carFormOptions } from "@/lib/admin/lang";
import type { AdminDict } from "@/lib/admin/i18n";
import { interpolate } from "@/lib/format";
import { cellName, comboStock, paintStock, totalStock } from "@/lib/colour-stock";

export async function generateMetadata() {
  return { title: (await adminT()).carForm.editMeta };
}

export default async function EditCarPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("FULL");
  const id = Number((await params).id);
  const car = Number.isInteger(id) ? await getCarForEdit(id) : null;
  if (!car) notFound();
  const [t, options] = await Promise.all([adminT(), carFormOptions()]);
  const te = t.carEdit;
  const LANGS = (["en", "hy", "ru"] as const).map((l) => [l, t.common.langs[l]] as const);
  const sel = { t: t.common };
  const others = (await listCarsAdmin()).filter((c) => c.id !== car.id);
  // Chosen cars first, in their order, then the rest.
  const relatedOrdered = [
    ...car.related.map((rid) => others.find((o) => o.id === rid)).filter((o): o is (typeof others)[number] => !!o),
    ...others.filter((o) => !car.related.includes(o.id)),
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin/cars" className="text-sm text-mute hover:text-ivory">{t.carForm.allCars}</Link>
        <a href={`/hy/cars/${car.slug}`} target="_blank" rel="noopener" className="text-sm text-gold hover:text-ivory">
          {t.common.viewOnSite}
        </a>
      </div>
      <h1 className="-mt-6 font-serif text-4xl font-medium">{carName(car)} {car.year}</h1>

      <CarForm car={car} t={t.carForm} options={options}
        stockFromColours={car.colorStock.length ? totalStock(car.colorStock) : null} />

      {/* ---------- Colours ---------- */}
      <section id="colors" className="scroll-mt-6">
        <h2 className="text-xl font-semibold">{te.colours}</h2>
        <p className="mt-1 text-sm text-mute">{te.coloursHelp}</p>
        <div className="mt-4 flex flex-col gap-3">
          {car.colors.map((c) => (
            <form key={`${c.id}-${c.kind}`} action={updateColorAction} className="grid items-end gap-3 rounded-2xl border border-line bg-ink-2 p-4 sm:grid-cols-[auto_7.5rem_repeat(3,minmax(0,1fr))_5rem_auto]">
              <input type="hidden" name="vehicle_id" value={car.id} />
              <input type="hidden" name="color_id" value={c.id} />
              <div>
                <label className="label" htmlFor={`hex-${c.id}`}>{t.common.colour}</label>
                <input id={`hex-${c.id}`} name="hex" type="color" defaultValue={c.hex} className="h-12 w-16 cursor-pointer rounded-xl border border-line bg-ink" />
              </div>
              <ColorKindSelect {...sel} id={`ck-${c.id}`} value={c.kind} />
              {LANGS.map(([l, name]) => (
                <div key={l}>
                  <label className="label" htmlFor={`name-${c.id}-${l}`}>{name}</label>
                  <input id={`name-${c.id}-${l}`} name={`name_${l}`} defaultValue={c.name[l]} className="field" />
                </div>
              ))}
              <div>
                <label className="label" htmlFor={`pos-${c.id}`}>{t.common.order}</label>
                <input id={`pos-${c.id}`} name="position" type="number" defaultValue={c.position} className="field" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-outline !min-h-12 !px-4 text-sm">{t.common.save}</button>
                <ConfirmSubmit formAction={deleteColorAction} className="rounded-full px-3 text-sm text-mute hover:text-[#f0a58f]"
                  ariaLabel={interpolate(te.deleteColour, { name: c.name.en })}
                  message={interpolate(te.deleteColourConfirm, { name: c.name.en })}>
                  {t.common.delete}
                </ConfirmSubmit>
              </div>
            </form>
          ))}
          <form action={addColorAction} className="grid items-end gap-3 rounded-2xl border border-dashed border-gold/30 p-4 sm:grid-cols-[auto_7.5rem_repeat(3,minmax(0,1fr))_auto]">
            <input type="hidden" name="vehicle_id" value={car.id} />
            <div>
              <label className="label" htmlFor="new-hex">{t.common.colour}</label>
              <input id="new-hex" name="hex" type="color" defaultValue="#ecebe6" className="h-12 w-16 cursor-pointer rounded-xl border border-line bg-ink" />
            </div>
            <ColorKindSelect {...sel} id="new-kind" />
            {LANGS.map(([l, name]) => (
              <div key={l}>
                <label className="label" htmlFor={`new-name-${l}`}>{name}{l === "en" && " *"}</label>
                <input id={`new-name-${l}`} name={`name_${l}`} required={l === "en"} placeholder={l === "en" ? te.colourPlaceholder : ""} className="field" />
              </div>
            ))}
            <button type="submit" className="btn-gold !min-h-12">{te.addColour}</button>
          </form>
        </div>
      </section>

      {/* ---------- Stock by colour ---------- */}
      <ColourStockGrid car={car} t={te} />

      {/* ---------- Photos ---------- */}
      <section id="photos" className="scroll-mt-6">
        <h2 className="text-xl font-semibold">{te.photos}</h2>
        <p className="mt-1 text-sm text-mute">{interpolate(te.photosHelp, { count: car.images.length })}</p>
        <form action={uploadPhotosAction}
          className="mt-4 grid items-end gap-3 rounded-2xl border border-dashed border-gold/30 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <input type="hidden" name="vehicle_id" value={car.id} />
          <div>
            <label className="label" htmlFor="photos-input">{te.photosInput}</label>
            <input id="photos-input" name="photos" type="file" multiple required accept="image/jpeg,image/png,image/webp,image/avif"
              className="field !py-2.5 file:mr-3 file:rounded-full file:border-0 file:bg-gold/15 file:px-3 file:py-1 file:text-gold" />
          </div>
          <ColorSelect {...sel} colors={car.colors} id="upload-color" />
          <KindSelect {...sel} id="upload-kind" />
          <button type="submit" className="btn-gold !min-h-12">{te.upload}</button>
        </form>

        {car.images.length === 0 ? (
          <p className="mt-4 text-sm text-[#f0a58f]">{te.noPhotos}</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {car.images.map((img) => (
              <li key={img.id} className={`relative overflow-hidden rounded-2xl border bg-ink-2 ${img.is_cover ? "border-gold" : "border-line"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover" />
                {img.is_cover ? (
                  <span className="absolute left-3 top-3 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-ink">{te.cover}</span>
                ) : (
                  <form action={setCoverAction} className="absolute left-3 top-3">
                    <input type="hidden" name="vehicle_id" value={car.id} />
                    <input type="hidden" name="image_id" value={img.id} />
                    <button type="submit" className="rounded-full bg-ink/80 px-3 py-1 text-xs text-ivory backdrop-blur hover:text-gold">{te.makeCover}</button>
                  </form>
                )}
                <form key={`${img.color_id}-${img.kind}`} action={updatePhotoAction} className="grid grid-cols-2 gap-2 p-3">
                  <input type="hidden" name="vehicle_id" value={car.id} />
                  <input type="hidden" name="image_id" value={img.id} />
                  <ColorSelect {...sel} colors={car.colors} id={`c-${img.id}`} value={img.color_id} />
                  <KindSelect {...sel} id={`k-${img.id}`} value={img.kind} />
                  <div>
                    <label className="label" htmlFor={`p-${img.id}`}>{t.common.order}</label>
                    <input id={`p-${img.id}`} name="position" type="number" defaultValue={img.position} className="field" />
                  </div>
                  <div className="flex items-end gap-2">
                    <button type="submit" className="btn-outline !min-h-12 !px-4 text-sm">{t.common.save}</button>
                    <ConfirmSubmit formAction={deletePhotoAction} className="px-2 text-sm text-mute hover:text-[#f0a58f]" message={te.deletePhotoConfirm}>{t.common.delete}</ConfirmSubmit>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- You may also like ---------- */}
      <section id="related" className="scroll-mt-6">
        <h2 className="text-xl font-semibold">{te.related}</h2>
        <p className="mt-1 text-sm text-mute">{te.relatedHelp}</p>
        <form action={saveRelatedAction} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="vehicle_id" value={car.id} />
          <div className="grid max-h-96 gap-1 overflow-y-auto rounded-2xl border border-line bg-ink-2 p-3 sm:grid-cols-2">
            {relatedOrdered.map((o) => (
              <label key={o.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm hover:bg-ink-3">
                <input type="checkbox" name="related" value={o.id} defaultChecked={car.related.includes(o.id)} className="size-5 accent-[#c9a66b]" />
                <span>{o.name}</span>
                {!o.published && <span className="text-xs text-mute-2">{t.common.hiddenMark}</span>}
              </label>
            ))}
          </div>
          <button type="submit" className="btn-gold self-start">{te.relatedSave}</button>
        </form>
      </section>

      {/* ---------- Delete ---------- */}
      <section>
        <details className="rounded-2xl border border-[#f0a58f]/30 p-4">
          <summary className="cursor-pointer text-sm text-[#f0a58f]">{te.deleteTitle}</summary>
          <form action={deleteCarAction} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="id" value={car.id} />
            <p className="text-sm text-mute">{te.deleteHelp}</p>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" name="confirm" required className="size-5 accent-[#f0a58f]" />
              {interpolate(te.deleteConfirm, { car: carName(car) })}
            </label>
            <button type="submit" className="self-start rounded-full border border-[#f0a58f]/60 px-5 py-3 text-sm text-[#f0a58f] hover:bg-[#f0a58f]/10">
              {te.deleteBtn}
            </button>
          </form>
        </details>
      </section>
    </div>
  );
}

type Sel = { t: AdminDict["common"] };

function ColorSelect({ t, colors, id, value }: Sel & { colors: { id: number; kind: string; name: { en: string } }[]; id: string; value?: number | null }) {
  const group = (kind: string, label: string) => {
    const list = colors.filter((c) => c.kind === kind);
    return list.length > 0 && (
      <optgroup label={label}>
        {list.map((c) => <option key={c.id} value={c.id}>{c.name.en}</option>)}
      </optgroup>
    );
  };
  return (
    <div>
      <label className="label" htmlFor={id}>{t.colour}</label>
      <select id={id} name="color_id" defaultValue={value ?? ""} className="field">
        <option value="">{t.allColours}</option>
        {group("EXTERIOR", t.paint)}
        {group("INTERIOR", t.interior)}
      </select>
    </div>
  );
}

function ColorKindSelect({ t, id, value }: Sel & { id: string; value?: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{t.type}</label>
      <select id={id} name="kind" defaultValue={value ?? "EXTERIOR"} className="field">
        <option value="EXTERIOR">{t.paint}</option>
        <option value="INTERIOR">{t.interior}</option>
      </select>
    </div>
  );
}

function KindSelect({ t, id, value }: Sel & { id: string; value?: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{t.type}</label>
      <select id={id} name="kind" defaultValue={value ?? "EXTERIOR"} className="field">
        <option value="EXTERIOR">{t.exterior}</option>
        <option value="INTERIOR">{t.interior}</option>
      </select>
    </div>
  );
}

/** One box per paint × interior. Saved numbers are shown; the car's total is their sum. */
function ColourStockGrid({ car, t }: { car: CarForEdit; t: AdminDict["carEdit"] }) {
  const paints = car.colors.filter((c) => c.kind === "EXTERIOR");
  const trims = car.colors.filter((c) => c.kind === "INTERIOR");
  const columns: (number | null)[] = trims.length ? trims.map((c) => c.id) : [null];
  const rows = car.colorStock;
  const byColour = rows.length > 0;
  // Saved rows that no longer match a box (a colour was added, or changed between paint and interior).
  const shown = new Set(paints.flatMap((p) => columns.map((i) => cellName(p.id, i))));
  const stale = rows.some((r) => !shown.has(cellName(r.exteriorId, r.interiorId)));
  const value = (p: number, i: number | null) => {
    const r = rows.find((x) => x.exteriorId === p && x.interiorId === i);
    return r ? String(r.stock) : "";
  };

  return (
    <section id="stock" className="scroll-mt-6">
      <h2 className="text-xl font-semibold">{t.stockTitle}</h2>
      <p className="mt-1 max-w-3xl text-sm text-mute">{t.stockHelp}</p>
      {paints.length === 0 ? (
        <p className="mt-4 text-sm text-mute-2">{t.stockNeedPaint}</p>
      ) : (
        <form key={rows.map((r) => `${r.exteriorId}:${r.interiorId}:${r.stock}`).join(",")} action={saveColorStockAction}
          className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="vehicle_id" value={car.id} />
          {stale && <p role="alert" className="text-sm text-[#f0a58f]">{t.stockStale}</p>}
          <div className="overflow-x-auto rounded-2xl border border-line bg-ink-2">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.12em] text-mute-2">
                <tr>
                  <th scope="col" className="p-3 font-medium">{t.stockPaint}</th>
                  {columns.map((i) => {
                    const trim = trims.find((c) => c.id === i);
                    return (
                      <th key={i ?? 0} scope="col" className="p-3 text-center font-medium normal-case tracking-normal">
                        {trim ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="size-3.5 rounded-full ring-1 ring-white/20" style={{ backgroundColor: trim.hex }} aria-hidden="true" />
                            {trim.name.en}
                          </span>
                        ) : t.stockCount}
                      </th>
                    );
                  })}
                  {trims.length > 0 && <th scope="col" className="p-3 text-right font-medium">Σ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paints.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className="p-3 text-left font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-4 rounded-full ring-1 ring-white/20" style={{ backgroundColor: p.hex }} aria-hidden="true" />
                        {p.name.en}
                      </span>
                    </th>
                    {columns.map((i) => {
                      const trim = trims.find((c) => c.id === i);
                      const name = cellName(p.id, i);
                      return (
                        <td key={name} className="p-2 text-center">
                          <input name={name} type="number" min={0} max={999} inputMode="numeric" defaultValue={value(p.id, i)}
                            placeholder="—" aria-label={trim ? `${p.name.en} / ${trim.name.en}` : p.name.en}
                            className={`field !min-h-10 w-20 !px-2 text-center ${byColour && comboStock(rows, p.id, i) > 0 ? "!border-gold/50" : ""}`} />
                        </td>
                      );
                    })}
                    {trims.length > 0 && <td className="p-3 text-right text-mute">{byColour ? paintStock(rows, p.id) : "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" className="btn-gold !min-h-12">{t.stockSave}</button>
            <span className="text-sm text-mute">
              {byColour ? interpolate(t.stockTotal, { count: totalStock(rows) }) : t.stockOff}
            </span>
          </div>
        </form>
      )}
    </section>
  );
}
