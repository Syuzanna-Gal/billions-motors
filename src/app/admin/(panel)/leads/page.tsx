import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LEAD_STATUSES, listLeads, type LeadStatus } from "@/lib/admin/leads";
import { setLeadStatusAction } from "../../actions";

export const metadata = { title: "Requests" };

const TYPE: Record<string, string> = { OFFER: "Price offer", FINANCING: "Financing", CONTACT: "Contact" };
const STATUS: Record<LeadStatus, string> = { NEW: "New", IN_PROGRESS: "In progress", DONE: "Done", SPAM: "Spam" };
const CHANNEL: Record<string, string> = { WHATSAPP: "WhatsApp", PHONE: "Call", TELEGRAM: "Telegram", EMAIL: "Email" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireUser("FULL");
  const raw = (await searchParams).status;
  const status = LEAD_STATUSES.find((s) => s === raw);
  const leads = await listLeads(status);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-serif text-4xl font-medium">Requests</h1>
        <p className="mt-2 text-mute">Everything customers sent from the site’s forms, newest first.</p>
      </header>
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        <FilterLink href="/admin/leads" active={!status}>All</FilterLink>
        {LEAD_STATUSES.map((s) => (
          <FilterLink key={s} href={`/admin/leads?status=${s}`} active={status === s}>{STATUS[s]}</FilterLink>
        ))}
      </nav>

      {leads.length === 0 ? (
        <p className="text-mute">No requests here.</p>
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
                    {TYPE[l.type] ?? l.type} · prefers {CHANNEL[l.channel] ?? l.channel} · site language {l.locale.toUpperCase()} ·{" "}
                    {new Date(l.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Yerevan" })}
                  </p>
                  {l.vehicle_name && (
                    <p className="mt-2 text-sm">
                      Car: <a href={`/hy/cars/${l.vehicle_slug}`} target="_blank" rel="noopener" className="text-gold hover:underline">{l.vehicle_name}</a>
                    </p>
                  )}
                  {l.email && <p className="mt-1 text-sm text-mute">{l.email}</p>}
                  {l.message && <p className="mt-2 whitespace-pre-line text-sm text-mute">{l.message}</p>}
                </div>
                <form action={setLeadStatusAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={l.id} />
                  <label htmlFor={`st-${l.id}`} className="sr-only">Status</label>
                  <select id={`st-${l.id}`} name="status" defaultValue={l.status} className="field !min-h-10 !w-auto">
                    {LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}
                  </select>
                  <button type="submit" className="rounded-full border border-line px-3 py-2 text-xs text-mute hover:text-ivory">Update</button>
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
