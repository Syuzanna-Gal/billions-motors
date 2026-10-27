"use client";

import { useActionState, useState } from "react";
import type { SellableCar, SaleResult } from "@/lib/admin/sales";
import { sellAction } from "../../actions";
import type { AdminDict } from "@/lib/admin/i18n";
import { interpolate } from "@/lib/format";
import { comboStock, firstAvailable, paintStock } from "@/lib/colour-stock";

/** Pick the car (and colour), press one button. Optional details are folded away. */
export function SellForm({
  cars, t, statusLabels, saving,
}: { cars: SellableCar[]; t: AdminDict["sell"]; statusLabels: Record<string, string>; saving: string }) {
  const [carId, setCarId] = useState("");
  // Counted by colour: the chosen paint and interior (ids), so the counts can follow the choice.
  const [paintId, setPaintId] = useState<number | null>(null);
  const [trimId, setTrimId] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState<SaleResult | undefined, FormData>(async (prev, form) => {
    const result = await sellAction(prev, form);
    // After a sale start from an empty form, so a second click can't sell a different car by mistake.
    if (result?.ok) {
      setCarId("");
      setPaintId(null);
      setTrimId(null);
      setFormKey((k) => k + 1);
    }
    return result;
  }, undefined);
  const car = cars.find((c) => String(c.id) === carId);
  const byColour = !!car && car.combos.length > 0;
  const needsTrim = byColour && car.interiors.length > 0;
  const comboLeft = byColour && paintId !== null && (!needsTrim || trimId !== null)
    ? comboStock(car.combos, paintId, needsTrim ? trimId : null) : null;
  const soldOut = car?.stock === 0 || comboLeft === 0;
  const ready = !!car && (!byColour || (comboLeft ?? 0) > 0);

  /** On choosing a car counted by colour, preselect the first paint and interior that have units. */
  const chooseCar = (id: string) => {
    setCarId(id);
    const next = cars.find((c) => String(c.id) === id);
    if (!next?.combos.length) {
      setPaintId(null);
      setTrimId(null);
      return;
    }
    const paint = next.colors[firstAvailable(next.colors, (p) => paintStock(next.combos, p.id))];
    setPaintId(paint?.id ?? null);
    setTrimId(pickTrim(next, paint?.id ?? null));
  };
  const pickTrim = (c: SellableCar, paint: number | null) =>
    paint === null || !c.interiors.length ? null : c.interiors[firstAvailable(c.interiors, (i) => comboStock(c.combos, paint, i.id))]?.id ?? null;

  return (
    <div className="flex flex-col gap-5">
      {state?.ok && (
        <div role="status" className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-gold">
          <p className="font-semibold">{interpolate(t.sold, { car: state.carName })}</p>
          <p className="mt-1 text-sm">
            {state.byColour
              ? state.stockLeft === 0 ? t.comboNoneLeft : interpolate(t.comboLeft, { count: state.stockLeft ?? 0 })
              : state.tracked
              ? state.stockLeft === 0
                ? t.lastOne
                : interpolate(t.left, { count: state.stockLeft ?? 0 })
              : t.untracked}
          </p>
          <button
            type="button"
            className="mt-3 text-sm underline"
            onClick={() => {
              setCarId("");
              setPaintId(null);
              setTrimId(null);
              setFormKey((k) => k + 1);
            }}
          >
            {t.another}
          </button>
        </div>
      )}
      {state && !state.ok && (
        <p role="alert" className="rounded-2xl border border-[#f0a58f]/50 bg-[#f0a58f]/10 p-4 text-sm text-[#f6c4b4]">{state.error}</p>
      )}

      <form key={formKey} action={action} className="flex flex-col gap-5 rounded-[24px] border border-line bg-ink-2 p-5 sm:p-7">
        <div>
          <label htmlFor="vehicle_id" className="label">{t.which}</label>
          <select id="vehicle_id" name="vehicle_id" required value={carId} onChange={(e) => chooseCar(e.target.value)} className="field text-base">
            <option value="" disabled>{t.choose}</option>
            {cars.map((c) => (
              <option key={c.id} value={c.id} disabled={c.stock === 0}>
                {c.name} — {c.stock === null ? statusLabels[c.status] ?? c.status : c.stock === 0 ? t.soldOut : interpolate(t.inStock, { count: c.stock })}
              </option>
            ))}
          </select>
        </div>

        {car && byColour && (
          <>
            <ChoiceGroup legend={t.colour} name="color_id" items={car.colors} selected={paintId}
              left={(id) => paintStock(car.combos, id)} leftLabel={t.optionLeft}
              onChange={(id) => {
                setPaintId(id);
                setTrimId(pickTrim(car, id));
              }} />
            {needsTrim && paintId !== null && (
              <ChoiceGroup legend={t.interior} name="interior_id" items={car.interiors} selected={trimId}
                left={(id) => comboStock(car.combos, paintId, id)} leftLabel={t.optionLeft} onChange={setTrimId} />
            )}
          </>
        )}

        {car && !byColour && car.colors.length > 0 && (
          <fieldset>
            <legend className="label">{t.colour}</legend>
            <div className="flex flex-wrap gap-2">
              {car.colors.map((c, i) => (
                <label key={c.id} className="cursor-pointer">
                  <input type="radio" name="color_id" value={c.id} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm text-mute peer-checked:border-gold peer-checked:text-ivory peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold">
                    <span className="size-4 rounded-full ring-1 ring-white/20" style={{ backgroundColor: c.hex }} aria-hidden="true" />
                    {c.name}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <details className="rounded-2xl border border-line p-4">
          <summary className="cursor-pointer text-sm text-mute">{t.optional}</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="quantity" className="label">{t.quantity}</label>
              <input id="quantity" name="quantity" type="number" min={1} max={comboLeft ?? car?.stock ?? 50} defaultValue={1} className="field" />
            </div>
            <div>
              <label htmlFor="price_amd" className="label">{t.finalPrice}</label>
              <input id="price_amd" name="price_amd" inputMode="numeric" className="field" />
            </div>
            <div>
              <label htmlFor="customer_name" className="label">{t.customerName}</label>
              <input id="customer_name" name="customer_name" className="field" />
            </div>
            <div>
              <label htmlFor="customer_phone" className="label">{t.customerPhone}</label>
              <input id="customer_phone" name="customer_phone" type="tel" className="field" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="note" className="label">{t.note}</label>
              <textarea id="note" name="note" className="field" />
            </div>
          </div>
        </details>

        <button type="submit" disabled={!ready || soldOut || pending} className="btn-gold min-h-14 text-base disabled:opacity-50">
          {pending ? saving : car ? interpolate(t.markSold, { car: car.name }) : t.markSoldEmpty}
        </button>
      </form>
    </div>
  );
}

/** Colour choice with the units left of each; options without units can't be picked. */
function ChoiceGroup({
  legend, name, items, selected, left, leftLabel, onChange,
}: {
  legend: string; name: string; items: { id: number; name: string; hex: string }[]; selected: number | null;
  left: (id: number) => number; leftLabel: string; onChange: (id: number) => void;
}) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {items.map((c) => {
          const n = left(c.id);
          return (
            <label key={c.id} className={n > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-40"}>
              <input type="radio" name={name} value={c.id} checked={selected === c.id} disabled={n === 0}
                onChange={() => onChange(c.id)} className="peer sr-only" />
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm text-mute peer-checked:border-gold peer-checked:text-ivory peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold">
                <span className="size-4 rounded-full ring-1 ring-white/20" style={{ backgroundColor: c.hex }} aria-hidden="true" />
                {c.name}
                <span className="text-xs text-mute-2">· {interpolate(leftLabel, { count: n })}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
