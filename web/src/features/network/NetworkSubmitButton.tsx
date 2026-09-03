"use client";

import { useFormStatus } from "react-dom";

export function NetworkSubmitButton({
  intent,
  label,
  pendingLabel,
  className,
  fieldName = "intent",
}: {
  intent?: string;
  label: string;
  pendingLabel: string;
  className: string;
  fieldName?: string;
}) {
  const { pending, data } = useFormStatus();
  const activeIntent = data?.get(fieldName);
  const showsPending = pending && (!intent || activeIntent === intent);
  return (
    <button
      type="submit"
      name={intent ? fieldName : undefined}
      value={intent}
      disabled={pending}
      aria-disabled={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-65`}
    >
      {showsPending ? pendingLabel : label}
    </button>
  );
}
