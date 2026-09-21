import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ConnectAvatar } from "@/features/connect/ConnectAvatar";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getConnectProfilesByUserIds } from "@/features/connect/connectData";
import { getConnectVenture, getConnectVentures, ventureLogoUrl } from "@/features/connect/connectVentureData";

/**
 * Die Seite eines Unternehmens.
 *
 * GEMELDET AM 21.09.2026: Im Highlight-Feld stand ein Unternehmen, und der
 * Klick fuehrte auf das Profil des Menschen. "Cool waere doch, dass man eben
 * auch auf diese kleine Unternehmensseite kommt." Es gab sie nicht - jeder Weg
 * zu einem Unternehmen endete bei seiner Inhaberin.
 *
 * DAS UNTERNEHMEN ZUERST, der Mensch danach. Das ist die Reihenfolge, um die es
 * geht: Wer auf ein Unternehmen klickt, will wissen, worum es geht und fuer wen
 * es ist - nicht zuerst, wer dahintersteht. Der Mensch steht deshalb unten,
 * vollstaendig verlinkt, und nicht statt der Sache.
 *
 * "FUER WEN IST DAS" IST DAS WICHTIGSTE FELD, so steht es auch im Formular:
 * Daran erkennt jemand beim Lesen, ob er jemanden kennt, fuer den das passt.
 * Deshalb steht es hier abgesetzt und nicht im Fliesstext.
 *
 * Wer das sehen darf, entscheidet die Policy auf network_ventures: Mitglieder
 * sehen jedes aktive Unternehmen eines aktiven Profils, die eigenen immer.
 * Nicht vorhanden, nicht aktiv, nicht erlaubt - dieselbe Antwort.
 */
export default async function ConnectVenturePage({
  params,
}: {
  params: Promise<{ ventureId: string }>;
}) {
  const { ventureId } = await params;
  const { client, user } = await requireConnectMember(`/connect/ventures/${ventureId}`);
  const t = await getTranslations("connect");

  const venture = await getConnectVenture(client, ventureId);
  if (!venture) notFound();

  const isOwn = venture.owner_user_id === user.id;
  // Ein verborgenes Unternehmen sieht nur die eigene Person - die Policy gibt
  // es heraus, hier wird es nur nicht Fremden gezeigt.
  if (venture.status !== "active" && !isOwn) notFound();

  const [owners, siblings] = await Promise.all([
    getConnectProfilesByUserIds(client, [venture.owner_user_id]),
    getConnectVentures(client, venture.owner_user_id),
  ]);
  const owner = owners.get(venture.owner_user_id) ?? null;
  const others = siblings.filter(
    (entry) => entry.id !== venture.id && (entry.status === "active" || isOwn)
  );

  const logo = ventureLogoUrl(venture);
  const card = "rounded-3xl border border-slate-200 bg-white p-5 sm:p-6";

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link
        href="/connect/ventures"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        ← {t("tabs.ventures")}
      </Link>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 object-contain"
          />
        ) : null}
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{venture.name}</h1>
          {venture.role_label ? (
            <p className="mt-1 text-sm text-slate-500">
              {t("ventures.roleLabel")}: {venture.role_label}
            </p>
          ) : null}
        </div>
        {isOwn ? (
          <Link
            href={`/connect/ventures/mine?edit=${venture.id}`}
            className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:ml-auto"
          >
            {t("actions.edit")}
          </Link>
        ) : null}
      </header>

      <section className={`${card} mt-6`}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {t("ventures.whatItDoes")}
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">
          {venture.what_it_does}
        </p>
      </section>

      {/* Abgesetzt, mit dem Rahmen, den das Formular schon benutzt: Das ist das
          Feld, an dem jemand erkennt, ob er jemanden kennt, fuer den das passt. */}
      <section className="mt-4 rounded-3xl border border-l-4 border-slate-200 border-l-violet-400 bg-white p-5 sm:p-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">
          {t("ventures.audience")}
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-800">
          {venture.audience}
        </p>
      </section>

      {venture.motivation ? (
        <section className={`${card} mt-4`}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t("ventures.motivation")}
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">
            {venture.motivation}
          </p>
        </section>
      ) : null}

      {venture.website ? (
        <a
          href={venture.website}
          target="_blank"
          rel="noreferrer noopener"
          title={t("ventures.openLinkHint")}
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-violet-800 hover:bg-slate-50"
        >
          {t("ventures.openWebsite")}
        </a>
      ) : null}

      {/* ------------------------------------------------------------------
          Der Mensch dahinter - unten und nicht oben. Ohne ihn waere das ein
          Handelsregistereintrag; vor der Sache waere es das falsche Thema.
          ------------------------------------------------------------------ */}
      {owner ? (
        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t("ventures.personBehind")}
          </h2>
          <Link
            href={`/connect/people/${owner.user_id}`}
            className="mt-3 flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-violet-300"
          >
            <ConnectAvatar profile={owner} displayName={owner.display_name} />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-900">
                {owner.display_name}
              </span>
              <span className="block truncate text-sm text-slate-600">{owner.headline}</span>
            </span>
          </Link>

          {others.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t("ventures.alsoByPerson")}
              </p>
              <ul className="mt-2 grid gap-1">
                {others.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={`/connect/ventures/${entry.id}`}
                      className="text-sm font-medium text-violet-800 hover:underline"
                    >
                      {entry.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
