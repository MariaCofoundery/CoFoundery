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
  }>;
}) {
  const params = await searchParams;
  const invitationId = params.invitationId?.trim() ?? "";
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
        </section>
      </main>
    );
  }

  if (data.status !== "ready") {
    redirect("/advisor/dashboard");
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
