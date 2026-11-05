import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { getMyAdvisorOrgs } from "@/features/advisor/orgData";
import { listEventFormats } from "@/features/advisor/teamProgramData";
import { saveEventFormatAction } from "@/features/advisor/teamProgramActions";
import { PlanEventList } from "@/features/advisor/PlanEventList";
import { loadSetup } from "@/features/advisor/setup/setupData";
import { isSetupStep, stepHref, type SetupStep } from "@/features/advisor/setup/setupModel";
import { setSetupHiddenAction, skipSetupStepAction } from "@/features/advisor/setup/setupActions";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SUGGESTED_FORMATS = ["Workshop", "Masterclass", "Mentoring", "Office Hours", "Pitch-Training", "Fireside Chat", "Networking", "Demo Day"];

/**
 * "Los geht's" (Entwurf vom 05.11.2026): Einrichten Schritt fuer Schritt. Links die Liste mit dem Stand, rechts der
 * gewaehlte Schritt - was er bringt, wo man ihn spaeter findet, "jetzt machen" oder ueberspringen. Der Schritt
 * "Programm planen" geht gleich hier: Formate antippen, Termine tippen oder diktieren.
 */
export default async function SetupPage({ searchParams }: { searchParams?: Promise<{ org?: string; schritt?: string }> }) {
  const query = (await searchParams) ?? {};
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/advisor/los-gehts"));
  const client = await createClient();
  const [t, roleViews, orgs] = await Promise.all([getTranslations("advisor.setup"), getDashboardRoleViews(user.id), getMyAdvisorOrgs(client)]);
  if (!roleViews.hasAdvisor) redirect("/dashboard");
  const org = orgs.find((entry) => entry.id === query.org) ?? orgs.find((entry) => entry.role === "owner") ?? orgs[0] ?? null;
  // Ohne Organisation ist der erste Schritt, das eigene Programm anzulegen.
  if (!org) redirect("/advisor/organisation");

  const setup = await loadSetup(client, org, user.id);
  const { items, done, total, next } = setup.progress;
  const current: SetupStep = isSetupStep(query.schritt) && items.some((item) => item.key === query.schritt) ? query.schritt : next ?? items[items.length - 1].key;
  const index = items.findIndex((item) => item.key === current);
  const currentState = items[index]?.state ?? "open";
  const formats = current === "plan" ? await listEventFormats(client, org.id) : [];
  const href = (step: SetupStep) => `/advisor/los-gehts?${new URLSearchParams({ org: org.id, schritt: step }).toString()}`;

  return (
    <main className="work-ui mx-auto grid w-full max-w-6xl gap-6 px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:px-8">
      <aside className="rounded-[20px] border border-slate-200 bg-white p-5">
        <p className="text-[13px] text-slate-600">{org.name}</p>
        <h1 className="font-brand mt-1 text-[30px] font-semibold leading-tight text-slate-950">{t("title")}</h1>
        <p className="mt-1 text-[14px] text-slate-700">{t("progress", { done, total })}</p>
        <div aria-hidden="true" className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
          {items.map((item) => (
            <span key={item.key} className={`h-1.5 rounded-full ${item.state === "done" ? "bg-violet-600" : item.key === current ? "bg-violet-300" : "bg-slate-200"}`} />
          ))}
        </div>
        <ol className="mt-4 grid gap-1">
          {items.map((item, position) => (
            <li key={item.key}>
              <Link
                href={href(item.key)}
                aria-current={item.key === current ? "step" : undefined}
                className={`flex min-h-14 items-center gap-3 rounded-xl px-2.5 py-2 ${item.key === current ? "bg-violet-50" : "hover:bg-slate-50"}`}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold ${
                    item.state === "done" ? "bg-emerald-700 text-white" : item.key === current ? "bg-violet-600 text-white" : "border-[1.5px] border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  {item.state === "done" ? "✓" : position + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[14.5px] ${item.key === current ? "font-bold text-slate-950" : item.state === "done" ? "font-medium text-slate-600" : "font-medium text-slate-950"}`}>{t(`steps.${item.key}.title`)}</span>
                  <span className="block text-[12.5px] text-slate-600">
                    {item.state === "skipped" ? t("skippedShort") : t(`steps.${item.key}.short`)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <form action={setSetupHiddenAction} className="mt-3">
          <input type="hidden" name="orgId" value={org.id} />
          <input type="hidden" name="hidden" value="yes" />
          <SubmitButton label={t("later")} pendingLabel="…" className="inline-flex min-h-10 items-center text-left text-[13.5px] text-slate-600 underline-offset-4 hover:underline" />
        </form>
      </aside>

      <section aria-labelledby="step-title" className="grid gap-5 rounded-[20px] border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-[13px] font-semibold text-violet-800">{t("stepOf", { step: index + 1, total })}</p>
        <h2 id="step-title" className="font-brand -mt-3 text-[30px] font-semibold leading-tight text-slate-950">{t(`steps.${current}.title`)}</h2>
        <p className="max-w-2xl text-[15.5px] leading-7 text-slate-800">{t(`steps.${current}.text`)}</p>

        {current === "plan" && currentState !== "done" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-[14px] font-semibold text-slate-950">{t("plan.formatsTitle")}</p>
              <p className="mt-1 text-[13.5px] text-slate-600">{t("plan.formatsText")}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SUGGESTED_FORMATS.map((label) => {
                  const on = formats.some((format) => format.label.toLocaleLowerCase("de") === label.toLocaleLowerCase("de"));
                  return on ? (
                    <span key={label} className="inline-flex min-h-9 items-center rounded-full border border-violet-500 bg-violet-50 px-3 text-[13px] font-semibold text-violet-900">✓ {label}</span>
                  ) : (
                    <form key={label} action={saveEventFormatAction}>
                      <input type="hidden" name="orgId" value={org.id} />
                      <input type="hidden" name="back" value="setup" />
                      <input type="hidden" name="label" value={label} />
                      <SubmitButton label={label} pendingLabel="…" className="inline-flex min-h-9 items-center rounded-full border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50" />
                    </form>
                  );
                })}
                {formats
                  .filter((format) => !SUGGESTED_FORMATS.some((label) => label.toLocaleLowerCase("de") === format.label.toLocaleLowerCase("de")))
                  .map((format) => <span key={format.formatId} className="inline-flex min-h-9 items-center rounded-full border border-violet-500 bg-violet-50 px-3 text-[13px] font-semibold text-violet-900">✓ {format.label}</span>)}
              </div>
              <form action={saveEventFormatAction} className="mt-3 flex gap-2">
                <input type="hidden" name="orgId" value={org.id} />
                <input type="hidden" name="back" value="setup" />
                <label className="min-w-0 flex-1">
                  <span className="sr-only">{t("plan.ownFormat")}</span>
                  <input name="label" required maxLength={60} placeholder={t("plan.ownFormat")} className="min-h-10 w-full rounded-xl border border-slate-300 px-3 text-[14px]" />
                </label>
                <SubmitButton label={t("plan.add")} pendingLabel="…" className="inline-flex min-h-10 items-center rounded-xl border border-dashed border-violet-300 px-3 text-[13px] font-semibold text-violet-800" />
              </form>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-[14px] font-semibold text-slate-950">{t("plan.datesTitle")}</p>
              <p className="mb-3 mt-1 text-[13.5px] text-slate-600">{t("plan.datesText")}</p>
              <PlanEventList orgId={org.id} today={new Date().toISOString().slice(0, 10)} formats={formats} back="setup" />
            </div>
          </div>
        ) : null}

        <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3.5">
          <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-[13px] font-bold text-violet-800">i</span>
          <p className="text-[14px] leading-6 text-slate-700">
            {t("whereLater")} <strong>{t(`steps.${current}.place`)}</strong>. {currentState === "done" ? t("isDone") : t("doneWhen", { when: t(`steps.${current}.doneWhen`) })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {current !== "plan" || currentState === "done" ? (
            <Link href={stepHref(current, org.id)} className="brand-cta inline-flex min-h-12 items-center rounded-xl px-5 text-[15px] font-semibold">
              {currentState === "done" ? t("open") : t("doNow")}
            </Link>
          ) : null}
          {currentState !== "done" && currentState !== "skipped" ? (
            <form action={skipSetupStepAction}>
              <input type="hidden" name="orgId" value={org.id} />
              <input type="hidden" name="step" value={current} />
              <SubmitButton label={t("skip")} pendingLabel="…" className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50" />
            </form>
          ) : null}
          {index + 1 < items.length ? (
            <Link href={href(items[index + 1].key)} className="inline-flex min-h-12 items-center px-2 text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">{t("nextStep")}</Link>
          ) : (
            <Link href="/advisor/dashboard" className="inline-flex min-h-12 items-center px-2 text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">{t("toStart")}</Link>
          )}
          <span className="text-[13px] text-slate-600">{t("anytime")}</span>
        </div>
      </section>
    </main>
  );
}
