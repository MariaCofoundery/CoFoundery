import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DiscoveryMineNav } from "@/features/discovery/DiscoveryMineNav";
import { getOwnSavedSearches } from "@/features/connect/savedSearchData";
import {
  deleteDiscoverySearchAction,
  setDiscoverySearchNotifyAction,
} from "@/features/discovery/savedSearchActions";
import { hasFounderDiscoveryAccess } from "@/features/discovery/discoveryAccess";
import { ConfirmSubmitButton } from "@/features/ui/ConfirmSubmitButton";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createClient, getRequestUser } from "@/lib/supabase/server";

const CARD =
  "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6";
const SAVED_KEYS = ["created", "deleted"];

/**
 * Die gemerkten Suchen.
 *
 * Dieselbe Tabelle wie in Connect, dieselbe Zurueckhaltung: Jede Suche zeigt
 * ihre Kriterien im Klartext, und die Benachrichtigung laesst sich einzeln
 * abschalten, ohne die Suche zu verlieren.
 */
export default async function DiscoverySearchesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const [t, capability, params] = await Promise.all([
    getTranslations("discovery"),
    getTranslations("capability"),
    searchParams ? searchParams : Promise.resolve({} as Record<string, string | undefined>),
  ]);

  const client = await createClient();
  const {
    data: { user },
  } = await getRequestUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent("/discovery/searches")}`);
  if (!(await hasFounderDiscoveryAccess(user.id, client))) redirect("/advisor/dashboard");

  const searches = await getOwnSavedSearches(client, "discovery");
  const saved = SAVED_KEYS.includes(params.saved ?? "") ? params.saved : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff,#f8fafc)] px-5 py-10 text-slate-950 md:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/discovery?mode=search#search"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600"
        >
          ← {t("v2.searches.back")}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.03em]">{t("v2.searches.title")}</h1>
            <p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("v2.searches.text")}</p>
          </div>
          <DiscoveryMineNav />
        </div>

        {saved ? (
          <p role="status" className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
            {t(`v2.searches.saved.${saved}`)}
          </p>
        ) : null}
        {params.error ? (
          <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            {t("v2.searches.error")}
          </p>
        ) : null}

        {searches.length ? (
          <div className="mt-6 space-y-4">
            {searches.map((search) => {
              const criteria = [
                search.topics.length
                  ? `${t("v2.searches.criteria.roles")}: ${search.topics.join(", ")}`
                  : null,
                search.industries.length
                  ? `${t("v2.searches.criteria.industries")}: ${search.industries.join(", ")}`
                  : null,
                search.locations.length
                  ? `${t("v2.searches.criteria.locations")}: ${search.locations.join(", ")}`
                  : null,
                search.remoteMode
                  ? `${t("v2.searches.criteria.remote")}: ${t(`remoteModes.${search.remoteMode}`)}`
                  : null,
                search.capabilityAreaIds.length
                  ? `${t("v2.searches.criteria.capabilities")}: ${search.capabilityAreaIds
                      .map((areaId) => capability(`areaLabels.${areaId}`))
                      .join(", ")}`
                  : null,
                search.alignmentDimensions.length
                  ? `${t("v2.searches.criteria.alignment")}: ${search.alignmentDimensions
                      .map((dimension) => t(`v2.alignment.dimensions.${dimension}`))
                      .join(", ")}`
                  : null,
              ].filter((line): line is string => line !== null);

              return (
                <article key={search.id} className={CARD}>
                  <h2 className="text-lg font-semibold">{search.label}</h2>
                  <ul className="mt-3 space-y-1 text-sm text-slate-600">
                    {criteria.map((line) => (
                      <li key={line}>· {line}</li>
                    ))}
                  </ul>
                  {/* Die Einschraenkung gehoert neben das Kriterium, nicht in
                      eine Fussnote: Sonst wundert sich jemand, warum die Liste
                      kuerzer ist als die Meldung. */}
                  {search.alignmentDimensions.length ? (
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      {t("v2.searches.alignmentHint")}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <form action={setDiscoverySearchNotifyAction}>
                      <input type="hidden" name="search_id" value={search.id} />
                      <input type="hidden" name="notify" value={search.notify ? "false" : "true"} />
                      <SubmitButton
                        label={t(search.notify ? "v2.searches.notifyOff" : "v2.searches.notifyOn")}
                        pendingLabel={t("v2.watch.saving")}
                        className="min-h-11 rounded-full border border-slate-200 px-4 text-sm font-semibold"
                      />
                    </form>
                    <span className="text-xs text-slate-500">
                      {t(search.notify ? "v2.searches.notifyStateOn" : "v2.searches.notifyStateOff")}
                    </span>
                    <form action={deleteDiscoverySearchAction}>
                      <input type="hidden" name="search_id" value={search.id} />
                      <ConfirmSubmitButton
                        label={t("v2.searches.delete")}
                        question={t("v2.searches.deleteQuestion")}
                        confirmLabel={t("v2.searches.deleteConfirm")}
                        cancelLabel={t("v2.searches.deleteCancel")}
                        pendingLabel={t("v2.watch.saving")}
                        className="text-xs font-semibold text-slate-500 underline underline-offset-2"
                        confirmClassName="min-h-11 rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-900"
                      />
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <section className={`${CARD} mt-6 text-center`}>
            <h2 className="text-xl font-semibold">{t("v2.searches.emptyTitle")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t("v2.searches.emptyText")}</p>
            <Link
              href="/discovery?mode=search#search"
              className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold"
            >
              {t("v2.searches.emptyCta")}
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
