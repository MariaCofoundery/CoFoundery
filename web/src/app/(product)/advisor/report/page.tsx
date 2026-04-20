import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { AdvisorReportProductView } from "@/features/reporting/AdvisorReportProductView";
import {
  getAdvisorReportPageData,
  saveAdvisorSectionImpulse,
} from "@/features/reporting/advisorReportPageData";
import {
  ADVISOR_IMPULSE_SECTION_ORDER,
  type AdvisorImpulseSectionKey,
} from "@/features/reporting/advisorSectionImpulses";

function isAdvisorImpulseSectionKey(value: string): value is AdvisorImpulseSectionKey {
  return (ADVISOR_IMPULSE_SECTION_ORDER as readonly string[]).includes(value);
}

export default async function AdvisorReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    invitationId?: string;
    saved?: string;
    debug?: string;
  }>;
}) {
  const params = await searchParams;
  const invitationId = params.invitationId?.trim() ?? "";
  const debug = params.debug === "1";
  if (!invitationId) {
    redirect("/advisor/dashboard");
  }

  const data = await getAdvisorReportPageData(invitationId);
  const savedSectionKey = isAdvisorImpulseSectionKey(params.saved ?? "")
    ? (params.saved as AdvisorImpulseSectionKey)
    : null;

  async function saveImpulseAction(formData: FormData) {
    "use server";

    const invitationId = String(formData.get("invitationId") ?? "").trim();
    const sectionKeyRaw = String(formData.get("sectionKey") ?? "").trim();
    const text = String(formData.get("text") ?? "");

    if (!invitationId || !isAdvisorImpulseSectionKey(sectionKeyRaw)) {
      redirect(`/advisor/report?invitationId=${encodeURIComponent(invitationId || "")}`);
    }

    const result = await saveAdvisorSectionImpulse({
      invitationId,
      sectionKey: sectionKeyRaw,
      text,
    });

    revalidatePath("/advisor/report");

    if (!result.ok) {
      redirect(`/advisor/report?invitationId=${encodeURIComponent(invitationId)}#advisor-impulses`);
    }

    redirect(
      `/advisor/report?invitationId=${encodeURIComponent(invitationId)}&saved=${encodeURIComponent(
        sectionKeyRaw
      )}#advisor-impulses`
    );
  }

  if (data.status === "not_authenticated") {
    redirect(`/login?next=/advisor/report?invitationId=${encodeURIComponent(invitationId)}`);
  }

  if (data.status === "forbidden" || data.status === "not_found") {
    redirect("/advisor/dashboard");
  }

  if (data.status === "missing_report") {
    if (debug) {
      console.info("[advisor-report-debug] render_state", data.debugMeta);
    }
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16 md:px-10">
        <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-10 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Advisor Report</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">
            Report noch nicht verfügbar
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">
            Für dieses Team liegt noch kein renderbarer Advisor-Report vor. Sobald der Founder-Report
            vollständig erzeugt wurde, kannst du hier direkt mit dem Advisor-Report weiterarbeiten.
          </p>
          {debug && data.debugMeta ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-xs leading-6 text-slate-700">
              <p className="font-semibold text-slate-900">Debug · Advisor Report Loader</p>
              <p>invitationId: {data.debugMeta.requestedInvitationId}</p>
              <p>userId: {data.debugMeta.userId ?? "-"}</p>
              <p>relationshipId: {data.debugMeta.relationshipId ?? "-"}</p>
              <p>
                accessBeforeLegacySync: {String(data.debugMeta.accessBeforeLegacySync)} · hasAccess:{" "}
                {String(data.debugMeta.hasAccess)}
              </p>
              <p>
                legacySyncAttempted: {String(data.debugMeta.legacySyncAttempted)} · legacySyncResult:{" "}
                {data.debugMeta.legacySyncResult}
              </p>
              <p>reportRunId: {data.debugMeta.reportRunId ?? "-"}</p>
              <p>snapshotFounderScoring: {String(data.debugMeta.snapshotFounderScoring)}</p>
              <p>scoringSource: {data.debugMeta.scoringSource}</p>
              <p>finalState: {data.debugMeta.finalState}</p>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  if (data.status !== "ready") {
    redirect("/advisor/dashboard");
  }

  if (debug) {
    console.info("[advisor-report-debug] render_state", data.debugMeta);
  }

  const reportHref = `/advisor/report?invitationId=${encodeURIComponent(data.invitationId)}`;

  return (
    <>
      <ProductNavigationOverride
        activeView="advisor"
        contextLabel="Advisor-Kontext"
        matchingHref={reportHref}
        workbookHref={data.workbookHref}
      />
      {debug && data.debugMeta ? (
        <div className="mx-auto mt-6 w-full max-w-6xl px-6 md:px-10 xl:px-12">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-xs leading-6 text-slate-700">
            <p className="font-semibold text-slate-900">Debug · Advisor Report Loader</p>
            <p>url: /advisor/report?invitationId={data.invitationId}</p>
            <p>invitationId: {data.debugMeta.requestedInvitationId}</p>
            <p>userId: {data.debugMeta.userId ?? "-"}</p>
            <p>relationshipId: {data.debugMeta.relationshipId ?? "-"}</p>
            <p>
              accessBeforeLegacySync: {String(data.debugMeta.accessBeforeLegacySync)} · hasAccess:{" "}
              {String(data.debugMeta.hasAccess)}
            </p>
            <p>
              legacySyncAttempted: {String(data.debugMeta.legacySyncAttempted)} · legacySyncResult:{" "}
              {data.debugMeta.legacySyncResult}
            </p>
            <p>reportRunId: {data.debugMeta.reportRunId ?? "-"}</p>
            <p>snapshotFounderScoring: {String(data.debugMeta.snapshotFounderScoring)}</p>
            <p>scoringSource: {data.debugMeta.scoringSource}</p>
            <p>finalState: {data.debugMeta.finalState}</p>
            <p>matchingHref: {reportHref}</p>
            <p>workbookHref: {data.workbookHref}</p>
          </div>
        </div>
      ) : null}
      <AdvisorReportProductView
        invitationId={data.invitationId}
        participantAName={data.participantAName}
        participantBName={data.participantBName}
        report={data.report}
        impulses={data.impulses}
        workbookHref={data.workbookHref}
        snapshotHref={data.snapshotHref}
        savedSectionKey={savedSectionKey}
        saveAction={saveImpulseAction}
      />
    </>
  );
}
