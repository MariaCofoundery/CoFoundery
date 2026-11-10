import { respondConnectContactAction, snoozeConnectIntroductionAction, answerConnectIntroductionOutcomeAction } from "@/features/connect/connectActions";
import { ConnectSubmitButton } from "@/features/connect/ConnectSubmitButton";

type T = (key: string, values?: Record<string, string | number>) => string;

/** Die Antwort der Kennerin auf eine Vorstellung: Ja, Spaeter, Lieber nicht. Je Antwort ein eigenes Formular mit verstecktem Feld. */
export function IntroductionActions({ id, snoozed, t }: { id: string; snoozed: boolean; t: T }) {
  const btn = "min-h-11 rounded-full px-4 py-2 text-sm font-semibold";
  return (
    <div className="flex flex-wrap gap-2">
      <form action={respondConnectContactAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="response" value="accepted" /><ConnectSubmitButton label={t("introductions.yes")} pendingLabel={t("contact.accepting")} className={`${btn} bg-emerald-800 text-white`} /></form>
      {snoozed ? null : <form action={snoozeConnectIntroductionAction}><input type="hidden" name="id" value={id} /><ConnectSubmitButton label={t("introductions.later")} pendingLabel="…" className={`${btn} border border-slate-300 bg-white`} /></form>}
      <form action={respondConnectContactAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="response" value="declined" /><ConnectSubmitButton label={t("introductions.no")} pendingLabel={t("contact.declining")} className={`${btn} border border-slate-300 bg-white`} /></form>
    </div>
  );
}

/** "Hat es geklappt?" - eine Karte je angenommener Vorstellung nach 14 Tagen. Die Antwort bleibt privat. */
export function IntroductionOutcomeCard({ id, title, name, t }: { id: string; title: string; name: string; t: T }) {
  const btn = "min-h-11 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold";
  return (
    <article className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
      <h3 className="text-base font-semibold text-slate-950">{t("introductions.outcomeTitle")}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-700">{t("introductions.outcomeText", { type: title, name })}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["yes", "not_yet", "no"] as const).map((outcome) => (
          <form key={outcome} action={answerConnectIntroductionOutcomeAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="outcome" value={outcome} /><ConnectSubmitButton label={t(`introductions.outcome.${outcome}`)} pendingLabel="…" className={btn} /></form>
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600">{t("introductions.outcomeNote")}</p>
    </article>
  );
}
