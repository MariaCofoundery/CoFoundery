import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { SignalForm } from "@/features/problem-radar/forms";
import type { RadarSource } from "@/features/problem-radar/model";
export default async function NewSignalPage() {
  const client = await requirePlatformAdmin();
  const [t,{data,error}] = await Promise.all([getTranslations('radar'),client.rpc('list_radar_sources')]);
  const sources=(data??[]) as RadarSource[];
  return <><h2 className="mt-6 text-xl font-semibold">{t('addSignal')}</h2>{error ? <p role="alert">{t('loadError')}</p> : sources.some(s=>s.usable) ? <SignalForm sources={sources}/> : <p className="mt-4">{t('noSource')}</p>}</>;
}
