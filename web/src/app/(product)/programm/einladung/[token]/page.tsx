import { redirect } from "next/navigation";
import { createHash } from "crypto";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { startTeamProgramAction } from "@/features/advisor/teamProgramActions";
import { getTeamProgramInviteOptions } from "@/features/advisor/teamProgramData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Einladung der Organisation einloesen. Man waehlt eines der EIGENEN Teams; die
 * Organisation sieht nichts, bevor jemand aus dem Team hier zustimmt - und das
 * Programm ist erst aktiv, wenn alle zugestimmt haben.
 */
export default async function TeamProgramInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ fehler?: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("advisor.teamProgram");
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath(`/programm/einladung/${token}`));

  const failed = ((await searchParams) ?? {}).fehler === "1";
  const options = /^[0-9a-f]{48}$/.test(token)
    ? await getTeamProgramInviteOptions(await createClient(), createHash("sha256").update(token).digest("hex"))
    : [];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      {options.length === 0 ? (
        <>
          <h1 className="text-2xl font-semibold text-slate-950">{t("pageTitle")}</h1>
          <p role="alert" className="mt-4 text-sm leading-7 text-slate-700">{failed ? t("inviteFailed") : t("inviteInvalid")}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{t("inviteNoTeam")}</p>
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
                <form action={startTeamProgramAction}>
                  <input type="hidden" name="token" value={token} />
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
