"use client";

import { useActionState, useState } from "react";
import type { SellableCar, SaleResult } from "@/lib/admin/sales";
import { sellAction } from "../../actions";

const statusLabel: Record<string, string> = { IN_STOCK: "In stock", IN_TRANSIT: "In transit", PRE_ORDER: "Pre-order" };

/** Pick the car (and colour), press one button. Optional details are folded away. */
export function SellForm({ cars }: { cars: SellableCar[] }) {
  const [state, action, pending] = useActionState<SaleResult | undefined, FormData>(sellAction, undefined);
  const [carId, setCarId] = useState("");
  const [formKey, setFormKey] = useState(0);
  const car = cars.find((c) => String(c.id) === carId);
  const soldOut = car?.stock === 0;

  return (
    <div className="flex flex-col gap-5">
      {state?.ok && (
        <div role="status" className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-gold">
          <p className="font-semibold">Sold: {state.carName}</p>
          <p className="mt-1 text-sm">
            {state.tracked
              ? state.stockLeft === 0
                ? "That was the last one — the car is now hidden from the site."
                : `${state.stockLeft} left in stock.`
              : "This car isn't counted in stock (pre-order / in transit), so only the sale was recorded."}
          </p>
          <button
            type="button"
            className="mt-3 text-sm underline"
            onClick={() => {
              setCarId("");
              setFormKey((k) => k + 1);
            }}
          >
            Record another sale
          </button>
        </div>
      )}
      {state && !state.ok && (
        <p role="alert" className="rounded-2xl border border-[#f0a58f]/50 bg-[#f0a58f]/10 p-4 text-sm text-[#f6c4b4]">{state.error}</p>
      )}

      <form key={formKey} action={action} className="flex flex-col gap-5 rounded-[24px] border border-line bg-ink-2 p-5 sm:p-7">
        <div>
          <label htmlFor="vehicle_id" className="label">1. Which car was sold?</label>
          <select id="vehicle_id" name="vehicle_id" required value={carId} onChange={(e) => setCarId(e.target.value)} className="field text-base">
            <option value="" disabled>Choose a car…</option>
            {cars.map((c) => (
              <option key={c.id} value={c.id} disabled={c.stock === 0}>
                {c.name} — {c.stock === null ? statusLabel[c.status] ?? c.status : c.stock === 0 ? "sold out" : `${c.stock} in stock`}
              </option>
            ))}
          </select>
        </div>

        {car && car.colors.length > 0 && (
          <fieldset>
            <legend className="label">2. Colour</legend>
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
          <summary className="cursor-pointer text-sm text-mute">Optional: quantity, price, customer, note</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="quantity" className="label">Quantity</label>
              <input id="quantity" name="quantity" type="number" min={1} max={car?.stock ?? 50} defaultValue={1} className="field" />
            </div>
            <div>
              <label htmlFor="price_amd" className="label">Final price (AMD)</label>
              <input id="price_amd" name="price_amd" inputMode="numeric" className="field" />
            </div>
            <div>
              <label htmlFor="customer_name" className="label">Customer name</label>
              <input id="customer_name" name="customer_name" className="field" />
            </div>
            <div>
              <label htmlFor="customer_phone" className="label">Customer phone</label>
              <input id="customer_phone" name="customer_phone" type="tel" className="field" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="note" className="label">Note</label>
              <textarea id="note" name="note" className="field" />
            </div>
          </div>
        </details>

        <button type="submit" disabled={!car || soldOut || pending} className="btn-gold min-h-14 text-base disabled:opacity-50">
          {pending ? "Saving…" : car ? `Mark “${car.name}” as sold` : "Mark as sold"}
        </button>
      </form>
    </div>
  );
}
