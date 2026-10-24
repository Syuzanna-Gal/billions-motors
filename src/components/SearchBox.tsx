"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { Dictionary, Locale } from "@/i18n";
import type { Suggestion, SuggestResponse } from "@/app/api/search/route";
import { interpolate } from "@/lib/format";

/*
 * Header search: a magnifier button that opens a search panel with live suggestions.
 * - Without JavaScript the button is a plain link to the catalogue's search field.
 * - Requests are debounced, the previous one is cancelled, and answers are cached per query,
 *   so typing quickly sends few requests and backspacing sends none.
 * - Keyboard: "/" or Ctrl/⌘+K opens, ↑/↓ choose, Enter opens the car (or all results), Esc closes.
 * - ARIA combobox + listbox so screen readers announce the suggestions.
 */

const DEBOUNCE_MS = 150;
const MIN_LENGTH = 2;

type Status = "idle" | "loading" | "done" | "error";

export function SearchBox({ locale, t }: { locale: Locale; t: Dictionary["search"] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();

  // Close when the page changes (a suggestion or "all results" was followed).
  useEffect(() => setOpen(false), [pathname]);

  // "/" or Ctrl/⌘+K opens search from anywhere, unless the visitor is typing in a field.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable='true']");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  // Following a result: close without moving focus back (the new page takes it).
  const navigated = () => setOpen(false);

  return (
    <>
      <a
        ref={triggerRef}
        href={`/${locale}/cars#q`}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        aria-label={t.open}
        aria-haspopup="dialog"
        className="flex size-11 items-center justify-center rounded-full border border-line text-mute transition-colors hover:border-gold/50 hover:text-ivory"
      >
        <SearchIcon />
      </a>
      {/* Portal: the sticky header's backdrop blur would otherwise trap the fixed panel inside it. */}
      {open && createPortal(<SearchPanel locale={locale} t={t} onClose={close} onNavigate={navigated} />, document.body)}
    </>
  );
}

function SearchPanel({
  locale, t, onClose, onNavigate,
}: { locale: Locale; t: Dictionary["search"]; onClose: () => void; onNavigate: () => void }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cache = useRef(new Map<string, SuggestResponse>());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [active, setActive] = useState(-1);

  const q = query.trim();
  const allResultsHref = `/${locale}/cars?q=${encodeURIComponent(q)}`;

  // Focus the field and stop the page behind from scrolling while the panel is open.
  useEffect(() => {
    inputRef.current?.focus();
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = overflow;
    };
  }, []);

  // Fetch suggestions: debounced, cancellable, cached.
  useEffect(() => {
    setActive(-1);
    const show = (data: SuggestResponse) => {
      setResults(data.suggestions);
      setTotal(data.total);
      setStatus("done");
    };
    if (q.length < MIN_LENGTH) {
      setResults([]);
      setTotal(0);
      setStatus("idle");
      return;
    }
    const key = q.toLowerCase();
    const cached = cache.current.get(key);
    if (cached) {
      show(cached);
      return;
    }
    setStatus("loading");
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?locale=${locale}&q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SuggestResponse;
        cache.current.set(key, data);
        show(data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setStatus("error");
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, locale]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const href = active >= 0 && results[active] ? results[active].href : q.length >= MIN_LENGTH ? allResultsHref : null;
    if (!href) return;
    onNavigate();
    router.push(href);
  };

  // Escape from anywhere in the panel, and keep Tab inside it while it's open.
  const onDialogKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>("input, button, a[href]:not([tabindex='-1'])");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const firstSimilar = results.findIndex((r) => r.similar);
  const hasResults = results.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-ink/70 px-4 pt-20 backdrop-blur-sm sm:pt-28" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose(); // click on the backdrop
    }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t.label} onKeyDown={onDialogKeyDown}
        className="h-fit w-full max-w-2xl overflow-hidden rounded-[24px] border border-line bg-ink-2 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)]">
        <form role="search" action={`/${locale}/cars`} method="get" onSubmit={onSubmit} className="flex items-center gap-3 border-b border-line px-5">
          <span className="text-gold" aria-hidden="true"><SearchIcon /></span>
          <label htmlFor={`${listId}-input`} className="sr-only">{t.label}</label>
          <input
            ref={inputRef}
            id={`${listId}-input`}
            name="q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t.placeholder}
            maxLength={80}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            role="combobox"
            aria-expanded={hasResults}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            className="min-h-16 flex-1 bg-transparent text-lg text-ivory outline-none placeholder:text-mute-2 [&::-webkit-search-cancel-button]:hidden"
          />
          {status === "loading" && <span className="size-4 animate-spin rounded-full border-2 border-gold/30 border-t-gold" aria-hidden="true" />}
          <button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-xs text-mute-2 hover:text-ivory" aria-label={t.close}>
            Esc
          </button>
        </form>

        <ul id={listId} role="listbox" aria-label={t.label} className="max-h-[min(60vh,28rem)] overflow-y-auto">
          {results.map((r, i) => (
            <li key={r.href} id={`${listId}-${i}`} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)}>
              {i === firstSimilar && (
                firstSimilar === 0 ? (
                  <p className="px-5 pb-1 pt-4 text-sm text-mute" aria-hidden="true">{interpolate(t.noExact, { q })}</p>
                ) : (
                  <p className="px-5 pb-1 pt-4 text-[11px] uppercase tracking-[0.14em] text-mute-2" aria-hidden="true">{t.similar}</p>
                )
              )}
              <Link href={r.href} tabIndex={-1} onClick={onNavigate}
                className={`flex items-center gap-4 border-l-2 px-5 py-3 transition-colors ${i === active ? "border-gold bg-white/[0.06]" : "border-transparent"}`}>
                <span className="h-11 w-16 flex-none overflow-hidden rounded-lg bg-ink-3">
                  {r.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image} alt="" className="size-full object-cover" loading="lazy" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${i === active ? "text-gold" : "text-ivory"}`}>{r.name}</span>
                  <span className="block truncate text-xs text-mute-2">{r.meta}</span>
                  {/* On phones the price goes under the name so the name isn't cut short. */}
                  <span className="block truncate text-xs text-gold sm:hidden">{r.price}</span>
                </span>
                <span className="hidden flex-none text-sm text-gold sm:block">{r.price}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line px-5 py-3 text-sm">
          <p className="text-mute-2" aria-live="polite">
            {q.length < MIN_LENGTH
              ? t.hint
              : status === "done" && !hasResults
                ? interpolate(t.nothing, { q })
                : status === "done" && total > 0 // with only close matches the heading above says so
                  ? interpolate(t.found, { count: total })
                  : ""}
          </p>
          {q.length >= MIN_LENGTH && (
            <Link href={allResultsHref} onClick={onNavigate} className="min-w-0 max-w-full truncate text-gold hover:text-ivory">
              {interpolate(t.seeAll, { q })} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
