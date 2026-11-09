import { getLocale, getTranslations } from "next-intl/server";
import {
  decideOrgInviteSuggestionAction,
  inviteOrgAdvisorAction,
  leaveOrgAction,
  setOrgMemberRightsAction,
  setOrgMemberRoleAction,
  setOrgMembershipAction,
  suggestOrgInviteAction,
} from "@/features/advisor/orgActions";
import type { AdvisorOrg, OrgInviteSuggestion, OrgMember, OrgOpenInvite } from "@/features/advisor/orgData";
import { ORG_RIGHTS, ORG_ROLES, type OrgRole, invitableRoles, rightPreset, rightsOf, roleAllows } from "@/features/advisor/orgRights";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { getPresentationLocale } from "@/i18n/presentationLocale";

const FIELD = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm";
const LABEL = "block text-xs font-semibold uppercase tracking-[.12em] text-slate-500";
const GHOST = "inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";
const BADGE: Record<OrgRole, string> = {
  owner: "bg-slate-900 text-white",
  coordinator: "bg-sky-100 text-sky-900",
  advisor: "bg-violet-100 text-violet-900",
  guest: "bg-emerald-100 text-emerald-900",
};

/**
 * Mitglieder und Rollen der Organisation (Entwurf vom 09.11.2026): Admin, Koordination, Advisor, Gast.
 *
 * Die Rolle gibt die Voreinstellung; ein Admin schaltet sieben Rechte pro Person an oder aus. Wer das Recht "einladen"
 * hat, laedt mit Rolle ein, alle anderen Mitglieder schlagen vor (Admin oder Koordination entscheiden). Das hier ist
 * Anzeige - jede Regel steht in der Datenbank (`org_has_right`, 20270410120000).
 */
