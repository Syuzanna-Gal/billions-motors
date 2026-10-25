import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { editedCounts, TEXT_SECTIONS } from "@/lib/admin/texts";
import { adminT } from "@/lib/admin/lang";
import { interpolate } from "@/lib/format";

export async function generateMetadata() {
  return { title: (await adminT()).texts.title };
}

export default async function TextsPage() {
  await requireUser("FULL");
  const [counts, all] = await Promise.all([editedCounts(), adminT()]);
  const t = all.texts;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="font-serif text-4xl font-medium">{t.title}</h1>
        <p className="mt-2 text-mute">{t.lead}</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {TEXT_SECTIONS.map((s) => (
          <li key={s.slug}>
            <Link href={`/admin/texts/${s.slug}`}
              className="flex h-full flex-col gap-2 rounded-[20px] border border-line bg-ink-2 p-5 transition-colors hover:border-gold/50">
              <span className="flex items-center justify-between gap-3">
                <span className="text-lg font-semibold">{t.sections[s.slug].title}</span>
                {counts[s.slug] ? (
                  <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs text-gold">
                    {interpolate(t.editedCount, { count: counts[s.slug] })}
                  </span>
                ) : null}
              </span>
              <span className="text-sm text-mute">{t.sections[s.slug].description}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-mute-2">
        {t.note}{" "}
        <Link href="/admin/cars" className="text-gold">{all.nav.cars}</Link> · <Link href="/admin/contact" className="text-gold">{all.nav.contact}</Link>
      </p>
    </div>
  );
}
