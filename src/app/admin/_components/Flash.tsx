"use client";

import { useSearchParams } from "next/navigation";

/** Shows ?ok=… / ?err=… messages that actions put in the URL after saving. */
export function Flash() {
  const params = useSearchParams();
  const ok = params.get("ok");
  const err = params.get("err");
  if (!ok && !err) return null;
  return (
    <p
      role={err ? "alert" : "status"}
      className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
        err ? "border-[#f0a58f]/50 bg-[#f0a58f]/10 text-[#f6c4b4]" : "border-gold/40 bg-gold/10 text-gold"
      }`}
    >
      {err ?? ok}
    </p>
  );
}

export function SavedNote({ text }: { text?: string }) {
  return text ? <p role="status" className="text-sm text-gold">{text}</p> : null;
}
