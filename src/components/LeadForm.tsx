"use client";

import { useId, useState } from "react";
import type { Dictionary } from "@/i18n";
import type { ContactChannel, LeadType } from "@/lib/types";

type Props = {
  t: Dictionary["form"];
  type: LeadType;
  vehicleSlug?: string;
  locale: string;
  submitLabel?: string;
  /** Extra context sent with the lead, e.g. loan calculator inputs. */
  extra?: Record<string, string | number>;
};

const channels: ContactChannel[] = ["WHATSAPP", "PHONE", "TELEGRAM", "EMAIL"];

export function LeadForm({ t, type, vehicleSlug, locale, submitLabel, extra }: Props) {
  const id = useId();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setState("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type, vehicleSlug, locale, extra }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="rounded-2xl border border-gold/40 bg-ink p-6 text-ivory">
        {t.success}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
      <div>
        <label htmlFor={`${id}-name`} className="label">{t.name} *</label>
        <input id={`${id}-name`} name="name" required autoComplete="name" maxLength={120} className="field" />
      </div>
      <div>
        <label htmlFor={`${id}-phone`} className="label">{t.phone} *</label>
        <input id={`${id}-phone`} name="phone" type="tel" required autoComplete="tel" inputMode="tel"
          pattern="[0-9 +\(\)\-]{6,20}" placeholder="+374" className="field" />
      </div>
      <div>
        <label htmlFor={`${id}-email`} className="label">{t.email}</label>
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={160} className="field" />
      </div>
      <fieldset>
        <legend className="label">{t.contactVia}</legend>
        <div className="flex flex-wrap gap-2">
          {channels.map((c, i) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="channel" value={c} defaultChecked={i === 0} className="peer sr-only" />
              <span className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm text-mute transition-colors peer-checked:border-gold peer-checked:text-ivory peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold">
                {t.channels[c]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${id}-msg`} className="label">{t.message}</label>
        <textarea id={`${id}-msg`} name="message" maxLength={2000} className="field" />
      </div>
      <label className="flex items-start gap-3 text-sm text-mute">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 flex-none accent-[#c9a66b]" />
        {t.consent}
      </label>
      <button type="submit" disabled={state === "sending"} className="btn-gold disabled:opacity-60">
        {state === "sending" ? t.sending : (submitLabel ?? t.send)}
      </button>
      {state === "error" && (
        <p role="alert" className="text-sm text-[#f0a58f]">{t.error}</p>
      )}
    </form>
  );
}
