import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { consentTeamProgramAction, endTeamProgramAction } from "@/features/advisor/teamProgramActions";
import { getMyTeamPrograms } from "@/features/advisor/teamProgramData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Programm: in welchen Programmen ist mein Team, und wer liest mit? Die
 * Zustimmung steht hier, damit jede Person im Team sie selbst gibt.
 */
export default async function TeamProgramPage({ searchParams }: { searchParams?: Promise<{ neu?: string }> }) {
  const t = await getTranslations("advisor.teamProgram");
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/programm"));
  const programs = await getMyTeamPrograms(await createClient());
  const isNew = ((await searchParams) ?? {}).neu === "1";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{t("pageTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("pageText")}</p>
      {isNew ? (
        <p role="status" className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-900">
          {t("pageNew")}
        </p>
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
                  {program.isActive ? t("statusActive") : t("approvedOf", { approved: program.approvedCount, total: program.memberCount })}
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
              <p className="mt-3 text-xs leading-6 text-slate-600">{t("meaning")}</p>
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
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
