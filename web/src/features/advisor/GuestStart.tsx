import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AdvisorPageHeader } from "@/features/advisor/AdvisorPageHeader";
import type { AdvisorOrg } from "@/features/advisor/orgData";
import { listProgramEvents } from "@/features/advisor/teamProgramData";
import { getPresentationLocale } from "@/i18n/presentationLocale";

/**
 * "Heute" fuer einen Gast der Organisation (09.11.2026): nur lesen - die naechsten Termine und die Wege zu Kalender,
 * Programmplan und (mit dem Recht) Zahlen. Kein Teamraum, keine Startups, keine Namen.
 */
export async function GuestStart({ client, org }: { client: SupabaseClient; org: AdvisorOrg }) {
  const t = await getTranslations("advisor.guestStart");
  const locale = getPresentationLocale(await getLocale());
  const events = (await listProgramEvents(client, org.id)).filter((event) => new Date(event.startsAt).getTime() >= Date.now()).slice(0, 8);
  const when = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const org_ = encodeURIComponent(org.id);
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <AdvisorPageHeader eyebrow={org.name} title={t("title")} text={t("text")} />
      <section aria-labelledby="guest-next" className="mt-7 rounded-[20px] border border-slate-200 bg-white p-5 sm:p-6">
        <h2 id="guest-next" className="font-brand text-[22px] font-semibold text-slate-950">{t("next")}</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-[14.5px] text-slate-700">{t("nothing")}</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {events.map((event) => (
              <li key={event.eventId} className="flex flex-wrap items-baseline gap-x-3 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
                <span className="text-[13px] font-semibold text-violet-900">{when.format(new Date(event.startsAt))}</span>
                <span className="text-[15px] text-slate-950">{event.title}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={`/advisor/kalender?org=${org_}`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">{t("calendar")}</Link>
          <Link href={`/advisor/kalender?org=${org_}&ansicht=plan`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">{t("plan")}</Link>
          {org.rights.results ? <Link href={`/advisor/organisation?org=${org_}&tab=report`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">{t("numbers")}</Link> : null}
        </div>
      </section>
      <p className="mt-4 text-[13px] leading-6 text-slate-600">{t("note")}</p>
    </main>
  );
}
