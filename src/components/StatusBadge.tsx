import type { Dictionary } from "@/i18n";
import type { VehicleStatus } from "@/lib/types";

/** "In stock · 2 pcs" when the car is counted; otherwise just the status. */
export function StatusBadge({
  status, stock = null, t, className = "",
}: { status: VehicleStatus; stock?: number | null; t: Dictionary; className?: string }) {
  const showCount = status === "IN_STOCK" && stock != null && stock > 0;
  return (
    <span
      className={`gold-gradient inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink ${className}`}
    >
      {t.status[status]}
      {showCount && <span className="ml-1.5 normal-case tracking-normal">· {stock} {t.units.pcs}</span>}
    </span>
  );
}
