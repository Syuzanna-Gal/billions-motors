import type { Dictionary } from "@/i18n";
import { bankInitials, type Bank } from "@/lib/banks";
import { reveal } from "@/lib/reveal";

/** Partner banks as round logos (Financing page). Banks and their logos come from Admin → Banks. */
export function PartnerBanks({ banks, t }: { banks: Bank[]; t: Dictionary["banks"] }) {
  if (banks.length === 0) return null;
  return (
    <section aria-labelledby="partner-banks" className="mt-14" {...reveal(120)}>
      <h2 id="partner-banks" className="font-serif text-3xl font-medium">{t.title}</h2>
      <p className="mt-2 max-w-2xl text-mute">{t.lead}</p>
      <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-7">
        {banks.map((b) => {
          const circle = (
            <>
              <span className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-gold/30 transition-shadow group-hover:ring-2 group-hover:ring-gold sm:size-24">
                {b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.logoUrl} alt="" loading="lazy" className="size-[72%] object-contain" />
                ) : (
                  <span className="font-serif text-2xl font-semibold text-on-gold" aria-hidden="true">{bankInitials(b.name)}</span>
                )}
              </span>
              <span className="mt-2.5 block max-w-24 text-center text-xs leading-snug text-mute group-hover:text-ivory sm:max-w-28">
                {b.name}
              </span>
            </>
          );
          return (
            <li key={b.slot} className="flex flex-col items-center">
              {b.url ? (
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center"
                  aria-label={b.name || undefined}>
                  {circle}
                </a>
              ) : (
                <div className="group flex flex-col items-center">{circle}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
