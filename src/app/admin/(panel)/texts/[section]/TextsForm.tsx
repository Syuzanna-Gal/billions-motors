"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { TextRow } from "@/lib/admin/texts";
import { saveTextsAction, type TextsState } from "../../../actions";

const LANGS: [Locale, string][] = [["hy", "Armenian"], ["en", "English"], ["ru", "Russian"]];
const fieldName = (key: string, l: Locale) => `t:${key}:${l}`;

/**
 * One row per text, one box per language. Lists (paragraphs, strip items) are one box with a
 * blank line between items. "Default" puts the original text back into the box.
 */
export function TextsForm({ section, rows, groupTitles }: { section: string; rows: TextRow[]; groupTitles: Record<string, string> }) {
  const [state, setState] = useState<TextsState>();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const groups = [...new Set(rows.map((r) => r.group))];

  const resetBox = (name: string, value: string) => {
    const box = formRef.current?.elements.namedItem(name);
    if (box instanceof HTMLTextAreaElement) box.value = value;
  };

  // Submitted by hand (not <form action>) so React doesn't clear the boxes afterwards:
  // after an error the editor keeps everything they typed.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => setState(await saveTextsAction(undefined, data)));
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-8">
      <input type="hidden" name="section" value={section} />
      {groups.map((g) => (
        <fieldset key={g} className="flex flex-col gap-3">
          {groups.length > 1 && <legend className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-gold-mid">{groupTitles[g] ?? g}</legend>}
          {rows.filter((r) => r.group === g).map((row) => (
            <div key={row.field.key} className="rounded-2xl border border-line bg-ink-2 p-4">
              <p className="mb-3 flex flex-wrap items-baseline gap-x-3 text-sm font-semibold">
                {row.label || groupTitles[g]}
                {row.field.kind === "list" && <span className="text-xs font-normal text-mute-2">One item per block — leave a blank line between items.</span>}
              </p>
              <div className="grid gap-3 lg:grid-cols-3">
                {LANGS.map(([l, langName]) => {
                  const v = row.values[l];
                  const name = fieldName(row.field.key, l);
                  const error = state?.errors?.[name];
                  const lines = Math.min(12, Math.max(row.field.kind === "list" ? 4 : 1, Math.ceil(v.current.length / 48), v.current.split("\n").length));
                  return (
                    <div key={l}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <label htmlFor={name} className="text-xs text-mute-2">
                          {langName}
                          {v.edited && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold">edited</span>}
                        </label>
                        {v.edited && (
                          <button type="button" onClick={() => resetBox(name, v.default)} className="text-[11px] text-mute-2 hover:text-gold"
                            title={v.default}>
                            Default ↺
                          </button>
                        )}
                      </div>
                      <textarea
                        id={name}
                        name={name}
                        defaultValue={v.current}
                        rows={lines}
                        lang={l}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${name}-error` : undefined}
                        className={`field !min-h-0 resize-y py-2.5 leading-relaxed ${error ? "!border-[#f0a58f]" : ""}`}
                      />
                      {error && <p id={`${name}-error`} className="mt-1 text-xs text-[#f6c4b4]">{error}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </fieldset>
      ))}

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-4 border-t border-line bg-ink/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="submit" disabled={pending} className="btn-gold disabled:opacity-60">{pending ? "Saving…" : "Save texts"}</button>
        {state?.message && <p role="status" className="text-sm text-gold">{state.message}</p>}
        {state?.error && <p role="alert" className="text-sm text-[#f0a58f]">{state.error}</p>}
      </div>
    </form>
  );
}
