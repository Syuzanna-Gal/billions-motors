import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/i18n";
import { getContact } from "@/lib/settings";
import { LeadForm } from "@/components/LeadForm";
import { PageHeader } from "@/components/PageHeader";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.contact.title, description: t.contact.lead };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const contact = await getContact(locale);

  const items: { label: string; value: string; href?: string }[] = [
    { label: t.contact.phone, value: contact.phone, href: contact.telHref },
    { label: t.contact.email, value: contact.email, href: `mailto:${contact.email}` },
    { label: t.contact.address, value: contact.address, href: contact.mapUrl ?? undefined },
    { label: t.contact.hours, value: contact.hours },
  ].filter((i) => i.value);

  return (
    <>
      <PageHeader title={t.contact.title} lead={t.contact.lead} />
      <section className="container-page grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <div key={item.label} className="rounded-[var(--radius-card)] border border-line bg-ink-2 p-6">
                <dt className="eyebrow !text-[11px]">{item.label}</dt>
                <dd className="mt-3 whitespace-pre-line text-lg">
                  {item.href ? <a href={item.href} className="hover:text-gold">{item.value}</a> : item.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-3">
            {contact.whatsappHref && <a href={contact.whatsappHref} className="btn-gold">WhatsApp</a>}
            {contact.telegramHref && <a href={contact.telegramHref} className="btn-outline">Telegram</a>}
          </div>
        </div>
        <div className="rounded-[24px] border border-line bg-ink-2 p-6 sm:p-8">
          <h2 className="mb-6 font-serif text-3xl font-medium">{t.contact.formTitle}</h2>
          <LeadForm t={t.form} type="CONTACT" locale={locale} />
        </div>
      </section>
    </>
  );
}
