import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { saveMatchingWorkspaceAgreementSectionAction } from "@/features/matchingCore/matchingWorkspaceAgreementActions";
import { createOrGetMatchingWorkspaceAgreement } from "@/features/matchingCore/matchingWorkspaceAgreementData";
import {
  type MatchingWorkspaceAgreementSectionKey,
  type MatchingWorkspaceAgreementSummary,
} from "@/features/matchingCore/matchingWorkspaceAgreementTypes";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
  searchParams?: Promise<{
    agreementMessage?: string | string[];
    agreementOk?: string | string[];
  }>;
};

const PRIMARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[color:var(--brand-primary-hover)]";
const FIELD_CLASS =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

const AGREEMENT_MODULES: Array<{
  key: MatchingWorkspaceAgreementSectionKey;
  title: string;
  description: string;
}> = [
  {
    key: "roles",
    title: "Rollen & Verantwortlichkeiten",
    description: "Haltet fest, wer welche Themen führt und wo frühe Mitsicht wichtig ist.",
  },
  {
    key: "commitment",
    title: "Zeit & Commitment",
    description: "Beschreibt, was realistisch verfügbar ist und woran ihr Überlastung früh merkt.",
  },
  {
    key: "decisions",
    title: "Entscheidungen",
    description: "Klärt, was eine Person allein entscheiden darf und wann beide gebraucht werden.",
  },
  {
    key: "conflict",
    title: "Konflikt & Klärung",
    description: "Legt fest, wie ihr Spannungen früh, fair und handhabbar ansprecht.",
  },
  {
    key: "communication",
    title: "Kommunikation",
    description: "Definiert, wie Wichtiges sichtbar bleibt, bevor es im Alltag untergeht.",
  },
  {
    key: "equity_conversation",
    title: "Equity-Gespräch",
    description: "Sammelt Fragen zu Beiträgen, Risiken und Erwartungen, ohne sie vorschnell zu finalisieren.",
  },
  {
    key: "next_90_days",
    title: "Nächste 90 Tage",
    description: "Haltet fest, was Vorrang hat, was liegen bleibt und woran ihr Fortschritt erkennt.",
  },
];

function searchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function agreementResultUrl(workspaceId: string, result: { ok: boolean; message?: string }) {
  const params = new URLSearchParams();
  params.set("agreementMessage", result.message ?? "Das Operating Agreement wurde verarbeitet.");
  params.set("agreementOk", result.ok ? "1" : "0");
  return `/workspaces/${workspaceId}?${params.toString()}`;
}

function PageMessage({ message, ok }: { message: string | null; ok: boolean }) {
  if (!message) {
    return null;
  }

  return (
    <section
      className={`rounded-3xl border p-4 ${
        ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <p className={`text-sm font-semibold ${ok ? "text-emerald-900" : "text-amber-900"}`}>
        {message}
      </p>
    </section>
  );
}

function UnavailableState() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff,#f8fafc)] px-5 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-8">
        <Link
          href="/discovery/intros"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Zurück zu meinen Intros
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Dieser Arbeitsraum ist aktuell nicht verfügbar.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Der Arbeitsraum existiert nicht, gehört nicht zu deinem Account oder ist nicht mehr
          verfügbar. Private Details werden hier bewusst nicht angezeigt.
        </p>
      </section>
    </main>
  );
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "Noch nicht gespeichert";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function AgreementEditor({
  summary,
  saveSection,
}: {
  summary: MatchingWorkspaceAgreementSummary;
  saveSection: (formData: FormData) => Promise<void>;
}) {
  const agreement = summary.agreement;

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Arbeitsdokument
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
        Euer Operating Agreement
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        Haltet fest, wie ihr zusammenarbeiten, entscheiden und mit Spannungen umgehen wollt.
      </p>
      <div className="mt-5 grid gap-5">
        {AGREEMENT_MODULES.map((module) => {
          const section = agreement?.sections[module.key] ?? {
            notes: "",
            agreement: "",
            updatedAt: null,
          };
          const hasContent =
            Boolean(section?.notes.trim()) || Boolean(section?.agreement.trim());

          return (
            <form
              key={module.key}
              action={saveSection}
              className="rounded-3xl border border-slate-200 bg-white p-5"
            >
              <input type="hidden" name="sectionKey" value={module.key} />
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{module.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {module.description}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    hasContent ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {hasContent ? "Angelegt" : "Bereit"}
                </span>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <label>
                  <span className="text-sm font-semibold text-slate-950">Notizen</span>
                  <textarea
                    name="notes"
                    defaultValue={section.notes}
                    rows={5}
                    maxLength={4000}
                    className={FIELD_CLASS}
                    placeholder="Gedanken, offene Punkte oder Beispiele aus eurem Gespräch."
                  />
                </label>
                <label>
                  <span className="text-sm font-semibold text-slate-950">Vereinbarung</span>
                  <textarea
                    name="agreement"
                    defaultValue={section.agreement}
                    rows={5}
                    maxLength={4000}
                    className={FIELD_CLASS}
                    placeholder="Was soll ab jetzt zwischen euch gelten?"
                  />
                </label>
              </div>
              <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">
                  Zuletzt aktualisiert: {formatUpdatedAt(section.updatedAt)}
                </p>
                <button type="submit" className={PRIMARY_CTA_CLASS}>
                  Section speichern
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </section>
  );
}

export default async function MatchingWorkspacePage({ params, searchParams }: PageProps) {
  const { workspaceId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/workspaces/${workspaceId}`)}`);
  }

  let summary: MatchingWorkspaceAgreementSummary | null = null;
  try {
    summary = await createOrGetMatchingWorkspaceAgreement({
      workspaceId,
      userId: user.id,
    });
  } catch {
    summary = null;
  }

  if (!summary?.agreement) {
    return <UnavailableState />;
  }

  async function saveAgreementSection(formData: FormData) {
    "use server";
    const result = await saveMatchingWorkspaceAgreementSectionAction(workspaceId, formData);
    redirect(agreementResultUrl(workspaceId, result));
  }

  const message = searchParamValue(resolvedSearchParams.agreementMessage) ?? null;
  const ok = searchParamValue(resolvedSearchParams.agreementOk) !== "0";
  const reportHref = `/matching/${summary.workspace.matchingSessionId}/report`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
      <ProductNavigationOverride matchingHref={reportHref} workbookHref={`/workspaces/${workspaceId}`} />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)] backdrop-blur md:p-7">
          <Link href={reportHref} className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Zurück zum Dynamik-Report
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Matching Workspace
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
            Euer Operating Agreement
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            Haltet fest, wie ihr zusammenarbeiten, entscheiden und mit Spannungen umgehen wollt.
            Es ist ein Arbeitsdokument, kein Vertrag.
          </p>
        </header>

        <PageMessage message={message} ok={ok} />

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Status
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Arbeitsraum vorbereitet
          </h2>
          <p className="mt-3 text-sm leading-6 text-emerald-950">
            Agreement-Status: Entwurf
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold leading-6 text-amber-950">
            In diesem V1-Arbeitsraum wird noch nichts finalisiert: keine Advisor-Freigabe, kein
            Export, keine Versionierung und keine Änderung am alten invitation-basierten Workbook.
          </p>
        </section>

        <AgreementEditor summary={summary} saveSection={saveAgreementSection} />
      </div>
    </main>
  );
}
