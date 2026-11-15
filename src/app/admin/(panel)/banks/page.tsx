import { requireUser } from "@/lib/auth";
import { adminT } from "@/lib/admin/lang";
import { getBankSlots, bankInitials } from "@/lib/banks";
import { interpolate } from "@/lib/format";
import { saveBankAction } from "../../actions";

export async function generateMetadata() {
  return { title: (await adminT()).banks.title };
}

export default async function BanksPage() {
  await requireUser("FULL");
  const [slots, all] = await Promise.all([getBankSlots(), adminT()]);
  const t = all.banks;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-medium">{t.title}</h1>
          <p className="mt-2 max-w-3xl text-mute">{t.lead}</p>
        </div>
        <a href="/hy/financing" target="_blank" rel="noopener" className="text-sm text-gold hover:text-ivory">{t.preview}</a>
      </header>

      <ol className="grid gap-4 md:grid-cols-2">
        {slots.map((b) => {
          const filled = Boolean(b.logoUrl || b.name);
          const status = !filled ? t.empty : b.visible ? t.shown : t.hidden;
          return (
            <li key={b.slot} id={`bank-${b.slot}`} className="scroll-mt-6">
              {/* Keyed by its saved values so the fields show what was saved after each save. */}
              <form key={`${b.logoUrl}|${b.name}|${b.url}|${b.visible}`} action={saveBankAction} encType="multipart/form-data"
                className={`flex h-full flex-col gap-4 rounded-[20px] border bg-ink-2 p-5 ${filled && b.visible ? "border-gold/40" : "border-line"}`}>
                <input type="hidden" name="slot" value={b.slot} />
                <div className="flex items-center gap-4">
                  <span className="flex size-16 flex-none items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-gold/30">
                    {b.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.logoUrl} alt="" className="size-[72%] object-contain" />
                    ) : (
                      <span className="font-serif text-xl font-semibold text-ink/70" aria-hidden="true">{bankInitials(b.name) || b.slot}</span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-semibold">{interpolate(t.place, { n: b.slot })}</h2>
                    <p className={`text-sm ${filled && b.visible ? "text-gold" : "text-mute-2"}`}>{status}</p>
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor={`name-${b.slot}`}>{t.name}</label>
                  <input id={`name-${b.slot}`} name="name" defaultValue={b.name} maxLength={60} placeholder={t.namePlaceholder} className="field" />
                </div>
                <div>
                  <label className="label" htmlFor={`logo-${b.slot}`}>{b.logoUrl ? t.replaceLogo : t.logo}</label>
                  <input id={`logo-${b.slot}`} name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/avif"
                    className="field !py-2.5 file:mr-3 file:rounded-full file:border-0 file:bg-gold/15 file:px-3 file:py-1 file:text-gold" />
                  <p className="mt-1 text-xs text-mute-2">{t.logoHint}</p>
                  {b.logoUrl && (
                    <label className="mt-2 flex items-center gap-2 text-sm text-mute">
                      <input type="checkbox" name="remove_logo" className="size-4 accent-[#c9a66b]" />
                      {t.removeLogo}
                    </label>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor={`url-${b.slot}`}>{t.url}</label>
                  <input id={`url-${b.slot}`} name="url" type="url" defaultValue={b.url ?? ""} placeholder="https://" className="field" />
                  <p className="mt-1 text-xs text-mute-2">{t.urlHint}</p>
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex min-h-11 items-center gap-2.5 text-sm">
                    <input type="checkbox" name="visible" defaultChecked={b.visible} className="size-5 accent-[#c9a66b]" />
                    {t.show}
                  </label>
                  <button type="submit" className="btn-gold !min-h-11 !px-6">{t.save}</button>
                </div>
              </form>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
