import { cancelConnectContactAction, respondConnectContactAction } from "./connectActions";
import { ConnectSubmitButton } from "./ConnectSubmitButton";

type T = (key: string) => string;

export function ConnectContactActions({ id, direction, t }: { id: string; direction: "incoming" | "outgoing"; t: T }) {
  if (direction === "outgoing") return <form action={cancelConnectContactAction}><input type="hidden" name="id" value={id} /><ConnectSubmitButton label={t("contact.cancel")} pendingLabel={t("contact.canceling")} className="min-h-11 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold" /></form>;
  // Beta-Gate 06.10.2026: je Antwort ein eigenes Formular mit verstecktem Feld.
  // Vorher hing `response` am Namen/Wert des gedrueckten Knopfs - und kam in
  // der Server-Aktion leer an ("Die Kontaktanfrage konnte nicht geaendert
  // werden"). Annehmen und Ablehnen waren damit beide unmoeglich.
  return <div className="flex flex-wrap gap-2">
    <form action={respondConnectContactAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="response" value="accepted" />
      <ConnectSubmitButton label={t("contact.accept")} pendingLabel={t("contact.accepting")} className="min-h-11 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" />
    </form>
    <form action={respondConnectContactAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="response" value="declined" />
      <ConnectSubmitButton label={t("contact.decline")} pendingLabel={t("contact.declining")} className="min-h-11 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold" />
    </form>
  </div>;
}
