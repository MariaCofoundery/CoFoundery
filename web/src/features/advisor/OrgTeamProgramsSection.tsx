import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  createTeamProgramInviteAction,
  revokeTeamProgramInviteAction,
  setTeamProgramContactsAction,
} from "@/features/advisor/teamProgramActions";
import type { AdvisorOrg, OrgMember } from "@/features/advisor/orgData";
import type { OrgTeamProgram, TeamProgramInvite } from "@/features/advisor/teamProgramData";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

/**
 * Teams im Programm. Der Inhaber laedt ein und ordnet Bezugspersonen zu; andere
 * Mitglieder sehen nur die Teams, in denen sie Bezugsperson sind. Ein Team
 * steht hier erst, wenn jemand aus dem Team den Link eingeloest hat.
 */
export async function OrgTeamProgramsSection({
  org,
  members,
  programs,
  invites,
  freshToken,
}: {
  org: AdvisorOrg;
  members: OrgMember[];
  programs: OrgTeamProgram[];
  invites: TeamProgramInvite[];
  /** Nur direkt nach dem Erzeugen: der Link wird danach nie wieder gezeigt. */
  freshToken: string | null;
}) {
  const t = await getTranslations("advisor.teamProgram");
  const isOwner = org.role === "owner" && org.status === "active";
  const activeMembers = members.filter((member) => member.status === "active");
  const nameOf = (userId: string) => activeMembers.find((member) => member.userId === userId)?.displayName ?? t("unnamedPerson");
  const freshUrl = freshToken && /^[0-9a-f]{48}$/.test(freshToken) ? `${getPublicAppOrigin()}/programm/einladung/${freshToken}` : null;
  const openInvites = invites.filter((invite) => invite.status === "open");

  return (
    <section aria-labelledby="org-programs-title" className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 id="org-programs-title" className="text-xl font-semibold text-slate-950">{t("sectionTitle")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("sectionText")}</p>

      {isOwner ? (
        <form action={createTeamProgramInviteAction} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="orgId" value={org.id} />
          <label className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("inviteLabel")}</span>
            <input name="label" maxLength={120} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
          </label>
          <SubmitButton
            label={t("inviteCreate")}
            pendingLabel="…"
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          />
        </form>
      ) : null}

      {freshUrl ? (
        <div role="status" className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
          <p className="text-sm font-semibold text-violet-900">{t("inviteShownOnce")}</p>
          <input readOnly value={freshUrl} aria-label={t("inviteCreate")} className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800" />
        </div>
      ) : null}

      {isOwner && openInvites.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-900">{t("invitesTitle")}</h3>
          <ul className="mt-2 grid gap-2">
            {openInvites.map((invite) => (
              <li key={invite.inviteId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-2 text-sm">
                <span className="text-slate-800">
                  {invite.label ?? t("inviteNoLabel")}
                  <span className="text-slate-500"> · {t("inviteExpires", { date: invite.expiresAt.slice(0, 10) })}</span>
                </span>
                <form action={revokeTeamProgramInviteAction}>
                  <input type="hidden" name="orgId" value={org.id} />
                  <input type="hidden" name="inviteId" value={invite.inviteId} />
                  <SubmitButton label={t("inviteRevoke")} pendingLabel="…" className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline" />
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-900">{t("programsTitle")}</h3>
        {programs.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">{isOwner ? t("programsEmpty") : t("programsEmptyContact")}</p>
        ) : (
          <ul className="mt-2 grid gap-3">
            {programs.map((program) => (
              <li key={program.programId} className="rounded-2xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{program.teamName ?? t("unnamedTeam")}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      program.isActive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {program.isActive
                      ? t("statusActive")
                      : t("statusWaiting", { approved: program.approvedCount, total: program.memberCount })}
                  </span>
                </div>
                {program.isActive ? (
                  <Link href={`/advisor/programm/${program.programId}`} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">
                    {t("openTeam")}
                  </Link>
                ) : null}
                {isOwner ? (
                  <form action={setTeamProgramContactsAction} className="mt-3">
                    <input type="hidden" name="orgId" value={org.id} />
                    <input type="hidden" name="programId" value={program.programId} />
                    <fieldset>
                      <legend className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("contactsLabel")}</legend>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                        {activeMembers.map((member) => (
                          <label key={member.userId} className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              name="contact"
                              value={member.userId}
                              defaultChecked={program.contactUserIds.includes(member.userId)}
                              className="h-4 w-4"
                            />
                            {member.displayName ?? t("unnamedPerson")}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <SubmitButton label={t("contactsSave")} pendingLabel="…" className="mt-1 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" />
                  </form>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">
                    {t("contactsLabel")}: {program.contactUserIds.map(nameOf).join(", ") || t("contactsNone")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
