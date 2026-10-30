import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  createTeamProgramCodeAction,
  createTeamProgramInviteAction,
  revokeTeamProgramCodeAction,
  revokeTeamProgramInviteAction,
  setProgramMetaAction,
  removeTeamFromProgramAction,
  setTeamProgramSoloAction,
  setTeamProgramContactsAction,
} from "@/features/advisor/teamProgramActions";
import type { AdvisorOrg, OrgMember } from "@/features/advisor/orgData";
import type { OrgTeamProgram, TeamProgramCode, TeamProgramInvite } from "@/features/advisor/teamProgramData";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

const CARD = "rounded-3xl border border-slate-200 bg-white p-5 sm:p-6";
const LABEL = "block text-xs font-semibold uppercase tracking-[.12em] text-slate-500";
const INPUT = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm";
const PRIMARY = "inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white";
const QUIET = "inline-flex min-h-11 items-center px-2 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline";

/**
 * Reiter "Programm": die Teams im Programm und die zwei Wege, ein Team
 * einzuladen (Link oder Mail, Code). Der Inhaber laedt ein und ordnet
 * Bezugspersonen zu; andere Mitglieder sehen nur die Teams, in denen sie
 * Bezugsperson sind. Ein Team steht erst hier, wenn jemand aus dem Team den
 * Link oder Code eingeloest hat.
 */
