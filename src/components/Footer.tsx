import Link from "next/link";
import type { Dictionary, Locale } from "@/i18n";
import type { Contact } from "@/lib/settings";
import { LogoStacked } from "./Logo";

export function Footer({ locale, t, contact }: { locale: Locale; t: Dictionary; contact: Contact }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-line bg-ink">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <LogoStacked locale={locale} />
          <p className="max-w-xs text-sm leading-relaxed text-mute">{t.footer.tagline}</p>
        </div>
        <FooterCol title={t.footer.explore}>
          <FooterLink href={`/${locale}/cars`}>{t.nav.cars}</FooterLink>
          <FooterLink href={`/${locale}/loan-calculator`}>{t.nav.loan}</FooterLink>
          <FooterLink href={`/${locale}/financing`}>{t.nav.financing}</FooterLink>
          <FooterLink href={`/${locale}/import-process`}>{t.nav.importProcess}</FooterLink>
        </FooterCol>
        <FooterCol title={t.footer.company}>
          <FooterLink href={`/${locale}/about`}>{t.nav.about}</FooterLink>
          <FooterLink href={`/${locale}/warranty`}>{t.nav.warranty}</FooterLink>
          <FooterLink href={`/${locale}/contact`}>{t.nav.contact}</FooterLink>
        </FooterCol>
        <FooterCol title={t.footer.contact}>
          {contact.phone && <a href={contact.telHref} className="text-mute hover:text-ivory">{contact.phone}</a>}
          {contact.email && <a href={`mailto:${contact.email}`} className="text-mute hover:text-ivory">{contact.email}</a>}
          {contact.whatsappHref && <a href={contact.whatsappHref} className="text-mute hover:text-ivory">WhatsApp</a>}
          {contact.telegramHref && <a href={contact.telegramHref} className="text-mute hover:text-ivory">Telegram</a>}
          {contact.instagram && <a href={contact.instagram} className="text-mute hover:text-ivory">Instagram</a>}
          {contact.facebook && <a href={contact.facebook} className="text-mute hover:text-ivory">Facebook</a>}
          {contact.address && <p className="whitespace-pre-line text-mute-2">{contact.address}</p>}
        </FooterCol>
      </div>
      <div className="container-page">
        <div className="gold-rule opacity-40" />
        <p className="py-6 text-xs text-mute-2">
          © {year} Billions LLC. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h2 className="eyebrow mb-1">{title}</h2>
      {children}
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-mute hover:text-ivory">
      {children}
    </Link>
  );
}
