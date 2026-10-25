import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-armenian";
import "../globals.css";
import { getAdminLang } from "@/lib/admin/lang";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Billions Admin" },
  robots: { index: false, follow: false },
};

// Admin pages always show live data.
export const dynamic = "force-dynamic";

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={await getAdminLang()}>
      <body className="min-h-dvh bg-ink text-ivory">{children}</body>
    </html>
  );
}
