import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { site } from "@/lib/site";
import { getAllSlugs } from "@/lib/vehicles";

export const dynamic = "force-dynamic";

const staticPaths = ["", "/cars", "/loan-calculator", "/financing", "/import-process", "/warranty", "/about", "/contact"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAllSlugs();
  const paths = [...staticPaths, ...slugs.map((s) => `/cars/${s}`)];
  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${site.url}/${locale}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : path.startsWith("/cars/") ? 0.8 : 0.6,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${site.url}/${l}${path}`])) },
    })),
  );
}
