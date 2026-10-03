import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { safeRadarUrl, uuid, type RadarSignal, type RadarSource } from "@/features/problem-radar/model";
import { buttonClass, Identity, inputClass, ResultMessage, SignalForm } from "@/features/problem-radar/forms";
import { reviewRadarSignalAction } from "@/features/problem-radar/actions";
import { SubmitButton } from "@/features/ui/SubmitButton";
export default async function SignalPage({params,searchParams}: {params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const client=await requirePlatformAdmin(); const {id}=await params; if(!uuid(id)) notFound();
  const [t,query,result,sourcesResult]=await Promise.all([getTranslations('radar'),searchParams,client.rpc('list_radar_signals',{p_id:id}),client.rpc('list_radar_sources')]);
  if(result.error || sourcesResult.error) return <p role="alert">{t('loadError')}</p>;
  const signal=(result.data as RadarSignal[])?.[0]; if(!signal) notFound();
  const sourceUrl=safeRadarUrl(signal.source_url);
  const editable=!signal.expired && signal.review_status!=='discarded' && !signal.usage_block && signal.source_usable;
  const reviewActions = [
    ...(!signal.expired && signal.source_usable && !signal.usage_block && signal.availability !== 'removed' ? ['reviewed', ...(['reviewed','relevant'].includes(signal.review_status) ? ['relevant'] : [])] : []),
    ...(!signal.usage_block ? ['blocked'] : !signal.expired && signal.source_usable ? ['unblocked'] : []),
    'discarded',
  ];
  return <><ResultMessage result={query.result}/><h2 className="mt-5 text-xl font-semibold">{signal.problem_observation ?? t('minimizedRecord')}</h2>
    <p className="my-3 text-sm">{t(`options.${signal.review_status}`)} · {signal.usable ? t('usable') : t('notUsable')}{signal.overdue ? ` · ${t('overdue')}` : ''}</p>
    <p className="my-2 text-sm">{t('fields.source_date')}: {signal.source_date ?? t('unknown')} · {t('captured')}: {signal.captured_at.slice(0,10)} · {signal.source_language.toUpperCase()} / {signal.summary_language.toUpperCase()}</p>
    <p className="text-sm">{signal.source_name} · {signal.source_region==='unknown' ? t('unknown') : signal.source_region} · {t(`options.${signal.availability}`)}</p>
    {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer" className="my-3 inline-flex min-h-11 items-center underline">{t('openSource')}</a> : null}
    <dl className="my-5 space-y-4 text-sm">{(['source_title','summary','problem_observation','affected_context'] as const).map(k=><div key={k}><dt className="font-semibold">{t(`fields.${k}`)}</dt><dd className="whitespace-pre-wrap">{signal[k]??t('unknown')}</dd></div>)}<div><dt className="font-semibold">{t('fields.tags')}</dt><dd>{signal.tags.join(', ')||t('unknown')}</dd></div></dl>
    <p className="text-sm">{t('restrictions')}: {signal.usage_block || signal.sensitivity==='sensitive' ? t('blocked') : t('clear')} · {t('reviewDue')}: {signal.review_due_at.slice(0,10)} · {t('revision')}: {signal.revision}</p>
    <p className="my-2 text-sm">{t('reviewedAt')}: {signal.reviewed_at?.slice(0,10)??t('unknown')} · {t('reviewer')}: {signal.reviewed_by??t('unknown')}</p>
    {signal.review_status!=='discarded' ? <form action={reviewRadarSignalAction} className="my-5 space-y-4 rounded-xl border p-4"><Identity value={signal}/><p className="text-sm leading-6">{t('reviewHint')}</p>
      <label className="block text-sm">{t('reason')}<select name="reason" className={inputClass}>{['manual_review','sensitive','takedown','not_relevant'].map(v=><option key={v} value={v}>{t(`options.${v}`)}</option>)}</select></label>
      <label className="block text-sm">{t('operation')}<select name="action" className={inputClass}>{reviewActions.map(action=><option key={action} value={action}>{t(`actions.${action}`)}</option>)}</select></label>
      <SubmitButton label={t('applyReview')} pendingLabel={t('saving')} className={buttonClass}/>
    </form> : null}
    {editable ? <details className="my-6 rounded-xl border p-4"><summary className="flex min-h-11 cursor-pointer items-center font-semibold">{t('editSignal')}</summary><p className="text-sm">{t('editHint')}</p><SignalForm signal={signal} sources={sourcesResult.data as RadarSource[]}/></details> : null}
  </>;
}
