"use client";

import { useMemo, useState } from "react";
import type { Dictionary } from "@/i18n";
import { calculateLoan } from "@/lib/loan";

type Props = { t: Dictionary["loan"]; locale: "hy" | "en"; initialPrice?: number };

const TERMS = [12, 24, 36, 48, 60, 72, 84];

export function LoanCalculator({ t, locale, initialPrice }: Props) {
  const [price, setPrice] = useState(initialPrice ?? 15_000_000);
  const [down, setDown] = useState(Math.round((initialPrice ?? 15_000_000) * 0.2));
  const [rate, setRate] = useState(14);
  const [term, setTerm] = useState(48);

  const result = useMemo(() => calculateLoan(price, Math.min(down, price), rate, term), [price, down, rate, term]);
  const nf = new Intl.NumberFormat(locale === "hy" ? "hy-AM" : "en-US");
  const amd = (n: number) => `${nf.format(Math.round(n))} ${locale === "hy" ? "դր." : "AMD"}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-7 rounded-[24px] border border-line bg-ink-2 p-6 sm:p-8">
        <MoneyField id="loan-price" label={t.price} value={price} onChange={setPrice} min={1_000_000} max={150_000_000} step={500_000} nf={nf} />
        <MoneyField id="loan-down" label={t.down} value={down} onChange={setDown} min={0} max={price} step={250_000} nf={nf} />
        <div>
          <label htmlFor="loan-rate" className="label">{t.rate}</label>
          <div className="flex items-center gap-4">
            <input id="loan-rate" type="range" min={0} max={30} step={0.5} value={rate}
              onChange={(e) => setRate(Number(e.target.value))} className="flex-1 accent-[#c9a66b]" />
            <output htmlFor="loan-rate" className="w-16 text-right text-lg">{rate}%</output>
          </div>
        </div>
        <fieldset>
          <legend className="label">{t.term}</legend>
          <div className="flex flex-wrap gap-2">
            {TERMS.map((m) => (
              <button key={m} type="button" aria-pressed={term === m} onClick={() => setTerm(m)}
                className={`min-h-11 min-w-14 rounded-full px-4 text-sm transition-colors ${
                  term === m ? "gold-gradient font-semibold text-ink" : "border border-line text-mute hover:text-ivory"
                }`}>
                {m}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-col justify-between gap-6 rounded-[24px] border border-gold/30 bg-[radial-gradient(100%_100%_at_100%_0%,#2a2620_0%,#141416_70%)] p-6 sm:p-8" aria-live="polite">
        <div>
          <p className="eyebrow">{t.monthly}</p>
          <p className="text-gold mt-3 font-serif text-[52px] leading-none sm:text-6xl">{amd(result.monthly)}</p>
        </div>
        <dl className="flex flex-col divide-y divide-line text-[15px]">
          <Row label={t.amount} value={amd(result.principal)} />
          <Row label={t.interest} value={amd(result.totalInterest)} />
          <Row label={t.total} value={amd(result.totalRepayment)} />
          <Row label={t.term} value={`${term}`} />
        </dl>
        <p className="text-xs leading-relaxed text-mute-2">{t.note}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt className="text-mute">{label}</dt>
      <dd className="text-ivory">{value}</dd>
    </div>
  );
}

function MoneyField({
  id, label, value, onChange, min, max, step, nf,
}: {
  id: string; label: string; value: number; onChange: (n: number) => void;
  min: number; max: number; step: number; nf: Intl.NumberFormat;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id}
        inputMode="numeric"
        value={nf.format(value)}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/[^\d]/g, ""));
          if (Number.isFinite(n)) onChange(Math.min(n, max));
        }}
        className="field text-lg"
      />
      <input type="range" aria-label={label} min={min} max={Math.max(max, min)} step={step} value={Math.min(value, max)}
        onChange={(e) => onChange(Number(e.target.value))} className="mt-3 w-full accent-[#c9a66b]" />
    </div>
  );
}
