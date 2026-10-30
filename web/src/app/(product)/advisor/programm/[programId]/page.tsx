import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { ProgramMilestones } from "@/features/advisor/ProgramMilestones";
import { ManageProgramUpdates } from "@/features/advisor/ProgramUpdates";
import { getMyAdvisorOrgs, getOrgMembers } from "@/features/advisor/orgData";
import {
  getOrgTeamPrograms,
  getProgramUpdateDue,
  getProgramUpdateQuestions,
  listProgramMilestones,
  listProgramUpdates,
} from "@/features/advisor/teamProgramData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Ein Team im Programm, aus Sicht der Bezugsperson oder des Inhabers.
 *
 * Es steht nur, was das Team ins Programm einbringt: Stand der Zustimmung,
 * Bezugspersonen, Meilensteine. Arbeitsweisen, Founder Setup und Team-Review
 * sind eigene Freigaben und stehen hier nicht.
 */
export default async function AdvisorProgramTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { programId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(programId)) notFound();
  const tabParam = ((await searchParams) ?? {}).tab;
  const tab = tabParam === "meilensteine" || tabParam === "updates" ? tabParam : "overview";
  const t = await getTranslations("advisor.teamProgram");
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

  const [members, milestones, questions, updates, due] = await Promise.all([
    getOrgMembers(client, orgOfProgram.id),
    program.isActive && tab === "meilensteine" ? listProgramMilestones(client, programId) : Promise.resolve([]),
    program.isActive && tab === "updates" ? getProgramUpdateQuestions(client, programId) : Promise.resolve([]),
    program.isActive && tab === "updates" ? listProgramUpdates(client, programId) : Promise.resolve([]),
    program.isActive && tab === "updates" ? getProgramUpdateDue(client, programId) : Promise.resolve(null),
  ]);
  const nameOf = (userId: string) => members.find((member) => member.userId === userId)?.displayName ?? t("unnamedPerson");
  const base = `/advisor/programm/${programId}`;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={`/advisor/organisation?org=${orgOfProgram.id}&tab=settings`} className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">
        ← {t("backToOrg")}
      </Link>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[.12em] text-violet-700">{t("teamPageEyebrow")} · {orgOfProgram.name}</p>
      <h1 className="mt-1 break-words text-3xl font-semibold tracking-tight text-slate-950">{program.teamName ?? t("unnamedTeam")}</h1>

      <nav className="mt-5 flex gap-6 border-b border-slate-200" aria-label={t("teamPageEyebrow")}>
        {[
          ["overview", t("tabOverview"), base],
          ["meilensteine", t("tabMilestones"), `${base}?tab=meilensteine`],
          ["updates", t("tabUpdates"), `${base}?tab=updates`],
        ].map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            aria-current={tab === key ? "page" : undefined}
            className={`-mb-px inline-flex min-h-11 items-center border-b-[3px] text-sm font-semibold ${tab === key ? "border-violet-600 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {!program.isActive ? (
          <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("teamPageInactive")} ({t("statusWaiting", { approved: program.approvedCount, total: program.memberCount })})
          </p>
        ) : tab === "overview" ? (
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <dd className="text-2xl font-extrabold text-slate-950">{program.memberCount}</dd>
              <dt className="text-xs text-slate-600">{t("members", { count: program.memberCount })}</dt>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("contactsLabel")}</dt>
              <dd className="mt-1 text-sm text-slate-800">{program.contactUserIds.map(nameOf).join(", ") || t("contactsNone")}</dd>
            </div>
          </dl>
        ) : tab === "updates" ? (
          <ManageProgramUpdates programId={programId} questions={questions} due={due} updates={updates} returnTo={`${base}?tab=updates`} />
        ) : (
          <ProgramMilestones programId={programId} milestones={milestones} returnTo={`${base}?tab=meilensteine`} />
        )}
      </div>
    </main>
  );
}
