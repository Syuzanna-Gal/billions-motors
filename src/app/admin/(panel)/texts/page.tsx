import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { editedCounts, TEXT_SECTIONS } from "@/lib/admin/texts";

export const metadata = { title: "Site texts" };

export default async function TextsPage() {
  await requireUser("FULL");
  const counts = await editedCounts();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="font-serif text-4xl font-medium">Site texts</h1>
        <p className="mt-2 text-mute">
          Every text on the website, in Armenian, English and Russian. Change any of them and save — the site updates
          straight away. Clearing a text (or typing back the original) returns it to the default.
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {TEXT_SECTIONS.map((s) => (
          <li key={s.slug}>
            <Link href={`/admin/texts/${s.slug}`}
              className="flex h-full flex-col gap-2 rounded-[20px] border border-line bg-ink-2 p-5 transition-colors hover:border-gold/50">
              <span className="flex items-center justify-between gap-3">
                <span className="text-lg font-semibold">{s.title}</span>
                {counts[s.slug] ? (
                  <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs text-gold">{counts[s.slug]} edited</span>
                ) : null}
              </span>
              <span className="text-sm text-mute">{s.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-mute-2">
        Cars, prices and photos are edited under <Link href="/admin/cars" className="text-gold">Cars</Link>; phone, address and
        map under <Link href="/admin/contact" className="text-gold">Contact info</Link>. The car shown large on the home page is
        the newest car marked “Featured”.
      </p>
    </div>
  );
}
