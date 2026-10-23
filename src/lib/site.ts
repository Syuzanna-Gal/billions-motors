export const site = {
  url: process.env.SITE_URL ?? "http://localhost:3000",
  noindex: process.env.SITE_NOINDEX === "true",
};

// Phone, WhatsApp, address etc. are edited in Admin → Contact info (see lib/settings.ts).
