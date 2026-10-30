import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { startTeamProgramByCodeAction } from "@/features/advisor/teamProgramActions";
import { getTeamProgramCodeOptions } from "@/features/advisor/teamProgramData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Mit einem Programmcode beitreten: eines der EIGENEN Teams waehlen und
 * zustimmen. Das Programm ist erst aktiv, wenn alle im Team zugestimmt haben.
 * Ein falscher, gesperrter oder abgelaufener Code sieht von aussen gleich aus.
 */
export default async function TeamProgramCodePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{ fehler?: string }>;
}) {
  const { code } = await params;
  const t = await getTranslations("advisor.teamProgram");
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath(`/programm/code/${code}`));

  const failed = ((await searchParams) ?? {}).fehler === "1";
  const options = /^[A-HJ-NP-Z2-9]{8}$/.test(code) ? await getTeamProgramCodeOptions(await createClient(), code) : [];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      {options.length === 0 ? (
        <>
          <h1 className="text-2xl font-semibold text-slate-950">{t("pageTitle")}</h1>
          <p role="alert" className="mt-4 text-sm leading-7 text-slate-700">{failed ? t("inviteFailed") : t("codeInvalid")}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{t("codeNoTeam")}</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{t("inviteTitle", { org: options[0].orgName })}</h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">{t("inviteText")}</p>
          {failed ? <p role="alert" className="mt-3 text-sm text-rose-800">{t("inviteFailed")}</p> : null}
          <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("meaning")}</p>
          <ul className="mt-5 grid gap-3">
            {options.map((option) => (
              <li key={option.teamId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="font-semibold text-slate-900">
                  {option.teamName ?? t("unnamedTeam")}
                  <span className="ml-2 text-sm font-normal text-slate-500">{t("members", { count: option.memberCount })}</span>
                </span>
                <form action={startTeamProgramByCodeAction}>
                  <input type="hidden" name="code" value={code} />
                  <input type="hidden" name="teamId" value={option.teamId} />
                  <SubmitButton label={t("inviteJoin")} pendingLabel="…" className="brand-cta inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold" />
                </form>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
