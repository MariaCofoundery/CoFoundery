import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { radarRoot, type RadarSource } from "@/features/problem-radar/model";
import { Identity, inputClass, ResultMessage, SaveButton, SourceForm } from "@/features/problem-radar/forms";
import { reviewRadarSourceAction } from "@/features/problem-radar/actions";
export default async function SourcesPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const client = await requirePlatformAdmin();
  const [t,params,{data,error}] = await Promise.all([getTranslations('radar'),searchParams,client.rpc('list_radar_sources')]);
  const sources = (data??[]) as RadarSource[];
  const selected = sources.find(s=>s.id===params.source);
  return <><h2 className="mt-6 text-xl font-semibold">{t('sources')}</h2><ResultMessage result={params.result}/>
    {error ? <p role="alert">{t('loadError')}</p> : <ul className="my-5 space-y-3">{sources.map(s=><li key={s.id} className="rounded-xl border p-4"><Link href={`${radarRoot}/sources?source=${s.id}`} className="font-semibold underline">{s.name}</Link><p className="mt-1 text-sm">{s.domain}{s.allowed_path} · {t(`options.${s.permission_state}`)} · {t(`options.${s.status}`)} · {s.usable ? t('usable') : t('notUsable')}</p><p className="text-sm">{t('reviewDue')}: {s.review_due_at?.slice(0,10) ?? t('unknown')}{s.review_due_at && new Date(s.review_due_at).getTime() <= Date.now() ? ` · ${t('overdue')}` : ''}</p></li>)}</ul>}
    <section className="rounded-2xl border p-4 sm:p-6"><h2 className="text-lg font-semibold">{selected ? t('editSource') : t('addSource')}</h2>{selected ? <Link className="my-2 inline-flex min-h-11 items-center text-sm underline" href={`${radarRoot}/sources`}>{t('addSource')}</Link> : null}<SourceForm source={selected}/></section>
    {selected ? <section className="mt-6 rounded-2xl border p-4 sm:p-6"><h2 className="font-semibold">{t('sourceReview')}</h2><p className="my-3 text-sm leading-6">{t('sourceReviewHint')}</p><p className="text-sm">{t('reviewedAt')}: {selected.reviewed_at?.slice(0,10) ?? t('unknown')}</p><form action={reviewRadarSourceAction} className="mt-4 space-y-4"><Identity value={selected}/>
      <label className="block text-sm">{t('permission')}<select name="permission_state" defaultValue={selected.permission_state} className={inputClass}>{['pending','approved','denied'].map(v=><option key={v} value={v}>{t(`options.${v}`)}</option>)}</select></label>
      <label className="block text-sm">{t('status')}<select name="status" defaultValue={selected.status} className={inputClass}>{['active','paused','withdrawn'].map(v=><option key={v} value={v}>{t(`options.${v}`)}</option>)}</select></label>
      <label className="block text-sm">{t('reviewDue')}<input type="date" name="review_due_at" defaultValue={selected.review_due_at?.slice(0,10) ?? ''} className={inputClass}/></label>
      <SaveButton/>
    </form></section> : null}
  </>;
}
