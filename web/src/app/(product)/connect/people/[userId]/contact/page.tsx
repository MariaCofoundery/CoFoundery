import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ConnectAvatar } from "@/features/connect/ConnectAvatar";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { requestConnectPersonContactAction } from "@/features/connect/connectActions";
import { hasActiveConnectProfile } from "@/features/connect/connectData";
import { getConnectPerson } from "@/features/connect/connectPeopleData";
import { ConnectProfileRequired } from "@/features/connect/ConnectProfileRequired";
import { ConnectSubmitButton } from "@/features/connect/ConnectSubmitButton";
import { CONNECT_ERROR_KEYS } from "@/features/connect/connectFeedbackKeys";
import { knownKey } from "@/i18n/knownKey";

/**
 * Jemanden anschreiben, ohne dass er etwas ausgeschrieben hat.
 *
 * Bis zum 21.09.2026 gab es das nicht: Eine Kontaktanfrage hing an einer
 * ANZEIGE, und wer gerade keine offen hatte, war nicht erreichbar.
 *
 * DIE PROFILPRUEFUNG STEHT VOR DEM FORMULAR, nicht dahinter - dieselbe
 * Reihenfolge wie beim Weg ueber eine Anzeige, und aus demselben Grund: Sonst
 * schreibt man eine Nachricht fertig und erfaehrt erst beim Absenden, dass sie
 * nicht rausgeht.
 */
export default async function ConnectPersonContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { userId } = await params;
  const [t, query] = await Promise.all([getTranslations("connect"), searchParams]);
  const { client, user } = await requireConnectMember(`/connect/people/${userId}/contact`);

  const [person, hasProfile] = await Promise.all([
    getConnectPerson(client, userId),
    hasActiveConnectProfile(client, user.id),
  ]);
  if (!person) notFound();
  if (person.user_id === user.id) redirect("/connect/profile");

  const errorKey = knownKey(query.error, CONNECT_ERROR_KEYS);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-9">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/connect/people/${userId}`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600"
        >
          ← {person.display_name}
        </Link>

        <section className="mt-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-700">
            {t("contact.eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold">{t("contact.personTitle")}</h1>

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
            <ConnectAvatar profile={person} displayName={person.display_name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{person.display_name}</p>
              <p className="truncate text-sm text-slate-600">{person.headline}</p>
            </div>
          </div>

          {errorKey ? (
            <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              {t(`errors.${errorKey}`)}
            </p>
          ) : null}

          {!hasProfile ? (
            // Die Regel, die Maria am 21.09.2026 entschieden hat: Anschreiben
            // darf, wer selbst ein veroeffentlichtes Profil hat. Gegenseitigkeit,
            // keine Huerde - wer angeschrieben wird, soll sehen koennen, wer da
            // schreibt. Erzwungen wird sie in der Datenbank; hier steht sie als
            // Satz, damit niemand raten muss.
            <ConnectProfileRequired
              returnTo={`/connect/people/${userId}/contact`}
              copy={{
                title: t("contact.profileRequiredTitle"),
                text: t("contact.personProfileRequiredText"),
                cta: t("contact.profileRequiredCta"),
              }}
            />
          ) : (
            <form action={requestConnectPersonContactAction} className="mt-6">
              <input type="hidden" name="recipient_user_id" value={person.user_id} />
              <label className="block text-sm font-medium text-slate-900">
                {t("contact.messageLabel")}
                <textarea
                  name="message"
                  required
                  minLength={10}
                  maxLength={500}
                  rows={6}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-100"
                />
                {/* Ohne Anzeige fehlt der Anlass, den die andere Person sonst
                    mitliest. Deshalb ein eigener Hinweis: Wer schreibt, soll
                    sagen, warum. */}
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  {t("contact.personMessageHint")}
                </span>
              </label>
              <div className="mt-5">
                <ConnectSubmitButton
                  label={t("contact.send")}
                  pendingLabel={t("contact.sending")}
                  className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold"
                />
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
