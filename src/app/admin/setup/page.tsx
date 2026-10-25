import { redirect } from "next/navigation";
import { countUsers } from "@/lib/auth";
import { adminT, getAdminLang } from "@/lib/admin/lang";
import { setupAction } from "../actions";
import { AuthForm } from "../_components/AuthForm";
import { AdminLangSwitch } from "../_components/AdminLangSwitch";

export async function generateMetadata() {
  return { title: (await adminT()).auth.setupMeta };
}

/** Only reachable while there are no admin users: creates the first Full user. */
export default async function SetupPage() {
  if ((await countUsers()) > 0) redirect("/admin/login");
  const t = await adminT();
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-[24px] border border-line bg-ink-2 p-7">
        <div className="mb-8 flex items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-horizontal.svg" alt="Billions Motors" className="h-11 w-auto" />
          <AdminLangSwitch lang={await getAdminLang()} label={t.common.language} />
        </div>
        <h1 className="text-xl font-semibold">{t.auth.setupTitle}</h1>
        <p className="mb-6 mt-2 text-sm text-mute">{t.auth.setupLead}</p>
        <AuthForm action={setupAction} submitLabel={t.auth.setupSubmit} withName
          labels={{ name: t.auth.yourName, email: t.common.email, password: t.auth.password, passwordNew: t.auth.passwordNew, wait: t.common.pleaseWait }} />
      </div>
    </main>
  );
}
