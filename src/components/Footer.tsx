import Link from "next/link";
import type { Dictionary, Locale } from "@/i18n";
import { site, telHref, telegramHref, whatsappHref } from "@/lib/site";
import { LogoStacked } from "./Logo";

export function Footer({ locale, t }: { locale: Locale; t: Dictionary }) {
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
          <a href={telHref()} className="text-mute hover:text-ivory">{site.phone}</a>
          <a href={`mailto:${site.email}`} className="text-mute hover:text-ivory">{site.email}</a>
          <a href={whatsappHref()} className="text-mute hover:text-ivory">WhatsApp</a>
          <a href={telegramHref()} className="text-mute hover:text-ivory">Telegram</a>
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
