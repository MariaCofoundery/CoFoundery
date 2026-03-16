import Link from "next/link";
import { notFound } from "next/navigation";
import { FounderAlignmentWorkbookClient } from "@/features/reporting/FounderAlignmentWorkbookClient";
import { DebugConversationGuidePreview } from "@/features/reporting/DebugConversationGuidePreview";
import { DebugFounderPreviewModeSwitch } from "@/features/reporting/DebugFounderPreviewModeSwitch";
import { DebugWorkbookViewerSwitch } from "@/features/reporting/DebugWorkbookViewerSwitch";
import {
  getConversationGuidePreviewState,
  getFounderPreviewScenarioMeta,
  getWorkbookPreviewState,
  resolveFounderPreviewMode,
  resolveFounderPreviewViewerRole,
  type FounderPreviewMode,
} from "@/features/reporting/debugFounderPreviewData";

type PageSearchParams = {
  mode?: string;
  viewer?: string;
};

export default async function FounderAlignmentPreviewPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const mode = resolveFounderPreviewMode(params.mode, "pre_founder");
  const viewer = resolveFounderPreviewViewerRole(params.viewer, mode);
  const scenario = getFounderPreviewScenarioMeta(mode);
  const conversationPreview = getConversationGuidePreviewState(mode);
  const workbookPreview = getWorkbookPreviewState(mode, viewer);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#fbf8ff_24%,#ffffff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <object
                data="/cofoundery-align-logo.svg"
                type="image/svg+xml"
                aria-label="CoFoundery Align Logo"
                className="h-10 w-auto max-w-[190px]"
              />
              <p className="mt-5 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Founder Alignment Debug
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                Zentrale Preview fuer Report, Gespraechsleitfaden und Workbook
              </h1>
              <p className="mt-4 max-w-3xl text-[15px] leading-8 text-slate-700">
                Diese Debug-Oberflaeche simuliert realistische Founder-Alignment-Szenarien mit reinem
                Mock-State. Es werden keine Einladungen benoetigt, keine Supabase-Daten geladen und keine
                Schreibvorgaenge ausgeloest.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]">
              <InfoCard label="Scenario" value={scenario.label} accent="primary" />
              <InfoCard label="Team Context" value={scenario.teamContextLabel} accent="accent" />
              <InfoCard
                label="Module"
                value={scenario.valuesCompleted ? "Base + Values" : "Base only"}
              />
              <InfoCard
                label="Advisor"
                value={scenario.advisorActive ? `Aktiv: ${scenario.advisorName}` : "Nicht beteiligt"}
              />
            </div>
          </div>

          <div className="mt-6">
            <DebugFounderPreviewModeSwitch
              pathname="/debug/founder-alignment-preview"
              currentMode={mode as FounderPreviewMode}
            />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Szenario-Notiz</p>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">{scenario.description}</p>
          </div>

          <nav className="mt-6 flex flex-wrap gap-3 print:hidden">
            <AnchorLink href="#matching-preview" label="Matching Report Preview" />
            <AnchorLink href="#conversation-preview" label="Gespraechsleitfaden Preview" />
            <AnchorLink href="#workbook-preview" label="Workbook Preview" />
          </nav>
        </section>

        <section id="matching-preview" className="mt-8 scroll-mt-8">
          <SectionHeader
            eyebrow="Preview 1"
            title="Matching Report Preview"
            description="Dieser Bereich rendert bewusst denselben Founder-Alignment-Report wie der neue Debug-Report-Einstieg, damit Preview, Gespraechsleitfaden und Workbook auf derselben Report-Familie basieren."
          />
          <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <iframe
              title="Founder Alignment Report Preview"
              src={`/debug/founder-report-preview?mode=${mode}`}
              className="min-h-[1600px] w-full bg-white"
            />
          </div>
        </section>

        <section id="conversation-preview" className="mt-10 scroll-mt-8">
          <SectionHeader
            eyebrow="Preview 2"
            title="Gespraechsleitfaden Preview"
            description="Der Leitfaden uebernimmt denselben Mock-Kontext und zeigt dadurch direkt, wie sich Teamkontext und Werte auf die Fragen auswirken."
          />
          <DebugConversationGuidePreview
            embedded
            preview={conversationPreview}
            workbookHref="#workbook-preview"
          />
        </section>

        <section id="workbook-preview" className="mt-10 scroll-mt-8">
          <SectionHeader
            eyebrow="Preview 3"
            title="Workbook Preview"
            description="Das Workbook wird mit Mock-Payload geladen, ohne Einladung, ohne Datenbank und ohne aktive Save-Logik. Im Advisor-Szenario sind Hinweise und Status direkt sichtbar."
          />
          <div className="mb-4">
            <DebugWorkbookViewerSwitch
              pathname="/debug/founder-alignment-preview"
              currentMode={mode as FounderPreviewMode}
              currentViewer={viewer}
            />
          </div>
          <FounderAlignmentWorkbookClient
            invitationId={null}
            teamContext={workbookPreview.teamContext}
            founderAName={workbookPreview.founderAName}
            founderBName={workbookPreview.founderBName}
            currentUserRole={workbookPreview.currentUserRole}
            initialWorkbook={workbookPreview.initialWorkbook}
            highlights={workbookPreview.highlights}
            advisorInvite={workbookPreview.advisorInvite}
            advisorToken={null}
            showValuesStep={workbookPreview.showValuesStep}
            canSave={false}
            persisted={false}
            updatedAt={null}
            source="mock"
            storedTeamContext={null}
            hasTeamContextMismatch={false}
            reportHeadline={workbookPreview.reportHeadline}
          />
        </section>

        <section className="mt-10 rounded-[28px] border border-slate-200/80 bg-white/92 p-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Weitere Einzel-Previews</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href={`/debug/workbook-advisor-preview?mode=${mode}&viewer=${viewer}`}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Workbook Solo Preview
            </Link>
            <Link
              href={`/debug/conversation-guide-preview?mode=${mode}`}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Guide Solo Preview
            </Link>
            <Link
              href={`/debug/founder-report-preview?mode=${mode}`}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Report Solo Preview
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 rounded-[24px] border border-slate-200/80 bg-white/88 px-6 py-5">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-700">{description}</p>
    </div>
  );
}

function InfoCard({
  label,
  value,
  accent = "neutral",
}: {
  label: string;
  value: string;
  accent?: "primary" | "accent" | "neutral";
}) {
  const toneClassName =
    accent === "primary"
      ? "border-[color:var(--brand-primary)]/22 bg-[color:var(--brand-primary)]/7"
      : accent === "accent"
        ? "border-[color:var(--brand-accent)]/16 bg-[color:var(--brand-accent)]/7"
        : "border-slate-200/80 bg-slate-50/70";

  return (
    <article className={`rounded-2xl border p-4 ${toneClassName}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{value}</p>
    </article>
  );
}

function AnchorLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      {label}
    </a>
  );
}
