"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Dictionary, Locale } from "@/i18n";
import type { Vehicle, VehicleColor, VehicleImage } from "@/lib/types";
import { comboStock, firstAvailable, paintStock } from "@/lib/colour-stock";
import { StatusBadge } from "./StatusBadge";

/*
 * The colour the customer is looking at on the car page, shared by the photo gallery and the
 * availability badge, so the badge shows the stock of the colour in the photo.
 */

type Kind = VehicleImage["kind"];

interface Selection {
  paints: VehicleColor[];
  trims: VehicleColor[];
  paintIndex: number;
  trimIndex: number;
  kind: Kind;
  setPaintIndex: (i: number) => void;
  setTrimIndex: (i: number) => void;
  setKind: (k: Kind) => void;
}

const SelectionContext = createContext<Selection | null>(null);

export function useCarColours(): Selection {
  const s = useContext(SelectionContext);
  if (!s) throw new Error("useCarColours must be used inside <CarColoursProvider>");
  return s;
}

/** Counted by colour and in stock: the only case where per-colour numbers mean anything to a customer. */
const countsByColour = (car: Pick<Vehicle, "status" | "colorStock">) => car.status === "IN_STOCK" && car.colorStock.length > 0;

export function CarColoursProvider({
  car, children,
}: { car: Pick<Vehicle, "status" | "colors" | "colorStock">; children: ReactNode }) {
  const paints = car.colors.filter((c) => c.kind === "EXTERIOR");
  const trims = car.colors.filter((c) => c.kind === "INTERIOR");
  const byColour = countsByColour(car);
  // Open on a colour that's actually there.
  const [paintIndex, setPaintIndex] = useState(() =>
    byColour ? firstAvailable(paints, (p) => paintStock(car.colorStock, p.id)) : 0);
  const [trimIndex, setTrimIndex] = useState(() => {
    const paint = paints[paintIndex];
    return byColour && paint ? firstAvailable(trims, (t) => comboStock(car.colorStock, paint.id, t.id)) : 0;
  });
  const [kind, setKind] = useState<Kind>("EXTERIOR");
  return (
    <SelectionContext.Provider value={{ paints, trims, paintIndex, trimIndex, kind, setPaintIndex, setTrimIndex, setKind }}>
      {children}
    </SelectionContext.Provider>
  );
}

type BadgeText = Pick<Dictionary, "status" | "units"> & { car: Pick<Dictionary["car"], "colourOnOrder" | "byInterior"> };

/**
 * Availability for the colour in the photo: "In stock · 2 pcs" for that paint, with the split by
 * interior underneath. Cars not counted by colour show the usual badge.
 */
export function ColourStockBadge({
  car, t, locale,
}: { car: Pick<Vehicle, "status" | "stock" | "arrivalDays" | "colorStock">; t: BadgeText; locale: Locale }) {
  const { paints, trims, paintIndex, trimIndex, kind } = useCarColours();
  const paint = paints[paintIndex];
  if (!countsByColour(car) || !paint) return <StatusBadge car={car} t={t} locale={locale} />;

  const units = paintStock(car.colorStock, paint.id);
  // Only the interiors this paint actually has, so the line stays short.
  const perInterior = trims
    .map((trim, i) => ({ trim, i, n: comboStock(car.colorStock, paint.id, trim.id) }))
    .filter((x) => x.n > 0);
  return (
    <div className="flex min-w-0 flex-col items-start gap-2" aria-live="polite">
      {units > 0 ? (
        <StatusBadge car={{ ...car, stock: units }} t={t} locale={locale} />
      ) : (
        <span className="inline-flex items-center rounded-full border border-gold/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold">
          {t.car.colourOnOrder}
        </span>
      )}
      {units > 0 && perInterior.length > 0 && (
        <p className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
          <span className="text-mute-2">{paint.name} · {t.car.byInterior}:</span>
          {perInterior.map(({ trim, i, n }) => {
            const active = kind === "INTERIOR" && i === trimIndex;
            return (
              <span key={trim.id} className={`inline-flex items-center gap-1.5 ${active ? "text-ivory" : ""}`}>
                <span className={`size-3 rounded-full ring-1 ${active ? "ring-gold" : "ring-white/20"}`} style={{ backgroundColor: trim.hex }} aria-hidden="true" />
                {trim.name} {n}
              </span>
            );
          })}
        </p>
      )}
    </div>
  );
}
