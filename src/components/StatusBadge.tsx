import type { Dictionary, Locale } from "@/i18n";
import { plural } from "@/lib/format";
import type { Vehicle } from "@/lib/types";

/**
 * The availability label, with a count where it helps:
 * "In stock · 2 pcs", "In transit · 30 days" (counts down daily, stays at 1 until the status changes).
 */
export function StatusBadge({
  car, t, locale, className = "",
}: { car: Pick<Vehicle, "status" | "stock" | "arrivalDays">; t: Dictionary; locale: Locale; className?: string }) {
  const { status, stock, arrivalDays } = car;
  let extra: string | null = null;
  if (status === "IN_STOCK" && stock != null && stock > 0) extra = `${stock} ${stock === 1 ? t.units.pc : t.units.pcs}`;
  if (status === "IN_TRANSIT" && arrivalDays != null) extra = plural(arrivalDays, t.units.days, locale);
  return (
    <span
      className={`gold-gradient inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink ${className}`}
    >
      {t.status[status]}
      {extra && <span className="ml-1.5 normal-case tracking-normal">· {extra}</span>}
    </span>
  );
}
