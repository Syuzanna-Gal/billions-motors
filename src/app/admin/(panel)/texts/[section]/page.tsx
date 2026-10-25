import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSectionTexts, GROUP_TITLES, sectionBySlug } from "@/lib/admin/texts";
import { TextsForm } from "./TextsForm";

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props) {
  const section = sectionBySlug((await params).section);
  return { title: section ? `${section.title} · Site texts` : "Site texts" };
}

export default async function SectionTextsPage({ params }: Props) {
  await requireUser("FULL");
  const section = sectionBySlug((await params).section);
  if (!section) notFound();
  const rows = await getSectionTexts(section);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/texts" className="text-sm text-mute hover:text-ivory">← Site texts</Link>
          <h1 className="mt-2 font-serif text-4xl font-medium">{section.title}</h1>
          <p className="mt-2 max-w-2xl text-mute">{section.description}</p>
        </div>
        <a href={`/hy${section.preview}`} target="_blank" rel="noopener" className="text-sm text-gold hover:text-ivory">View on site ↗</a>
      </header>
      <TextsForm section={section.slug} rows={rows} groupTitles={GROUP_TITLES} />
    </div>
  );
}
