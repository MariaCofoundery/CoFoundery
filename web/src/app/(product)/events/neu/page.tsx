import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { getMyAdvisorOrgs } from "@/features/advisor/orgData";
import { submitEventAction } from "@/features/events/eventsActions";
import { REGIONS } from "@/features/events/eventsModel";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";

const LABEL = "block text-sm font-semibold text-slate-900";
const INPUT = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px]";
const ERRORS = ["confirm", "tooMany", "notAllowed", "url", "invalid"] as const;

/**
 * Ein Event vorschlagen - fuer Mitglieder einer aktiven Organisation. Nur Fakten und der Link zur offiziellen
 * Seite; sichtbar erst nach Freigabe durch die Plattform-Admins (20270323120000).
 */
export default async function SubmitEventPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const query = (await searchParams) ?? {};
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/events/neu"));
  const client = await createClient();
  const [t, tEvents, orgs, roleViews] = await Promise.all([getTranslations("events.submit"), getTranslations("events"), getMyAdvisorOrgs(client), getDashboardRoleViews(user.id)]);
  const active = orgs.filter((org) => org.status === "active");
  // Seit 05.11.2026 auch Gruendende - ohne Organisation; geprueft wird genauso (Admin-Freigabe).
  if (active.length === 0 && !roleViews.hasFounder) redirect("/events");
  const error = ERRORS.find((entry) => entry === query.error) ?? null;

  return (
    <main className="work-ui mx-auto w-full max-w-2xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      <Link href="/events" className="inline-flex min-h-11 items-center text-sm text-slate-600 underline-offset-4 hover:underline">← {t("back")}</Link>
      <h1 className="font-brand mt-1 text-[30px] font-semibold leading-tight text-slate-950">{t("title")}</h1>
      <p className="mt-2 text-[15px] leading-6 text-slate-700">{t("intro")}</p>
      {error ? <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{t(`errors.${error}`)}</p> : null}

      <form action={submitEventAction} className="mt-6 grid gap-5 rounded-[18px] border border-slate-200 bg-white p-5 sm:p-6">
        {active.length + (roleViews.hasFounder ? 1 : 0) > 1 ? (
          <label className="block">
            <span className={LABEL}>{t("org")}</span>
            <select name="orgId" className={INPUT}>
              {active.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
              {roleViews.hasFounder ? <option value="">{t("asFounder")}</option> : null}
            </select>
          </label>
        ) : (
          <input type="hidden" name="orgId" value={active[0]?.id ?? ""} />
        )}
        <label className="block">
          <span className={LABEL}>{t("eventTitle")}</span>
          <input name="title" required maxLength={200} className={INPUT} />
        </label>
        <div className="grid gap-5 sm:grid-cols-3">
          <label className="block">
            <span className={LABEL}>{t("day")}</span>
            <input type="date" name="day" required className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>{t("start")}</span>
            <input type="time" name="startTime" className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>{t("end")}</span>
            <input type="time" name="endTime" className={INPUT} />
          </label>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-[15px] text-slate-800">
          <input type="checkbox" name="allDay" value="yes" className="size-5" />
          {t("allDay")}
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>{t("place")}</span>
            <input name="place" maxLength={160} placeholder={t("placePlaceholder")} className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>{t("region")}</span>
            <select name="region" className={INPUT}>
              <option value="">{t("regionNone")}</option>
              {REGIONS.map((code) => <option key={code} value={code}>{tEvents(`regions.${code}`)}</option>)}
            </select>
          </label>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-[15px] text-slate-800">
          <input type="checkbox" name="online" value="yes" className="size-5" />
          {t("online")}
        </label>
        <label className="block">
          <span className={LABEL}>{t("organizer")}</span>
          <input name="organizer" maxLength={120} className={INPUT} />
        </label>
        <label className="block">
          <span className={LABEL}>{t("url")}</span>
          <input type="url" name="url" required maxLength={500} pattern="https://.+" placeholder="https://" className={INPUT} />
          <span className="mt-1.5 block text-[13px] text-slate-600">{t("urlHint")}</span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] leading-6 text-amber-950">
          <input type="checkbox" name="confirmed" value="yes" required className="mt-1 size-5 shrink-0" />
          <span>{t("confirm")}</span>
        </label>
        <SubmitButton label={t("send")} pendingLabel="…" className="brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-5 text-sm font-semibold" />
      </form>
    </main>
  );
}
