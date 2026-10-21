import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, locales, type Dictionary } from "@/i18n";
import { PageHeader } from "@/components/PageHeader";

// Simple content pages: /financing, /import-process, /warranty, /about
type PageKey = keyof Dictionary["pages"];
const pageKeys = ["financing", "import-process", "warranty", "about"] as const satisfies readonly PageKey[];
const isPageKey = (v: string): v is PageKey => (pageKeys as readonly string[]).includes(v);

type Props = { params: Promise<{ locale: string; page: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) => pageKeys.map((page) => ({ locale, page })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params;
  if (!isLocale(locale) || !isPageKey(page)) return {};
  const content = getDictionary(locale).pages[page];
  return { title: content.title, description: content.lead };
}

export default async function ContentPage({ params }: Props) {
  const { locale, page } = await params;
  if (!isLocale(locale) || !isPageKey(page)) notFound();
  const t = getDictionary(locale);
  const content = t.pages[page];
  const numbered = page === "import-process";

  return (
    <>
      <PageHeader title={content.title} lead={content.lead} />
      <section className="container-page">
        <div className="gold-rule mb-10 opacity-60" />
        <ol className="flex max-w-3xl flex-col gap-8">
          {content.body.map((para, i) => (
            <li key={i} className="flex gap-6">
              {numbered && (
                <span className="text-gold w-12 flex-none font-serif text-4xl leading-none">{String(i + 1).padStart(2, "0")}</span>
              )}
              <p className="text-lg leading-relaxed text-mute">{para}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex flex-wrap gap-3.5">
          <Link href={`/${locale}/cars`} className="btn-gold">{t.home.viewAll}</Link>
          <Link href={`/${locale}/contact`} className="btn-outline">{t.nav.contact}</Link>
        </div>
      </section>
    </>
  );
}
