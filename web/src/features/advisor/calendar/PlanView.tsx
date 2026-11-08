import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PlanEventList } from "@/features/advisor/PlanEventList";
import { calendarHref } from "@/features/advisor/calendar/calendarModel";
import type { EventFormat, ProgramEvent } from "@/features/advisor/teamProgramData";
import { berlinDayOf } from "@/lib/berlinTime";

/**
 * Der Programmplan (06.11.2026): hier traegt man die Termine des Programms ein - einzeln, mehrere auf einmal (tippen
 * oder diktieren) und mit den Formaten - und sieht sie als Liste. Das Raster mit Posts und Aufgaben ist der Kalender.
 * Ein Klick auf einen Termin oeffnet sein Panel im Kalender.
 */
export async function PlanView({
  orgId,
  isOwner,
  events,
  postCounts,
  formats,
  programs,
  today,
  locale,
  keep,
}: {
  orgId: string;
  isOwner: boolean;
  events: ProgramEvent[];
  postCounts: Map<string, number>;
  formats: EventFormat[];
  programs: { programId: string; name: string }[];
  today: string;
  locale: string;
  keep: Record<string, string>;
}) {
  const t = await getTranslations("advisor.calendar.plan");
  const tp = await getTranslations("advisor.teamProgram");
  const date = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const clock = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const upcoming = events.filter((event) => berlinDayOf(event.startsAt) >= today);
  const past = events.filter((event) => berlinDayOf(event.startsAt) < today).reverse();

  const row = (event: ProgramEvent) => {
    const day = berlinDayOf(event.startsAt);
    const [weekday, ...rest] = date.format(new Date(`${day}T00:00:00Z`)).split(" ");
    const posts = postCounts.get(event.eventId) ?? 0;
    const forTeams =
      event.audience === "internal"
        ? tp("event.audience.internal")
        : event.audience === "selected"
          ? tp("event.onlyFor", { teams: (event.programIds ?? []).map((id) => programs.find((program) => program.programId === id)?.name).filter(Boolean).join(", ") || "–" })
          : null;
    return (
      <li key={event.eventId}>
        <Link href={calendarHref(orgId, { ...keep, ansicht: null, termin: event.eventId })} className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-3 hover:border-violet-300">
          <span className="flex h-[54px] w-[52px] shrink-0 flex-col items-center justify-center rounded-xl bg-violet-100 text-violet-900">
            <span className="text-[11.5px] font-bold uppercase leading-tight">{weekday}</span>
            <span className="font-brand text-[18px] font-semibold leading-tight">{rest.join(" ")}</span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[15.5px] font-semibold text-slate-950">{event.title}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-700">
              <span>{clock.format(new Date(event.startsAt))}{event.endsAt ? `–${clock.format(new Date(event.endsAt))}` : ""}</span>
              <span>· {[tp(`event.venue.${event.venue ?? "onsite"}`), event.location].filter(Boolean).join(" · ")}</span>
              {event.formatLabel ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-900">{event.formatLabel}</span> : null}
              {forTeams ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">{forTeams}</span> : null}
              {event.mandatory ? <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">{tp("event.mandatory")}</span> : null}
            </span>
          </span>
          {event.audience !== "internal" ? (
            <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-bold sm:inline ${posts > 0 ? "bg-pink-100 text-pink-950" : "bg-amber-100 text-amber-950"}`}>{posts > 0 ? t("posts", { count: posts }) : t("noPosts")}</span>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <section aria-labelledby="plan-title" className="grid gap-5">
      <div className="rounded-[20px] border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 sm:p-6">
        <h2 id="plan-title" className="font-brand text-[24px] font-semibold text-slate-950">{t("title")}</h2>
        <p className="mt-1 max-w-2xl text-[14.5px] leading-6 text-slate-700">{t("text")}</p>
        {isOwner ? (
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link href={calendarHref(orgId, { ...keep, neu: "termin" })} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#6D49E0] px-5 text-[15px] font-semibold text-white hover:bg-[#5B36D6]">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              {t("addOne")}
            </Link>
            <Link href={calendarHref(orgId, { ...keep, neu: "liste" })} className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 text-[15px] font-semibold text-slate-950 hover:bg-slate-50">{t("addMany")}</Link>
            <Link href={calendarHref(orgId, { ansicht: "formate" })} className="inline-flex min-h-12 items-center rounded-xl px-4 text-[14.5px] font-semibold text-violet-800 hover:bg-violet-50">{t("formats", { count: formats.length })}</Link>
          </div>
        ) : null}
      </div>

      {events.length === 0 ? (
        isOwner ? (
          <div className="rounded-[20px] border border-slate-200 bg-white p-5 sm:p-6">
            <h3 className="text-[16px] font-bold text-slate-950">{t("emptyTitle")}</h3>
            <p className="mb-3 mt-1 text-[14px] leading-6 text-slate-700">{tp("bulk.text")}</p>
            <PlanEventList orgId={orgId} today={today} formats={formats} />
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-[15px] text-slate-700">{tp("planEmpty")}</p>
        )
      ) : null}

      {upcoming.length > 0 ? <ol className="grid gap-2.5">{upcoming.map(row)}</ol> : events.length > 0 ? <p className="text-[15px] text-slate-700">{t("nothingAhead")}</p> : null}
      {past.length > 0 ? (
        <details>
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-[14px] font-semibold text-slate-700">{tp("planPast")} ({past.length})</summary>
          <ol className="mt-2 grid gap-2.5 opacity-80">{past.map(row)}</ol>
        </details>
      ) : null}
    </section>
  );
}
