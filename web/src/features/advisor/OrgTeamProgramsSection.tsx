import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getPresentationLocale } from "@/i18n/presentationLocale";
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
import type { OrgProgramStars, OrgTeamProgram, TeamProgramCode, TeamProgramInvite } from "@/features/advisor/teamProgramData";
import { TeamAvatar } from "@/features/advisor/TeamAvatar";
import { EmptyState } from "@/features/advisor/EmptyState";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

const CARD = "advisor-card p-5 sm:p-6";
const LABEL = "block text-sm font-semibold text-slate-900";
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
  stars = [],
  part = "teams",
  seatsText = null,
  lastActivity = {},
}: {
  org: AdvisorOrg;
  members: OrgMember[];
  programs: OrgTeamProgram[];
  stars?: OrgProgramStars[];
  /** Plaetze der Organisation, steht unter der Ueberschrift "Teams im Programm". */
  seatsText?: string | null;
  /** Je Team: naechster Meilenstein und letztes Update (nur Reiter "Teams im Programm"). */
  lastActivity?: Record<string, { milestone: { title: string; dueOn: string } | null; lastUpdate: string | null; openTasks?: number }>;
  /** "teams": die Karten der Teams im Programm (taeglich); "enroll": Einladungen und Codes (einmal einrichten). */
  part?: "teams" | "enroll";
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
  const waitingCount = programs.filter((program) => !program.isActive).length;
  const locale = getPresentationLocale(await getLocale());
  const dayFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", timeZone: "UTC" });
  const dayOf = (iso: string) => dayFormat.format(new Date(`${iso}T00:00:00Z`));
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const ago = (iso: string) => relative.format(-Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000)), "day");

  return (
    <div className="grid gap-6">
      {part === "teams" ? (
      <section aria-labelledby="org-programs-title" className="grid gap-4">
        {/* Entwurf vom 05.11.2026: Zeilen statt Karten - Team, Ansprechpersonen, naechster Meilenstein, letztes
            Update. Was man an einem Team einstellt, steht aufgeklappt unter seiner Zeile. */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="org-programs-title" className="text-xl font-semibold text-slate-950">{t("programsTitle")}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {[t("programsActive", { count: programs.filter((program) => program.isActive).length }), waitingCount > 0 ? t("programsWaiting", { count: waitingCount }) : null, seatsText].filter(Boolean).join(" · ")}
            </p>
          </div>
          {/* Ohne Team stehen dieselben Wege im leeren Zustand darunter - nicht zweimal. */}
          {isOwner && programs.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              <Link href={`/advisor/organisation?org=${encodeURIComponent(org.id)}&tab=enroll#org-codes-title`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t("programCodeButton")}</Link>
              <Link href={`/advisor/organisation?org=${encodeURIComponent(org.id)}&tab=enroll#org-invite-title`} className="brand-cta inline-flex min-h-11 items-center rounded-xl px-[18px] text-sm font-semibold">+ {t("programsEmptyInvite")}</Link>
            </div>
          ) : null}
        </div>

        {programs.length === 0 ? (
          <EmptyState
            text={isOwner ? t("programsEmpty") : t("programsEmptyContact")}
            actions={isOwner ? [{ href: `/advisor/organisation?org=${encodeURIComponent(org.id)}&tab=enroll#org-invite-title`, label: t("programsEmptyInvite"), primary: true }, { href: `/advisor/organisation?org=${encodeURIComponent(org.id)}&tab=enroll#org-codes-title`, label: t("programsEmptyCode") }, { href: "/advisor/beispiel", label: t("programsEmptyExample") }] : [{ href: "/advisor/beispiel", label: t("programsEmptyExample") }]}
          />
        ) : (
          <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_96px] gap-4 bg-slate-50 px-5 py-3 text-[12.5px] font-semibold text-slate-600 md:grid">
              <span>{t("colTeam")}</span><span>{t("contactsLabel")}</span><span>{t("colMilestone")}</span><span>{t("colUpdate")}</span><span />
            </div>
            <ul>
              {programs.map((program) => {
                const entry = stars.find((candidate) => candidate.programId === program.programId);
                const activity = lastActivity[program.programId];
                const contacts = program.contactUserIds.map(nameOf).join(", ");
                return (
                  <li key={program.programId} className={`border-t border-slate-100 first:border-t-0 ${program.isActive ? "" : "bg-violet-50/40"}`}>
                    <div className="grid gap-x-4 gap-y-1.5 px-5 py-3.5 text-sm md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_96px] md:items-center">
                      <span className="flex min-w-0 items-center gap-3">
                        <TeamAvatar name={program.teamName ?? "?"} size={32} />
                        <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">{program.teamName ?? t("unnamedTeam")}</span>
                          {program.isAlumni ? <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">{t("metaAlumni")}</span> : null}
                          {entry ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">★ {entry.stars}</span> : null}
                        </span>
                        <span className="block text-[13px] text-slate-600">
                          {program.isActive
                            ? [program.batch, program.category, t("membersCount", { count: program.memberCount })].filter(Boolean).join(" · ")
                            : t("statusWaiting", { approved: program.approvedCount, total: program.memberCount })}
                        </span>
                        {entry?.nextTitle ? <span className="block text-[12.5px] text-amber-900">{t("rewardsNext", { missing: Math.max(0, (entry.nextStars ?? 0) - entry.stars), title: entry.nextTitle })}</span> : null}
                        </span>
                      </span>
                      <span className="text-[13px] text-slate-600"><span className="font-semibold text-slate-700 md:hidden">{t("contactsLabel")}: </span>{contacts || t("contactsNone")}</span>
                      <span className="text-slate-900">
                        {activity?.milestone ? (
                          <>
                            {activity.milestone.title}
                            <span className="block text-[13px] text-slate-600">{t("milestoneUntil", { date: dayOf(activity.milestone.dueOn) })}</span>
                          </>
                        ) : program.isActive ? <span className="text-[13px] text-slate-500">{t("noMilestone")}</span> : null}
                      </span>
                      <span className="text-[13px] text-slate-600">{activity ? (activity.lastUpdate ? ago(activity.lastUpdate) : t("noUpdate")) : null}</span>
                      <span>
                        {program.isActive ? (
                          <Link href={`/advisor/programm/${program.programId}`} className="inline-flex min-h-11 items-center text-[13.5px] font-semibold text-violet-800 underline-offset-4 hover:underline">{t("openTeam")} →</Link>
                        ) : null}
                      </span>
                    </div>
                    {program.isActive ? (
                      <p className="-mt-1 flex flex-wrap gap-x-4 px-5 pb-1 text-[13px]">
                        <Link href={`/advisor/teamraum/aufgaben?${new URLSearchParams({ org: org.id, team: program.programId }).toString()}`} className="inline-flex min-h-9 items-center font-medium text-violet-800 underline-offset-4 hover:underline">
                          {t("rowTasks", { count: activity?.openTasks ?? 0 })}
                        </Link>
                        <Link href={`/advisor/organisation?${new URLSearchParams({ org: org.id, tab: "plan" }).toString()}`} className="inline-flex min-h-9 items-center font-medium text-violet-800 underline-offset-4 hover:underline">{t("rowDates")}</Link>
                      </p>
                    ) : null}
                    {isOwner || program.isContact ? (
                      <details className="group px-5 pb-1">
                        <summary className="-mt-1 inline-flex min-h-10 cursor-pointer list-none items-center text-[13px] font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline">{t("teamSettings")}</summary>
                        <div className="pb-4">
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
                        </div>
                      </details>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <details className="rounded-[14px] border border-slate-200 bg-white px-[18px]">
          <summary className="flex min-h-12 cursor-pointer items-center text-sm font-medium text-slate-700">{t("retentionQuestion")}</summary>
          <div className="grid gap-2 pb-4 text-sm leading-6 text-slate-700">
            <p>{t("sectionText")}</p>
            <p>{t("retentionText")}</p>
          </div>
        </details>
      </section>
      ) : null}

      {part === "enroll" ? (
        <p className="text-sm leading-6 text-slate-600">
          {t("enrollOtherWay")}{" "}
          <Link href="/advisor/einladen" className="font-semibold text-violet-800 underline-offset-4 hover:underline">{t("enrollOtherWayLink")}</Link>
        </p>
      ) : null}

      {part === "enroll" && isOwner ? (
        <section aria-labelledby="org-invite-title" className="grid gap-4 md:grid-cols-2">
          <div className={CARD}>
            <h2 id="org-invite-title" className="scroll-mt-24 text-lg font-semibold text-slate-950">{t("inviteCardTitle")}</h2>
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
            <h2 id="org-codes-title" className="scroll-mt-24 text-lg font-semibold text-slate-950">{t("codesTitle")}</h2>
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
