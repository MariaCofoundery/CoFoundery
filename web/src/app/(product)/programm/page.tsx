import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { consentTeamProgramAction, endTeamProgramAction, openTeamProgramCodeAction, setTeamProgramSoloAction } from "@/features/advisor/teamProgramActions";
import {
  getMyTeamPrograms,
  getProgramProfile,
  getProgramUpdateDue,
  getProgramUpdateQuestions,
  listProgramMilestones,
  listProgramUpdates,
} from "@/features/advisor/teamProgramData";
import { TeamProgramUpdates } from "@/features/advisor/ProgramUpdates";
import { TeamProgramProfileForm } from "@/features/advisor/ProgramProfile";
import { ProgramMilestones } from "@/features/advisor/ProgramMilestones";
import { getMyProgramEvents } from "@/features/advisor/teamProgramData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Programm: in welchen Programmen ist mein Team, und wer liest mit? Die
 * Zustimmung steht hier, damit jede Person im Team sie selbst gibt.
 */
export default async function TeamProgramPage({ searchParams }: { searchParams?: Promise<{ neu?: string; code?: string }> }) {
  const t = await getTranslations("advisor.teamProgram");
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/programm"));
  const client = await createClient();
  const programs = await getMyTeamPrograms(client);
  const planEvents = await getMyProgramEvents(client);
  const dateFormat = new Intl.DateTimeFormat(getPresentationLocale(await getLocale()), { dateStyle: "medium", timeStyle: "short" });
  const updatesByProgram = new Map(
    await Promise.all(
      programs
        .filter((program) => program.isActive)
        .map(async (program) => {
          const [questions, updates, due, profile] = await Promise.all([
            getProgramUpdateQuestions(client, program.programId),
            listProgramUpdates(client, program.programId),
            getProgramUpdateDue(client, program.programId),
            getProgramProfile(client, program.programId),
          ]);
          return [program.programId, { questions, updates, due, profile }] as const;
        }),
    ),
  );
  const milestonesByProgram = new Map(
    await Promise.all(
      programs.filter((program) => program.isActive).map(async (program) => [program.programId, await listProgramMilestones(client, program.programId)] as const),
    ),
  );
  const query = (await searchParams) ?? {};
  const isNew = query.neu === "1";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{t("pageTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("pageText")}</p>
      {isNew ? (
        <p role="status" className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-900">
          {t("pageNew")}
        </p>
      ) : null}

      <form action={openTeamProgramCodeAction} className="mt-6 grid gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 sm:max-w-md">
        <label>
          <span className="block text-sm font-semibold text-slate-900">{t("codeEntryTitle")}</span>
          <span className="block text-xs leading-5 text-slate-600">{t("codeEntryText")}</span>
          <input name="code" required maxLength={12} autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-label={t("codeEntryLabel")} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm uppercase tracking-[.2em]" />
        </label>
        {query.code === "invalid" ? <p role="alert" className="text-xs text-rose-800">{t("codeEntryInvalid")}</p> : null}
        <SubmitButton label={t("codeEntryGo")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" />
      </form>

      {planEvents.length > 0 ? (
        <section aria-labelledby="my-plan-title" className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 id="my-plan-title" className="text-lg font-semibold text-slate-950">{t("myPlanTitle")}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">{t("myPlanText")}</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {planEvents.map((event) => (
              <li key={`${event.programId}-${event.eventId}`} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-950">{event.title}</span>
                  <span className="text-sm text-slate-600">{dateFormat.format(new Date(event.startsAt))}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {event.orgName} · {t(event.kind === "internal" ? "kindInternal" : event.kind === "external" ? "kindExternal" : "kindEducation")}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
                {event.notes ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{event.notes}</p> : null}
                {event.todos ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700"><span className="font-semibold">{t("planTodos")}: </span>{event.todos}</p> : null}
                {event.myStatus ? <p className="mt-1 text-xs font-semibold text-violet-800">{t("myAttendance", { status: t(`attend_${event.myStatus}`) })}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {programs.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">{t("pageEmpty")}</p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {programs.map((program) => (
            <li key={program.programId} className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-950">{program.orgName}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${program.isActive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                  {program.isActive ? t("statusActive") : program.memberCount < 2 && !program.soloConfirmed ? t("waitingForCofounders") : t("approvedOf", { approved: program.approvedCount, total: program.memberCount })}
                </span>
              </div>
              <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("readers")}</p>
                <p className="mt-1">
                  {program.contactNames.length > 0
                    ? t("contactsLine", { names: program.contactNames.join(", ") })
                    : t("noContactsYet")}
                </p>
                {program.adminNames.length > 0 ? <p>{t("adminsLine", { names: program.adminNames.join(", ") })}</p> : null}
              </div>
              {program.memberCount < 2 && !program.soloConfirmed ? (
                <p className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-900">
                  {t("waitingText")}{" "}
                  <Link href={`/invite/new?team=${program.teamId}`} className="font-semibold underline underline-offset-4">{t("waitingInvite")}</Link>
                </p>
              ) : null}
              {program.memberCount === 1 ? (
                <form action={setTeamProgramSoloAction} className="mt-2">
                  <input type="hidden" name="programId" value={program.programId} />
                  <input type="hidden" name="confirmed" value={program.soloConfirmed ? "no" : "yes"} />
                  <p className="text-xs leading-6 text-slate-600">{program.soloConfirmed ? t("soloMarkedForTeam") : t("soloTeamText")}</p>
                  <SubmitButton label={program.soloConfirmed ? t("soloUndo") : t("soloTeamConfirm")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800" />
                </form>
              ) : null}
              <p className="mt-3 text-xs leading-6 text-slate-600">{program.includesSetup ? t("meaning") : t("meaningWithoutSetup")}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {program.iApproved ? (
                  <span className="text-sm font-semibold text-emerald-800">{t("iApproved")}</span>
                ) : (
                  <form action={consentTeamProgramAction}>
                    <input type="hidden" name="programId" value={program.programId} />
                    <SubmitButton label={t("consent")} pendingLabel="…" className="brand-cta inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold" />
                  </form>
                )}
                <form action={endTeamProgramAction}>
                  <input type="hidden" name="programId" value={program.programId} />
                  <SubmitButton label={t("end")} pendingLabel="…" className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline" />
                </form>
              </div>
              <p className="mt-1 text-xs text-slate-500">{t("endHint")}</p>
              {program.isActive ? (
                <>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <TeamProgramProfileForm programId={program.programId} profile={updatesByProgram.get(program.programId)?.profile ?? null} />
                </div>
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <ProgramMilestones programId={program.programId} milestones={milestonesByProgram.get(program.programId) ?? []} returnTo="/programm" />
                </div>
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <TeamProgramUpdates
                    programId={program.programId}
                    questions={updatesByProgram.get(program.programId)?.questions ?? []}
                    due={updatesByProgram.get(program.programId)?.due ?? null}
                    updates={updatesByProgram.get(program.programId)?.updates ?? []}
                  />
                </div>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
