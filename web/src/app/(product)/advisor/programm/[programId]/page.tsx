import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { AdvisorPageHeader } from "@/features/advisor/AdvisorPageHeader";
import { AdvisorNotebook } from "@/features/advisor/AdvisorNotebook";
import { getAdvisorFollowUpFor, getAdvisorNoteFor } from "@/features/advisor/notebookData";
import { ProgramCheckIn } from "@/features/advisor/ProgramCheckIn";
import { ProgramRewards } from "@/features/advisor/ProgramRewards";
import { ProgramOutcomes } from "@/features/advisor/ProgramOutcomes";
import { ProgramSetupView } from "@/features/advisor/ProgramSetupView";
import { ProgramMilestones } from "@/features/advisor/ProgramMilestones";
import { ManageProgramUpdates } from "@/features/advisor/ProgramUpdates";
import { ProgramProfileView } from "@/features/advisor/ProgramProfile";
import { TeamAccessList } from "@/features/advisor/ProgramAccess";
import { getMyAdvisorOrgs, getOrgMembers } from "@/features/advisor/orgData";
import {
  getOrgTeamPrograms,
  getProgramAccess,
  getProgramConfirmedSetup,
  getCheckIns,
  getOutcomeComments,
  getProgramOutcomes,
  getProgramRewards,
  getSuccessEnabled,
  getProgramProfile,
  getProgramUpdateDue,
  getProgramUpdateQuestions,
  listProgramMilestones,
  listProgramUpdates,
} from "@/features/advisor/teamProgramData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Ein Team im Programm, aus Sicht der Bezugsperson oder des Inhabers.
 *
 * Es steht, was das Team ins Programm einbringt: Stand der Zustimmung,
 * Bezugspersonen, Meilensteine - und das gemeinsam bestaetigte Founder Setup,
 * weil die Zustimmung zum Programm es ausdruecklich einschliesst (nur lesend,
 * nur bestaetigte Punkte). Arbeitsweisen und Team-Review sind eigene Freigaben
 * und stehen hier nicht.
 */
