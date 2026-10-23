import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { radarRoot, type RadarCandidate, type RadarCollectionStatus } from "@/features/problem-radar/model";
import { buttonClass, ResultMessage } from "@/features/problem-radar/forms";
import { reviewRadarCandidateAction, runRadarScanAction, setRadarCollectionAction } from "@/features/problem-radar/actions";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Das Kandidatenfach des Wochenscans.
 *
 * Hier landet, was der Sammler gefunden hat: Titel, Datum und Adresse eines
 * oeffentlichen Beitrags, sonst nichts. Ob daraus ein Signal wird, entscheidet
 * ein Mensch und schreibt es mit eigenen Worten auf.
 */
export default async function CandidatesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const client = await requirePlatformAdmin();
  const params = await searchParams;
  const [t, locale, list, status] = await Promise.all([
    getTranslations("radar"),
    getLocale(),
    client.rpc("list_radar_candidates", { p_state: "open", p_offset: 0 }),
    client.rpc("admin_radar_collection_status"),
  ]);
  const rows = ((list.data ?? []) as RadarCandidate[]).slice(0, 25);
  const info = status.data as RadarCollectionStatus | null;
  const day = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
  const scan = typeof params.scan === "string" ? params.scan : null;
  const added = typeof params.added === "string" && /^\d{1,4}$/.test(params.added) ? Number(params.added) : 0;

  return <>
    <h2 className="mt-6 text-xl font-semibold">{t("candidates.title")}</h2>
    <p className="my-3 text-sm leading-6 text-slate-600">{t("candidates.intro")}</p>
    <ResultMessage result={params.result} />
    {scan ? <p role={scan === "error" || scan === "notconfigured" ? "alert" : "status"} className="my-4 rounded-xl bg-slate-100 p-4 text-sm">{t(`candidates.scan.${scan}`, { count: added })}</p> : null}

    {status.error || !info ? <p role="alert">{t("loadError")}</p> : <section className="rounded-2xl border p-4 sm:p-6">
      <h3 className="font-semibold">{t("candidates.weekly")}</h3>
      <p className="my-2 text-sm leading-6">{t("candidates.weeklyHint")}</p>
      <form action={setRadarCollectionAction} className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="enabled" defaultChecked={info.enabled} />{t("candidates.enabled")}</label>
        <SubmitButton label={t("save")} pendingLabel={t("saving")} className={buttonClass} />
      </form>
      <ul className="mt-4 space-y-2 text-sm">
        {info.sources.length === 0 ? <li>{t("candidates.noSources")}</li> : info.sources.map((source) => <li key={source.id} className="rounded-xl bg-slate-50 p-3">
          <strong>{source.name}</strong> · {source.collectable ? t("candidates.ready") : t("candidates.notReady")}
          {source.last_run?.finished_at ? <span className="block text-slate-600">{t("candidates.lastRun", { date: day(source.last_run.finished_at), outcome: t(`candidates.outcomes.${source.last_run.outcome}`), count: source.last_run.added })}</span> : <span className="block text-slate-600">{t("candidates.neverRun")}</span>}
        </li>)}
      </ul>
      <form action={runRadarScanAction} className="mt-4"><SubmitButton label={t("candidates.scanNow")} pendingLabel={t("candidates.scanning")} className={buttonClass} /></form>
    </section>}

    <h3 className="mt-8 font-semibold">{t("candidates.open")} ({info?.open_candidates ?? 0})</h3>
    {list.error ? <p role="alert">{t("loadError")}</p> : rows.length === 0 ? <p className="py-6">{t("candidates.empty")}</p> : <ul className="mt-3 space-y-3">
      {rows.map((row) => <li key={row.id} className="min-w-0 rounded-xl border p-4">
        <p className="font-semibold">{row.title}</p>
        <p className="mt-1 text-sm text-slate-600">{row.source_name}{row.source_date ? ` · ${day(row.source_date)}` : ""}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {row.url ? <a href={row.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-11 items-center text-sm underline">{t("candidates.openSource")}</a> : null}
          <Link href={`${radarRoot}/signals/new?candidate=${row.id}`} className={buttonClass}>{t("candidates.take")}</Link>
          <form action={reviewRadarCandidateAction}><input type="hidden" name="id" value={row.id} /><SubmitButton label={t("candidates.dismiss")} pendingLabel={t("saving")} className={buttonClass} /></form>
        </div>
      </li>)}
    </ul>}
  </>;
}
