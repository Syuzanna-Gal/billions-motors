import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSectionTexts, sectionBySlug } from "@/lib/admin/texts";
import { adminT } from "@/lib/admin/lang";
import { TextsForm } from "./TextsForm";

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props) {
  const [section, t] = [sectionBySlug((await params).section), (await adminT()).texts];
  return { title: section ? `${t.sections[section.slug].title} · ${t.title}` : t.title };
}

export default async function SectionTextsPage({ params }: Props) {
  await requireUser("FULL");
  const section = sectionBySlug((await params).section);
  if (!section) notFound();
  const [rows, all] = await Promise.all([getSectionTexts(section), adminT()]);
  const t = all.texts;
  const info = t.sections[section.slug];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/texts" className="text-sm text-mute hover:text-ivory">{t.back}</Link>
          <h1 className="mt-2 font-serif text-4xl font-medium">{info.title}</h1>
          <p className="mt-2 max-w-2xl text-mute">{info.description}</p>
        </div>
        <a href={`/hy${section.preview}`} target="_blank" rel="noopener" className="text-sm text-gold hover:text-ivory">{all.common.viewOnSite}</a>
      </header>
      <TextsForm section={section.slug} rows={rows} groupTitles={t.groups}
        t={{ edited: t.edited, useDefault: t.useDefault, listHint: t.listHint, save: t.save, saving: all.common.saving }}
        langNames={all.common.langs} />
    </div>
  );
}
