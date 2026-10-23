import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { saveSettingsAction } from "../../actions";

export const metadata = { title: "Contact info" };

export default async function ContactSettingsPage() {
  await requireUser("FULL");
  const s = await getSettings();

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
        <h1 className="font-serif text-4xl font-medium">Contact info</h1>
        <p className="mt-2 text-mute">Shown in the header, footer, contact page and on every car page.</p>
      </header>
      <form action={saveSettingsAction} className="flex flex-col gap-6">
        <fieldset className="grid gap-4 rounded-[20px] border border-line bg-ink-2 p-5 sm:grid-cols-2 sm:p-6">
          <legend className="px-2 text-sm font-semibold text-gold-mid">Phone and messengers</legend>
          {field("phone", "Phone", "As shown on the site, e.g. +374 94 000 000", "tel")}
          {field("whatsapp", "WhatsApp number", "Digits with country code, e.g. 37494000000")}
          {field("telegram", "Telegram username", "Without @, e.g. billions_motors")}
          {field("email", "Email", undefined, "email")}
        </fieldset>
        <fieldset className="grid gap-4 rounded-[20px] border border-line bg-ink-2 p-5 sm:grid-cols-2 sm:p-6">
          <legend className="px-2 text-sm font-semibold text-gold-mid">Showroom</legend>
          {area("address_hy", "Address — Armenian")}
          {area("hours_hy", "Opening hours — Armenian")}
          {area("address_en", "Address — English")}
          {area("hours_en", "Opening hours — English")}
          {area("address_ru", "Address — Russian")}
          {area("hours_ru", "Opening hours — Russian")}
          <div className="sm:col-span-2">{field("map_url", "Map link (Google or Yandex)", "Starts with https://", "url")}</div>
        </fieldset>
        <fieldset className="grid gap-4 rounded-[20px] border border-line bg-ink-2 p-5 sm:grid-cols-2 sm:p-6">
          <legend className="px-2 text-sm font-semibold text-gold-mid">Social</legend>
          {field("instagram", "Instagram page", "Full link, https://instagram.com/…", "url")}
          {field("facebook", "Facebook page", "Full link, https://facebook.com/…", "url")}
        </fieldset>
        <button type="submit" className="btn-gold self-start">Save contact info</button>
      </form>
    </div>
  );
}
