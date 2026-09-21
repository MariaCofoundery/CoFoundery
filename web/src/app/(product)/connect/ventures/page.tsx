import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ConnectTabs } from "@/features/connect/ConnectTabs";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getConnectProfilesByUserIds } from "@/features/connect/connectData";
import { getConnectTabCounts } from "@/features/connect/connectPeopleData";
import { getActiveConnectVentures, ventureLogoUrl } from "@/features/connect/connectVentureData";
import { ConnectAvatar } from "@/features/connect/ConnectAvatar";

/**
 * Die Unternehmen im Netzwerk.
 *
 * GEBAUT AM 21.09.2026. Bis dahin gab es Unternehmen nur als EIGENE, unter
 * dieser Adresse - eine Verwaltungsseite, die jetzt unter /connect/ventures/mine
 * liegt, wo sie hingehoert (sie steht in der Navigation der eigenen Sachen).
 * Hier war nichts: Auf einer Personenkarte stand "2 Unternehmen", und es
 * fuehrte kein einziger Weg dorthin.
 *
 * JEDES UNTERNEHMEN ZEIGT SEINEN MENSCHEN. Das ist der Punkt: Ein Verzeichnis
 * von Firmen waere ein Handelsregister. Was hier entsteht, ist ein Netzwerk -
 * also steht an jedem Eintrag, wer dahinter steht, und ein Klick fuehrt zu ihm.
 *
 * Sortiert nach Aktualitaet, nie nach Passung - dieselbe Linie wie bei den
 * Menschen und am Problembrett: Sobald sortiert wird, ist es eine Rangliste.
 */
export default async function ConnectVentureDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, params] = await Promise.all([getTranslations("connect"), searchParams]);
  const { client, user } = await requireConnectMember("/connect/ventures");

  const term = (params.q ?? "").trim();
  const [ventures, counts] = await Promise.all([
    getActiveConnectVentures(client, term),
    getConnectTabCounts(client, user.id),
  ]);

  // Der Mensch zu jedem Unternehmen, in einer Abfrage statt einer je Karte.
  // getConnectProfilesByUserIds gibt bereits eine Map zurueck.
  const ownerByUserId = await getConnectProfilesByUserIds(
    client,
    [...new Set(ventures.map((venture) => venture.owner_user_id))]
  );

  const card = "rounded-3xl border border-slate-200 bg-white p-5 sm:p-6";

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <p className="text-xs uppercase tracking-[.18em] text-slate-500">{t("eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {t("ventures.directoryTitle")}
      </h1>
      <p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("ventures.directoryText")}</p>

      <div className="mt-5">
        <ConnectTabs active="ventures" counts={counts} />
      </div>

      <form method="get" className="mt-5 flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder={t("ventures.searchPlaceholder")}
          aria-label={t("ventures.searchPlaceholder")}
          className="min-h-11 min-w-0 flex-1 rounded-full border border-slate-200 px-4 text-sm"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t("filters.apply")}
        </button>
      </form>

      {ventures.length === 0 ? (
        <section className={`${card} mt-6 text-center`}>
          <h2 className="text-lg font-semibold text-slate-900">
            {term ? t("ventures.emptySearch") : t("ventures.emptyDirectory")}
          </h2>
          <Link
            href="/connect/ventures/mine"
            className="mt-4 inline-flex min-h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t("ventures.addOwn")}
          </Link>
        </section>
      ) : (
        <section aria-label={t("ventures.directoryTitle")} className="mt-6 grid gap-4 md:grid-cols-2">
          {ventures.map((venture) => {
            const owner = ownerByUserId.get(venture.owner_user_id);
            const logo = ventureLogoUrl(venture);
            return (
              <article key={venture.id} className={card}>
                <div className="flex items-start gap-3">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-2xl border border-slate-200 object-contain"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-slate-950">{venture.name}</h2>
                    {venture.role_label ? (
                      <p className="truncate text-sm text-slate-500">{venture.role_label}</p>
                    ) : null}
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-700">{venture.what_it_does}</p>
                {venture.audience ? (
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {t("ventures.audienceLabel")}: {venture.audience}
                  </p>
                ) : null}

                {/* Der Mensch dahinter - ohne ihn waere das ein Handelsregister. */}
                {owner ? (
                  <Link
                    href={`/connect/people/${owner.user_id}`}
                    className="mt-4 flex min-w-0 items-center gap-3 border-t border-slate-100 pt-4 hover:opacity-80"
                  >
                    <ConnectAvatar profile={owner} displayName={owner.display_name} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {owner.display_name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{owner.headline}</span>
                    </span>
                  </Link>
                ) : null}

                {venture.website ? (
                  <a
                    href={venture.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={t("ventures.openLinkHint")}
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline"
                  >
                    {t("ventures.openWebsite")}
                  </a>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
