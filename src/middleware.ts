import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/i18n/config";

// Every page lives under /hy, /en or /ru. Requests without a locale are redirected.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first)) return NextResponse.next();

  // Pick the first of the browser's preferred languages that we support; Armenian otherwise.
  const preferred = (request.headers.get("accept-language") ?? "")
    .toLowerCase()
    .split(",")
    .map((part) => part.trim().slice(0, 2));
  const locale = preferred.find(isLocale) ?? defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip the admin panel, API routes, Next internals and files with an extension (images, robots.txt, sitemap.xml…)
  matcher: ["/((?!admin|api|_next|.*\\..*).*)"],
};
