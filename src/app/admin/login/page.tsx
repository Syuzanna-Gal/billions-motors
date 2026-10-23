import { redirect } from "next/navigation";
import { countUsers, getCurrentUser } from "@/lib/auth";
import { loginAction } from "../actions";
import { AuthForm } from "../_components/AuthForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if ((await countUsers()) === 0) redirect("/admin/setup");
  if (await getCurrentUser()) redirect("/admin");
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-[24px] border border-line bg-ink-2 p-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-horizontal.svg" alt="Billions Motors" className="mb-8 h-11 w-auto" />
        <h1 className="mb-6 text-xl font-semibold">Admin sign in</h1>
        <AuthForm action={loginAction} submitLabel="Sign in" />
      </div>
    </main>
  );
}
