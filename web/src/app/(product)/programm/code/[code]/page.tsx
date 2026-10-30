import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { createTeamForProgramCodeAction, startTeamProgramByCodeAction } from "@/features/advisor/teamProgramActions";
import { ProgramBrandHeader } from "@/features/advisor/ProgramBrandHeader";
import { accentStyles } from "@/features/advisor/programAccent";
import { getProgramBrandingForCode, getTeamProgramCodeOptions } from "@/features/advisor/teamProgramData";
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

  const fehler = ((await searchParams) ?? {}).fehler;
  const failed = fehler === "1";
  const needsFounderRole = fehler === "rolle";
  const supabase = await createClient();
  const validFormat = /^[A-HJ-NP-Z2-9]{8}$/.test(code);
  // Ankommen zaehlt als Konto fuer diesen Code (hoechstens fuenf je Team-Platz); ein falscher Code tut nichts.
  if (validFormat) await supabase.rpc("record_team_program_code_arrival", { p_code: code });
  const options = validFormat ? await getTeamProgramCodeOptions(supabase, code) : [];
  const branding = validFormat ? await getProgramBrandingForCode(supabase, code) : null;
  const tPage = await getTranslations("advisor.programPage");
  const look = accentStyles(branding?.accent ?? null, branding?.accentB ?? null);
  // Der Kopf der Organisation traegt die Hauptueberschrift; ohne ihn tut es diese Seite.
  const Heading = branding ? "h2" : "h1";
  const buttonStyle = branding ? { background: look.button, color: look.buttonText } : undefined;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      {branding ? (
        <div className="mb-6 overflow-hidden rounded-[32px] border border-slate-200 shadow-[0_30px_80px_-30px_rgba(60,40,180,0.35)]">
          <ProgramBrandHeader orgName={branding.orgName} slug={branding.slug} hasLogo={branding.hasLogo} look={look} eyebrow={tPage("eyebrow")} />
        </div>
      ) : null}
      {options.length === 0 ? (
        <>
          <Heading className="text-2xl font-semibold text-slate-950">{t("pageTitle")}</Heading>
          {needsFounderRole ? (
            <p role="alert" className="mt-4 text-sm leading-7 text-slate-700">{t("newTeamNeedsFounder")}</p>
          ) : failed ? (
            <p role="alert" className="mt-4 text-sm leading-7 text-slate-700">{t("inviteFailed")}</p>
          ) : null}
          <p className="mt-4 text-sm leading-7 text-slate-700">{t("newTeamIntro")}</p>
          <form action={createTeamForProgramCodeAction} className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <input type="hidden" name="code" value={code} />
            <label>
              <span className="block text-sm font-semibold text-slate-900">{t("newTeamName")}</span>
              <input name="teamName" maxLength={60} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
            </label>
            <p className="text-xs leading-6 text-slate-600">{t("newTeamHint")}</p>
            <SubmitButton label={t("newTeamCreate")} pendingLabel="…" style={buttonStyle} className={`${branding ? "" : "brand-cta "}inline-flex min-h-11 w-fit items-center rounded-xl px-5 text-sm font-semibold`} />
          </form>
        </>
      ) : (
        <>
          <Heading className="text-2xl font-semibold tracking-tight text-slate-950">{t("inviteTitle", { org: options[0].orgName })}</Heading>
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
                  <SubmitButton label={t("inviteJoin")} pendingLabel="…" style={buttonStyle} className={`${branding ? "" : "brand-cta "}inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold`} />
                </form>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
