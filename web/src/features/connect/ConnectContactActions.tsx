import { cancelConnectContactAction, respondConnectContactAction } from "./connectActions";
import { ConnectSubmitButton } from "./ConnectSubmitButton";

type T = (key: string) => string;

export function ConnectContactActions({ id, direction, t }: { id: string; direction: "incoming" | "outgoing"; t: T }) {
  if (direction === "outgoing") return <form action={cancelConnectContactAction}><input type="hidden" name="id" value={id} /><ConnectSubmitButton label={t("contact.cancel")} pendingLabel={t("contact.canceling")} className="min-h-11 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold" /></form>;
  return <form action={respondConnectContactAction} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={id} />
    <ConnectSubmitButton fieldName="response" intent="accepted" label={t("contact.accept")} pendingLabel={t("contact.accepting")} className="min-h-11 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" />
    <ConnectSubmitButton fieldName="response" intent="declined" label={t("contact.decline")} pendingLabel={t("contact.declining")} className="min-h-11 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold" />
  </form>;
}
