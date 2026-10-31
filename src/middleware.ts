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
  // Behind the web server, request.nextUrl holds the internal address (localhost:3000), so the
  // redirect is built from the address the visitor actually used (Host / X-Forwarded-* headers).
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const target = new URL(`/${locale}${pathname === "/" ? "" : pathname}${request.nextUrl.search}`, `${proto}://${host}`);
  return NextResponse.redirect(target);
}

export const config = {
  // Skip the admin panel, API routes, Next internals and files with an extension (images, robots.txt, sitemap.xml…)
  matcher: ["/((?!admin|api|_next|.*\\..*).*)"],
};
