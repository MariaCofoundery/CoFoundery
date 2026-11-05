import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { deleteEventAction, reviewEventAction, saveEventSourceAction, setEventSourceEnabledAction } from "@/features/events/eventsActions";
import { listEventSources, listPendingEcosystemEvents } from "@/features/events/eventsData";
import { REGIONS } from "@/features/events/eventsModel";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { getPresentationLocale } from "@/i18n/presentationLocale";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LABEL = "block text-sm font-semibold text-slate-900";
const INPUT = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px]";

/**
 * Events pruefen (20270323120000): eingetragene Events freigeben oder ablehnen, Quellen pflegen. Eine Quelle wird
 * nur mit Lizenz, Namensnennung und Nachweis der Erlaubnis angelegt; eingeschaltet wird sie hier von Hand.
 */
export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ sourceSaved?: string; sourceError?: string }> }) {
  const client = await requirePlatformAdmin();
  const [t, tEvents, query, locale] = await Promise.all([getTranslations("events.admin"), getTranslations("events"), searchParams, getLocale().then(getPresentationLocale)]);
  const [pending, sources] = await Promise.all([listPendingEcosystemEvents(client), listEventSources(client)]);
  const when = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

  return (
    <main className="work-ui mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-6 pb-16 pt-9">
      <header>
        <Link href="/admin" className="inline-flex min-h-11 items-center text-sm text-slate-600 underline-offset-4 hover:underline">← {t("back")}</Link>
        <h1 className="font-brand text-[2rem] font-semibold leading-tight text-slate-950">{t("title")}</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-7 text-slate-700">{t("intro")}</p>
      </header>

      <section aria-labelledby="pending-title" className="rounded-[18px] border border-slate-200 bg-white p-5 sm:p-6">
        <h2 id="pending-title" className="text-lg font-semibold text-slate-950">{t("pendingTitle", { count: pending.length })}</h2>
        <p className="mt-1 text-[14px] leading-6 text-slate-600">{t("pendingHint")}</p>
        {pending.length === 0 ? <p className="mt-3 text-[15px] text-slate-700">{t("pendingNone")}</p> : null}
        <ul className="mt-3 grid gap-3">
          {pending.map((event) => (
            <li key={event.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-[15px] font-semibold text-slate-950">{event.title}</p>
              <p className="mt-0.5 text-[13px] text-slate-600">
                {[when.format(new Date(event.startsAt)), event.online ? tEvents("online") : null, event.place, event.region ? tEvents(`regions.${event.region}`) : null, event.organizer, event.submittedOrgName ? t("by", { org: event.submittedOrgName }) : t("byFounder")].filter(Boolean).join(" · ")}
              </p>
              <a href={event.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-9 items-center break-all text-[13px] font-semibold text-violet-800 underline underline-offset-2">{event.url}</a>
              <p className="mt-1 text-[13px] text-slate-600">{t("checkHint")}</p>
              <form action={reviewEventAction} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="eventId" value={event.id} />
                <label className="min-w-56 flex-1">
                  <span className="sr-only">{t("note")}</span>
                  <input name="note" maxLength={300} placeholder={t("notePlaceholder")} className="min-h-10 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                </label>
                <SubmitButton intent="publish" fieldName="decision" label={t("publish")} pendingLabel="…" className="brand-cta inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold" />
                <SubmitButton intent="reject" fieldName="decision" label={t("reject")} pendingLabel="…" className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700" />
              </form>
              <form action={deleteEventAction} className="mt-1">
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="back" value="admin" />
                <SubmitButton label={t("delete")} pendingLabel="…" className="text-sm text-rose-700 underline-offset-4 hover:underline" />
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section id="sources" aria-labelledby="sources-title" className="scroll-mt-24 rounded-[18px] border border-slate-200 bg-white p-5 sm:p-6">
        <h2 id="sources-title" className="text-lg font-semibold text-slate-950">{t("sourcesTitle")}</h2>
        <p className="mt-1 max-w-3xl text-[14px] leading-6 text-slate-600">{t("sourcesHint")}</p>
        {query.sourceSaved === "1" ? <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">{t("sourceSaved")}</p> : null}
        {query.sourceError === "1" ? <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{t("sourceError")}</p> : null}
        {sources.length === 0 ? <p className="mt-3 text-[15px] text-slate-700">{t("sourcesNone")}</p> : null}
        <ul className="mt-3 grid gap-3">
          {sources.map((source) => (
            <li key={source.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-slate-950">{source.name} <span className="font-normal text-slate-500">({source.key})</span></p>
                  <p className="mt-0.5 text-[13px] text-slate-700">{source.license} · {source.attribution}</p>
                  <p className="mt-0.5 text-[13px] text-slate-600">{t("permission")}: {source.permissionNote}</p>
                  <p className="mt-0.5 break-all text-[13px] text-slate-600">{source.feedUrl}</p>
                  <p className="mt-0.5 text-[13px] text-slate-600">
                    {source.lastRunAt ? t("lastRun", { when: when.format(new Date(source.lastRunAt)), count: source.lastCount ?? 0 }) : t("neverRun")}
                    {source.lastError ? <span className="text-rose-700"> · {t("lastError", { error: source.lastError })}</span> : null}
                  </p>
                </div>
                <form action={setEventSourceEnabledAction}>
                  <input type="hidden" name="sourceId" value={source.id} />
                  <input type="hidden" name="enabled" value={source.enabled ? "no" : "yes"} />
                  <SubmitButton
                    label={source.enabled ? t("disable") : t("enable")}
                    pendingLabel="…"
                    className={`inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold ${source.enabled ? "border border-slate-300 bg-white text-slate-700" : "brand-cta"}`}
                  />
                </form>
              </div>
              <p className="mt-2 text-[13px] font-semibold text-slate-700">{source.enabled ? t("isOn") : t("isOff")}</p>
            </li>
          ))}
        </ul>

        <details className="mt-5 rounded-2xl border border-slate-200 p-4">
          <summary className="flex min-h-11 cursor-pointer items-center text-[15px] font-semibold text-violet-800">{t("addSource")}</summary>
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] leading-6 text-amber-950">{t("addSourceWarning")}</p>
          <form action={saveEventSourceAction} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label><span className={LABEL}>{t("fields.key")}</span><input name="key" required pattern="[a-z0-9-]{2,40}" className={INPUT} /></label>
            <label><span className={LABEL}>{t("fields.name")}</span><input name="name" required maxLength={120} className={INPUT} /></label>
            <label><span className={LABEL}>{t("fields.homepageUrl")}</span><input type="url" name="homepageUrl" required pattern="https://.+" className={INPUT} /></label>
            <label><span className={LABEL}>{t("fields.feedUrl")}</span><input type="url" name="feedUrl" required pattern="https://.+" className={INPUT} /></label>
            <label><span className={LABEL}>{t("fields.license")}</span><input name="license" required maxLength={120} placeholder="CC BY 4.0" className={INPUT} /></label>
            <label><span className={LABEL}>{t("fields.licenseUrl")}</span><input type="url" name="licenseUrl" pattern="https://.+" className={INPUT} /></label>
            <label><span className={LABEL}>{t("fields.attribution")}</span><input name="attribution" required maxLength={200} className={INPUT} /></label>
            <label>
              <span className={LABEL}>{t("fields.region")}</span>
              <select name="region" className={INPUT}><option value="">{t("fields.regionNone")}</option>{REGIONS.map((code) => <option key={code} value={code}>{tEvents(`regions.${code}`)}</option>)}</select>
            </label>
            <label className="sm:col-span-2">
              <span className={LABEL}>{t("fields.permissionNote")}</span>
              <textarea name="permissionNote" required minLength={5} maxLength={500} rows={3} placeholder={t("fields.permissionPlaceholder")} className={`${INPUT} py-2`} />
            </label>
            <SubmitButton label={t("saveSource")} pendingLabel="…" className="brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-5 text-sm font-semibold" />
          </form>
        </details>
      </section>
    </main>
  );
}
