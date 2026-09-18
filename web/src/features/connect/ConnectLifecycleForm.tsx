"use client";

import { useTranslations } from "next-intl";
import { changeConnectListingStatusAction } from "./connectActions";
import { ConnectSubmitButton } from "./ConnectSubmitButton";


/**
 * Holt seine Texte selbst - siehe ConnectListingForm. Eine Funktion als Prop
 * an ein Browser-Bauteil laesst React nicht zu; hier stand dasselbe `t={t}`,
 * und /connect/my waere aus demselben Grund abgestuerzt.
 */
export function ConnectLifecycleForm({ id, status }: { id: string; status: string }) {
  const t = useTranslations("connect");
  const button = (intent: "pause" | "complete" | "publish" | "renew", className: string) => (
    <ConnectSubmitButton
      intent={intent}
      label={t(`actions.${intent}`)}
      pendingLabel={t(`pending.${intent}`)}
      className={className}
    />
  );
  return (
    <form action={changeConnectListingStatusAction} className="flex flex-wrap gap-2">
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
