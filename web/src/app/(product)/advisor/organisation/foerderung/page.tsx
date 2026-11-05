import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { FundingReportView } from "@/features/advisor/OrgFunding";
import { PrintButton } from "@/features/teams/PrintButton";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { fundingReportFor } from "./fundingReportSource";

const UUID = /^[0-9a-f-]{36}$/;

/**
 * Der Sachbericht zu einer Foerderung: druckbar (oder als PDF speichern), aktuell oder als
 * festgehaltener Stand. Nur Zaehlungen gegen die Auflagen - keine Prozente, keine Ampel.
 */
export default async function FundingReportPage({ searchParams }: { searchParams?: Promise<{ org?: string; grant?: string; snapshot?: string }> }) {
  const query = (await searchParams) ?? {};
  if (!UUID.test(query.org ?? "") || !UUID.test(query.grant ?? "")) notFound();
  const orgId = query.org as string;
  const grantId = query.grant as string;
  const snapshotId = UUID.test(query.snapshot ?? "") ? (query.snapshot as string) : null;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath(`/advisor/organisation/foerderung?org=${orgId}&grant=${grantId}`));

  const t = await getTranslations("advisor.funding");
  const tProgram = await getTranslations("advisor.teamProgram");
  const locale = getPresentationLocale(await getLocale());
  const client = await createClient();
  const data = await fundingReportFor(client, orgId, grantId, snapshotId, tProgram("unnamedTeam"));
  if (!data) notFound();
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" });
  const dayOf = (iso: string) => day.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
  const { report } = data;
  const fulfilled = report.requirements.filter((requirement) => requirement.fulfilled).length;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 print:max-w-none print:px-0 print:py-0">
      <Link
        href={`/advisor/organisation?${new URLSearchParams({ org: orgId, tab: "funding", grant: grantId }).toString()}`}
        className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline print:hidden"
      >
        ← {t("report.back")}
      </Link>
      <header className="mt-6 border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">{t("report.eyebrow")}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{report.grant.name}</h1>
        <dl className="mt-3 grid gap-1 text-sm text-slate-700 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-6">
          {report.grant.funder ? (<><dt className="font-semibold">{t("grant.funder")}</dt><dd>{report.grant.funder}</dd></>) : null}
          {report.grant.reference ? (<><dt className="font-semibold">{t("grant.reference")}</dt><dd>{report.grant.reference}</dd></>) : null}
          <dt className="font-semibold">{t("report.period")}</dt>
          <dd>{`${dayOf(report.grant.startsOn)} – ${dayOf(report.grant.endsOn)}`}</dd>
          <dt className="font-semibold">{t("report.countedUntil")}</dt>
          <dd>{dayOf(report.countedUntil)}</dd>
          {data.takenAt ? (<><dt className="font-semibold">{t("report.snapshotOf")}</dt><dd>{[dayOf(data.takenAt), data.note].filter(Boolean).join(" · ")}</dd></>) : null}
        </dl>
        <p className="mt-4 text-sm font-semibold text-slate-900">{t("report.summary", { fulfilled, total: report.requirements.length })}</p>
      </header>
      <div className="mt-6">
        <FundingReportView report={report} locale={locale} />
      </div>
      <p className="mt-6 text-xs leading-5 text-slate-500">{t("report.footnote")}</p>
      <p className="mt-6 print:hidden">
        <PrintButton label={t("report.print")} className="brand-cta inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold" />
      </p>
    </main>
  );
}
