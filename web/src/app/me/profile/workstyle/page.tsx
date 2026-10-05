import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import {
  getProductWorkstyle,
  getProductSnapshot,
} from "@/features/reporting/workstyle/data";
import { saveProductSnapshot } from "@/features/reporting/workstyle/actions";
import { IndividualWorkstyle } from "@/features/reporting/workstyle/IndividualWorkstyle";
import {
  PRODUCT_ITEMS,
  type ProductProfile,
} from "@/features/reporting/workstyle/model";
import { getShareState } from "@/features/instruments/align/shareData";
import { ShareForm } from "@/features/instruments/align/ShareForm";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import { CURRENT_WORKSTYLE_HREF } from "@/features/instruments/workstyle/current";
import { getLocale, getTranslations } from "next-intl/server";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Wie du arbeitest",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ snapshot?: string; error?: string; ansicht?: string }>;
}) {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=%2Fme%2Fprofile%2Fworkstyle");
  const client = await createClient();
  const query = await searchParams;
  const [current, shares] = await Promise.all([
    getProductWorkstyle(client, user.id),
    getShareState(user.id, "workstyle", null),
  ]);
  const snapshot = query.snapshot
    ? await getProductSnapshot<ProductProfile>(client, query.snapshot)
    : null;
  if (query.snapshot && (!snapshot || snapshot.input.person_id !== user.id))
    notFound();
  const profile = snapshot?.input ?? current;
  const [t, locale] = await Promise.all([getTranslations("report.workstyle"), getLocale()]);
  // Ausfuehrliche Fassung: alle Einzelantworten aufgeklappt und im Druck enthalten.
  const full = query.ansicht === "ausfuehrlich";
  const viewHref = (nextFull: boolean) => {
    const params = new URLSearchParams();
    if (query.snapshot) params.set("snapshot", query.snapshot);
    if (nextFull) params.set("ansicht", "ausfuehrlich");
    const qs = params.toString();
    return `/me/profile/workstyle${qs ? `?${qs}` : ""}`;
  };
  return (
    <main className="ws-report mx-auto max-w-4xl px-5 py-10">
      <Link className="ws-no-print underline" href="/me/profile">
        {t("backToProfile")}
      </Link>
      <header className="my-7">
        <h1 className="text-4xl font-semibold">{t("individualTitle")}</h1>
        {locale !== "de" && (
          <p className="mt-3 text-sm text-slate-600" lang={locale}>
            {t("germanOnly")}
          </p>
        )}
      </header>
      {profile ? (
        <>
          <div className="ws-no-print mb-7 flex flex-wrap items-center gap-4">
            <PrintReportButton label={t("print")} />
            <Link className="text-sm underline" href={viewHref(!full)}>
              {full ? t("compactVersion") : t("fullVersion")}
            </Link>
            {!snapshot && (
              <form action={saveProductSnapshot.bind(null, null)}>
                <button className="min-h-11 rounded-lg border px-4">
                  {t("snapshot")}
                </button>
              </form>
            )}
          </div>
          {full && <p className="mb-5 text-sm text-slate-500">{t("fullVersionNote")}</p>}
          {query.error && <p role="alert">{t("snapshotError")}</p>}
          {snapshot && (
            <p className="mb-5 text-sm">
              {t("snapshotSaved", {
                date: new Date(snapshot.generated_at).toLocaleString("de-DE"),
              })}
            </p>
          )}
          <IndividualWorkstyle profile={profile} full={full} />
          <div className="ws-no-print mt-10">
            <ShareForm
              scope="workstyle"
              ventureId={null}
              recipients={shares.recipients}
              hiddenByRecipient={shares.hiddenByRecipient}
              items={PRODUCT_ITEMS.map((i) => ({
                itemId: i.item_key,
                prompt: i.prompt,
              }))}
              label="Dein Arbeitsprofil"
            />
          </div>
        </>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="max-w-2xl leading-7">{t("emptyIndividual")}</p>
          <Link
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-slate-900 px-4 font-semibold text-white"
            href={CURRENT_WORKSTYLE_HREF}
          >
            {t("emptyIndividualCta")}
          </Link>
        </section>
      )}
    </main>
  );
}
