import { redirect } from "next/navigation";
import { countUsers } from "@/lib/auth";
import { setupAction } from "../actions";
import { AuthForm } from "../_components/AuthForm";

export const metadata = { title: "First-time setup" };

/** Only reachable while there are no admin users: creates the first Full user. */
export default async function SetupPage() {
  if ((await countUsers()) > 0) redirect("/admin/login");
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-[24px] border border-line bg-ink-2 p-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-horizontal.svg" alt="Billions Motors" className="mb-8 h-11 w-auto" />
        <h1 className="text-xl font-semibold">Create the first admin</h1>
        <p className="mb-6 mt-2 text-sm text-mute">
          This account gets the <strong className="text-ivory">Full</strong> role. You can add sales people afterwards.
        </p>
        <AuthForm action={setupAction} submitLabel="Create admin and sign in" withName />
      </div>
    </main>
  );
}
