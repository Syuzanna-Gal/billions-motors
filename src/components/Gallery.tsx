"use client";

import { useState } from "react";
import type { VehicleColor, VehicleImage } from "@/lib/types";
import { CarPhoto } from "./CarPhoto";

type Labels = { exterior: string; interior: string; photo: string; previous: string; next: string; color: string };

export function Gallery({
  images,
  colors,
  alt,
  labels,
}: {
  images: VehicleImage[];
  colors: VehicleColor[];
  alt: string;
  labels: Labels;
}) {
  const [colorIndex, setColorIndex] = useState(0);
  const [kind, setKind] = useState<VehicleImage["kind"]>("EXTERIOR");
  const [index, setIndex] = useState(0);

  const color = colors[colorIndex];
  // A colour's own photos win; otherwise show the car's general photos.
  const pool = color && color.images.length ? color.images : images;
  const hasInterior = pool.some((i) => i.kind === "INTERIOR");
  const list = pool.filter((i) => i.kind === kind);
  const current = list[index];
  const count = Math.max(list.length, 1);
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <div className="flex flex-col gap-4">
      {hasInterior && (
        <div className="flex gap-2" role="group" aria-label="Photo set">
          {(["EXTERIOR", "INTERIOR"] as const).map((k) => (
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
        </div>
      )}

      <div className="relative aspect-[16/10] overflow-hidden rounded-[24px] border border-line">
        <CarPhoto
          image={current}
          alt={color ? `${alt} — ${color.name}` : alt}
          placeholder={labels.photo}
          tint={kind === "EXTERIOR" ? color?.hex : undefined}
          priority
        />
        {color && (
          <span className="absolute left-4 top-4 rounded-full bg-ink/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-ivory backdrop-blur">
            {color.name}
          </span>
        )}
        {list.length > 1 && (
          <>
            <NavButton side="left" label={labels.previous} onClick={() => go(-1)} />
            <NavButton side="right" label={labels.next} onClick={() => go(1)} />
            <span className="absolute bottom-4 right-4 rounded-full bg-ink/70 px-3 py-1 text-xs text-ivory">
              {index + 1} / {list.length}
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
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {colors.length > 0 && (
        <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[20px] border border-line bg-ink-2 px-5 py-4">
          <legend className="sr-only">{labels.color}</legend>
          <span className="text-sm text-mute-2" aria-hidden="true">
            {labels.color}: <span className="text-ivory">{color?.name}</span>
          </span>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c, i) => {
              const active = i === colorIndex;
              return (
                <label key={c.name} title={c.name} className="cursor-pointer">
                  <input
                    type="radio"
                    name="car-color"
                    value={c.name}
                    checked={active}
                    onChange={() => {
                      setColorIndex(i);
                      setIndex(0);
                    }}
                    className="peer sr-only"
                  />
                  <span className="sr-only">{c.name}</span>
                  <span
                    aria-hidden="true"
                    className={`flex size-11 items-center justify-center rounded-full border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold ${
                      active ? "border-gold" : "border-line hover:border-gold/50"
                    }`}
                  >
                    <span className="size-8 rounded-full ring-1 ring-white/15" style={{ backgroundColor: c.hex }} />
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
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
