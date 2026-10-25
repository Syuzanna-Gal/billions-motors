import { requireUser } from "@/lib/auth";
import { listUsers } from "@/lib/admin/users";
import { createUserAction, deleteUserAction, resetPasswordAction, updateUserAction } from "../../actions";
import { ConfirmSubmit } from "../../_components/ConfirmSubmit";
import { adminT } from "@/lib/admin/lang";
import { interpolate } from "@/lib/format";

export async function generateMetadata() {
  return { title: (await adminT()).users.title };
}

export default async function UsersPage() {
  const me = await requireUser("FULL");
  const [users, all] = await Promise.all([listUsers(), adminT()]);
  const t = all.users;
  const c = all.common;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <h1 className="font-serif text-4xl font-medium">{t.title}</h1>
        <p className="mt-2 text-mute">{t.lead}</p>
      </header>

      <ul className="flex flex-col gap-3">
        {users.map((u) => (
          <li key={u.id} className="rounded-2xl border border-line bg-ink-2 p-4">
            <form key={u.role} action={updateUserAction} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem_auto]">
              <input type="hidden" name="id" value={u.id} />
              <div>
                <p className="label">{c.email}</p>
                <p className="flex min-h-12 items-center text-sm">{u.email}{u.id === me.id && <span className="ml-2 text-xs text-gold-mid">{c.you}</span>}</p>
              </div>
              <div>
                <label htmlFor={`name-${u.id}`} className="label">{c.name}</label>
                <input id={`name-${u.id}`} name="name" defaultValue={u.name ?? ""} className="field" />
              </div>
              <div>
                <label htmlFor={`role-${u.id}`} className="label">{c.role}</label>
                <select id={`role-${u.id}`} name="role" defaultValue={u.role} className="field">
                  <option value="SALES">{c.roles.SALES}</option>
                  <option value="FULL">{c.roles.FULL}</option>
                </select>
              </div>
              <button type="submit" className="btn-outline !min-h-12 !px-4 text-sm">{c.save}</button>
            </form>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-mute">{t.changePassword}{u.id !== me.id ? t.deleteSuffix : ""}</summary>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <form action={resetPasswordAction} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={u.id} />
                  <div>
                    <label htmlFor={`pw-${u.id}`} className="label">{t.newPassword}</label>
                    <input id={`pw-${u.id}`} name="password" type="password" minLength={8} required autoComplete="new-password" className="field" />
                  </div>
                  <button type="submit" className="btn-outline !min-h-12 !px-4 text-sm">{t.setPassword}</button>
                </form>
                {u.id !== me.id && (
                  <form action={deleteUserAction}>
                    <input type="hidden" name="id" value={u.id} />
                    <ConfirmSubmit className="min-h-12 rounded-full px-4 text-sm text-mute hover:text-[#f0a58f]" message={interpolate(t.deleteConfirm, { email: u.email })}>{t.deleteUser}</ConfirmSubmit>
                  </form>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>

      <form action={createUserAction} className="grid items-end gap-3 rounded-2xl border border-dashed border-gold/30 p-4 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">{t.add}</h2>
        <div>
          <label htmlFor="new-name" className="label">{c.name}</label>
          <input id="new-name" name="name" className="field" />
        </div>
        <div>
          <label htmlFor="new-email" className="label">{c.email} *</label>
          <input id="new-email" name="email" type="email" required className="field" />
        </div>
        <div>
          <label htmlFor="new-role" className="label">{c.role}</label>
          <select id="new-role" name="role" defaultValue="SALES" className="field">
            <option value="SALES">{c.roles.SALES}</option>
            <option value="FULL">{c.roles.FULL}</option>
          </select>
        </div>
        <div>
          <label htmlFor="new-pw" className="label">{t.passwordRequired}</label>
          <input id="new-pw" name="password" type="password" minLength={8} required autoComplete="new-password" className="field" />
        </div>
        <button type="submit" className="btn-gold self-start sm:col-span-2 sm:justify-self-start">{t.addBtn}</button>
      </form>
    </div>
  );
}