export async function OrgTeamProgramsSection({
  org,
  members,
  programs,
  invites,
  freshToken,
  mailState,
  inviteError,
  codes,
  codeError,
}: {
  org: AdvisorOrg;
  members: OrgMember[];
  programs: OrgTeamProgram[];
  invites: TeamProgramInvite[];
  /** Nur direkt nach dem Erzeugen: der Link wird danach nie wieder gezeigt. */
  freshToken: string | null;
  /** Ergebnis des Mailversands direkt nach dem Erzeugen (sent | failed | invalid). */
  mailState: string | null;
  inviteError: string | null;
  codes: TeamProgramCode[];
  codeError: string | null;
}) {
  const t = await getTranslations("advisor.teamProgram");
  const isOwner = org.role === "owner" && org.status === "active";
  const activeMembers = members.filter((member) => member.status === "active");
  const nameOf = (userId: string) => activeMembers.find((member) => member.userId === userId)?.displayName ?? t("unnamedPerson");
  const freshUrl = freshToken && /^[0-9a-f]{48}$/.test(freshToken) ? `${getPublicAppOrigin()}/programm/einladung/${freshToken}` : null;
  const openInvites = invites.filter((invite) => invite.status === "open");

  return (
    <div className="grid gap-6">
      <section aria-labelledby="org-programs-title" className={CARD}>
        <h2 id="org-programs-title" className="text-xl font-semibold text-slate-950">{t("programsTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("sectionText")}</p>
        <aside className="mt-3 max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" aria-label={t("retentionTitle")}>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("retentionTitle")}</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{t("retentionText")}</p>
        </aside>

        {programs.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm leading-6 text-slate-600">
            {isOwner ? t("programsEmpty") : t("programsEmptyContact")}
          </p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {programs.map((program) => (
              <li key={program.programId} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-base font-semibold text-slate-950">{program.teamName ?? t("unnamedTeam")}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    {program.isAlumni ? <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800">{t("metaAlumni")}</span> : null}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        program.isActive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {program.isActive ? t("statusActive") : t("statusWaiting", { approved: program.approvedCount, total: program.memberCount })}
                    </span>
                  </span>
                </div>
                {!program.isActive && program.memberCount === 1 && (isOwner || program.isContact) ? (
                  <form action={setTeamProgramSoloAction} className="mt-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
                    <input type="hidden" name="orgId" value={org.id} />
                    <input type="hidden" name="programId" value={program.programId} />
                    <input type="hidden" name="confirmed" value="yes" />
                    <p className="text-sm leading-6 text-violet-900">{t("soloText")}</p>
                    <SubmitButton label={t("soloConfirm")} pendingLabel="…" className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-900" />
                  </form>
                ) : null}
                {program.soloConfirmed && program.memberCount === 1 ? <p className="mt-1 text-xs text-slate-500">{t("soloMarked")}</p> : null}
                {program.isActive ? (
                  <Link href={`/advisor/programm/${program.programId}`} className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">
                    {t("openTeam")} →
                  </Link>
                ) : null}

                {isOwner || program.isContact ? (
                  <form action={setProgramMetaAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                    <input type="hidden" name="orgId" value={org.id} />
                    <input type="hidden" name="programId" value={program.programId} />
                    <label>
                      <span className={LABEL}>{t("metaBatch")}</span>
                      <input name="batch" maxLength={60} defaultValue={program.batch ?? ""} className={INPUT} />
                    </label>
                    <label>
                      <span className={LABEL}>{t("metaCategory")}</span>
                      <input name="category" maxLength={60} defaultValue={program.category ?? ""} className={INPUT} />
                    </label>
                    <label className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-800">
                      <input type="checkbox" name="alumni" value="yes" defaultChecked={program.isAlumni} className="h-4 w-4" />
                      {t("metaAlumni")}
                    </label>
                    <SubmitButton label={t("metaSave")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" />
                  </form>
                ) : null}

                {isOwner ? (
                  <details className="mt-3 border-t border-slate-200 pt-3">
                    <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-slate-500 underline-offset-4 hover:text-rose-800 hover:underline">{t("removeTeam")}</summary>
                    <form action={removeTeamFromProgramAction} className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                      <input type="hidden" name="orgId" value={org.id} />
                      <input type="hidden" name="programId" value={program.programId} />
                      <p className="text-sm leading-6 text-rose-950">{t("removeTeamText")}</p>
                      <SubmitButton label={t("removeTeamConfirm")} pendingLabel="…" className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white" />
                    </form>
                  </details>
                ) : null}

                {isOwner ? (
                  <form action={setTeamProgramContactsAction} className="mt-4 border-t border-slate-200 pt-3">
                    <input type="hidden" name="orgId" value={org.id} />
                    <input type="hidden" name="programId" value={program.programId} />
                    <fieldset>
                      <legend className={LABEL}>{t("contactsLabel")}</legend>
                      <div className="mt-1 flex flex-wrap gap-x-5">
                        {activeMembers.map((member) => (
                          <label key={member.userId} className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-800">
                            <input type="checkbox" name="contact" value={member.userId} defaultChecked={program.contactUserIds.includes(member.userId)} className="h-4 w-4" />
                            {member.displayName ?? t("unnamedPerson")}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <SubmitButton label={t("contactsSave")} pendingLabel="…" className="mt-1 inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" />
                  </form>
                ) : (
                  <p className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-600">
                    {t("contactsLabel")}: {program.contactUserIds.map(nameOf).join(", ") || t("contactsNone")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOwner ? (
        <section aria-labelledby="org-invite-title" className="grid gap-4 md:grid-cols-2">
          <div className={CARD}>
            <h2 id="org-invite-title" className="text-lg font-semibold text-slate-950">{t("inviteCardTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{t("inviteCardText")}</p>
            <form action={createTeamProgramInviteAction} className="mt-4 grid gap-3">
              <input type="hidden" name="orgId" value={org.id} />
              <label>
                <span className={LABEL}>{t("inviteLabel")}</span>
                <input name="label" maxLength={120} className={INPUT} />
              </label>
              <label>
                <span className={LABEL}>{t("inviteEmail")}</span>
                <input name="email" type="email" maxLength={200} autoComplete="off" className={INPUT} />
              </label>
              <SubmitButton label={t("inviteCreate")} pendingLabel="…" className={PRIMARY} />
            </form>
            {inviteError === "limit" ? <p role="alert" className="mt-3 text-sm text-rose-800">{t("inviteLimit")}</p> : null}
            {mailState ? (
              <p role="status" className="mt-3 text-sm text-slate-700">
                {mailState === "sent" ? t("inviteMailSent") : mailState === "invalid" ? t("inviteMailInvalid") : t("inviteMailFailed")}
              </p>
            ) : null}
            {freshUrl ? (
              <div role="status" className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
                <p className="text-sm font-semibold text-violet-900">{t("inviteShownOnce")}</p>
                <input readOnly value={freshUrl} aria-label={t("inviteCreate")} className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800" />
              </div>
            ) : null}
            {openInvites.length > 0 ? (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-slate-900">{t("invitesTitle")}</h3>
                <ul className="mt-1 divide-y divide-slate-100">
                  {openInvites.map((invite) => (
                    <li key={invite.inviteId} className="flex flex-wrap items-center justify-between gap-2 py-1 text-sm">
                      <span className="min-w-0 text-slate-800">
                        {invite.label ?? t("inviteNoLabel")}
                        <span className="block text-xs text-slate-500">{t("inviteExpires", { date: invite.expiresAt.slice(0, 10) })}</span>
                      </span>
                      <form action={revokeTeamProgramInviteAction}>
                        <input type="hidden" name="orgId" value={org.id} />
                        <input type="hidden" name="inviteId" value={invite.inviteId} />
                        <SubmitButton label={t("inviteRevoke")} pendingLabel="…" className={QUIET} />
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className={CARD}>
            <h2 className="text-lg font-semibold text-slate-950">{t("codesTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{t("codesText")}</p>
            <form action={createTeamProgramCodeAction} className="mt-4 grid gap-3">
              <input type="hidden" name="orgId" value={org.id} />
              <label>
                <span className={LABEL}>{t("codeLabel")}</span>
                <input name="label" maxLength={120} className={INPUT} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className={LABEL}>{t("codeMaxUses")}</span>
                  <input name="maxUses" inputMode="numeric" defaultValue="10" className={INPUT} />
                </label>
                <label>
                  <span className={LABEL}>{t("codeValidDays")}</span>
                  <input name="validDays" inputMode="numeric" defaultValue="90" className={INPUT} />
                </label>
              </div>
              <SubmitButton label={t("codeCreate")} pendingLabel="…" className={PRIMARY} />
            </form>
            {codeError === "limit" ? <p role="alert" className="mt-3 text-sm text-rose-800">{t("codeLimit")}</p> : null}
            {codes.length > 0 ? (
              <ul className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
                {codes.map((entry) => (
                  <li key={entry.codeId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block font-mono text-base font-semibold tracking-[.18em] text-slate-950">
                        {entry.code.slice(0, 4)}-{entry.code.slice(4)}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {entry.label ? `${entry.label} · ` : ""}
                        {t("codeUses", { uses: entry.uses, max: entry.maxUses })} · {t("codeAccounts", { accounts: entry.accounts, max: entry.maxUses * 5 })} · {t("codeExpires", { date: entry.expiresAt.slice(0, 10) })}
                        {entry.status === "revoked" ? ` · ${t("codeRevoked")}` : entry.status === "expired" ? ` · ${t("codeExpired")}` : ""}
                      </span>
                    </span>
                    {entry.status === "active" ? (
                      <form action={revokeTeamProgramCodeAction}>
                        <input type="hidden" name="orgId" value={org.id} />
                        <input type="hidden" name="codeId" value={entry.codeId} />
                        <SubmitButton label={t("codeRevoke")} pendingLabel="…" className={QUIET} />
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
