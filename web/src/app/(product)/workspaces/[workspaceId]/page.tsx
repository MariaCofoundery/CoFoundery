import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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

type WorkspaceT = Awaited<ReturnType<typeof getTranslations>>;

const PRIMARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[color:var(--brand-primary-hover)]";
const FIELD_CLASS =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

const AGREEMENT_MODULES: Array<{
  key: MatchingWorkspaceAgreementSectionKey;
}> = [
  { key: "roles" },
  { key: "commitment" },
  { key: "decisions" },
  { key: "conflict" },
  { key: "communication" },
  { key: "equity_conversation" },
  { key: "next_90_days" },
];

function searchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function agreementResultUrl(
  workspaceId: string,
  result: { ok: boolean; message?: string },
  fallbackMessage: string
) {
  const params = new URLSearchParams();
  params.set("agreementMessage", result.message ?? fallbackMessage);
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

function UnavailableState({ t }: { t: WorkspaceT }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff,#f8fafc)] px-5 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-8">
        <Link
          href="/discovery/intros"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          {t("agreement.unavailable.back")}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          {t("agreement.unavailable.title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t("agreement.unavailable.text")}
        </p>
      </section>
    </main>
  );
}

function formatUpdatedAt(value: string | null, t: WorkspaceT) {
  if (!value) return t("agreement.editor.neverSaved");
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function AgreementEditor({
  summary,
  saveSection,
  t,
}: {
  summary: MatchingWorkspaceAgreementSummary;
  saveSection: (formData: FormData) => Promise<void>;
  t: WorkspaceT;
}) {
  const agreement = summary.agreement;

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {t("agreement.editor.eyebrow")}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
        {t("agreement.editor.title")}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        {t("agreement.editor.text")}
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
                  <h3 className="text-lg font-semibold text-slate-950">
                    {t(`agreement.editor.sections.${module.key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t(`agreement.editor.sections.${module.key}.description`)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    hasContent ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {hasContent ? t("agreement.editor.saved") : t("agreement.editor.ready")}
                </span>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <label>
                  <span className="text-sm font-semibold text-slate-950">
                    {t("agreement.editor.notes")}
                  </span>
                  <textarea
                    name="notes"
                    defaultValue={section.notes}
                    rows={5}
                    maxLength={4000}
                    className={FIELD_CLASS}
                    placeholder={t("agreement.editor.notesPlaceholder")}
                  />
                </label>
                <label>
                  <span className="text-sm font-semibold text-slate-950">
                    {t("agreement.editor.agreement")}
                  </span>
                  <textarea
                    name="agreement"
                    defaultValue={section.agreement}
                    rows={5}
                    maxLength={4000}
                    className={FIELD_CLASS}
                    placeholder={t("agreement.editor.agreementPlaceholder")}
                  />
                </label>
              </div>
              <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">
                  {t("agreement.editor.updatedAt", { value: formatUpdatedAt(section.updatedAt, t) })}
                </p>
                <button type="submit" className={PRIMARY_CTA_CLASS}>
                  {t("agreement.editor.saveSection")}
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
  const t = await getTranslations("workspace");
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
    return <UnavailableState t={t} />;
  }

  const fallbackResultMessage = t("agreement.fallbackResult");

  async function saveAgreementSection(formData: FormData) {
    "use server";
    const result = await saveMatchingWorkspaceAgreementSectionAction(workspaceId, formData);
    redirect(agreementResultUrl(workspaceId, result, fallbackResultMessage));
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
            {t("agreement.header.back")}
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t("agreement.header.eyebrow")}
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
            {t("agreement.header.title")}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            {t("agreement.header.text")}
          </p>
        </header>

        <PageMessage message={message} ok={ok} />

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {t("agreement.status.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            {t("agreement.status.title")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-emerald-950">
            {t("agreement.status.draft")}
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold leading-6 text-amber-950">
            {t("agreement.status.v1Notice")}
          </p>
        </section>

        <AgreementEditor summary={summary} saveSection={saveAgreementSection} t={t} />
      </div>
    </main>
  );
}
