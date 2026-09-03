import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  DISCOVERY_REMOTE_MODE_OPTIONS,
  DISCOVERY_ROLE_OPTIONS,
} from "@/features/discovery/discoveryConfig";
import { saveDiscoveryV2SearchPreferencesAction } from "@/features/discovery/discoveryActions";
import { FounderDiscoveryCard } from "@/features/discovery/FounderDiscoveryCard";
import { hasFounderDiscoveryAccess } from "@/features/discovery/discoveryAccess";
import {
  getDiscoveryCandidatesForCurrentUser,
  getDiscoveryExploreProfilesForCurrentUser,
  getOwnDiscoveryProfile,
  getOwnSearchPreferences,
} from "@/features/discovery/discoveryData";
import { getOwnSavedDiscoveryProfileIds } from "@/features/discovery/discoverySavesData";
import {
  getDiscoverySearchBriefCriteria,
} from "@/features/discovery/discoveryPresentation";
import {
  type DiscoveryFounderRole,
  type DiscoveryRemoteMode,
  type FounderSearchPreferences,
} from "@/features/discovery/discoveryTypes";
import { createClient } from "@/lib/supabase/server";

const CARD_CLASS =
  "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6";
const PRIMARY_CTA_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[color:var(--brand-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200";
const SECONDARY_CTA_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200";
const FIELD_CLASS =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";
const CHIP_CLASS =
  "inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700";

type DiscoveryT = Awaited<ReturnType<typeof getTranslations>>;
type DiscoverySearchParams = {
  page?: string | string[];
  searchResult?: string | string[];
  mode?: string | string[];
};

function searchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function defaultMustHaves(): FounderSearchPreferences["mustHaves"] {
  return {
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
}

function Checkbox({
  name,
  value,
  label,
  checked,
  disabled = false,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={`flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-2 text-sm ${disabled ? "border-slate-100 bg-slate-50 text-slate-400" : "border-slate-200 bg-white text-slate-700"}`}>
      <input type="checkbox" name={name} value={value} defaultChecked={checked} disabled={disabled} className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-2 focus:ring-slate-300" />
      <span>{label}</span>
    </label>
  );
}

function roleLabel(t: DiscoveryT, role: DiscoveryFounderRole) {
  return t(`roles.${role}`);
}

function SearchBrief({ preferences, t }: { preferences: FounderSearchPreferences; t: DiscoveryT }) {
  const criteria = getDiscoverySearchBriefCriteria(preferences.mustHaves);
  const labels = criteria.flatMap((criterion) => {
    if (criterion.key === "role") {
      return criterion.values.map((role) => roleLabel(t, role as DiscoveryFounderRole));
    }
    if (criterion.key === "remote") {
      return criterion.values.map((mode) => t(`remoteModes.${mode}`));
    }
    if (criterion.key === "availability") {
      return [t("v2.search.minimumHoursChip", { hours: Number(criterion.values[0]) })];
    }
    return criterion.values;
  });
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.04)] md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t("v2.search.briefEyebrow")}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {labels.length > 0 ? t("v2.search.briefTitle") : t("v2.search.briefEmptyTitle")}
          </h2>
          {labels.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {labels.map((label) => <span key={label} className={CHIP_CLASS}>{label}</span>)}
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("v2.search.briefEmptyText")}</p>
          )}
        </div>
        <a href="#search" className={SECONDARY_CTA_CLASS}>{t("v2.search.edit")}</a>
      </div>
    </section>
  );
}

