import Link from "next/link";
import { AdvisorReportPreview } from "@/features/reporting/AdvisorReportPreview";
import type { AdvisorReportData } from "@/features/reporting/advisor-report/advisorReportTypes";
import {
  ADVISOR_IMPULSE_SECTION_META,
  ADVISOR_IMPULSE_SECTION_ORDER,
  type AdvisorImpulseSectionKey,
  type AdvisorSectionImpulse,
} from "@/features/reporting/advisorSectionImpulses";

type Props = {
  invitationId: string;
  participantAName: string;
  participantBName: string;
  report: AdvisorReportData;
  impulses: Record<AdvisorImpulseSectionKey, AdvisorSectionImpulse | null>;
  workbookHref: string;
  snapshotHref: string;
  savedSectionKey: AdvisorImpulseSectionKey | null;
  saveAction: (formData: FormData) => void | Promise<void>;
};

function formatSavedLabel(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdvisorReportProductView({
  invitationId,
  participantAName,
  participantBName,
  report,
  impulses,
  workbookHref,
  snapshotHref,
  savedSectionKey,
  saveAction,
}: Props) {
  const topActions = (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <Link
        href="/advisor/dashboard"
        className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
      >
        Zurück zum Advisor-Dashboard
      </Link>
      <div className="flex flex-wrap gap-3">
        <Link
          href={workbookHref}
          className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          Workbook öffnen
        </Link>
        <Link
          href={snapshotHref}
          className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          Snapshot exportieren
        </Link>
      </div>
    </div>
  );

  const appendix = (
    <section id="advisor-impulses" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Advisor-Impulse</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">Kurze Impulse pro Abschnitt</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Halte hier knappe Beobachtungen oder Moderationshinweise fest. Pro Abschnitt gibt es genau
          einen editierbaren Advisor-Impuls. Leere Felder entfernen den Eintrag wieder.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {ADVISOR_IMPULSE_SECTION_ORDER.map((sectionKey) => {
          const meta = ADVISOR_IMPULSE_SECTION_META[sectionKey];
          const impulse = impulses[sectionKey];
          const savedLabel = formatSavedLabel(impulse?.updatedAt ?? null);
          return (
            <form
              key={sectionKey}
              action={saveAction}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <input type="hidden" name="invitationId" value={invitationId} />
              <input type="hidden" name="sectionKey" value={sectionKey} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">{meta.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{meta.description}</p>
                </div>
                {savedSectionKey === sectionKey ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
                    Gespeichert
                  </span>
                ) : null}
              </div>
              <textarea
                name="text"
                defaultValue={impulse?.text ?? ""}
                placeholder={meta.placeholder}
                className="mt-4 min-h-[132px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs leading-6 text-slate-500">
                  {savedLabel ? `Zuletzt gespeichert: ${savedLabel}` : "Noch kein Impuls hinterlegt"}
                </p>
                <button
                  type="submit"
                  className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Speichern
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </section>
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12 md:px-10 xl:px-12">
      <AdvisorReportPreview
        participantAName={participantAName}
        participantBName={participantBName}
        report={report}
        title={`${participantAName} + ${participantBName}`}
        eyebrow="Advisor Report"
        topActions={topActions}
        appendix={appendix}
      />
    </main>
  );
}
