import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-armenian";
import "@fontsource-variable/noto-serif-armenian";
import "../globals.css";
import { getDictionary, isLocale, languageAlternates, localeTags, locales } from "@/i18n";
import { site } from "@/lib/site";
import { getContact } from "@/lib/settings";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RevealObserver } from "@/components/RevealObserver";

const EARLY_REVEAL = `(function(){try{
if(!("IntersectionObserver" in window))return;
var els=document.querySelectorAll('[data-reveal]:not([data-reveal="in"])');
if(matchMedia("(prefers-reduced-motion: reduce)").matches){els.forEach(function(e){e.dataset.reveal="in"});return;}
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.dataset.reveal="in";io.unobserve(e.target)}})},{rootMargin:"0px 0px -8% 0px",threshold:0.08});
els.forEach(function(e){io.observe(e)});
}catch(e){}})();`;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: "#0b0b0c" };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    metadataBase: new URL(site.url),
    title: { default: t.meta.title, template: "%s | Billions Motors" },
    description: t.meta.description,
    alternates: { canonical: `/${locale}`, languages: languageAlternates("") },
    openGraph: { siteName: "Billions Motors", type: "website", locale: localeTags[locale].og },
    robots: site.noindex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const contact = await getContact(locale);

  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-ink text-ivory">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn-gold">
          Skip to content
        </a>
        <Header locale={locale} t={t} contact={contact} />
        <main id="main">{children}</main>
        <Footer locale={locale} t={t} contact={contact} />
        {/* Starts the scroll reveal as soon as the HTML is parsed, so the first screen doesn't
            stay empty while the JavaScript bundle loads on a slow phone. RevealObserver takes over after. */}
        <script dangerouslySetInnerHTML={{ __html: EARLY_REVEAL }} />
        <RevealObserver />
        {/* Without JavaScript, show everything instead of waiting for the scroll reveal. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </body>
    </html>
  );
}
