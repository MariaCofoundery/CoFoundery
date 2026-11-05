"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { EventAudience, EventHost, EventVenue, ProgramEvent } from "@/features/advisor/teamProgramData";
import { OptionalField, SECTION_TITLE, Segmented, Switch, TILE, TILE_INPUT, TILE_LABEL } from "@/features/ui/FormControls";

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

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

/**
 * Ein Termin als Formular im Seitenpanel (Entwurf vom 05.11.2026): der Titel gross, dann Format, Wann, Wo, Fuer wen,
 * Pflicht und Veranstalter - und "Was dranhaengt": die Orga-Checkliste im Teamraum, Posts, der Event-Kalender und die
 * Foerderauflage, jedes einzeln zu- oder abschaltbar. Hinweise und Notizen erscheinen auf Wunsch.
 */
export function EventFormFields({
  event,
  formats,
  programs,
  requirements,
  defaultDay = "",
  formatsHref = "#",
}: {
  event?: ProgramEvent;
  formats: { formatId: string; label: string }[];
  programs: { programId: string; name: string }[];
  requirements: Requirement[];
  /** Vorbelegter Tag, wenn man im Kalender auf einen Tag klickt. */
  defaultDay?: string;
  /** Wohin "+ Neues Format" fuehrt (die Formate im Kalender). */
  formatsHref?: string;
}) {
  const t = useTranslations("advisor.teamProgram.event");
  const tc = useTranslations("advisor.calendar.form");
  const start = berlinParts(event?.startsAt);
  const end = berlinParts(event?.endsAt);
  const [formatId, setFormatId] = useState(event?.formatId ?? "");
  const [venue, setVenue] = useState<EventVenue>(event?.venue ?? "onsite");
  const [audience, setAudience] = useState<EventAudience>(event?.audience ?? "all");
  const [host, setHost] = useState<EventHost>(event?.host ?? "us");
  const [mandatory, setMandatory] = useState(Boolean(event?.mandatory));
  const [checklist, setChecklist] = useState(false);
  const [makePublic, setMakePublic] = useState(Boolean(event?.publicStatus));
  const [chosenTeams, setChosenTeams] = useState<string[]>(event?.programIds ?? []);
  const internal = audience === "internal";
  const kind = internal ? "internal" : host === "partner" ? "external" : "education";
  const counts = requirements.filter((entry) => (entry.formatId === null || entry.formatId === formatId) && (entry.eventKind === null || entry.eventKind === kind) && (entry.formatId !== null || entry.eventKind !== null));

  return (
    <div className="grid gap-6 px-5 pb-6 pt-2 sm:px-7">
      <label className="block">
        <span className="sr-only">{t("title")}</span>
        <input
          name="title"
          required
          maxLength={160}
          defaultValue={event?.title ?? ""}
          placeholder={tc("titlePlaceholder")}
          className="font-brand w-full border-0 border-b-2 border-slate-200 bg-transparent pb-2.5 pt-1 text-[28px] font-semibold leading-tight text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-violet-500"
        />
      </label>

      <div className="grid gap-2.5">
        <span className="text-[13px] font-bold text-slate-700">{t("format")}</span>
        <input type="hidden" name="formatId" value={formatId} />
        <div role="group" aria-label={t("format")} className="flex flex-wrap gap-2">
          {formats.map((format) => (
            <button
              key={format.formatId}
              type="button"
              aria-pressed={formatId === format.formatId}
              onClick={() => setFormatId(formatId === format.formatId ? "" : format.formatId)}
              className={`inline-flex min-h-10 items-center rounded-full border-[1.5px] px-3.5 text-[13.5px] font-semibold transition ${formatId === format.formatId ? "border-violet-500 bg-violet-50 text-violet-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {format.label}
            </button>
          ))}
          <a href={formatsHref} className="inline-flex min-h-10 items-center rounded-full border-[1.5px] border-dashed border-violet-300 px-3.5 text-[13.5px] font-bold text-violet-800">+ {t("newFormat")}</a>
        </div>
      </div>

      <div className="grid gap-2.5">
        <span className={SECTION_TITLE}>
          <span className="text-violet-700"><Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon></span>
          {tc("when")}
        </span>
        <div className="grid gap-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className={TILE}>
            <span className={TILE_LABEL}>{t("day")}</span>
            <input type="date" name="day" required defaultValue={start.day || defaultDay} className={TILE_INPUT} />
          </label>
          <label className={TILE}>
            <span className={TILE_LABEL}>{t("start")}</span>
            <input type="time" name="startTime" defaultValue={start.time} className={TILE_INPUT} />
          </label>
          <label className={TILE}>
            <span className={TILE_LABEL}>{t("end")}</span>
            <input type="time" name="endTime" defaultValue={end.time} className={TILE_INPUT} />
          </label>
        </div>
      </div>

      <div className="grid gap-2.5">
        <span className={SECTION_TITLE}>
          <span className="text-violet-700"><Icon><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Icon></span>
          {t("where")}
        </span>
        <Segmented name="venue" label={t("where")} value={venue} onChange={setVenue} options={[{ value: "onsite", label: t("venue.onsite") }, { value: "online", label: t("venue.online") }, { value: "hybrid", label: t("venue.hybrid") }]} />
        <label className={TILE}>
          <span className={TILE_LABEL}>{venue === "online" ? t("linkLabel") : t("placeLabel")}</span>
          <input name="location" maxLength={200} defaultValue={event?.location ?? ""} placeholder={venue === "online" ? t("linkPlaceholder") : t("placePlaceholder")} className={TILE_INPUT} />
        </label>
      </div>

      <div className="grid gap-2.5">
        <span className={SECTION_TITLE}>
          <span className="text-violet-700"><Icon><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></Icon></span>
          {t("forWhom")}
        </span>
        <Segmented name="audience" label={t("forWhom")} value={audience} onChange={setAudience} options={[{ value: "all", label: tc("audienceAll") }, { value: "selected", label: tc("audienceSelected") }, { value: "internal", label: tc("audienceInternal") }]} />
        {internal ? <span className="text-[13px] leading-5 text-slate-600">{t("internalHint")}</span> : null}
        {audience === "selected" ? (
          programs.length === 0 ? (
            <span className="text-[13px] leading-5 text-slate-600">{t("noTeams")}</span>
          ) : (
            <div role="group" aria-label={t("audience.selected")} className="flex flex-wrap gap-2">
              {programs.map((program) => {
                const on = chosenTeams.includes(program.programId);
                return (
                  <label key={program.programId} className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3.5 text-[13.5px] font-semibold ${on ? "border-violet-500 bg-violet-50 text-violet-900" : "border-slate-300 bg-white text-slate-700"}`}>
                    <input type="checkbox" name="programId" value={program.programId} checked={on} onChange={() => setChosenTeams(on ? chosenTeams.filter((id) => id !== program.programId) : [...chosenTeams, program.programId])} className="size-4" />
                    {program.name}
                  </label>
                );
              })}
            </div>
          )
        ) : null}
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-[14px] bg-[#F4F5FB]">
            <Switch name="mandatory" label={t("mandatory")} checked={mandatory} onChange={setMandatory} />
          </div>
          <Segmented name="host" label={t("host")} value={host} onChange={setHost} options={[{ value: "us", label: tc("hostUs") }, { value: "partner", label: tc("hostPartner") }]} className="self-stretch" />
        </div>
      </div>

      <div className="grid gap-2.5">
        <span className={SECTION_TITLE}>
          <span className="text-violet-700"><Icon><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Icon></span>
          {tc("attached")}
        </span>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          {!event ? (
            <Switch
              name="orgaTask"
              label={tc("checklistTitle")}
              hint={tc("checklistHint")}
              checked={checklist}
              onChange={setChecklist}
              icon={<Icon><rect x="3" y="3" width="18" height="18" rx="4" /><path d="m8 12 3 3 5-6" /></Icon>}
            />
          ) : null}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-pink-100 text-pink-800"><Icon><path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6l-6 4H4a1 1 0 0 0-1 1z" /><path d="M17 8a5 5 0 0 1 0 8" /></Icon></span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[14.5px] font-semibold text-slate-950">{tc("socialTitle")}</span>
              <span className="text-[12.5px] leading-[1.4] text-slate-600">{internal ? tc("socialInternal") : tc("socialHint")}</span>
            </span>
          </div>
          {internal ? (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-sky-100 text-sky-800"><Icon><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Icon></span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[14.5px] font-semibold text-slate-950">{t("publicTitle")}</span>
                <span className="text-[12.5px] leading-[1.4] text-slate-600">{t("publicInternal")}</span>
              </span>
              <input type="hidden" name="makePublic" value="no" />
            </div>
          ) : (
            <div>
              <Switch
                name="makePublic"
                label={tc("publicTitle")}
                hint={tc("publicHint")}
                checked={makePublic}
                onChange={setMakePublic}
                tone="sky"
                icon={<Icon><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Icon>}
              />
              {makePublic ? (
                <label className={`${TILE} mx-4 mb-3.5 ml-[4.25rem]`}>
                  <span className={TILE_LABEL}>{t("publicUrl")}</span>
                  <input type="url" name="publicUrl" pattern="https://.+" required defaultValue={event?.publicUrl ?? ""} placeholder="https://" className={TILE_INPUT} />
                </label>
              ) : null}
              {event?.publicStatus ? <p className="mb-3 ml-[4.25rem] text-[13px] font-semibold text-slate-700">{t(`publicStatus.${event.publicStatus}`)}</p> : null}
            </div>
          )}
          {requirements.length > 0 ? (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-emerald-100 text-emerald-800"><Icon><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="m9 15 2 2 4-4" /></Icon></span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[14.5px] font-semibold text-slate-950">{t("fundingTitle")}</span>
                <span className="text-[12.5px] leading-[1.4] text-slate-600">
                  {counts.length === 0 ? t("fundingNone") : counts.map((entry) => t("fundingCounts", { title: entry.title, grant: entry.grantName })).join(" · ")}
                </span>
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-2.5">
        <div className="contents">
          <OptionalField label={t("notes")} startOpen={Boolean(event?.notes)}>
            <label className={`${TILE} w-full`}>
              <span className={TILE_LABEL}>{t("notes")}</span>
              <textarea name="notes" rows={2} maxLength={2000} defaultValue={event?.notes ?? ""} className={`${TILE_INPUT} resize-y font-normal`} />
            </label>
          </OptionalField>
          <OptionalField label={t("todos")} startOpen={Boolean(event?.todos)}>
            <label className={`${TILE} w-full`}>
              <span className={TILE_LABEL}>{t("todos")}</span>
              <textarea name="todos" rows={2} maxLength={2000} defaultValue={event?.todos ?? ""} className={`${TILE_INPUT} resize-y font-normal`} />
            </label>
          </OptionalField>
          <OptionalField label={t("internalNote")} startOpen={Boolean(event?.internalNote)}>
            <label className={`${TILE} w-full bg-amber-50`}>
              <span className="text-xs font-semibold text-amber-900">{t("internalNote")}</span>
              <input name="internalNote" maxLength={2000} defaultValue={event?.internalNote ?? ""} placeholder={t("internalNotePlaceholder")} className={TILE_INPUT} />
              <span className="text-xs text-amber-900">{t("internalNoteHint")}</span>
            </label>
          </OptionalField>
        </div>
      </div>
    </div>
  );
}
