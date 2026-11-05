"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { EventAudience, EventHost, EventVenue, ProgramEvent } from "@/features/advisor/teamProgramData";

const LABEL = "mb-1.5 block text-sm font-semibold text-slate-900";
const INPUT = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px]";
const HINT = "mt-1.5 block text-[13px] leading-5 text-slate-600";

type Requirement = { title: string; grantName: string; formatId: string | null; eventKind: "education" | "internal" | "external" | null };

/** Berliner Datum und Uhrzeit eines Zeitpunkts fuer die Felder. */
function berlinParts(iso: string | null | undefined) {
  if (!iso) return { day: "", time: "" };
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function Chips<T extends string>({ name, label, value, options, onChange }: { name: string; label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      <input type="hidden" name={name} value={value} />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm ${value === option.value ? "border-violet-500 bg-violet-50 font-semibold text-violet-900" : "border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Ein Termin im Programmplan (Entwurf vom 05.11.2026, statt "Art"): Format, Zeit, Wo, Fuer wen, Pflicht,
 * Veranstalter, Hinweise fuer die Teams, eine Notiz nur fuers eigene Team - und rechts, was am Termin haengt:
 * Aufgaben im Teamraum, oeffentlich im Event-Kalender, fuer welche Foerderauflage er zaehlt.
 */
export function EventFormFields({
  event,
  formats,
  programs,
  requirements,
}: {
  event?: ProgramEvent;
  formats: { formatId: string; label: string }[];
  programs: { programId: string; name: string }[];
  requirements: Requirement[];
}) {
  const t = useTranslations("advisor.teamProgram.event");
  const start = berlinParts(event?.startsAt);
  const end = berlinParts(event?.endsAt);
  const [formatId, setFormatId] = useState(event?.formatId ?? "");
  const [venue, setVenue] = useState<EventVenue>(event?.venue ?? "onsite");
  const [audience, setAudience] = useState<EventAudience>(event?.audience ?? "all");
  const [host, setHost] = useState<EventHost>(event?.host ?? "us");
  const [mandatory, setMandatory] = useState(event?.mandatory ? "yes" : "no");
  const [makePublic, setMakePublic] = useState(Boolean(event?.publicStatus));
  const kind = audience === "internal" ? "internal" : host === "partner" ? "external" : "education";
  const counts = requirements.filter((entry) => (entry.formatId === null || entry.formatId === formatId) && (entry.eventKind === null || entry.eventKind === kind) && (entry.formatId !== null || entry.eventKind !== null));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
      <div className="grid gap-5">
        <label className="block">
          <span className={LABEL}>{t("title")}</span>
          <input name="title" required maxLength={160} defaultValue={event?.title ?? ""} className={INPUT} />
        </label>

        <div>
          <span className={LABEL}>{t("format")}</span>
          <input type="hidden" name="formatId" value={formatId} />
          <div role="group" aria-label={t("format")} className="flex flex-wrap gap-1.5">
            {formats.map((format) => (
              <button
                key={format.formatId}
                type="button"
                aria-pressed={formatId === format.formatId}
                onClick={() => setFormatId(formatId === format.formatId ? "" : format.formatId)}
                className={`inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm ${formatId === format.formatId ? "border-violet-500 bg-violet-50 font-semibold text-violet-900" : "border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50"}`}
              >
                {format.label}
              </button>
            ))}
            <a href="#formats" className="inline-flex min-h-10 items-center rounded-full border border-dashed border-violet-300 px-3.5 text-sm font-semibold text-violet-800">+ {t("newFormat")}</a>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className={LABEL}>{t("day")}</span>
            <input type="date" name="day" required defaultValue={start.day} className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>{t("start")}</span>
            <input type="time" name="startTime" defaultValue={start.time} className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>{t("end")}</span>
            <input type="time" name="endTime" defaultValue={end.time} className={INPUT} />
          </label>
        </div>

        <div>
          <span className={LABEL}>{t("where")}</span>
          <Chips name="venue" label={t("where")} value={venue} onChange={setVenue} options={[{ value: "onsite", label: t("venue.onsite") }, { value: "online", label: t("venue.online") }, { value: "hybrid", label: t("venue.hybrid") }]} />
          <label className="mt-2 block">
            <span className="sr-only">{venue === "online" ? t("linkLabel") : t("placeLabel")}</span>
            <input name="location" maxLength={200} defaultValue={event?.location ?? ""} placeholder={venue === "online" ? t("linkPlaceholder") : t("placePlaceholder")} className={INPUT} />
          </label>
        </div>

        <div>
          <span className={LABEL}>{t("forWhom")}</span>
          <Chips name="audience" label={t("forWhom")} value={audience} onChange={setAudience} options={[{ value: "all", label: t("audience.all") }, { value: "selected", label: t("audience.selected") }, { value: "internal", label: t("audience.internal") }]} />
          {audience === "internal" ? <span className={HINT}>{t("internalHint")}</span> : null}
          {audience === "selected" ? (
            programs.length === 0 ? (
              <span className={HINT}>{t("noTeams")}</span>
            ) : (
              <fieldset className="mt-2 flex flex-wrap gap-x-5">
                <legend className="sr-only">{t("audience.selected")}</legend>
                {programs.map((program) => (
                  <label key={program.programId} className="inline-flex min-h-11 items-center gap-2 text-[15px] text-slate-800">
                    <input type="checkbox" name="programId" value={program.programId} defaultChecked={event?.programIds?.includes(program.programId)} className="size-5" />
                    {program.name}
                  </label>
                ))}
              </fieldset>
            )
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <span className={LABEL}>{t("participation")}</span>
            <Chips name="mandatory" label={t("participation")} value={mandatory} onChange={setMandatory} options={[{ value: "yes", label: t("mandatory") }, { value: "no", label: t("optional") }]} />
          </div>
          <div>
            <span className={LABEL}>{t("host")}</span>
            <Chips name="host" label={t("host")} value={host} onChange={setHost} options={[{ value: "us", label: t("hostUs") }, { value: "partner", label: t("hostPartner") }]} />
          </div>
        </div>

        <label className="block">
          <span className={LABEL}>{t("notes")}</span>
          <textarea name="notes" rows={2} maxLength={2000} defaultValue={event?.notes ?? ""} className={`${INPUT} py-2`} />
        </label>
        <label className="block">
          <span className={LABEL}>{t("todos")}</span>
          <textarea name="todos" rows={2} maxLength={2000} defaultValue={event?.todos ?? ""} className={`${INPUT} py-2`} />
        </label>
        <label className="block">
          <span className={LABEL}>{t("internalNote")}</span>
          <input name="internalNote" maxLength={2000} defaultValue={event?.internalNote ?? ""} placeholder={t("internalNotePlaceholder")} className={INPUT} />
          <span className={HINT}>{t("internalNoteHint")}</span>
        </label>
      </div>

      <div className="grid gap-3">
        {!event ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[15px] font-semibold text-slate-950">{t("tasksTitle")}</p>
            <p className="mt-1 text-[13px] leading-5 text-slate-600">{t("tasksText")}</p>
            <label className="mt-2 flex min-h-11 items-center gap-2.5 text-[14px] text-slate-800">
              <input type="checkbox" name="orgaTask" value="yes" className="size-5" />
              {t("tasksChecklist")}
            </label>
          </div>
        ) : null}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[15px] font-semibold text-slate-950">{t("socialTitle")}</p>
          <p className="mt-1 text-[13px] leading-5 text-slate-600">{t("socialText")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[15px] font-semibold text-slate-950">{t("publicTitle")}</p>
          <input type="hidden" name="makePublic" value={audience === "internal" ? "no" : makePublic ? "yes" : "no"} />
          {audience === "internal" ? (
            <p className="mt-1 text-[13px] leading-5 text-slate-600">{t("publicInternal")}</p>
          ) : (
            <>
              <label className="mt-2 flex items-start gap-2.5 text-[14px] leading-5 text-slate-800">
                <input type="checkbox" checked={makePublic} onChange={(change) => setMakePublic(change.target.checked)} className="mt-0.5 size-5 shrink-0" />
                {t("publicCheck")}
              </label>
              {makePublic ? (
                <label className="mt-2 block">
                  <span className="mb-1 block text-[13px] font-semibold text-slate-900">{t("publicUrl")}</span>
                  <input type="url" name="publicUrl" pattern="https://.+" required defaultValue={event?.publicUrl ?? ""} placeholder="https://" className={INPUT} />
                </label>
              ) : null}
              {event?.publicStatus ? <p className="mt-2 text-[13px] font-semibold text-slate-700">{t(`publicStatus.${event.publicStatus}`)}</p> : null}
            </>
          )}
        </div>
        {requirements.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[15px] font-semibold text-slate-950">{t("fundingTitle")}</p>
            {counts.length === 0 ? (
              <p className="mt-1 text-[13px] leading-5 text-slate-600">{t("fundingNone")}</p>
            ) : (
              <ul className="mt-1 grid gap-1 text-[13.5px] text-slate-800">
                {counts.map((entry) => <li key={`${entry.grantName}-${entry.title}`}>{t("fundingCounts", { title: entry.title, grant: entry.grantName })}</li>)}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
