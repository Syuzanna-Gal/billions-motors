"use client";

import { useActionState } from "react";
import type { FormState } from "../actions";

type Props = {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  withName?: boolean;
};

/** Login and first-user setup share this small form. */
export function AuthForm({ action, submitLabel, withName }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {withName && (
        <div>
          <label htmlFor="name" className="label">Your name</label>
          <input id="name" name="name" autoComplete="name" className="field" />
        </div>
      )}
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="field" />
      </div>
      <div>
        <label htmlFor="password" className="label">Password{withName ? " (at least 8 characters)" : ""}</label>
        <input id="password" name="password" type="password" required minLength={withName ? 8 : undefined}
          autoComplete={withName ? "new-password" : "current-password"} className="field" />
      </div>
      {state?.error && <p role="alert" className="text-sm text-[#f0a58f]">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-gold mt-2 disabled:opacity-60">
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
