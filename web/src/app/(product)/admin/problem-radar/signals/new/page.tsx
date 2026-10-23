import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { SignalForm } from "@/features/problem-radar/forms";
import { uuid, type RadarSource } from "@/features/problem-radar/model";
export default async function NewSignalPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const client = await requirePlatformAdmin();
  const params = await searchParams;
  const candidateId = typeof params.candidate === 'string' && uuid(params.candidate) ? params.candidate : null;
  const candidate = candidateId ? (await client.rpc('get_radar_candidate', { p_id: candidateId })).data as { id: string; url: string; title: string | null; source_date: string | null } | null : null;
  const [t,{data,error}] = await Promise.all([getTranslations('radar'),client.rpc('list_radar_sources')]);
  const sources=(data??[]) as RadarSource[];
  return <><h2 className="mt-6 text-xl font-semibold">{t('addSignal')}</h2>{error ? <p role="alert">{t('loadError')}</p> : sources.some(s=>s.usable) ? <SignalForm sources={sources} candidate={candidate ?? undefined}/> : <p className="mt-4">{t('noSource')}</p>}</>;
}
