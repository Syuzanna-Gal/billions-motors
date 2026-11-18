import type { Dictionary } from "@/i18n";
import { bankInitials, type Bank } from "@/lib/banks";
import { reveal } from "@/lib/reveal";

/** Enough items in one copy of the strip to fill a wide screen, however few banks there are. */
const MIN_ITEMS = 8;

/**
 * Home page: "Partner banks" with the banks running in an endless line (name, then round logo).
 * Same banks as the Financing page (Admin → Banks). Uses the Ticker's marquee animation:
 * the row is rendered twice so the -50% loop has no jump; hovering pauses it.
 */
export function BankTicker({ banks, t }: { banks: Bank[]; t: Dictionary["banks"] }) {
  if (banks.length === 0) return null;
  const repeat = Math.ceil(MIN_ITEMS / banks.length);
  const items = Array.from({ length: repeat }, (_, r) => banks.map((b) => ({ ...b, key: `${r}-${b.slot}` }))).flat();
  // Keep the speed per bank steady (about 6s each) rather than per strip.
  const duration = `${Math.max(30, items.length * 6)}s`;

  const row = (copy: number) =>
    items.map((b, i) => {
      // Screen readers and keyboards get each bank once.
      const hidden = copy === 1 || i >= banks.length;
      const content = (
        <>
          <span className="size-2 rotate-45 bg-gold-mid" aria-hidden="true" />
          <span className="whitespace-nowrap text-ivory group-hover:text-gold">{b.name}</span>
          <span className="flex size-16 flex-none sm:size-[72px] items-center justify-center overflow-hidden rounded-full ring-1 ring-gold/30">
            {b.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logoUrl} alt="" loading="lazy" className="size-[72%] object-contain" />
            ) : (
              <span className="font-serif text-lg font-semibold text-gold" aria-hidden="true">{bankInitials(b.name)}</span>
            )}
          </span>
        </>
      );
      return (
        <li key={`${copy}-${b.key}`} className="flex shrink-0 px-8 sm:px-10" aria-hidden={hidden || undefined}>
          {b.url ? (
            <a href={b.url} target="_blank" rel="noopener noreferrer" tabIndex={hidden ? -1 : undefined}
              className="group flex items-center gap-4 text-base sm:text-lg">
              {content}
            </a>
          ) : (
            <span className="group flex items-center gap-4 text-base sm:text-lg">{content}</span>
          )}
        </li>
      );
    });

  return (
    <section aria-labelledby="home-banks" className="pb-16 sm:pb-20">
      <div className="container-page" {...reveal()}>
        <h2 id="home-banks" className="font-serif text-[40px] font-medium sm:text-5xl">{t.title}</h2>
        <p className="mt-3 max-w-2xl text-lg text-mute">{t.lead}</p>
      </div>
      <div className="marquee relative mt-9 overflow-hidden border-y border-line bg-ink-2/70 py-5 sm:py-6" {...reveal(120)}>
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-ink to-transparent" />
        <ul className="marquee-track flex w-max" style={{ animationDuration: duration }}>
          {row(0)}
          {row(1)}
        </ul>
      </div>
    </section>
  );
}
