import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LEAD_STATUSES, listLeads, type LeadStatus } from "@/lib/admin/leads";
import { setLeadStatusAction } from "../../actions";
import { adminT, getAdminLang } from "@/lib/admin/lang";
import { adminIntl } from "@/lib/admin/i18n";
import { interpolate } from "@/lib/format";

export async function generateMetadata() {
  return { title: (await adminT()).leads.title };
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireUser("FULL");
  const raw = (await searchParams).status;
  const status = LEAD_STATUSES.find((s) => s === raw);
  const [leads, all, lang] = await Promise.all([listLeads(status), adminT(), getAdminLang()]);
  const t = all.leads;
  const TYPE: Record<string, string> = t.types;
  const STATUS: Record<LeadStatus, string> = t.statuses;
  const CHANNEL: Record<string, string> = t.channels;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-serif text-4xl font-medium">{t.title}</h1>
        <p className="mt-2 text-mute">{t.lead}</p>
      </header>
      <nav aria-label={t.filterLabel} className="flex flex-wrap gap-2">
        <FilterLink href="/admin/leads" active={!status}>{t.all}</FilterLink>
        {LEAD_STATUSES.map((s) => (
          <FilterLink key={s} href={`/admin/leads?status=${s}`} active={status === s}>{STATUS[s]}</FilterLink>
        ))}
      </nav>

      {leads.length === 0 ? (
        <p className="text-mute">{t.none}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {leads.map((l) => (
            <li key={l.id} className={`rounded-2xl border bg-ink-2 p-4 ${l.status === "NEW" ? "border-gold/40" : "border-line"}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    {l.name} · <a href={`tel:${l.phone.replace(/[^+\d]/g, "")}`} className="text-gold hover:underline">{l.phone}</a>
                  </p>
                  <p className="mt-1 text-xs text-mute-2">
                    {TYPE[l.type] ?? l.type} · {interpolate(t.prefers, { channel: CHANNEL[l.channel] ?? l.channel })} ·{" "}
                    {interpolate(t.siteLanguage, { lang: l.locale.toUpperCase() })} ·{" "}
                    {new Date(l.created_at).toLocaleString(adminIntl[lang], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Yerevan" })}
                  </p>
                  {l.vehicle_name && (
                    <p className="mt-2 text-sm">
                      {t.car} <a href={`/hy/cars/${l.vehicle_slug}`} target="_blank" rel="noopener" className="text-gold hover:underline">{l.vehicle_name}</a>
                    </p>
                  )}
                  {l.email && <p className="mt-1 text-sm text-mute">{l.email}</p>}
                  {l.message && <p className="mt-2 whitespace-pre-line text-sm text-mute">{l.message}</p>}
                </div>
                <form key={l.status} action={setLeadStatusAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={l.id} />
                  <label htmlFor={`st-${l.id}`} className="sr-only">{t.status}</label>
                  <select id={`st-${l.id}`} name="status" defaultValue={l.status} className="field !min-h-10 !w-auto">
                    {LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}
                  </select>
                  <button type="submit" className="rounded-full border border-line px-3 py-2 text-xs text-mute hover:text-ivory">{t.update}</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`rounded-full px-4 py-2 text-sm ${active ? "bg-ivory font-semibold text-ink" : "border border-line text-mute hover:text-ivory"}`}>
      {children}
    </Link>
  );
}