export async function OrgMembersPanel({
  org,
  members,
  openInvites,
  suggestions,
}: {
  org: AdvisorOrg;
  members: OrgMember[];
  openInvites: OrgOpenInvite[];
  suggestions: OrgInviteSuggestion[];
}) {
  const t = await getTranslations("advisor.org");
  const locale = getPresentationLocale(await getLocale());
  const day = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Europe/Berlin" });
  const active = org.status === "active";
  const isAdmin = org.isAdmin && active;
  const canInvite = org.rights.invite && active;
  const canSuggest = !canInvite && active && org.role !== "guest" && org.role !== null;
  const adminCount = members.filter((member) => member.role === "owner" && member.status === "active").length;
  const open = suggestions.filter((entry) => entry.status === "open" && !entry.mine);
  const mine = suggestions.filter((entry) => entry.mine);

  return (
    <div className="grid gap-6">
      {canInvite && open.length > 0 ? (
        <section aria-labelledby="suggestions-title" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
          <h3 id="suggestions-title" className="text-sm font-semibold text-amber-950">{t("suggestionsTitle", { count: open.length })}</h3>
          <ul className="mt-3 grid gap-3">
            {open.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-amber-200 bg-white p-4">
                <p className="break-all text-[15px] font-semibold text-slate-950">{entry.email}</p>
                <p className="text-[13px] text-slate-600">{t("suggestionMeta", { role: t(`roles.${entry.role}`), name: entry.suggestedByName ?? t("unnamed") })}</p>
                {entry.reason ? <p className="mt-1 text-[14px] leading-6 text-slate-800">{entry.reason}</p> : null}
                <form action={decideOrgInviteSuggestionAction} className="mt-3 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="orgId" value={org.id} />
                  <input type="hidden" name="suggestionId" value={entry.id} />
                  <label>
                    <span className={LABEL}>{t("roleLabel")}</span>
                    <select name="role" defaultValue={entry.role} className={FIELD}>
                      {invitableRoles(isAdmin).map((role) => <option key={role} value={role}>{t(`roles.${role}`)}</option>)}
                    </select>
                  </label>
                  <label className="min-w-[12rem] flex-1">
                    <span className={LABEL}>{t("suggestionNote")}</span>
                    <input name="note" maxLength={300} className={FIELD} />
                  </label>
                  <button type="submit" name="decision" value="accept" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white">{t("suggestionAccept")}</button>
                  <button type="submit" name="decision" value="decline" className={GHOST}>{t("suggestionDecline")}</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {canInvite ? (
        <form action={inviteOrgAdvisorAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5">
          <input type="hidden" name="orgId" value={org.id} />
          <h3 className="font-brand text-[22px] font-semibold text-slate-950">{t("inviteTitle")}</h3>
          <label>
            <span className={LABEL}>{t("inviteEmail")}</span>
            <input type="email" name="email" required className={FIELD} />
          </label>
          <fieldset className="grid gap-2">
            <legend className={LABEL}>{t("roleLabel")}</legend>
            <div className="mt-1 grid gap-2 sm:grid-cols-3">
              {invitableRoles(isAdmin).filter((role) => role !== "owner").map((role) => (
                <label key={role} className="flex cursor-pointer gap-3 rounded-xl border border-slate-300 bg-white p-3 has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50">
                  <input type="radio" name="role" value={role} defaultChecked={role === "advisor"} className="mt-1 size-4" />
                  <span>
                    <span className="block text-[14.5px] font-semibold text-slate-950">{t(`roles.${role}`)}</span>
                    <span className="block text-[12.5px] leading-5 text-slate-600">{t(`roleDesc.${role}`)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-[13px] leading-5 text-slate-600">{t("inviteNote", { admin: isAdmin ? t("inviteNoteAdmin") : "" })}</p>
          <SubmitButton label={t("invite")} pendingLabel={t("pending")} className="inline-flex min-h-11 items-center self-start rounded-xl bg-[#6D49E0] px-6 text-sm font-semibold text-white" />
        </form>
      ) : null}

      {canSuggest ? (
        <form action={suggestOrgInviteAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5">
          <input type="hidden" name="orgId" value={org.id} />
          <h3 className="font-brand text-[22px] font-semibold text-slate-950">{t("suggestTitle")}</h3>
          <p className="max-w-2xl text-[14px] leading-6 text-slate-700">{t("suggestText")}</p>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <label>
              <span className={LABEL}>{t("inviteEmail")}</span>
              <input type="email" name="email" required className={FIELD} />
            </label>
            <label>
              <span className={LABEL}>{t("suggestRole")}</span>
              <select name="role" defaultValue="advisor" className={FIELD}>
                <option value="advisor">{t("roles.advisor")}</option>
                <option value="guest">{t("roles.guest")}</option>
              </select>
            </label>
          </div>
          <label>
            <span className={LABEL}>{t("suggestReason")}</span>
            <textarea name="reason" maxLength={500} rows={3} className={`${FIELD} py-2`} />
          </label>
          <SubmitButton label={t("suggestButton")} pendingLabel={t("pending")} className="inline-flex min-h-11 items-center self-start rounded-xl bg-[#6D49E0] px-6 text-sm font-semibold text-white" />
        </form>
      ) : null}

      {mine.length > 0 ? (
        <section aria-labelledby="my-suggestions-title" className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <h3 id="my-suggestions-title" className="text-sm font-semibold text-slate-900">{t("mySuggestionsTitle")}</h3>
          <ul className="mt-2 grid gap-2">
            {mine.map((entry) => (
              <li key={entry.id} className="text-[14px] text-slate-800">
                <span className="break-all font-medium">{entry.email}</span>
                <span className="text-slate-600"> · {t(`suggestionStatus.${entry.status}`)}{entry.status === "declined" && entry.decisionNote ? ` – ${entry.decisionNote}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {openInvites.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-amber-950">{t("openInvitesTitle")}</h3>
          <p className="mt-1 text-xs leading-5 text-amber-900">{t("openInvitesText")}</p>
          <ul className="mt-2 space-y-1">
            {openInvites.map((invite) => (
              <li key={`${invite.email}-${invite.sentAt}`} className="break-all text-sm text-amber-950">
                {invite.email}
                <span className="text-amber-800"> · {t(`roles.${invite.role}`)} · {t("openInviteUntil", { date: day.format(new Date(invite.expiresAt)) })}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section aria-labelledby="members-title" className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 id="members-title" className="font-brand text-[22px] font-semibold text-slate-950">{t("membersTitle")}</h3>
        <ul className="mt-3">
          {members.map((member) => {
            const rights = rightsOf(member.role, member.rightsOverrides);
            const custom = ORG_RIGHTS.some((right) => roleAllows(member.role, right) && rights[right] !== rightPreset(member.role, right)) && member.role !== "owner";
            const mayRemove = canInvite && member.status === "active" && !member.isSelf && (isAdmin || member.role !== "owner");
            const mayEditRole = isAdmin && member.status === "active" && !member.isSelf;
            const lastAdmin = member.role === "owner" && adminCount <= 1;
            return (
              <li key={member.userId} className="border-t border-slate-100 py-3 first:border-t-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1 break-words text-[15px] font-semibold text-slate-950">
                    {member.displayName ?? t("unnamed")}{member.isSelf ? ` (${t("you")})` : ""}
                    {member.status === "revoked" ? <span className="font-normal text-slate-500"> · {t("revoked")}</span> : null}
                  </span>
                  <span className={`inline-flex h-7 items-center rounded-full px-3 text-[12.5px] font-bold ${BADGE[member.role]}`}>{t(`roles.${member.role}`)}</span>
                  {custom ? <span className="inline-flex h-7 items-center rounded-full bg-amber-100 px-3 text-[12.5px] font-bold text-amber-900">{t("rightsCustom")}</span> : null}
                  {mayRemove ? (
                    <form action={setOrgMembershipAction}>
                      <input type="hidden" name="orgId" value={org.id} />
                      <input type="hidden" name="userId" value={member.userId} />
                      <input type="hidden" name="status" value="revoked" />
                      <SubmitButton label={t("removeMember")} pendingLabel={t("pending")} className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline" />
                    </form>
                  ) : null}
                </div>

                {mayEditRole ? (
                  <details className="mt-2 rounded-xl bg-slate-50">
                    <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-violet-800">{t("rolesAndRights")}</summary>
                    <div className="grid gap-4 px-3 pb-4">
                      <form action={setOrgMemberRoleAction} className="flex flex-wrap items-end gap-3">
                        <input type="hidden" name="orgId" value={org.id} />
                        <input type="hidden" name="userId" value={member.userId} />
                        <label>
                          <span className={LABEL}>{t("roleLabel")}</span>
                          <select name="role" defaultValue={member.role} className="mt-1 min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm">
                            {ORG_ROLES.filter((role) => !(lastAdmin && role !== "owner")).map((role) => <option key={role} value={role}>{role === "owner" && member.role !== "owner" ? t("makeAdminOption") : t(`roles.${role}`)}</option>)}
                          </select>
                        </label>
                        <SubmitButton label={t("roleSave")} pendingLabel={t("pending")} className={GHOST} />
                        {lastAdmin ? <p className="basis-full text-xs leading-5 text-slate-600">{t("lastAdminNote")}</p> : null}
                      </form>

                      {member.role === "owner" ? (
                        <p className="text-[13px] leading-5 text-slate-600">{t("adminAllRights")}</p>
                      ) : (
                        <form action={setOrgMemberRightsAction} className="grid gap-1">
                          <input type="hidden" name="orgId" value={org.id} />
                          <input type="hidden" name="userId" value={member.userId} />
                          <input type="hidden" name="role" value={member.role} />
                          <p className={LABEL}>{t("rightsTitle", { name: member.displayName ?? t("unnamed") })}</p>
                          {ORG_RIGHTS.filter((right) => roleAllows(member.role, right)).map((right) => (
                            <label key={right} className="flex min-h-11 cursor-pointer items-center gap-3 border-t border-slate-200 py-2">
                              <input type="checkbox" name={`right_${right}`} defaultChecked={rights[right]} className="size-5 shrink-0" />
                              <span>
                                <span className="block text-[14.5px] font-semibold text-slate-950">{t(`rights.${right}.label`)}</span>
                                <span className="block text-[12.5px] leading-5 text-slate-600">{t(`rights.${right}.hint`)}</span>
                              </span>
                            </label>
                          ))}
                          {member.role === "guest" ? <p className="text-[12.5px] leading-5 text-slate-600">{t("guestOnlyResults")}</p> : null}
                          <p className="text-[12.5px] leading-5 text-slate-600">{t("rightsNever")}</p>
                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            <SubmitButton label={t("rightsSave")} pendingLabel={t("pending")} className="inline-flex min-h-11 items-center rounded-xl bg-[#6D49E0] px-5 text-sm font-semibold text-white" />
                            <button type="submit" name="reset" value="1" className={GHOST}>{t("rightsReset")}</button>
                          </div>
                          {member.rightsUpdatedAt ? (
                            <p className="text-[12.5px] text-slate-600">{t("rightsChanged", { name: member.rightsUpdatedByName ?? t("unnamed"), date: day.format(new Date(member.rightsUpdatedAt)) })}</p>
                          ) : null}
                        </form>
                      )}
                    </div>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs leading-6 text-slate-600">{t("someAdminNote")}</p>
      </section>

      {org.role === null || org.role === "guest" ? null : org.role === "owner" && adminCount <= 1 ? (
        <p className="text-xs leading-6 text-slate-500">{t("leaveLastOwner")}</p>
      ) : (
        <form action={leaveOrgAction}>
          <input type="hidden" name="orgId" value={org.id} />
          <SubmitButton label={t("leave")} pendingLabel={t("pending")} className={GHOST} />
        </form>
      )}

      <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("membershipMeaning")}</p>
    </div>
  );
}
