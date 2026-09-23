import { getTranslations } from "next-intl/server";
import {
  createAdvisorOrgAction,
  inviteOrgAdvisorAction,
  setOrgMembershipAction,
} from "@/features/advisor/orgActions";
import type { AccompaniedPerson, AdvisorOrg, OrgMember } from "@/features/advisor/orgData";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Die Organisation - anlegen, Menschen aufnehmen, sehen wen man begleitet.
 *
 * DER GESAMMELTE BEREICH steht hier unten: die Menschen, die zugestimmt
 * haben, und daneben, was bei ihnen noch offen ist. Getrennt, weil eine Liste,
 * die Angefragte und Begleitete vermischt, dazu einlädt, eine Anfrage für eine
 * Zusage zu halten.
 *
 * ES STEHEN KEINE NAMEN DARIN. Ein Advisor sieht, WEN er begleitet, sobald er
 * die Person öffnet - die Liste selbst arbeitet mit dem, was jede Zeile
 * ohnehin trägt. Namen hier zu zeigen hieße, sie für Menschen zu laden, die
 * vielleicht nur "Wer du bist" freigegeben haben.
 */
export async function AdvisorOrgSection({
  orgs,
  members,
  accompanied,
}: {
  orgs: AdvisorOrg[];
  members: OrgMember[];
  accompanied: AccompaniedPerson[];
}) {
  const t = await getTranslations("advisor.org");
  const org = orgs[0] ?? null;

  return (
    <section id="advisor-org" className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="text-xl font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("text")}</p>

      {org === null ? (
        <form action={createAdvisorOrgAction} className="mt-5">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
              {t("nameLabel")}
            </span>
            <input
              type="text"
              name="name"
              required
              minLength={2}
              maxLength={120}
              className="mt-1 min-h-11 w-full max-w-md rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>
          <SubmitButton
            label={t("create")}
            pendingLabel={t("pending")}
            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          />
        </form>
      ) : (
        <>
          <p className="mt-4 text-sm font-medium text-slate-900">{org.name}</p>

          {org.role === "owner" ? (
            <form action={inviteOrgAdvisorAction} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="orgId" value={org.id} />
              <label className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                  {t("inviteLabel")}
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>
              <SubmitButton
                label={t("invite")}
                pendingLabel={t("pending")}
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              />
            </form>
          ) : null}

          <ul className="mt-5 space-y-2">
            {members.map((member) => (
              <li
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              >
                <span className="text-slate-800">
                  {t(`roles.${member.role}`)}
                  {member.status === "revoked" ? ` · ${t("revoked")}` : ""}
                </span>
                {org.role === "owner" && member.status === "active" ? (
                  <form action={setOrgMembershipAction}>
                    <input type="hidden" name="orgId" value={org.id} />
                    <input type="hidden" name="userId" value={member.userId} />
                    <input type="hidden" name="status" value="revoked" />
                    <SubmitButton
                      label={t("removeMember")}
                      pendingLabel={t("pending")}
                      className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
                    />
                  </form>
                ) : null}
              </li>
            ))}
          </ul>

          {/* WAS EINE MITGLIEDSCHAFT BEDEUTET - dort, wo sie vergeben wird. */}
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
            {t("membershipMeaning")}
          </p>
        </>
      )}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="text-base font-semibold text-slate-900">{t("peopleTitle")}</h3>
        {accompanied.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("peopleEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {accompanied.map((person) => (
              <li
                key={person.subjectUserId}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              >
                <span className="font-medium text-slate-900">
                  {t("personScopes", { count: person.scopes.length })}
                </span>
                {person.pendingScopes.length > 0 ? (
                  <span className="ml-2 text-slate-500">
                    {t("personPending", { count: person.pendingScopes.length })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
