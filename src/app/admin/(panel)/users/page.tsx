import { requireUser } from "@/lib/auth";
import { listUsers } from "@/lib/admin/users";
import { createUserAction, deleteUserAction, resetPasswordAction, updateUserAction } from "../../actions";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireUser("FULL");
  const users = await listUsers();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <h1 className="font-serif text-4xl font-medium">Users</h1>
        <p className="mt-2 text-mute">
          <strong className="text-ivory">Sales</strong> can only record sales.{" "}
          <strong className="text-ivory">Full</strong> can do everything, including managing users.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {users.map((u) => (
          <li key={u.id} className="rounded-2xl border border-line bg-ink-2 p-4">
            <form action={updateUserAction} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem_auto]">
              <input type="hidden" name="id" value={u.id} />
              <div>
                <p className="label">Email</p>
                <p className="flex min-h-12 items-center text-sm">{u.email}{u.id === me.id && <span className="ml-2 text-xs text-gold-mid">(you)</span>}</p>
              </div>
              <div>
                <label htmlFor={`name-${u.id}`} className="label">Name</label>
                <input id={`name-${u.id}`} name="name" defaultValue={u.name ?? ""} className="field" />
              </div>
              <div>
                <label htmlFor={`role-${u.id}`} className="label">Role</label>
                <select id={`role-${u.id}`} name="role" defaultValue={u.role} className="field">
                  <option value="SALES">Sales</option>
                  <option value="FULL">Full</option>
                </select>
              </div>
              <button type="submit" className="btn-outline !min-h-12 !px-4 text-sm">Save</button>
            </form>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-mute">Change password{u.id !== me.id ? " · Delete" : ""}</summary>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <form action={resetPasswordAction} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={u.id} />
                  <div>
                    <label htmlFor={`pw-${u.id}`} className="label">New password (8+ characters)</label>
                    <input id={`pw-${u.id}`} name="password" type="password" minLength={8} required autoComplete="new-password" className="field" />
                  </div>
                  <button type="submit" className="btn-outline !min-h-12 !px-4 text-sm">Set password</button>
                </form>
                {u.id !== me.id && (
                  <form action={deleteUserAction}>
                    <input type="hidden" name="id" value={u.id} />
                    <button type="submit" className="min-h-12 rounded-full px-4 text-sm text-mute hover:text-[#f0a58f]">Delete user</button>
                  </form>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>

      <form action={createUserAction} className="grid items-end gap-3 rounded-2xl border border-dashed border-gold/30 p-4 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">Add a user</h2>
        <div>
          <label htmlFor="new-name" className="label">Name</label>
          <input id="new-name" name="name" className="field" />
        </div>
        <div>
          <label htmlFor="new-email" className="label">Email *</label>
          <input id="new-email" name="email" type="email" required className="field" />
        </div>
        <div>
          <label htmlFor="new-role" className="label">Role</label>
          <select id="new-role" name="role" defaultValue="SALES" className="field">
            <option value="SALES">Sales</option>
            <option value="FULL">Full</option>
          </select>
        </div>
        <div>
          <label htmlFor="new-pw" className="label">Password * (8+ characters)</label>
          <input id="new-pw" name="password" type="password" minLength={8} required autoComplete="new-password" className="field" />
        </div>
        <button type="submit" className="btn-gold self-start sm:col-span-2 sm:justify-self-start">Add user</button>
      </form>
    </div>
  );
}
