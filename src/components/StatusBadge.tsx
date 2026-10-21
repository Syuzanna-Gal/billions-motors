import type { Dictionary } from "@/i18n";
import type { VehicleStatus } from "@/lib/types";

export function StatusBadge({ status, t, className = "" }: { status: VehicleStatus; t: Dictionary; className?: string }) {
  return (
    <span
      className={`gold-gradient inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink ${className}`}
    >
      {t.status[status]}
    </span>
  );
}