export default async function AdvisorProgramTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams?: Promise<{ tab?: string; saved?: string; error?: string }>;
}) {
  const { programId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(programId)) notFound();
  const query = (await searchParams) ?? {};
  const tabParam = query.tab;
  const tab = tabParam === "meilensteine" || tabParam === "updates" || tabParam === "freigaben" || tabParam === "setup" || tabParam === "notizen" || tabParam === "erfolge" ? tabParam : "overview";
  const t = await getTranslations("advisor.teamProgram");
  const locale = await getLocale();
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath(`/advisor/programm/${programId}`));

  const client = await createClient();
  const orgs = await getMyAdvisorOrgs(client);
  // Die Datenbank liefert nur Programme, die diese Person sehen darf.
  let program = null;
  let orgOfProgram = null;
  for (const org of orgs) {
    const found = (await getOrgTeamPrograms(client, org.id)).find((entry) => entry.programId === programId);
    if (found) {
      program = found;
      orgOfProgram = org;
      break;
    }
  }
  if (!program || !orgOfProgram) notFound();

  const [members, milestones, questions, updates, due, profile, accessRows, setupItems, outcomes, outcomeComments, rewards, checkIns] = await Promise.all([
    getOrgMembers(client, orgOfProgram.id),
    program.isActive && (tab === "meilensteine" || tab === "overview") ? listProgramMilestones(client, programId) : Promise.resolve([]),
    program.isActive && tab === "updates" ? getProgramUpdateQuestions(client, programId) : Promise.resolve([]),
    program.isActive && tab === "updates" ? listProgramUpdates(client, programId) : Promise.resolve([]),
    program.isActive && (tab === "updates" || tab === "overview") ? getProgramUpdateDue(client, programId) : Promise.resolve(null),
    program.isActive && tab === "overview" ? getProgramProfile(client, programId) : Promise.resolve(null),
    program.isActive && tab === "freigaben" ? getProgramAccess(client, orgOfProgram.id) : Promise.resolve([]),
    program.isActive && tab === "setup" ? getProgramConfirmedSetup(client, programId) : Promise.resolve([]),
    program.isActive && tab === "erfolge" ? getProgramOutcomes(client, programId) : Promise.resolve([]),
    program.isActive && tab === "erfolge" ? getOutcomeComments(client, programId) : Promise.resolve([]),
    program.isActive && tab === "erfolge" ? getProgramRewards(client, programId) : Promise.resolve([]),
    program.isActive && tab === "erfolge" ? getCheckIns(client, programId) : Promise.resolve([]),
  ]);
  const successEnabled = await getSuccessEnabled(client, orgOfProgram.id);
  const nameOf = (userId: string) => members.find((member) => member.userId === userId)?.displayName ?? t("unnamedPerson");
  const base = `/advisor/programm/${programId}`;

  const tabs: [string, string, string][] = [
    ["overview", t("tabOverview"), base],
    ["meilensteine", t("tabMilestones"), `${base}?tab=meilensteine`],
    ["updates", t("tabUpdates"), `${base}?tab=updates`],
    ...(successEnabled ? ([["erfolge", t("tabOutcomes"), `${base}?tab=erfolge`]] as [string, string, string][]) : []),
    ["setup", t("tabSetup"), `${base}?tab=setup`],
    ["freigaben", t("tabAccess"), `${base}?tab=freigaben`],
    ["notizen", t("tabNotes"), `${base}?tab=notizen`],
  ];
  const facts = [program.batch, program.category, program.isAlumni ? t("metaAlumni") : null].filter(Boolean).join(" · ");
  const contactNames = program.contactUserIds.map(nameOf).join(", ");
  const openMilestones = milestones.filter((milestone) => milestone.targetCount === null || milestone.doneCount < milestone.targetCount).length;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <AdvisorPageHeader
        eyebrow={`${t("teamPageEyebrow")} · ${orgOfProgram.name}`}
        title={program.teamName ?? t("unnamedTeam")}
        text={[facts, contactNames ? `${t("contactsLabel")}: ${contactNames}` : null].filter(Boolean).join(" · ") || null}
        action={
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
              program.isActive ? "bg-emerald-400/20 text-emerald-100 ring-emerald-300/40" : "bg-amber-300/20 text-amber-100 ring-amber-200/40"
            }`}
          >
            {program.isActive ? t("statusActive") : t("statusWaiting", { approved: program.approvedCount, total: program.memberCount })}
          </span>
        }
      >
        <nav className="flex flex-wrap gap-2" aria-label={t("teamPageEyebrow")}>
          {tabs.map(([key, label, href]) => (
            <Link
              key={key}
              href={href}
              aria-current={tab === key ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${
                tab === key ? "bg-white text-indigo-900" : "bg-white/10 text-indigo-100 hover:bg-white/20"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </AdvisorPageHeader>

      <Link href={`/advisor/organisation?org=${orgOfProgram.id}&tab=program`} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">
        ← {t("backToOrg")}
      </Link>

      <div className="mt-2">
        {!program.isActive ? (
          <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("teamPageInactive")} ({t("statusWaiting", { approved: program.approvedCount, total: program.memberCount })})
          </p>
        ) : tab === "overview" ? (
          <div className="grid gap-4">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [t("tileMembers"), program.memberCount, <><circle key="m1" cx="9" cy="8" r="3.2" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 6.5a3 3 0 010 5.5M17.5 14.2c2 .5 3.5 2.2 3.5 4.8" /></>, "bg-violet-100 text-violet-700"],
                [t("tileOpenMilestones"), openMilestones, <path key="m2" d="M6 20V4.5M6 5h11l-2.2 3.5L17 12H6" />, "bg-sky-100 text-sky-800"],
                [t("tileContacts"), program.contactUserIds.length, <><circle key="m3" cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" /></>, "bg-emerald-100 text-emerald-800"],
                [t("tileNextUpdate"), due ?? "–", <><rect key="m4" x="4" y="5.5" width="16" height="14" rx="3" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>, "bg-amber-100 text-amber-800"],
              ].map(([label, value, icon, tone]) => (
                <div key={label as string} className="advisor-card flex items-start gap-3 px-4 py-4">
                  <span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone as string}`}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon as React.ReactNode}</svg>
                  </span>
                  <div className="min-w-0">
                    <dd className="text-2xl font-bold leading-none tracking-tight text-slate-950">{value as React.ReactNode}</dd>
                    <dt className="mt-1 text-xs leading-5 text-slate-600">{label as string}</dt>
                  </div>
                </div>
              ))}
            </dl>
            <ProgramProfileView profile={profile} />
          </div>
        ) : tab === "erfolge" ? (
          <div className="grid gap-8">
            <ProgramOutcomes programId={programId} outcomes={outcomes} mode="org" returnTo={`${base}?tab=erfolge`} comments={outcomeComments} />
            <ProgramRewards programId={programId} rewards={rewards} mode="org" returnTo={`${base}?tab=erfolge`} />
            <ProgramCheckIn programId={programId} checkIns={checkIns} returnTo={`${base}?tab=erfolge`} />
          </div>
        ) : tab === "notizen" ? (
          <>
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("notesEndNote")}</p>
          <AdvisorNotebook
            anchor={{ kind: "program", id: programId }}
            note={await getAdvisorNoteFor(client, { kind: "program", id: programId })}
            followUp={await getAdvisorFollowUpFor(client, { kind: "program", id: programId })}
            saved={query.saved}
            error={query.error}
          />
          </>
        ) : tab === "setup" ? (
          <ProgramSetupView items={setupItems} includesSetup={program.includesSetup} locale={locale} />
        ) : tab === "freigaben" ? (
          <TeamAccessList programId={programId} access={accessRows.find((row) => row.programId === programId) ?? null} />
        ) : tab === "updates" ? (
          <ManageProgramUpdates programId={programId} questions={questions} due={due} updates={updates} returnTo={`${base}?tab=updates`} />
        ) : (
          <ProgramMilestones programId={programId} milestones={milestones} returnTo={`${base}?tab=meilensteine`} />
        )}
      </div>
    </main>
  );
}
