import { getTranslations } from "next-intl/server";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { saveRadarSignalAction, saveRadarSourceAction } from "./actions";
import { methods, sourceTypes, type RadarSignal, type RadarSource } from "./model";
export const inputClass = "mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-base";
export const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800";
export function Identity({ value }: { value?: { id: string; revision: number } }) {
  return value ? <><input type="hidden" name="id" value={value.id} /><input type="hidden" name="revision" value={value.revision} /></> : null;
}
export async function SaveButton() {
  const t = await getTranslations("radar");
  return <SubmitButton label={t("save")} pendingLabel={t("saving")} className={buttonClass} />;
}
export async function SourceForm({ source }: { source?: RadarSource }) {
  const t = await getTranslations("radar");
  const fields = [["name",160],["domain",253],["allowed_path",1000],["region",120],["target_context",400],["policy_references",2000],["review_note",1000]] as const;
  const selects = { source_type: sourceTypes, retrieval_method: methods, source_language: ["de","en"], source_nature: ["direct","editorial","aggregated","mixed","unknown"], source_origin: ["primary","secondary","unknown"] };
  return <form action={saveRadarSourceAction} className="mt-4 space-y-4">
    <Identity value={source} />
    <p className="text-sm text-slate-600">{t("sourceHint")}</p>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      {fields.map(([key,max]) => <label key={key} className="min-w-0 text-sm font-medium">{t(`fields.${key}`)}
        <input name={key} maxLength={max} required={!['region','policy_references','review_note'].includes(key)} defaultValue={source?.[key] ?? (key==='allowed_path' ? '/' : '')} className={inputClass} />
      </label>)}
      {Object.entries(selects).map(([key,values]) => <label key={key} className="min-w-0 text-sm font-medium">{t(`fields.${key}`)}<select name={key} defaultValue={String(source?.[key as keyof RadarSource] ?? (key==='retrieval_method' ? 'manual_url' : values[0]))} className={inputClass}>{values.map(value => <option key={value} value={value}>{t(`options.${value}`)}</option>)}</select></label>)}
    </div>
    <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" name="is_public" defaultChecked={source?.is_public} className="mt-1" />{t("publicConfirmation")}</label>
    <SaveButton />
  </form>;
}
export async function SignalForm({ sources, signal }: { sources: RadarSource[]; signal?: RadarSignal }) {
  const t = await getTranslations("radar");
  return <form action={saveRadarSignalAction} className="mt-5 space-y-4">
    <Identity value={signal} />
    <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6">{t("ownWords")}</p>
    <label className="block text-sm font-medium">{t("fields.source_id")}<select name="source_id" required defaultValue={signal?.source_id ?? ""} className={inputClass}>
      <option value="" disabled>{t("chooseSource")}</option>
      {sources.filter(s => s.usable && (!signal || s.id===signal.source_id)).map(s => <option key={s.id} value={s.id}>{s.name} · {s.domain}{s.allowed_path}</option>)}
    </select></label>
    <label className="block text-sm font-medium">{t("fields.source_url")}<input name="source_url" type="url" required readOnly={!!signal} maxLength={2048} defaultValue={signal?.source_url ?? ""} className={inputClass} /></label>
    {!signal ? <label className="block text-sm font-medium">{t("fields.stable_public_item_id")}<input name="stable_public_item_id" maxLength={120} className={inputClass} /><span className="text-xs text-slate-500">{t("itemHint")}</span></label> : null}
    <label className="block text-sm font-medium">{t("fields.source_title")}<input name="source_title" maxLength={200} defaultValue={signal?.source_title ?? ""} className={inputClass} /></label>
    <label className="block text-sm font-medium">{t("fields.source_date")}<input name="source_date" type="date" defaultValue={signal?.source_date ?? ""} className={inputClass} /></label>
    <div className="grid gap-4 sm:grid-cols-2">{(["source_language","summary_language"] as const).map(key => <label key={key} className="text-sm font-medium">{t(`fields.${key}`)}<select name={key} defaultValue={signal?.[key] ?? 'de'} className={inputClass}><option value="de">{t("options.de")}</option><option value="en">{t("options.en")}</option></select></label>)}</div>
    {([["summary",800],["problem_observation",1000],["affected_context",400]] as const).map(([key,max]) => <label key={key} className="block text-sm font-medium">{t(`fields.${key}`)}<textarea name={key} required maxLength={max} rows={3} defaultValue={signal?.[key] ?? ""} className={inputClass} /></label>)}
    <label className="block text-sm font-medium">{t("fields.tags")}<input name="tags" maxLength={327} defaultValue={signal?.tags.join(', ') ?? ""} className={inputClass} /></label>
    <label className="block text-sm font-medium">{t("fields.availability")}<select name="availability" defaultValue={signal?.availability ?? 'unchecked'} className={inputClass}>{['unchecked','available','unreachable','removed'].map(value => <option key={value} value={value}>{t(`options.${value}`)}</option>)}</select></label>
    <label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input name="minimized" type="checkbox" required className="mt-1" />{t("minimized")}</label>
    <SaveButton />
  </form>;
}
export async function ResultMessage({ result }: { result: unknown }) {
  const t = await getTranslations("radar");
  if (typeof result !== 'string' || !['saved','invalid','conflict','duplicate','purged'].includes(result)) return null;
  return <p role={['invalid','conflict'].includes(result) ? 'alert' : 'status'} className="my-4 rounded-xl bg-slate-100 p-4 text-sm">{t(`results.${result}`)}</p>;
}
