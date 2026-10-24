import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { carName, getCarForEdit, listCarsAdmin } from "@/lib/admin/cars";
import {
  addColorAction, deleteCarAction, deleteColorAction, deletePhotoAction, saveRelatedAction, updateColorAction, updatePhotoAction, uploadPhotosAction,
} from "../../../actions";
import { ConfirmSubmit } from "../../../_components/ConfirmSubmit";
import { CarForm } from "../CarForm";

export const metadata = { title: "Edit car" };

const LANGS = [["en", "English"], ["hy", "Armenian"], ["ru", "Russian"]] as const;

export default async function EditCarPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("FULL");
  const id = Number((await params).id);
  const car = Number.isInteger(id) ? await getCarForEdit(id) : null;
  if (!car) notFound();
  const others = (await listCarsAdmin()).filter((c) => c.id !== car.id);
  // Chosen cars first, in their order, then the rest.
  const relatedOrdered = [
    ...car.related.map((rid) => others.find((o) => o.id === rid)).filter((o): o is (typeof others)[number] => !!o),
    ...others.filter((o) => !car.related.includes(o.id)),
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin/cars" className="text-sm text-mute hover:text-ivory">← All cars</Link>
        <a href={`/hy/cars/${car.slug}`} target="_blank" rel="noopener" className="text-sm text-gold hover:text-ivory">
          View on site ↗
        </a>
      </div>
      <h1 className="-mt-6 font-serif text-4xl font-medium">{carName(car)} {car.year}</h1>

      <CarForm car={car} />

      {/* ---------- Colours ---------- */}
      <section id="colors" className="scroll-mt-6">
        <h2 className="text-xl font-semibold">Colours</h2>
        <p className="mt-1 text-sm text-mute">The colour picker on the car page. Lower “order” numbers show first.</p>
        <div className="mt-4 flex flex-col gap-3">
          {car.colors.map((c) => (
            <form key={c.id} action={updateColorAction} className="grid items-end gap-3 rounded-2xl border border-line bg-ink-2 p-4 sm:grid-cols-[auto_repeat(3,minmax(0,1fr))_5rem_auto]">
              <input type="hidden" name="vehicle_id" value={car.id} />
              <input type="hidden" name="color_id" value={c.id} />
              <div>
                <label className="label" htmlFor={`hex-${c.id}`}>Colour</label>
                <input id={`hex-${c.id}`} name="hex" type="color" defaultValue={c.hex} className="h-12 w-16 cursor-pointer rounded-xl border border-line bg-ink" />
              </div>
              {LANGS.map(([l, name]) => (
                <div key={l}>
                  <label className="label" htmlFor={`name-${c.id}-${l}`}>{name}</label>
                  <input id={`name-${c.id}-${l}`} name={`name_${l}`} defaultValue={c.name[l]} className="field" />
                </div>
              ))}
              <div>
                <label className="label" htmlFor={`pos-${c.id}`}>Order</label>
                <input id={`pos-${c.id}`} name="position" type="number" defaultValue={c.position} className="field" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-outline !min-h-12 !px-4 text-sm">Save</button>
                <ConfirmSubmit formAction={deleteColorAction} className="rounded-full px-3 text-sm text-mute hover:text-[#f0a58f]"
                  ariaLabel={`Delete colour ${c.name.en}`}
                  message={`Delete the colour “${c.name.en}”? Its photos will be deleted too.`}>
                  Delete
                </ConfirmSubmit>
              </div>
            </form>
          ))}
          <form action={addColorAction} className="grid items-end gap-3 rounded-2xl border border-dashed border-gold/30 p-4 sm:grid-cols-[auto_repeat(3,minmax(0,1fr))_auto]">
            <input type="hidden" name="vehicle_id" value={car.id} />
            <div>
              <label className="label" htmlFor="new-hex">Colour</label>
              <input id="new-hex" name="hex" type="color" defaultValue="#ecebe6" className="h-12 w-16 cursor-pointer rounded-xl border border-line bg-ink" />
            </div>
            {LANGS.map(([l, name]) => (
              <div key={l}>
                <label className="label" htmlFor={`new-name-${l}`}>{name}{l === "en" && " *"}</label>
                <input id={`new-name-${l}`} name={`name_${l}`} required={l === "en"} placeholder={l === "en" ? "e.g. Pearl White" : ""} className="field" />
              </div>
            ))}
            <button type="submit" className="btn-gold !min-h-12">+ Add colour</button>
          </form>
        </div>
      </section>

      {/* ---------- Photos ---------- */}
      <section id="photos" className="scroll-mt-6">
        <h2 className="text-xl font-semibold">Photos</h2>
        <p className="mt-1 text-sm text-mute">
          Link a photo to a colour to show it when that colour is picked. “All colours” photos are used when a colour has none.
          The first exterior photo is the card picture.
        </p>
        <form action={uploadPhotosAction}
          className="mt-4 grid items-end gap-3 rounded-2xl border border-dashed border-gold/30 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <input type="hidden" name="vehicle_id" value={car.id} />
          <div>
            <label className="label" htmlFor="photos-input">Photos (JPG, PNG, WebP · up to 15 MB each)</label>
            <input id="photos-input" name="photos" type="file" multiple required accept="image/jpeg,image/png,image/webp,image/avif"
              className="field !py-2.5 file:mr-3 file:rounded-full file:border-0 file:bg-gold/15 file:px-3 file:py-1 file:text-gold" />
          </div>
          <ColorSelect colors={car.colors} id="upload-color" />
          <KindSelect id="upload-kind" />
          <button type="submit" className="btn-gold !min-h-12">Upload</button>
        </form>

        {car.images.length === 0 ? (
          <p className="mt-4 text-sm text-[#f0a58f]">No photos yet — the site shows a placeholder.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {car.images.map((img) => (
              <li key={img.id} className="overflow-hidden rounded-2xl border border-line bg-ink-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="aspect-[16/10] w-full object-cover" />
                <form key={`${img.color_id}-${img.kind}`} action={updatePhotoAction} className="grid grid-cols-2 gap-2 p-3">
                  <input type="hidden" name="vehicle_id" value={car.id} />
                  <input type="hidden" name="image_id" value={img.id} />
                  <ColorSelect colors={car.colors} id={`c-${img.id}`} value={img.color_id} />
                  <KindSelect id={`k-${img.id}`} value={img.kind} />
                  <div>
                    <label className="label" htmlFor={`p-${img.id}`}>Order</label>
                    <input id={`p-${img.id}`} name="position" type="number" defaultValue={img.position} className="field" />
                  </div>
                  <div className="flex items-end gap-2">
                    <button type="submit" className="btn-outline !min-h-12 !px-4 text-sm">Save</button>
                    <ConfirmSubmit formAction={deletePhotoAction} className="px-2 text-sm text-mute hover:text-[#f0a58f]" message="Delete this photo?">Delete</ConfirmSubmit>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- You may also like ---------- */}
      <section id="related" className="scroll-mt-6">
        <h2 className="text-xl font-semibold">“You may also like”</h2>
        <p className="mt-1 text-sm text-mute">
          Tick up to 6 cars to show under this car, in this order. Nothing ticked = automatic (cars with the same body type).
        </p>
        <form action={saveRelatedAction} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="vehicle_id" value={car.id} />
          <div className="grid max-h-96 gap-1 overflow-y-auto rounded-2xl border border-line bg-ink-2 p-3 sm:grid-cols-2">
            {relatedOrdered.map((o) => (
              <label key={o.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm hover:bg-ink-3">
                <input type="checkbox" name="related" value={o.id} defaultChecked={car.related.includes(o.id)} className="size-5 accent-[#c9a66b]" />
                <span>{o.name}</span>
                {!o.published && <span className="text-xs text-mute-2">(hidden)</span>}
              </label>
            ))}
          </div>
          <button type="submit" className="btn-gold self-start">Save “You may also like”</button>
        </form>
      </section>

      {/* ---------- Delete ---------- */}
      <section>
        <details className="rounded-2xl border border-[#f0a58f]/30 p-4">
          <summary className="cursor-pointer text-sm text-[#f0a58f]">Delete this car</summary>
          <form action={deleteCarAction} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="id" value={car.id} />
            <p className="text-sm text-mute">
              This removes the car, its colours and photos for good. Past sales stay in the sales history.
              To just hide it, untick “Show on the site” instead.
            </p>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" name="confirm" required className="size-5 accent-[#f0a58f]" />
              Yes, delete {carName(car)} permanently
            </label>
            <button type="submit" className="self-start rounded-full border border-[#f0a58f]/60 px-5 py-3 text-sm text-[#f0a58f] hover:bg-[#f0a58f]/10">
              Delete car
            </button>
          </form>
        </details>
      </section>
    </div>
  );
}

function ColorSelect({ colors, id, value }: { colors: { id: number; name: { en: string } }[]; id: string; value?: number | null }) {
  return (
    <div>
      <label className="label" htmlFor={id}>Colour</label>
      <select id={id} name="color_id" defaultValue={value ?? ""} className="field">
        <option value="">All colours</option>
        {colors.map((c) => <option key={c.id} value={c.id}>{c.name.en}</option>)}
      </select>
    </div>
  );
}

function KindSelect({ id, value }: { id: string; value?: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>Type</label>
      <select id={id} name="kind" defaultValue={value ?? "EXTERIOR"} className="field">
        <option value="EXTERIOR">Exterior</option>
        <option value="INTERIOR">Interior</option>
      </select>
    </div>
  );
}
