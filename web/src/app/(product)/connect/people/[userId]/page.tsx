import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ConnectAvatar } from "@/features/connect/ConnectAvatar";
import { requireConnectMember } from "@/features/connect/connectAccess";
import {
  getActiveConnectListingsByOwner,
  getActiveConnectProblemsByAuthor,
  getConnectPerson,
} from "@/features/connect/connectPeopleData";
import { getConnectVentures, ventureLogoUrl } from "@/features/connect/connectVentureData";

/**
 * Die Profilseite eines Mitglieds.
 *
 * DER FEHLENDE RAUM. Bis zum 21.09.2026 gab es nur die OEFFENTLICHE Seite
 * unter /connect/p/<slug> - und die existiert nur, wenn jemand seine
 * Sichtbarkeit ausdruecklich auf oeffentlich gestellt hat. Wer auf "nur im
 * Netzwerk" stand, war im Produkt als Profil nirgends zu sehen: In der Liste
 * stand statt eines Links ein grauer Hinweis.
 *
 * Und hier laufen die Faeden zusammen, die vorher nebeneinander lagen: Von
 * einem Menschen zu seinen Unternehmen, seinen Anzeigen und seinem Ungeloesten.
 * Vorher fuehrte von keinem dieser Dinge ein Weg zu den anderen.
 *
 * WER DAS SEHEN DARF, entscheidet die Datenbank und nicht diese Seite: Die
 * Policy auf network_profiles gibt Mitgliedern jedes AKTIVE Profil heraus. Wer
 * nicht gesehen werden will, laesst sein Profil im Entwurf - dann steht es
 * auch in keiner Liste. "Nur im Netzwerk" heisst damit endlich, was es sagt.
 *
 * Gibt es das Profil nicht, ist es nicht aktiv oder darf man es nicht sehen,
 * kommt dieselbe Antwort: nicht gefunden. Drei Faelle zu unterscheiden waere
 * eine Auskunft darueber, wer hier Mitglied ist.
 */
