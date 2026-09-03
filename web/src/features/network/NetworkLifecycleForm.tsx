"use client";

import { changeNetworkListingStatusAction } from "./networkActions";
import { NetworkSubmitButton } from "./NetworkSubmitButton";

type T = (key: string) => string;

export function NetworkLifecycleForm({ id, status, t }: { id: string; status: string; t: T }) {
  const button = (intent: "pause" | "complete" | "publish" | "renew", className: string) => (
    <NetworkSubmitButton
      intent={intent}
      label={t(`actions.${intent}`)}
      pendingLabel={t(`pending.${intent}`)}
      className={className}
    />
  );
  return (
    <form action={changeNetworkListingStatusAction} className="flex flex-wrap gap-2">
      <input type="hidden" name="id" value={id} />
      {status === "active" ? (
        <>
          {button("pause", "min-h-11 rounded-full border px-3 py-2 text-sm")}
          {button("complete", "min-h-11 rounded-full border px-3 py-2 text-sm")}
        </>
      ) : button(status === "draft" ? "publish" : "renew", "min-h-11 rounded-full bg-slate-900 px-3 py-2 text-sm text-white")}
    </form>
  );
}
