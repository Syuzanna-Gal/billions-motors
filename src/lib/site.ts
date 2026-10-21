export const site = {
  url: process.env.SITE_URL ?? "http://localhost:3000",
  noindex: process.env.SITE_NOINDEX === "true",
  phone: process.env.NEXT_PUBLIC_PHONE ?? "+374 00 000 000",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "37400000000",
  telegram: process.env.NEXT_PUBLIC_TELEGRAM ?? "billions_am",
  email: process.env.NEXT_PUBLIC_EMAIL ?? "info@billions.am",
};

export const telHref = () => `tel:${site.phone.replace(/[^+\d]/g, "")}`;
export const whatsappHref = () => `https://wa.me/${site.whatsapp}`;
export const telegramHref = () => `https://t.me/${site.telegram}`;
