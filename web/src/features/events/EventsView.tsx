import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { deleteEventAction, toggleEventSaveAction } from "@/features/events/eventsActions";
import { EVENT_FILTERS, REGIONS, agenda, type CalendarEntry, type EcosystemEvent, type EventFilter, type Region } from "@/features/events/eventsModel";

/**
 * Der Event-Kalender als Tagesliste (Entwurf vom 05.11.2026, "Ausblick Event-Kalender"): leicht zu ueberfliegen,
 * vor allem am Telefon. An jedem Event steht, woher es kommt - aus dem eigenen Programm, aus einer Quelle mit
 * Lizenz oder von einer Organisation eingetragen und von uns geprueft. Der Titel fuehrt zur offiziellen Seite.
 */
export async function EventsView({
  entries,
  filter,
  region,
  locale,
  canSubmit,
  submissions,
  submitted,
}: {
  entries: CalendarEntry[];
  filter: EventFilter;
  region: Region | "online" | null;
  locale: string;
  canSubmit: boolean;
  submissions: EcosystemEvent[];
  submitted: boolean;
}) {
  const t = await getTranslations("events");
  const days = agenda(entries, filter, region);
  const dayLabel = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "long", timeZone: "Europe/Berlin" });
  const clock = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const hrefFor = (next: { filter?: EventFilter; region?: string | null }) => {
    const params = new URLSearchParams();
    const f = next.filter ?? filter;
    const r = next.region === undefined ? region : next.region;
    if (f !== "all") params.set("filter", f);
    if (r) params.set("region", r);
    return params.size > 0 ? `/events?${params.toString()}` : "/events";
  };
  const chip = (active: boolean) =>
    `inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-[13.5px] font-medium ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`;

  const origin = (event: EcosystemEvent) =>
    event.source ? (
      <span className="inline-flex flex-wrap items-center gap-x-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-900">
        {t("fromSource")}{" "}
        <a href={event.source.homepageUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{event.source.attribution}</a>
        {event.source.license ? (
          <>
            {" · "}
            {event.source.licenseUrl ? <a href={event.source.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{event.source.license}</a> : event.source.license}
          </>
        ) : null}
      </span>
    ) : (
      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-900">{event.submittedOrgName ? t("fromOrg", { org: event.submittedOrgName }) : t("fromCommunity")}</span>
    );

  const card = (entry: CalendarEntry) => {
    if (entry.kind === "program") {
      return (
        <article key={entry.key} className="flex gap-3 rounded-2xl border border-slate-200 bg-white py-3 pl-3.5 pr-3">
          <div className="w-12 shrink-0 pt-0.5 text-sm font-bold text-slate-950">{clock.format(new Date(entry.startsAt))}</div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="text-[15px] font-semibold leading-snug text-slate-950"><Link href={entry.href} className="underline-offset-4 hover:underline">{entry.title}</Link></h3>
            {entry.place ? <span className="text-[13px] text-slate-600">{entry.place}</span> : null}
            <span className="inline-flex w-fit rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-900">{entry.label}</span>
          </div>
        </article>
      );
    }
    const event = entry.event;
    return (
      <article key={entry.key} id={event.id} className="flex scroll-mt-24 gap-3 rounded-2xl border border-slate-200 bg-white py-3 pl-3.5 pr-3">
        <div className="w-12 shrink-0 pt-0.5 text-sm font-bold text-slate-950">{event.allDay ? t("allDay") : clock.format(new Date(event.startsAt))}</div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-[15px] font-semibold leading-snug text-slate-950">
            <a href={event.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{event.title}<span className="sr-only"> {t("opensOfficial")}</span> <span aria-hidden="true" className="text-slate-500">↗</span></a>
          </h3>
          <span className="text-[13px] text-slate-600">
            {[event.online ? t("online") : null, event.place, event.organizer ? t("by", { organizer: event.organizer }) : null].filter(Boolean).join(" · ")}
          </span>
          <span className="w-fit">{origin(event)}</span>
        </div>
        <form action={toggleEventSaveAction}>
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="filter" value={filter} />
          <input type="hidden" name="region" value={region ?? ""} />
          <button type="submit" aria-label={entry.saved ? t("unsave", { title: event.title }) : t("save", { title: event.title })} aria-pressed={entry.saved} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${entry.saved ? "border-violet-200 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-700"}`}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill={entry.saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
          </button>
        </form>
      </article>
    );
  };

  return (
    <main className="work-ui mx-auto w-full max-w-3xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-brand text-[30px] font-semibold leading-tight text-slate-950 sm:text-[34px]">{t("title")}</h1>
          <p className="mt-1 text-[14px] text-slate-600">{t("intro")}</p>
        </div>
        {canSubmit ? (
          <Link href="/events/neu" className="brand-cta inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold">+ {t("suggest")}</Link>
        ) : null}
      </header>

      {submitted ? <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("submittedNote")}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <nav aria-label={t("filterLabel")} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {EVENT_FILTERS.map((entry) => (
            <Link key={entry} href={hrefFor({ filter: entry })} aria-current={filter === entry ? "page" : undefined} className={chip(filter === entry)}>
              {t(`filters.${entry}`)}
            </Link>
          ))}
        </nav>
        <form method="get" action="/events" className="flex items-center gap-1.5">
          {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
          <label>
            <span className="sr-only">{t("regionLabel")}</span>
            <select name="region" defaultValue={region ?? ""} className="min-h-9 rounded-full border border-slate-300 bg-white px-3 text-[13.5px] text-slate-800">
              <option value="">{t("regionAll")}</option>
              <option value="online">{t("regionOnline")}</option>
              {REGIONS.map((code) => <option key={code} value={code}>{t(`regions.${code}`)}</option>)}
            </select>
          </label>
          <button type="submit" className="inline-flex min-h-9 items-center rounded-full border border-slate-300 bg-white px-3 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50">{t("regionApply")}</button>
        </form>
      </div>

      {days.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-[15px] leading-6 text-slate-700">
          {filter === "saved" ? t("emptySaved") : t("empty")}
        </p>
      ) : (
        days.map(({ day, entries: dayEntries }) => (
          <section key={day} aria-label={dayLabel.format(new Date(`${day}T12:00:00Z`))}>
            <h2 className="mx-1 mb-2 mt-5 text-[13px] font-semibold text-slate-600">
              {day === todayKey ? `${t("today")} · ` : ""}
              {dayLabel.format(new Date(`${day}T12:00:00Z`))}
            </h2>
            <div className="grid gap-2">{dayEntries.map(card)}</div>
          </section>
        ))
      )}

      {submissions.length > 0 ? (
        <section id="mine" aria-labelledby="mine-title" className="mt-10 scroll-mt-24 rounded-[18px] border border-slate-200 bg-white px-5 py-4">
          <h2 id="mine-title" className="text-[15px] font-semibold text-slate-950">{t("mineTitle")}</h2>
          <ul className="mt-2">
            {submissions.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-3 border-t border-slate-100 py-2.5 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-slate-950">{event.title}</p>
                  <p className={`text-[13px] ${event.status === "rejected" ? "text-rose-700" : "text-slate-600"}`}>
                    {event.status === "rejected" ? t("rejected", { note: event.reviewNote ?? "" }) : t("pending")}
                  </p>
                </div>
                <form action={deleteEventAction}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <SubmitButton label={t("withdraw")} pendingLabel="…" className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline" />
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 text-[13px] leading-5 text-slate-600">{t("legalNote")}</p>
    </main>
  );
}
