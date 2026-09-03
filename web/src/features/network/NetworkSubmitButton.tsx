"use client";

import { useFormStatus } from "react-dom";

export function NetworkSubmitButton({
  intent,
  label,
  pendingLabel,
  className,
}: {
  intent?: string;
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending, data } = useFormStatus();
  const activeIntent = data?.get("intent");
  const showsPending = pending && (!intent || activeIntent === intent);
  return (
    <button
      type="submit"
      name={intent ? "intent" : undefined}
      value={intent}
      disabled={pending}
      aria-disabled={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-65`}
    >
      {showsPending ? pendingLabel : label}
    </button>
  );
}