export default async function ConnectPersonPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { client, user } = await requireConnectMember(`/connect/people/${userId}`);
  const t = await getTranslations("connect");

  const person = await getConnectPerson(client, userId);
  if (!person) notFound();

  const isOwn = person.user_id === user.id;
  const [ventures, listings, problems] = await Promise.all([
    getConnectVentures(client, userId),
    getActiveConnectListingsByOwner(client, userId),
    getActiveConnectProblemsByAuthor(client, userId),
  ]);

  // Verborgene Unternehmen sieht nur die eigene Person - das entscheidet die
  // Policy. Hier wird nur nicht gezeigt, was sie nicht herausgibt.
  const visibleVentures = ventures.filter((venture) => venture.status === "active" || isOwn);

  const card = "rounded-[24px] border border-[#e4e2f0] bg-white p-6";
  const BTN_PRIMARY = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-[18px] text-[15px] font-semibold text-white hover:opacity-90";
  const BTN_QUIET = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-[#0b1f3a] hover:bg-[#e9e7f4]";
  const BTN_ON_BRAND = "inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-white px-[18px] text-[15px] font-semibold text-[#4a2fb8] sm:ml-auto";
  const LABEL = "text-[13px] font-semibold uppercase tracking-[0.08em] text-[#5f5e7a]";

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link
        href="/connect/people"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-[#5f5e7a] hover:text-[#0b1f3a]"
      >
        ← {t("tabs.people")}
      </Link>

      <header className="brand-panel relative mt-4 flex flex-col gap-4 overflow-hidden rounded-[28px] px-6 py-8 sm:flex-row sm:items-center sm:px-9">
        <span aria-hidden="true" className="orb -top-16 right-60 hidden h-40 w-40 md:block" />
        <ConnectAvatar
          profile={person}
          displayName={person.display_name}
          className="h-[88px] w-[88px] shrink-0 rounded-full border-2 border-white/60 object-cover"
        />
        <div className="min-w-0">
          <h1 className="text-[32px] font-semibold leading-tight sm:text-[34px]">
            {person.display_name}
          </h1>
          {person.headline ? (
            <p className="mt-1.5 text-base leading-7 text-white opacity-95">{person.headline}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white">
            {person.location_region ? <span>{person.location_region}</span> : null}
            {person.remote_mode ? <span>{t(`remote.${person.remote_mode}`)}</span> : null}
            {person.network_roles.map((role) => (
              <span key={role}>{t(`roles.${role}`)}</span>
            ))}
          </div>
        </div>
        {isOwn ? (
          <Link
            href="/connect/profile"
            className={BTN_ON_BRAND}
          >
            {t("actions.edit")}
          </Link>
        ) : (
          /* Seit dem 21.09.2026 geht das auch ohne Anzeige. Der Knopf steht
             oben und nicht am Ende der Seite: Er ist der Grund, warum man hier
             ist. */
          <Link
            href={`/connect/people/${person.user_id}/contact`}
            className={BTN_ON_BRAND}
          >
            {t("contact.cta")}
          </Link>
        )}
      </header>

      {person.bio ? (
        <section className={`${card} mt-6`}>
          <p className="whitespace-pre-line text-base leading-[1.65] text-[#0b1f3a]">{person.bio}</p>
        </section>
      ) : null}

      {person.expertise.length || person.industries.length ? (
        <section className={`${card} mt-4`}>
          <h2 className={LABEL}>
            {t("people.expertiseTitle")}
          </h2>
          <p className="mt-2 text-[15px] leading-7 text-[#0b1f3a]">
            {[...person.expertise, ...person.industries].join(" · ")}
          </p>
        </section>
      ) : null}

      {/* Wofuer die Person offen ist, und wie sie angesprochen werden moechte -
          das ist der Teil, der aus einem Verzeichnis ein Netzwerk macht. */}
      {person.open_to_formats.length || person.contact_note ? (
        <section className={`${card} mt-4`}>
          <h2 className={LABEL}>
            {t("people.openToTitle")}
          </h2>
          {person.open_to_formats.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {person.open_to_formats.map((format) => (
                <span
                  key={format}
                  className="rounded-full bg-[#efeafd] px-2.5 py-0.5 text-[13px] font-semibold text-[#4a2fb8]"
                >
                  {t(`profile.openTo.${format}`)}
                </span>
              ))}
            </div>
          ) : null}
          {person.contact_note ? (
            <p className="mt-3 text-sm leading-7 text-slate-700">{person.contact_note}</p>
          ) : null}
        </section>
      ) : null}

      {/* -------------------------------------------------------------------
          Die Unternehmen. Auf der Personenkarte stand bisher "2 Unternehmen"
          ohne einen Weg dorthin.
          ------------------------------------------------------------------- */}
      {visibleVentures.length ? (
        <section className="mt-8">
          <h2 className="text-2xl font-semibold tracking-tight text-[#0b1f3a]">{t("ventures.ofPersonTitle")}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {visibleVentures.map((venture) => {
              const logo = ventureLogoUrl(venture);
              return (
                <article key={venture.id} className={card}>
                  <div className="flex items-center gap-3">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logo}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-[#0b1f3a]">
                        <Link href={`/connect/ventures/${venture.id}`} className="hover:underline">
                          {venture.name}
                        </Link>
                      </h3>
                      {venture.role_label ? (
                        <p className="truncate text-xs text-slate-500">{venture.role_label}</p>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{venture.what_it_does}</p>
                  {venture.website ? (
                    <a
                      href={venture.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      title={t("ventures.openLinkHint")}
                      className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#6d49e0] hover:underline"
                    >
                      {t("ventures.openWebsite")}
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------------------
          Anzeigen und Ungeloestes - der Weg, auf dem man wirklich in Kontakt
          kommt. Solange eine Kontaktanfrage an eine Anzeige gebunden ist, ist
          das hier der einzige; deshalb steht es nicht kleingedruckt.
          ------------------------------------------------------------------- */}
      {listings.length ? (
        <section className="mt-8">
          <h2 className="text-2xl font-semibold tracking-tight text-[#0b1f3a]">{t("people.listingsTitle")}</h2>
          <div className="mt-3 grid gap-3">
            {listings.map((listing) => (
              <article key={listing.id} className={`${card} flex flex-wrap items-center gap-4`}>
                <div className="min-w-0 flex-1">
                  <p className={LABEL}>
                    {t(`directions.${listing.direction}`)} · {t(`categories.${listing.category}`)}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[#0b1f3a]">{listing.title}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/connect/listings/${listing.id}`}
                    className={BTN_QUIET}
                  >
                    {t("actions.details")}
                  </Link>
                  {!isOwn ? (
                    <Link
                      href={`/connect/listings/${listing.id}/contact`}
                      className={BTN_PRIMARY}
                    >
                      {t("contact.cta")}
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {problems.length ? (
        <section className="mt-8">
          <h2 className="text-2xl font-semibold tracking-tight text-[#0b1f3a]">{t("people.problemsTitle")}</h2>
          <div className="mt-3 grid gap-3">
            {problems.map((problem) => (
              <article key={problem.id} className={`${card} flex flex-wrap items-center gap-4`}>
                <div className="min-w-0 flex-1">
                  <p className={LABEL}>
                    {t(`problems.intents.${problem.author_intent}`)}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[#0b1f3a]">{problem.title}</h3>
                </div>
                <Link
                  href={`/connect/problems/${problem.id}`}
                  className={BTN_QUIET}
                >
                  {t("actions.details")}
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* Der Satz "noch nicht erreichbar" stand hier bis zum 21.09.2026 und
          ist mit dem direkten Kontakt weggefallen - wer nichts eingestellt
          hat, ist jetzt trotzdem ansprechbar. */}
    </main>
  );
}