export default async function DiscoveryPage({ searchParams }: { searchParams?: Promise<DiscoverySearchParams> }) {
  const t = await getTranslations("discovery");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedPage = parsePage(searchParamValue(resolvedSearchParams.page));
  const mode = searchParamValue(resolvedSearchParams.mode) === "search" ? "search" : "explore";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent("/discovery")}`);
  }
  if (!(await hasFounderDiscoveryAccess(user.id, supabase))) {
    redirect("/advisor/dashboard");
  }

  const [profile, loadedPreferences, savedProfileIds] = await Promise.all([
    getOwnDiscoveryProfile(user.id),
    getOwnSearchPreferences(user.id),
    getOwnSavedDiscoveryProfileIds(user.id),
  ]);
  const preferences: FounderSearchPreferences = loadedPreferences ?? {
    id: "",
    userId: user.id,
    priorityWeights: {},
    mustHaves: defaultMustHaves(),
    includeAssessmentSignals: false,
    assessmentSignalsConsentedAt: null,
    discoveryV2AlignmentEnabled: false,
    discoveryV2AlignmentDimensions: [],
    discoveryV2AlignmentPreferences: {},
    discoveryV2AlignmentConsentedAt: null,
    createdAt: "",
    updatedAt: "",
  };
  const result = mode === "search"
    ? await getDiscoveryCandidatesForCurrentUser(user.id, undefined, undefined, requestedPage)
    : await getDiscoveryExploreProfilesForCurrentUser(user.id, undefined, requestedPage);
  const isActive = profile?.status === "active";
  const saved = searchParamValue(resolvedSearchParams.searchResult);

  async function saveSearch(formData: FormData) {
    "use server";
    const actionResult = await saveDiscoveryV2SearchPreferencesAction(formData);
    redirect(`/discovery?mode=search&searchResult=${actionResult.ok ? "saved" : "failed"}#search`);
  }

  async function resetSearch() {
    "use server";
    const actionResult = await saveDiscoveryV2SearchPreferencesAction(new FormData());
    redirect(`/discovery?mode=search&searchResult=${actionResult.ok ? "reset" : "failed"}#search`);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className={CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t("common.brandEyebrow")}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">{t("v2.title")}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{t("v2.subtitle")}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/discovery/profile" className={SECONDARY_CTA_CLASS}>{t("v2.editProfile")}</Link>
            <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>{t("index.openRequests")}</Link>
            <Link href="/discovery/saved" className={SECONDARY_CTA_CLASS}>{t("common.savedProfiles")}</Link>
          </div>
        </header>

        <nav aria-label={t("v2.modes.label")} className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 sm:w-fit">
          {(["explore", "search"] as const).map((item) => (
            <Link
              key={item}
              href={`/discovery?mode=${item}`}
              aria-current={mode === item ? "page" : undefined}
              className={`min-h-11 rounded-xl px-5 py-2.5 text-center text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200 ${mode === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"}`}
            >
              {t(`v2.modes.${item}`)}
            </Link>
          ))}
        </nav>

        {mode === "search" ? <SearchBrief preferences={preferences} t={t} /> : null}

        {mode === "search" ? <section id="search" className={CARD_CLASS}>
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t("v2.search.eyebrow")}</p>
              <h2 className="mt-2 text-2xl font-semibold">{t("v2.search.title")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("v2.search.description")}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
              {isActive ? t("status.active") : t("v2.search.profileInactive")}
            </span>
          </div>

          {saved ? (
            <p className={`mt-4 rounded-2xl px-4 py-3 text-sm ${saved === "failed" ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}>
              {t(`v2.search.feedback.${saved === "failed" ? "failed" : saved === "reset" ? "reset" : "saved"}`)}
            </p>
          ) : null}

          <form action={saveSearch} className="mt-5 grid gap-6">
            <details className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <summary className="cursor-pointer text-lg font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200">{t("v2.search.practicalTitle")}</summary>
              <div className="mt-5 grid gap-5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t("v2.search.role")}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {DISCOVERY_ROLE_OPTIONS.map((option) => (
                      <Checkbox key={option.value} name="requiredRolesAny" value={option.value} label={roleLabel(t, option.value)} checked={preferences.mustHaves.requiredRolesAny.includes(option.value)} />
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <label>
                    <span className="text-sm font-semibold text-slate-900">{t("v2.search.expertise")}</span>
                    <input name="requiredExpertiseAny" defaultValue={preferences.mustHaves.requiredExpertiseAny.join(", ")} className={FIELD_CLASS} placeholder={t("v2.search.expertisePlaceholder")} />
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{t("v2.search.expertiseHelp")}</span>
                  </label>
                  <label>
                    <span className="text-sm font-semibold text-slate-900">{t("v2.search.location")}</span>
                    <input name="desiredLocationRegion" defaultValue={preferences.mustHaves.desiredLocationRegion ?? ""} className={FIELD_CLASS} placeholder={t("v2.search.locationPlaceholder")} />
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{t("v2.search.locationHelp")}</span>
                  </label>
                  <label>
                    <span className="text-sm font-semibold text-slate-900">{t("v2.search.minimumAvailability")}</span>
                    <input name="minimumAvailabilityHoursPerWeek" type="number" min={1} max={100} defaultValue={preferences.mustHaves.minimumAvailabilityHoursPerWeek ?? ""} className={FIELD_CLASS} placeholder="20" />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t("v2.search.remote")}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {DISCOVERY_REMOTE_MODE_OPTIONS.map((option) => (
                      <Checkbox key={option.value} name="acceptedRemoteModes" value={option.value} label={t(`remoteModes.${option.value}`)} checked={preferences.mustHaves.acceptedRemoteModes.includes(option.value as DiscoveryRemoteMode)} />
                    ))}
                  </div>
                </div>
              </div>
            </details>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className={PRIMARY_CTA_CLASS}>{t("v2.search.apply")}</button>
              <button formAction={resetSearch} className={SECONDARY_CTA_CLASS}>{t("v2.search.reset")}</button>
            </div>
          </form>
        </section> : null}

        <section className={CARD_CLASS}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t(mode === "explore" ? "v2.explore.eyebrow" : "v2.results.eyebrow")}</p>
            <h2 className="mt-2 text-2xl font-semibold">{t(mode === "explore" ? "v2.explore.title" : "v2.results.title")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t(mode === "explore" ? "v2.explore.count" : "v2.results.count", { count: result.totalCount })}</p>
          </div>
        </section>

        {(mode === "explore" || isActive) && result.candidates.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {result.candidates.map((candidate) => <FounderDiscoveryCard key={candidate.profile.id} candidate={candidate} preferences={preferences.mustHaves} t={t} saved={savedProfileIds.has(candidate.profile.id)} showMatchReasons={mode === "search"} />)}
          </div>
        ) : (
          <section className={CARD_CLASS}>
            <h2 className="text-lg font-semibold">{mode === "explore" ? t("v2.explore.emptyTitle") : isActive ? t("v2.results.emptyTitle") : t("v2.results.inactiveTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{mode === "explore" ? t("v2.explore.emptyText") : isActive ? t("v2.results.emptyText") : t("v2.results.inactiveText")}</p>
            {mode === "search" && isActive ? (
              <form action={resetSearch} className="mt-5">
                <button className={SECONDARY_CTA_CLASS}>{t("v2.results.reset")}</button>
              </form>
            ) : null}
          </section>
        )}

        {result.totalCount > result.pageSize ? (
          <nav aria-label={t("v2.pagination.label")} className="flex items-center justify-center gap-3">
            {result.page > 1 ? <Link href={`/discovery?mode=${mode}&page=${result.page - 1}`} className={SECONDARY_CTA_CLASS}>{t("v2.pagination.previous")}</Link> : null}
            <span className="text-sm text-slate-600">{t("v2.pagination.page", { page: result.page })}</span>
            {result.page * result.pageSize < result.totalCount ? <Link href={`/discovery?mode=${mode}&page=${result.page + 1}`} className={SECONDARY_CTA_CLASS}>{t("v2.pagination.next")}</Link> : null}
          </nav>
        ) : null}
      </div>
    </main>
  );
}
