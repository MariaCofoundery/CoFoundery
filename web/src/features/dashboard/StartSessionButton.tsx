"use client";

import { useFormStatus } from "react-dom";
import { createSessionAction } from "@/app/(product)/dashboard/actions";

export function StartSessionButton() {
  return (
    <div className="mt-4">
      <form action={createSessionAction}>
        <SubmitButton />
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[color:var(--ink)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Erstelle..." : "Meinen Fragebogen starten"}
    </button>
  );
}
