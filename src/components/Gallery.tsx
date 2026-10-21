"use client";

import { useState } from "react";
import type { VehicleImage } from "@/lib/types";
import { CarPhoto } from "./CarPhoto";

type Labels = { exterior: string; interior: string; photo: string; previous: string; next: string };

export function Gallery({ images, alt, labels }: { images: VehicleImage[]; alt: string; labels: Labels }) {
  const hasInterior = images.some((i) => i.kind === "INTERIOR");
  const [kind, setKind] = useState<VehicleImage["kind"]>("EXTERIOR");
  const [index, setIndex] = useState(0);

  const list = images.filter((i) => i.kind === kind);
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
        <CarPhoto image={current} alt={alt} placeholder={labels.photo} priority />
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
