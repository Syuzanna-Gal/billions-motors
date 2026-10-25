import { adminLangLabels, adminLangs, type AdminLang } from "@/lib/admin/i18n";
import { setAdminLangAction } from "../actions";

/** ՀԱՅ | EN switch for the admin panel. Plain forms: works without JavaScript too. */
export function AdminLangSwitch({ lang, label }: { lang: AdminLang; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex w-fit rounded-full border border-gold/30 p-[3px] text-xs">
      {adminLangs.map((l) => (
        <form key={l} action={setAdminLangAction}>
          <input type="hidden" name="lang" value={l} />
          <button type="submit" aria-pressed={l === lang}
            className={`rounded-full px-3 py-1.5 transition-colors ${l === lang ? "bg-ivory font-semibold text-ink" : "text-mute hover:text-ivory"}`}>
            {adminLangLabels[l]}
          </button>
        </form>
      ))}
    </div>
  );
}
