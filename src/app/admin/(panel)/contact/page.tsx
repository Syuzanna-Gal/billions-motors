import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { saveSettingsAction } from "../../actions";
import { adminT } from "@/lib/admin/lang";
import { interpolate } from "@/lib/format";

export async function generateMetadata() {
  return { title: (await adminT()).contact.title };
}

export default async function ContactSettingsPage() {
  await requireUser("FULL");
  const [s, all] = await Promise.all([getSettings(), adminT()]);
  const t = all.contact;
  const langs = all.common.langs;

  const field = (name: keyof typeof s, label: string, hint?: string, type = "text") => (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} type={type} defaultValue={s[name]} className="field" />
      {hint && <p className="mt-1 text-xs text-mute-2">{hint}</p>}
    </div>
  );
  const area = (name: keyof typeof s, label: string) => (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <textarea id={name} name={name} defaultValue={s[name]} className="field !min-h-20" />
    </div>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="font-serif text-4xl font-medium">{t.title}</h1>
        <p className="mt-2 text-mute">{t.lead}</p>
      </header>
      <form action={saveSettingsAction} className="flex flex-col gap-6">
        <fieldset className="grid gap-4 rounded-[20px] border border-line bg-ink-2 p-5 sm:grid-cols-2 sm:p-6">
          <legend className="px-2 text-sm font-semibold text-gold-mid">{t.phoneMessengers}</legend>
          {field("phone", t.phone, t.phoneHint, "tel")}
          {field("whatsapp", t.whatsapp, t.whatsappHint)}
          {field("telegram", t.telegram, t.telegramHint)}
          {field("email", t.email, undefined, "email")}
        </fieldset>
        <fieldset className="grid gap-4 rounded-[20px] border border-line bg-ink-2 p-5 sm:grid-cols-2 sm:p-6">
          <legend className="px-2 text-sm font-semibold text-gold-mid">{t.showroom}</legend>
          {(["hy", "en", "ru"] as const).map((l) => (
            <div key={l} className="contents">
              {area(`address_${l}`, interpolate(t.addressIn, { lang: langs[l] }))}
              {area(`hours_${l}`, interpolate(t.hoursIn, { lang: langs[l] }))}
            </div>
          ))}
          <div className="sm:col-span-2">{field("map_location", t.mapLocation, t.mapLocationHint)}</div>
          <div className="sm:col-span-2">{field("map_url", t.mapUrl, t.mapUrlHint, "url")}</div>
        </fieldset>
        <fieldset className="grid gap-4 rounded-[20px] border border-line bg-ink-2 p-5 sm:grid-cols-2 sm:p-6">
          <legend className="px-2 text-sm font-semibold text-gold-mid">{t.social}</legend>
          {field("instagram", t.instagram, t.instagramHint, "url")}
          {field("facebook", t.facebook, t.facebookHint, "url")}
        </fieldset>
        <button type="submit" className="btn-gold self-start">{t.save}</button>
      </form>
    </div>
  );
}
