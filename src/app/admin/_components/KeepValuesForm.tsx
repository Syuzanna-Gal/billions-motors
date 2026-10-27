"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";

export type SaveResult = { ok?: string; error?: string };

/**
 * A form whose fields keep what was typed when saving fails, so one mistake doesn't wipe the
 * other changes. (A plain server form reloads with the saved values; React's <form action>
 * resets the fields.) The fields themselves can be rendered on the server and passed as children.
 */
export function KeepValuesForm({
  action, children, submit, saving, className,
}: {
  action: (form: FormData) => Promise<SaveResult>;
  children: ReactNode;
  submit: string;
  saving: string;
  className?: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<SaveResult>();
  const [pending, startTransition] = useTransition();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await action(data);
      setResult(r);
      if (r.ok) router.refresh();
    });
  };
  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn-gold disabled:opacity-60">{pending ? saving : submit}</button>
        {result?.ok && <p role="status" className="text-sm text-gold">{result.ok}</p>}
        {result?.error && <p role="alert" className="text-sm text-[#f0a58f]">{result.error}</p>}
      </div>
    </form>
  );
}
