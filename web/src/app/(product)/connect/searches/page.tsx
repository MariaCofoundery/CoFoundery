import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import {
  deleteConnectSearchAction,
  setConnectSearchNotifyAction,
} from "@/features/connect/savedSearchActions";
import { getOwnSavedSearches } from "@/features/connect/savedSearchData";
import { CONNECT_ERROR_KEYS } from "@/features/connect/connectFeedbackKeys";
import { ConfirmSubmitButton } from "@/features/ui/ConfirmSubmitButton";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { knownKey } from "@/i18n/knownKey";

const card = "rounded-3xl border border-slate-200 bg-white p-6";
const SAVED_KEYS = ["created", "deleted"];

/**
 * Die gespeicherten Suchen.
 *
 * Jede zeigt ihre Kriterien im Klartext - wer nach Wochen eine Meldung
 * bekommt, soll nachsehen koennen, wonach er damals gesucht hat.
 */
export default async function ConnectSearchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, params] = await Promise.all([getTranslations("connect"), searchParams]);
  const { client } = await requireConnectMember("/connect/searches");
  const searches = await getOwnSavedSearches(client, "connect");

  const saved = SAVED_KEYS.includes(params.saved ?? "") ? params.saved : null;
  const errorKey = knownKey(params.error, CONNECT_ERROR_KEYS);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/connect" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">
        ← {t("navigation.overview")}
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("searches.title")}</h1>
      <p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("searches.text")}</p>

      {saved ? (
        <p role="status" className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
          {t(`searches.saved.${saved}`)}
        </p>
      ) : null}
      {errorKey ? (
        <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          {t(`errors.${errorKey}`)}
        </p>
      ) : null}

      {searches.length ? (
        <div className="mt-6 space-y-4">
          {searches.map((search) => {
            const criteria = [
              search.query ? `${t("searches.criteria.query")}: ${search.query}` : null,
              search.topics.length ? `${t("form.topics")}: ${search.topics.join(", ")}` : null,
              search.industries.length ? `${t("form.industries")}: ${search.industries.join(", ")}` : null,
              search.locations.length ? `${t("searches.criteria.locations")}: ${search.locations.join(", ")}` : null,
              search.capabilityAreaIds.length
                ? `${t("searches.criteria.capabilities")}: ${search.capabilityAreaIds.join(", ")}`
                : null,
              search.geographicScope ? `${t("filters.scope")}: ${t(`scopes.${search.geographicScope}`)}` : null,
              search.remoteMode ? `${t("filters.remote")}: ${t(`remote.${search.remoteMode}`)}` : null,
              search.connectDirection ? t(`directions.${search.connectDirection}`) : null,
              search.connectCategory ? t(`categories.${search.connectCategory}`) : null,
            ].filter(Boolean);

            return (
              <article key={search.id} className={card}>
                <h2 className="text-lg font-semibold">{search.label}</h2>
                {/* Die Kriterien im Klartext - sonst weiss nach Wochen
                    niemand mehr, warum eine Meldung kam. */}
                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  {criteria.map((line) => (
                    <li key={line as string}>· {line}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-slate-500">
                  {t(
                    search.includeListings && search.includeProblems
                      ? "searches.scopeBoth"
                      : search.includeListings
                        ? "searches.scopeListings"
                        : "searches.scopeProblems"
                  )}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <form action={setConnectSearchNotifyAction}>
                    <input type="hidden" name="search_id" value={search.id} />
                    <input type="hidden" name="notify" value={search.notify ? "false" : "true"} />
                    <SubmitButton
                      label={t(search.notify ? "searches.notifyOff" : "searches.notifyOn")}
                      pendingLabel={t("pending.save")}
                      className="min-h-11 rounded-full border border-slate-200 px-4 text-sm font-semibold"
                    />
                  </form>
                  <span className="text-xs text-slate-500">
                    {t(search.notify ? "searches.notifyStateOn" : "searches.notifyStateOff")}
                  </span>
                  <form action={deleteConnectSearchAction}>
                    <input type="hidden" name="search_id" value={search.id} />
                    <ConfirmSubmitButton
                      label={t("searches.delete")}
                      question={t("searches.deleteQuestion")}
                      confirmLabel={t("searches.deleteConfirm")}
                      cancelLabel={t("searches.deleteCancel")}
                      pendingLabel={t("pending.save")}
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
        <section className={`${card} mt-6 text-center`}>
          <h2 className="text-xl font-semibold">{t("searches.emptyTitle")}</h2>
          <p className="mt-2 text-sm text-slate-600">{t("searches.emptyText")}</p>
          <Link
            href="/connect"
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold"
          >
            {t("searches.emptyCta")}
          </Link>
        </section>
      )}
    </main>
  );
}
