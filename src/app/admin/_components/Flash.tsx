"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Shows ?ok=… / ?err=… messages that actions put in the URL after saving. With ?at=section the
 * page scrolls back to that section and the message floats at the bottom, where it can be seen.
 */
export function Flash() {
  const params = useSearchParams();
  const ok = params.get("ok");
  const err = params.get("err");
  const at = params.get("at");
  useEffect(() => {
    if (at) document.getElementById(at)?.scrollIntoView({ block: "start" });
  }, [at, ok, err]);
  if (!ok && !err) return null;
  return (
    <p
      role={err ? "alert" : "status"}
      className={`rounded-2xl border px-4 py-3 text-sm ${
        at ? "fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl shadow-2xl backdrop-blur" : "mb-6"
      } ${err ? "border-[#f0a58f]/50 bg-[#2a1814]/95 text-[#f6c4b4]" : "border-gold/40 bg-[#1f1a12]/95 text-gold"}`}
    >
      {err ?? ok}
    </p>
  );
}

export function SavedNote({ text }: { text?: string }) {
  return text ? <p role="status" className="text-sm text-gold">{text}</p> : null;
}
