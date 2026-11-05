import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { saveProgramEventAction } from "@/features/advisor/teamProgramActions";
import type { ProgramEvent } from "@/features/advisor/teamProgramData";
import { EventFormFields } from "@/features/advisor/EventFormFields";
import { PlanEventList } from "@/features/advisor/PlanEventList";
import { SidePanel } from "@/features/ui/SidePanel";
import { SubmitButton } from "@/features/ui/SubmitButton";

type Requirement = { title: string; grantName: string; formatId: string | null; eventKind: "education" | "internal" | "external" | null };

/**
 * Das Seitenpanel fuer Termine (Entwurf 05.11.2026): ein neuer Termin, ein Termin aendern oder mehrere auf einmal
 * eintragen. Statt einer langen Formularseite bleibt der Kalender dahinter stehen; Speichern liegt unten fest.
 */
export async function EventSheet({
  kind,
  orgId,
  event,
  defaultDay,
  today,
  closeHref,
  formats,
  programs,
  requirements,
  formatsHref,
}: {
  kind: "new" | "edit" | "bulk";
  orgId: string;
  event: ProgramEvent | null;
  defaultDay: string;
  today: string;
  closeHref: string;
  formats: { formatId: string; label: string }[];
  programs: { programId: string; name: string }[];
  requirements: Requirement[];
  formatsHref: string;
}) {
  const t = await getTranslations("advisor.calendar.sheet");
  const tp = await getTranslations("advisor.teamProgram");

  if (kind === "bulk") {
    return (
      <SidePanel closeHref={closeHref} closeLabel={t("close")} titleId="sheet-title" eyebrow={t("bulkEyebrow")}>
        <div className="grid gap-4 px-5 pb-6 pt-2 sm:px-7">
          <h2 id="sheet-title" className="font-brand text-[26px] font-semibold leading-tight text-slate-950">{t("bulkTitle")}</h2>
          <p className="text-[14.5px] leading-6 text-slate-700">{tp("bulk.text")}</p>
          <PlanEventList orgId={orgId} today={today} formats={formats} />
        </div>
      </SidePanel>
    );
  }

  // Ein Termin, den es nicht mehr gibt, oeffnet als neuer - nie ein leeres Formular unter dem alten Namen.
  const existing = kind === "edit" ? event : null;
  return (
    <SidePanel
      closeHref={closeHref}
      closeLabel={t("close")}
      titleId="sheet-title"
      eyebrow={existing ? t("editEyebrow") : t("newEyebrow")}
      formAction={saveProgramEventAction}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <Link href={closeHref} className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100">{t("cancel")}</Link>
          <SubmitButton label={existing ? t("saveChanges") : tp("event.save")} pendingLabel="…" className="inline-flex min-h-[46px] items-center rounded-xl bg-[#6D49E0] px-6 text-[14.5px] font-semibold text-white hover:bg-[#5B36D6]" />
        </div>
      }
    >
      <h2 id="sheet-title" className="sr-only">{existing ? t("editTitle") : t("newTitle")}</h2>
      <input type="hidden" name="orgId" value={orgId} />
      {existing ? <input type="hidden" name="eventId" value={existing.eventId} /> : null}
      <EventFormFields key={existing?.eventId ?? "new"} event={existing ?? undefined} formats={formats} programs={programs} requirements={requirements} defaultDay={defaultDay} formatsHref={formatsHref} />
    </SidePanel>
  );
}
