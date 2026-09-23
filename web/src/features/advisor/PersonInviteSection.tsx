import { getTranslations } from "next-intl/server";
import {
  invitePersonAction,
  revokePersonInviteAction,
} from "@/features/advisor/personInviteActions";
import { ADVISOR_SCOPES } from "@/features/advisor/personAccessData";
import { SubmitButton } from "@/features/ui/SubmitButton";

export type PersonInvite = {
  id: string;
  inviteeEmail: string;
  status: string;
  scopes: string[];
};

/**
 * Eine Person einladen - und sehen, was daraus wurde.
 *
 * DIE UMFÄNGE WERDEN EINZELN ANGEKREUZT, und das ist Absicht: Wer pauschal
 * "Zugang zum Profil" erbittet, bekommt eine pauschale Antwort - meistens
 * keine. Wer sagt, was er wofür braucht, bekommt eine Entscheidung.
 *
 * DIE BEGRÜNDUNG IST KEIN PFLICHTFELD, aber sie steht in der Mail und neben
 * der Anfrage. Eine Anfrage ohne Absender-Satz sieht aus wie Werbung.
 *
 * WAS HIER NICHT STEHT: eine Suche nach Personen. Es gibt keine, und es soll
 * keine geben - sie würde verraten, ob es zu einer Adresse ein Konto gibt.
 */
export async function PersonInviteSection({ invites }: { invites: PersonInvite[] }) {
  const t = await getTranslations("advisor.personInvites");
  const tScopes = await getTranslations("account.personAccess.scopes");
  const open = invites.filter((invite) => invite.status === "sent");

  return (
    <section id="person-invites" className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="text-xl font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("text")}</p>

      <form action={invitePersonAction} className="mt-5">
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
            {t("emailLabel")}
          </span>
          <input
            type="email"
            name="email"
            required
            className="mt-1 min-h-11 w-full max-w-md rounded-xl border border-slate-300 px-3 text-sm"
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
            {t("scopesLabel")}
          </legend>
          <p className="mt-1 text-xs leading-5 text-slate-500">{t("scopesHint")}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {ADVISOR_SCOPES.map((scope) => (
              <label key={scope} className="flex items-start gap-2 text-sm text-slate-800">
                <input type="checkbox" name={`scope_${scope}`} className="mt-1" />
                <span>{tScopes(scope)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 block">
          <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
            {t("noteLabel")}
          </span>
          <textarea
            name="note"
            rows={2}
            maxLength={400}
            placeholder={t("notePlaceholder")}
            className="mt-1 w-full max-w-xl rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <SubmitButton
          label={t("invite")}
          pendingLabel={t("pending")}
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
        />
      </form>

      {open.length > 0 ? (
        <ul className="mt-6 space-y-2">
          {open.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
            >
              <span className="min-w-0 text-sm text-slate-800">
                {invite.inviteeEmail}
                <span className="ml-2 text-xs text-slate-500">
                  {t("scopeCount", { count: invite.scopes.length })}
                </span>
              </span>
              <form action={revokePersonInviteAction}>
                <input type="hidden" name="inviteId" value={invite.id} />
                <SubmitButton
                  label={t("revoke")}
                  pendingLabel={t("pending")}
                  className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                />
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      {/* WAS EINE EINLADUNG IST UND WAS NICHT - hier, wo sie abgeschickt wird. */}
      <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
        {t("notAnAccess")}
      </p>
    </section>
  );
}
