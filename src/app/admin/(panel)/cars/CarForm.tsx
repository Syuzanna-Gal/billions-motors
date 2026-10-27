"use client";

import { useActionState, useEffect, useState } from "react";
import type { CarFields } from "@/lib/admin/cars";
import { saveCarAction, type FormState } from "../../actions";
import type { AdminDict } from "@/lib/admin/i18n";
import { interpolate } from "@/lib/format";

const STATUS = ["IN_STOCK", "IN_TRANSIT", "PRE_ORDER"] as const;
const FUEL = ["ELECTRIC", "EREV", "PHEV", "HYBRID", "PETROL"] as const;
const BODY = ["SEDAN", "CROSSOVER", "SUV", "HATCHBACK", "WAGON", "MPV", "PICKUP"] as const;
const DRIVE = ["FWD", "RWD", "AWD"] as const;
const LANG_CODES = ["hy", "en", "ru"] as const;

type Initial = Partial<CarFields> & { id?: number };

/** Names for the choice lists, in the admin's language (taken from the site's own texts). */
export type CarFormOptions = {
  status: Record<(typeof STATUS)[number], string>;
  fuel: Record<(typeof FUEL)[number], string>;
  body: Record<(typeof BODY)[number], string>;
  drive: Record<(typeof DRIVE)[number], string>;
  langs: Record<(typeof LANG_CODES)[number], string>;
  saving: string;
};

export function CarForm({
  car, t, options, stockFromColours = null,
}: { car?: Initial; t: AdminDict["carForm"]; options: CarFormOptions; stockFromColours?: number | null }) {
  const opts = <K extends string>(keys: readonly K[], names: Record<K, string>) => keys.map((k) => [k, names[k]] as const);
  const LANGS = LANG_CODES.map((l) => [l, options.langs[l]] as const);
  const [state, action, pending] = useActionState<FormState, FormData>(saveCarAction, undefined);
  const [tracked, setTracked] = useState(car?.stock !== null && car?.stock !== undefined);
  // A new result replaces any message from the page's URL (e.g. "Car created" after the first save).
  useEffect(() => {
    if (!state) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("ok") && !url.searchParams.has("err")) return;
    url.searchParams.delete("ok");
    url.searchParams.delete("err");
    url.searchParams.delete("at");
    window.history.replaceState(null, "", url);
  }, [state]);
  const err = state?.errors ?? {};
  const values = state?.values;
  const f = { car, err, values };
  const typed = (k: string, fallback: string) => values?.[k] ?? fallback;
  return (
    <form action={action} className="flex flex-col gap-6">
      {car?.id && <input type="hidden" name="id" value={car.id} />}

      <Section title={t.basics}>
        <Field {...f} name="brand" label={t.brand} required />
        <Field {...f} name="model" label={t.model} required />
        <Field {...f} name="trim_level" label={t.trim} hint={t.trimHint} />
        <Field {...f} name="year" label={t.year} type="number" required />
        <Select {...f} name="status" label={t.availability} options={opts(STATUS, options.status)} />
        <Field {...f} name="arrival_days" label={t.arrivalDays} type="number" hint={t.arrivalHint} />
        <Select {...f} name="body_type" label={t.body} options={opts(BODY, options.body)} />
        <Select {...f} name="fuel_type" label={t.fuel} options={opts(FUEL, options.fuel)} />
        <Select {...f} name="drive" label={t.drive} options={opts(DRIVE, options.drive)} />
      </Section>

      <Section title={t.priceStock}>
        <Field {...f} name="price_amd" label={t.price} type="number" hint={t.priceHint} />
        {stockFromColours !== null ? (
          <div>
            {/* The total comes from the colours; the server recalculates it on save. */}
            <input type="hidden" name="stock_mode" value="colours" />
            <p className="label">{t.stock}</p>
            <p className="text-sm text-mute">
              <a href="#stock" className="text-gold hover:text-ivory">{interpolate(t.stockFromColours, { count: stockFromColours })}</a>
            </p>
          </div>
        ) : (
        <fieldset>
          <legend className="label">{t.stock}</legend>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="stock_mode" value="tracked" checked={tracked} onChange={() => setTracked(true)} className="accent-[#c9a66b]" />
              {t.countUnits}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="stock_mode" value="untracked" checked={!tracked} onChange={() => setTracked(false)} className="accent-[#c9a66b]" />
              {t.notCounted}
            </label>
          </div>
          {tracked && (
            <input name="stock" type="number" min={0} defaultValue={value(car, "stock", values) || "1"} aria-label={t.unitsInStock} className="field mt-3 max-w-32" />
          )}
          {err.stock && <p className="mt-1 text-xs text-[#f0a58f]">{err.stock}</p>}
        </fieldset>
        )}
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="published" defaultChecked={values ? values.published === "on" : (car?.published ?? true)} className="size-5 accent-[#c9a66b]" />
          {t.showOnSite}
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="featured" defaultChecked={values ? values.featured === "on" : (car?.featured ?? false)} className="size-5 accent-[#c9a66b]" />
          {t.featuredHome}
        </label>
      </Section>

      <Section title={t.specs}>
        <Field {...f} name="horsepower" label={t.hp} type="number" required />
        <Field {...f} name="ev_range_km" label={t.evRange} type="number" />
        <Field {...f} name="battery_kwh" label={t.battery} type="number" />
        <Field {...f} name="accel_0_100" label={t.accel} type="number" />
        <Field {...f} name="top_speed_kmh" label={t.topSpeed} type="number" />
        <Field {...f} name="seats" label={t.seats} type="number" required />
        <Field {...f} name="length_mm" label={t.length} type="number" />
        <Field {...f} name="width_mm" label={t.width} type="number" />
        <Field {...f} name="height_mm" label={t.height} type="number" />
        <Field {...f} name="warranty_years" label={t.warrantyYears} type="number" required />
        <Field {...f} name="warranty_km" label={t.warrantyKm} type="number" required />
      </Section>

      <Section title={t.texts}>
        {LANGS.map(([l, name]) => (
          <div key={l} className="flex flex-col gap-3 rounded-2xl border border-line p-4 sm:col-span-2">
            <p className="text-sm font-semibold">{name}</p>
            <div>
              <label htmlFor={`transmission_${l}`} className="label">{t.transmission}</label>
              <input id={`transmission_${l}`} name={`transmission_${l}`} defaultValue={typed(`transmission_${l}`, car?.transmission?.[l] ?? "")} className="field" />
            </div>
            <div>
              <label htmlFor={`description_${l}`} className="label">{t.description}</label>
              <textarea id={`description_${l}`} name={`description_${l}`} defaultValue={typed(`description_${l}`, car?.description?.[l] ?? "")} className="field" />
            </div>
          </div>
        ))}
      </Section>

      <Section title={t.links}>
        <Field {...f} name="interior_360_url" label={t.view360} type="url" wide hint={t.view360Hint} />
        <Field {...f} name="video_url" label={t.video} type="url" wide />
      </Section>

      <Section title={t.webAddress}>
        <Field {...f} name="slug" label={t.slug} wide hint={t.slugHint} />
      </Section>

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-4 border-t border-line bg-ink/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="submit" disabled={pending} className="btn-gold disabled:opacity-60">
          {pending ? options.saving : car?.id ? t.saveChanges : t.create}
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
