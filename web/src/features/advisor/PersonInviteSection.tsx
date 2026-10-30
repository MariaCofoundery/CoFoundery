import { getTranslations } from "next-intl/server";
import {
  invitePersonAction,
  revokePersonInviteAction,
} from "@/features/advisor/personInviteActions";
import { ADVISOR_SCOPES } from "@/features/advisor/personAccessData";
import type { AdvisorOrg } from "@/features/advisor/orgData";
import { EmailChipsField } from "@/features/advisor/EmailChipsField";
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
export async function PersonInviteSection({
  invites,
  orgs,
}: {
  invites: PersonInvite[];
  orgs: AdvisorOrg[];
}) {
  const t = await getTranslations("advisor.personInvites");
  const tScopes = await getTranslations("account.personAccess.scopes");
  const open = invites.filter((invite) => invite.status === "sent");

  const stepNumber = "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-extrabold text-violet-800";
  const stepTitle = "text-sm font-semibold text-slate-950";

  return (
    <section id="person-invites" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-7">
      <h2 className="text-xl font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("text")}</p>

      <form action={invitePersonAction} className="mt-6 grid gap-6">
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <span className={stepNumber}>1</span>
            <h3 className={stepTitle}>{t("stepWho")}</h3>
          </div>
          <EmailChipsField
            label={t("emailLabel")}
            addLabel={t("addEmail")}
            removeLabel={t.raw("removeEmail") as string}
            hint={t("emailsHint")}
            invalidLabel={t("emailInvalid")}
          />
        </div>

        {/* IN WESSEN NAMEN. Das ist keine Kleinigkeit: Es entscheidet, ob der
            Zugang bleibt, wenn diese Person die Organisation verlässt. */}
        {orgs.length > 0 ? (
          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              <span className={stepNumber}>2</span>
              <h3 className={stepTitle}>{t("holderLabel")}</h3>
            </div>
            <label className="block">
              <select
                name="holder"
                defaultValue={`org:${orgs[0]!.id}`}
                className="min-h-11 w-full max-w-md rounded-xl border border-slate-300 px-3 text-sm"
              >
                {orgs.map((org) => (
                  <option key={org.id} value={`org:${org.id}`}>
                    {t("holderOrg", { name: org.name })}
                  </option>
                ))}
                <option value="self">{t("holderSelf")}</option>
              </select>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{t("holderHint")}</span>
            </label>
          </div>
        ) : null}

        <fieldset className="grid gap-3">
          <legend className="flex items-center gap-3">
            <span className={stepNumber}>{orgs.length > 0 ? 3 : 2}</span>
            <span className={stepTitle}>{t("scopesLabel")}</span>
          </legend>
          <p className="text-xs leading-5 text-slate-500">{t("scopesHint")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ADVISOR_SCOPES.map((scope) => (
              <label
                key={scope}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition hover:border-violet-300 has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50 has-[:checked]:text-violet-950"
              >
                <input type="checkbox" name={`scope_${scope}`} className="h-4 w-4 accent-violet-600" />
                {tScopes(scope)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <span className={stepNumber}>{orgs.length > 0 ? 4 : 3}</span>
            <h3 className={stepTitle}>{t("noteLabel")}</h3>
          </div>
          <textarea
            name="note"
            rows={2}
            maxLength={400}
            placeholder={t("notePlaceholder")}
            className="w-full max-w-xl rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-100"
          />
        </div>

        <SubmitButton
          label={t("invite")}
          pendingLabel={t("pending")}
          className="brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-6 py-3 text-sm font-semibold"
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
