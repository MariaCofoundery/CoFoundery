import Link from "next/link";
import { ConnectSubmitButton } from "@/features/connect/ConnectSubmitButton";
import { HELP_TYPES, THANKS_BODY_MAX, THANKS_OUTCOMES } from "./thanksModel";

type T = (key: string, values?: Record<string, string | number>) => string;

/** Das eine Danke-Formular, fuer beide Wege: nach einem Gespraech und ohne. Alles freiwillig bis auf "Wobei?". */
export function ThanksForm({ action, hidden, name, t, backHref, errorKey, note }: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: { name: string; value: string }[];
  name: string; t: T; backHref: string; errorKey?: string | null; note?: string;
}) {
  const chip = "flex min-h-11 cursor-pointer items-center rounded-full border border-slate-300 bg-white px-4 text-[15px] has-[:checked]:border-violet-700 has-[:checked]:bg-violet-700 has-[:checked]:font-semibold has-[:checked]:text-white";
  return (
    <>
      {errorKey ? <p role="alert" className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t(`thanks.errors.${errorKey}`)}</p> : null}
      <form action={action} className="mt-6 space-y-6">
        {hidden.map((field) => <input key={field.name} type="hidden" name={field.name} value={field.value} />)}
        <fieldset>
          <legend className="text-[15px] font-semibold">{t("thanks.whatFor")} <span className="font-normal text-slate-600">{t("thanks.severalOk")}</span></legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {HELP_TYPES.map((type) => <label key={type} className={chip}><input type="checkbox" name="help_type" value={type} className="sr-only" />{t(`thanks.types.${type}`)}</label>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-[15px] font-semibold">{t("thanks.whatBecame")} <span className="font-normal text-slate-600">{t("thanks.optional")}</span></legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {THANKS_OUTCOMES.map((outcome) => <label key={outcome} className={chip}><input type="radio" name="outcome" value={outcome} className="sr-only" />{t(`thanks.outcomeChoice.${outcome}`)}</label>)}
          </div>
        </fieldset>
        <div>
          <label htmlFor="thanks-body" className="text-[15px] font-semibold">{t("thanks.words", { name })} <span className="font-normal text-slate-600">{t("thanks.optional")}</span></label>
          <textarea id="thanks-body" name="body" rows={3} maxLength={THANKS_BODY_MAX} placeholder={t("thanks.placeholder")} className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white p-3 text-base leading-6" />
        </div>
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <input type="checkbox" name="show" className="mt-1 h-5 w-5" />
          <span className="text-[15px] leading-6"><strong>{t("thanks.showTitle", { name })}</strong><br /><span className="text-sm text-slate-600">{t("thanks.showNote")}</span></span>
        </label>
        {note ? <p className="rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-5 text-slate-700">{note}</p> : null}
        <div className="flex flex-col gap-2">
          <ConnectSubmitButton label={t("thanks.send")} pendingLabel="…" className="min-h-[54px] rounded-2xl bg-[linear-gradient(90deg,#5b3df5,#0a88c2)] px-5 text-lg font-bold text-white" />
          <Link href={backHref} className="inline-flex min-h-11 items-center justify-center text-[15px] text-slate-600">{t("thanks.notNow")}</Link>
        </div>
      </form>
    </>
  );
}
