import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { hasFounderDiscoveryAccess } from "@/features/discovery/discoveryAccess";
import { FounderDiscoveryCard } from "@/features/discovery/FounderDiscoveryCard";
import { getOwnSavedDiscoveryCandidates } from "@/features/discovery/discoverySavesData";
import type { FounderSearchPreferences } from "@/features/discovery/discoveryTypes";
import { createClient } from "@/lib/supabase/server";

const SECONDARY_CTA_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200";

const EMPTY_MUST_HAVES: FounderSearchPreferences["mustHaves"] = {
  minimumAvailabilityHoursPerWeek: null,
  acceptedRemoteModes: [],
  requiredRolesAny: [],
  requiredExpertiseAny: [],
  desiredLocationRegion: null,
  requiredIndustriesAny: [],
  acceptedCommitmentLevels: [],
  acceptedVentureStages: [],
  acceptedVentureGoals: [],
};

export default async function SavedFounderDiscoveryPage() {
  const t = await getTranslations("discovery");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent("/discovery/saved")}`);
  if (!(await hasFounderDiscoveryAccess(user.id, supabase))) redirect("/advisor/dashboard");

  const savedCandidates = await getOwnSavedDiscoveryCandidates(user.id, supabase);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-7">
          <Link href="/discovery" className="text-sm font-medium text-slate-500 hover:text-slate-900">{t("common.backToDiscovery")}</Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t("saved.eyebrow")}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">{t("saved.title")}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{t("saved.description")}</p>
        </header>

        {savedCandidates.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {savedCandidates.map(({ candidate }) => (
              <FounderDiscoveryCard
                key={candidate.profile.id}
                candidate={candidate}
                preferences={EMPTY_MUST_HAVES}
                t={t}
                saved
                showMatchReasons={false}
              />
            ))}
          </div>
        ) : (
          <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold text-slate-950">{t("saved.emptyTitle")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("saved.emptyText")}</p>
            <div className="mt-5">
              <Link href="/discovery" className={SECONDARY_CTA_CLASS}>{t("saved.discover")}</Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
