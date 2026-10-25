import type { Metadata } from "next";
import { getDictionary } from "@/lib/dictionary";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n";
import { LoanCalculator } from "@/components/LoanCalculator";
import { LeadForm } from "@/components/LeadForm";
import { PageHeader } from "@/components/PageHeader";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getDictionary(locale);
  return { title: t.loan.title, description: t.loan.lead };
}

export default async function LoanPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);
  const priceParam = (await searchParams).price;
  const price = typeof priceParam === "string" ? Number(priceParam) : NaN;

  return (
    <>
      <PageHeader title={t.loan.title} lead={t.loan.lead} />
      <section className="container-page">
        <LoanCalculator t={t.loan} locale={locale} initialPrice={Number.isFinite(price) && price > 0 ? price : undefined} />
      </section>
      <section className="container-page mt-12">
        <div className="mx-auto max-w-2xl rounded-[24px] border border-line bg-ink-2 p-6 sm:p-8">
          <h2 className="mb-6 font-serif text-3xl font-medium">{t.loan.apply}</h2>
          <LeadForm t={t.form} type="FINANCING" locale={locale} submitLabel={t.loan.apply} />
        </div>
      </section>
    </>
  );
}
