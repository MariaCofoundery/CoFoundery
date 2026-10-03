import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { filter, pageNumber, radarRoot, statuses, uuid, type RadarSignal, type RadarSource } from "@/features/problem-radar/model";
import { buttonClass, inputClass, ResultMessage } from "@/features/problem-radar/forms";
import { purgeRadarAction } from "@/features/problem-radar/actions";
import { SubmitButton } from "@/features/ui/SubmitButton";
export default async function RadarPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const client = await requirePlatformAdmin();
  const params = await searchParams;
  const page = pageNumber(params.page), status = filter(params.status,statuses), language = filter(params.language,['de','en']), source = uuid(params.source) ? params.source : null;
  const [t,locale,list,sourcesResult] = await Promise.all([getTranslations('radar'),getLocale(),client.rpc('list_radar_signals',{p_status:status,p_source:source,p_language:language,p_offset:page*25}),client.rpc('list_radar_sources')]);
  const rows = (list.data ?? []) as RadarSignal[], sources = (sourcesResult.data ?? []) as RadarSource[];
  const date = (value: string) => new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value));
  const link = (target: number) => `${radarRoot}?${new URLSearchParams({page:String(target),...(status ? {status} : {}),...(source ? {source} : {}),...(language ? {language} : {})})}`;
  return <>
    <Link href={`${radarRoot}/signals/new`} className={buttonClass}>{t('addSignal')}</Link>
    <ResultMessage result={params.result} />
    <form method="get" className="my-5 grid gap-3 sm:grid-cols-4">
      <label className="min-w-0 text-sm">{t('status')}<select name="status" defaultValue={status??''} className={inputClass}><option value="">{t('all')}</option>{statuses.map(s=><option key={s} value={s}>{t(`options.${s}`)}</option>)}</select></label>
      <label className="min-w-0 text-sm">{t('fields.source_id')}<select name="source" defaultValue={source??''} className={inputClass}><option value="">{t('all')}</option>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="min-w-0 text-sm">{t('fields.source_language')}<select name="language" defaultValue={language??''} className={inputClass}><option value="">{t('all')}</option><option value="de">DE</option><option value="en">EN</option></select></label>
      <button className={`${buttonClass} self-end`}>{t('apply')}</button>
    </form>
    {list.error || sourcesResult.error ? <p role="alert">{t('loadError')}</p> : rows.length===0 ? <p className="py-8">{t('empty')}</p> : <div className="space-y-4">{rows.slice(0,25).map(r=><article key={r.id} className="min-w-0 rounded-2xl border border-slate-200 p-4">
      <span className="text-sm text-slate-600">{t(`options.${r.review_status}`)} · {r.usable ? t('usable') : t('notUsable')}{r.overdue ? ` · ${t('overdue')}` : ''}</span>
      <h2 className="my-2 font-semibold"><Link href={`${radarRoot}/signals/${r.id}`} className="underline">{r.problem_observation ?? t('minimizedRecord')}</Link></h2>
      <p className="text-sm">{r.source_name} · {t(`options.${r.source_type}`)} · {r.source_language.toUpperCase()}</p>
      <p className="mt-2 text-sm">{t('fields.source_date')}: {r.source_date ? date(r.source_date) : t('unknown')} · {t('captured')}: {date(r.captured_at)}</p>
      <p className="mt-2 text-sm">{t('restrictions')}: {r.usage_block || r.sensitivity==='sensitive' ? t('blocked') : t('clear')}</p>
    </article>)}</div>}
    <nav className="my-5 flex flex-wrap gap-3" aria-label={t('pagination')}>{page>0 ? <Link className={buttonClass} href={link(page-1)}>{t('previous')}</Link> : null}{rows.length>25 ? <Link className={buttonClass} href={link(page+1)}>{t('next')}</Link> : null}</nav>
    <section className="mt-8 rounded-xl bg-slate-50 p-4"><h2 className="font-semibold">{t('retention')}</h2><p className="my-3 text-sm leading-6">{t('retentionHint')}</p><form action={purgeRadarAction}><SubmitButton label={t('purge')} pendingLabel={t('saving')} className={buttonClass}/></form></section>
  </>;
}
