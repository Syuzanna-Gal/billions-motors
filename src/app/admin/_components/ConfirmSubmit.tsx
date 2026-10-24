"use client";

import type { ReactNode } from "react";

/** A submit button that asks "are you sure?" first. Used for deletes that can't be undone. */
export function ConfirmSubmit({
  message, formAction, className, children, ariaLabel,
}: {
  message: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="submit"
      formAction={formAction}
      className={className}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
