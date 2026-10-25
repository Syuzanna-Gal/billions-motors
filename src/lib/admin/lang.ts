import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getCurrentUser } from "../auth";
import { defaultDictionary } from "@/i18n";
import { adminDictionaries, isAdminLang, type AdminDict, type AdminLang } from "./i18n";

/*
 * The admin panel's language: the signed-in user's choice, else the language last picked in this
 * browser (sign-in page), else the browser's preferred language, else Armenian.
 */

export const ADMIN_LANG_COOKIE = "bm_admin_lang";

export const getAdminLang = cache(async (): Promise<AdminLang> => {
  const user = await getCurrentUser();
  if (user?.lang) return user.lang;
  const saved = (await cookies()).get(ADMIN_LANG_COOKIE)?.value;
  if (isAdminLang(saved)) return saved;
  const accept = ((await headers()).get("accept-language") ?? "").toLowerCase();
  return accept.startsWith("en") ? "en" : "hy";
});

/** The admin texts in the current admin's language. */
export async function adminT(): Promise<AdminDict> {
  return adminDictionaries[await getAdminLang()];
}

/** Choice-list names for the car form, in the admin's language (the site's own words). */
export async function carFormOptions() {
  const [lang, t] = await Promise.all([getAdminLang(), adminT()]);
  const site = defaultDictionary(lang);
  return { status: site.status, fuel: site.fuel, body: site.body, drive: site.drive, langs: t.common.langs, saving: t.common.saving };
}
