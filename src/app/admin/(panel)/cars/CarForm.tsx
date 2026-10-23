"use client";

import { useActionState, useState } from "react";
import type { CarFields } from "@/lib/admin/cars";
import { saveCarAction, type FormState } from "../../actions";

const STATUS = [["IN_STOCK", "In stock"], ["IN_TRANSIT", "In transit"], ["PRE_ORDER", "Pre-order"]] as const;
const FUEL = [["ELECTRIC", "Electric"], ["EREV", "Range-extended hybrid"], ["PHEV", "Plug-in hybrid"], ["HYBRID", "Hybrid"], ["PETROL", "Petrol"]] as const;
const BODY = [["SEDAN", "Sedan"], ["CROSSOVER", "Crossover"], ["SUV", "SUV"], ["HATCHBACK", "Hatchback"], ["MPV", "Minivan"], ["PICKUP", "Pickup"]] as const;
const DRIVE = [["FWD", "Front-wheel"], ["RWD", "Rear-wheel"], ["AWD", "All-wheel"]] as const;
const LANGS = [["hy", "Armenian"], ["en", "English"], ["ru", "Russian"]] as const;

type Initial = Partial<CarFields> & { id?: number };

export function CarForm({ car }: { car?: Initial }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCarAction, undefined);
  const [tracked, setTracked] = useState(car?.stock !== null && car?.stock !== undefined);
  const err = state?.errors ?? {};
  const values = state?.values;
  const f = { car, err, values };
  const typed = (k: string, fallback: string) => values?.[k] ?? fallback;
  return (
    <form action={action} className="flex flex-col gap-6">
      {car?.id && <input type="hidden" name="id" value={car.id} />}

      <Section title="Basics">
        <Field {...f} name="brand" label="Brand" required />
        <Field {...f} name="model" label="Model" required />
        <Field {...f} name="trim_level" label="Trim / version" hint="e.g. 4WD Ultra+" />
        <Field {...f} name="year" label="Year" type="number" required />
        <Select {...f} name="status" label="Availability" options={STATUS} />
        <Select {...f} name="body_type" label="Body type" options={BODY} />
        <Select {...f} name="fuel_type" label="Fuel" options={FUEL} />
        <Select {...f} name="drive" label="Drive" options={DRIVE} />
      </Section>

      <Section title="Price and stock">
        <Field {...f} name="price_amd" label="Price (AMD)" type="number" hint="Leave empty to show “Contact for price”" />
        <fieldset>
          <legend className="label">Stock</legend>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="stock_mode" value="tracked" checked={tracked} onChange={() => setTracked(true)} className="accent-[#c9a66b]" />
              Count units
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="stock_mode" value="untracked" checked={!tracked} onChange={() => setTracked(false)} className="accent-[#c9a66b]" />
              Not counted (pre-order)
            </label>
          </div>
          {tracked && (
            <input name="stock" type="number" min={0} defaultValue={value(car, "stock", values) || "1"} aria-label="Units in stock" className="field mt-3 max-w-32" />
          )}
          {err.stock && <p className="mt-1 text-xs text-[#f0a58f]">{err.stock}</p>}
        </fieldset>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="published" defaultChecked={values ? values.published === "on" : (car?.published ?? true)} className="size-5 accent-[#c9a66b]" />
          Show on the site
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="featured" defaultChecked={values ? values.featured === "on" : (car?.featured ?? false)} className="size-5 accent-[#c9a66b]" />
          Featured on the home page
        </label>
      </Section>

      <Section title="Specifications">
        <Field {...f} name="horsepower" label="Horsepower (hp)" type="number" required />
        <Field {...f} name="ev_range_km" label="Electric range (km)" type="number" />
        <Field {...f} name="battery_kwh" label="Battery (kWh)" type="number" />
        <Field {...f} name="accel_0_100" label="0–100 km/h (seconds)" type="number" />
        <Field {...f} name="top_speed_kmh" label="Top speed (km/h)" type="number" />
        <Field {...f} name="seats" label="Seats" type="number" required />
        <Field {...f} name="length_mm" label="Length (mm)" type="number" />
        <Field {...f} name="width_mm" label="Width (mm)" type="number" />
        <Field {...f} name="height_mm" label="Height (mm)" type="number" />
        <Field {...f} name="warranty_years" label="Warranty (years)" type="number" required />
        <Field {...f} name="warranty_km" label="Warranty (km)" type="number" required />
      </Section>

      <Section title="Texts in each language">
        {LANGS.map(([l, name]) => (
          <div key={l} className="flex flex-col gap-3 rounded-2xl border border-line p-4 sm:col-span-2">
            <p className="text-sm font-semibold">{name}</p>
            <div>
              <label htmlFor={`transmission_${l}`} className="label">Transmission</label>
              <input id={`transmission_${l}`} name={`transmission_${l}`} defaultValue={typed(`transmission_${l}`, car?.transmission?.[l] ?? "")} className="field" />
            </div>
            <div>
              <label htmlFor={`description_${l}`} className="label">Description (optional)</label>
              <textarea id={`description_${l}`} name={`description_${l}`} defaultValue={typed(`description_${l}`, car?.description?.[l] ?? "")} className="field" />
            </div>
          </div>
        ))}
      </Section>

      <Section title="Web address">
        <Field {...f} name="slug" label="URL name" wide hint="Leave empty to create it from brand, model and year. Changing it breaks old links." />
      </Section>

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-4 border-t border-line bg-ink/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="submit" disabled={pending} className="btn-gold disabled:opacity-60">
          {pending ? "Saving…" : car?.id ? "Save changes" : "Create car"}
        </button>
        {state?.message && <p role="status" className="text-sm text-gold">{state.message}</p>}
        {state?.error && <p role="alert" className="text-sm text-[#f0a58f]">{state.error}</p>}
      </div>
    </form>
  );
}

type Common = { car?: Initial; err: Partial<Record<string, string>>; values?: Record<string, string> };

const value = (car: Initial | undefined, k: keyof CarFields, values?: Record<string, string>) => {
  if (values && k in values) return values[k];
  const x = car?.[k];
  return x === null || x === undefined || typeof x === "object" ? "" : String(x);
};

/* Defined outside CarForm so inputs keep what was typed when the form re-renders. */
function Field({ car, err, values, name, label, type = "text", hint, required, wide }: Common & {
  name: keyof CarFields; label: string; type?: string; hint?: string; required?: boolean; wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={name} className="label">{label}{required && " *"}</label>
      <input id={name} name={name} type={type} defaultValue={value(car, name, values)} required={required}
        inputMode={type === "number" ? "decimal" : undefined} step={type === "number" ? "any" : undefined}
        aria-invalid={err[name] ? true : undefined} aria-describedby={err[name] ? `${name}-err` : undefined}
        className={`field ${err[name] ? "!border-[#f0a58f]" : ""}`} />
      {hint && !err[name] && <p className="mt-1 text-xs text-mute-2">{hint}</p>}
      {err[name] && <p id={`${name}-err`} className="mt-1 text-xs text-[#f0a58f]">{err[name]}</p>}
    </div>
  );
}

function Select({ car, values, name, label, options }: Common & { name: keyof CarFields; label: string; options: readonly (readonly [string, string])[] }) {
  return (
    <div>
      <label htmlFor={name} className="label">{label} *</label>
      <select id={name} name={name} defaultValue={value(car, name, values) || options[0][0]} className="field">
        {options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
      </select>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-[20px] border border-line bg-ink-2 p-5 sm:p-6">
      <legend className="px-2 text-sm font-semibold text-gold-mid">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
