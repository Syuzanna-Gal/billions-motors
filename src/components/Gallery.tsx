"use client";

import { useState } from "react";
import { useCarColours } from "./CarColours";
import type { VehicleColor, VehicleImage } from "@/lib/types";
import { CarPhoto } from "./CarPhoto";

type Labels = {
  exterior: string;
  interior: string;
  photo: string;
  previous: string;
  next: string;
  color: string;
  interiorColor: string;
  view360: string;
};
type Kind = VehicleImage["kind"];

/*
 * Car photos with two pickers: paint colour (exterior photos) and interior trim
 * (interior photos). Each picker shows only when there's something to choose.
 * A colour without photos falls back to the car's general photos of that kind.
 * Must be inside <CarColoursProvider>.
 */
export function Gallery({
  images,
  alt,
  labels,
  interior360Url,
}: {
  images: VehicleImage[];
  alt: string;
  labels: Labels;
  interior360Url?: string | null;
}) {
  // Colour choice lives in <CarColoursProvider>, so the availability badge can follow it.
  const { paints, trims, paintIndex, trimIndex, kind, setPaintIndex, setTrimIndex, setKind } = useCarColours();
  const [index, setIndex] = useState(0);

  const paint = paints[paintIndex];
  const trim = trims[trimIndex];
  const general = (k: Kind) => images.filter((i) => i.kind === k);
  const ofKind = (c: VehicleColor | undefined, k: Kind) => c?.images.filter((i) => i.kind === k) ?? [];
  const firstNonEmpty = (...lists: VehicleImage[][]) => lists.find((l) => l.length > 0) ?? [];

  const exteriorList = firstNonEmpty(ofKind(paint, "EXTERIOR"), general("EXTERIOR"));
  // Interior: the chosen trim, else interior shots uploaded under the paint colour, else general ones.
  const interiorList = firstNonEmpty(ofKind(trim, "INTERIOR"), ofKind(paint, "INTERIOR"), general("INTERIOR"));
  const hasInterior = trims.some((t) => t.images.length > 0) || interiorList.length > 0;

  const list = kind === "EXTERIOR" ? exteriorList : interiorList;
  const current = list[Math.min(index, list.length - 1)];
  const count = Math.max(list.length, 1);
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);
  const label = kind === "EXTERIOR" ? paint?.name : trim?.name;

  return (
    <div className="flex flex-col gap-4">
      {(hasInterior || interior360Url) && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Photo set">
          {(["EXTERIOR", "INTERIOR"] as const)
            .filter((k) => k === "EXTERIOR" || hasInterior)
            .map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => {
                  setKind(k);
                  setIndex(0);
                }}
                className={`min-h-10 rounded-full px-4 text-sm transition-colors ${
                  kind === k ? "bg-ivory font-semibold text-ink" : "border border-line text-mute hover:text-ivory"
                }`}
              >
                {k === "EXTERIOR" ? labels.exterior : labels.interior}
              </button>
            ))}
          {interior360Url && (
            <a href={interior360Url} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-gold/40 px-4 text-sm text-gold hover:border-gold hover:text-ivory">
              {labels.view360} ↗
            </a>
          )}
        </div>
      )}

      <div className="relative aspect-[16/10] overflow-hidden rounded-[24px] border border-line">
        <CarPhoto
          // Remount per photo so a slow image never shows over the next one.
          key={current?.url ?? "none"}
          image={current}
          alt={label ? `${alt} — ${label}` : alt}
          placeholder={labels.photo}
          tint={kind === "EXTERIOR" ? paint?.hex : undefined}
          priority
        />
        {label && (
          <span className="absolute left-4 top-4 max-w-[70%] truncate rounded-full bg-ink/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-ivory backdrop-blur">
            {label}
          </span>
        )}
        {list.length > 1 && (
          <>
            <NavButton side="left" label={labels.previous} onClick={() => go(-1)} />
            <NavButton side="right" label={labels.next} onClick={() => go(1)} />
            <span className="absolute bottom-4 right-4 rounded-full bg-ink/70 px-3 py-1 text-xs text-ivory">
              {Math.min(index, list.length - 1) + 1} / {list.length}
            </span>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {list.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1} / ${list.length}`}
              aria-current={i === index ? "true" : undefined}
              className={`h-16 w-24 flex-none overflow-hidden rounded-xl border ${i === index ? "border-gold" : "border-line opacity-60 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {kind === "EXTERIOR" && paints.length > 0 && (
        <Swatches
          name="car-color"
          legend={labels.color}
          colors={paints}
          active={paintIndex}
          onChange={(i) => {
            setPaintIndex(i);
            setIndex(0);
          }}
        />
      )}
      {kind === "INTERIOR" && trims.length > 0 && (
        <Swatches
          name="car-interior"
          legend={labels.interiorColor}
          colors={trims}
          active={trimIndex}
          onChange={(i) => {
            setTrimIndex(i);
            setIndex(0);
          }}
        />
      )}
    </div>
  );
}

function Swatches({
  name, legend, colors, active, onChange,
}: { name: string; legend: string; colors: VehicleColor[]; active: number; onChange: (i: number) => void }) {
  return (
    <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[20px] border border-line bg-ink-2 px-5 py-4">
      <legend className="sr-only">{legend}</legend>
      <span className="text-sm text-mute-2" aria-hidden="true">
        {legend}: <span className="text-ivory">{colors[active]?.name}</span>
      </span>
      <div className="flex flex-wrap gap-2.5">
        {colors.map((c, i) => (
          <label key={c.id} title={c.name} className="cursor-pointer">
            <input type="radio" name={name} value={c.id} checked={i === active} onChange={() => onChange(i)} className="peer sr-only" />
            <span className="sr-only">{c.name}</span>
            <span
              aria-hidden="true"
              className={`flex size-11 items-center justify-center rounded-full border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold ${
                i === active ? "border-gold" : "border-line hover:border-gold/50"
              }`}
            >
              <span className="size-8 rounded-full ring-1 ring-white/15" style={{ backgroundColor: c.hex }} />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function NavButton({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 -translate-y-1/2 ${side === "left" ? "left-4" : "right-4"} flex size-11 items-center justify-center rounded-full bg-ink/70 text-ivory backdrop-blur hover:bg-ink`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d={side === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}
