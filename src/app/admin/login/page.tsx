import { redirect } from "next/navigation";
import { countUsers, getCurrentUser } from "@/lib/auth";
import { adminT, getAdminLang } from "@/lib/admin/lang";
import { loginAction } from "../actions";
import { AuthForm } from "../_components/AuthForm";
import { AdminLangSwitch } from "../_components/AdminLangSwitch";

export async function generateMetadata() {
  return { title: (await adminT()).auth.signIn };
}

export default async function LoginPage() {
  if ((await countUsers()) === 0) redirect("/admin/setup");
  const user = await getCurrentUser();
  if (user) redirect(user.role === "FULL" ? "/admin/cars" : "/admin/sell");
  const t = await adminT();
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-[24px] border border-line bg-ink-2 p-7">
        <div className="mb-8 flex items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-horizontal.svg" alt="Billions Motors" className="h-11 w-auto" />
          <AdminLangSwitch lang={await getAdminLang()} label={t.common.language} />
        </div>
        <h1 className="mb-6 text-xl font-semibold">{t.auth.signInTitle}</h1>
        <AuthForm action={loginAction} submitLabel={t.auth.signIn}
          labels={{ name: t.auth.yourName, email: t.common.email, password: t.auth.password, passwordNew: t.auth.passwordNew, wait: t.common.pleaseWait }} />
      </div>
    </main>
  );
}
