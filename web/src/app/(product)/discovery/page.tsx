import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DiscoveryMineNav } from "@/features/discovery/DiscoveryMineNav";
import { saveDiscoveryV2SearchPreferencesAction } from "@/features/discovery/discoveryActions";
import { DiscoverySavedSearchForm } from "@/features/discovery/DiscoverySavedSearchForm";
import { FounderDiscoveryCard } from "@/features/discovery/FounderDiscoveryCard";
import { getCandidateMatch } from "@/features/find/matchData";
import { matchPoints } from "@/features/find/matchPoints";
import { getOwnPreferences } from "@/features/find/preferenceData";
import type { MatchPointsCopy } from "@/features/find/MatchPointsView";
import type { MatchPointKind } from "@/features/find/matchPoints";
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
  type FounderSearchPreferences,
} from "@/features/discovery/discoveryTypes";
import { getCapabilityVocabulary } from "@/features/capability/capabilityData";
import { getMemberPhotos } from "@/features/profile/memberPhotoData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

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

// Die Rueckmeldungen der Suchmaske und des Merkens teilen sich eine Stelle.
const FEEDBACK_KEYS = ["saved", "reset", "failed", "label", "empty"];
const WARNING_FEEDBACK = ["failed", "label", "empty"];

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
  const { data: { user } } = await getRequestUser();
  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent("/discovery")}`);
  }
  if (!(await hasFounderDiscoveryAccess(user.id, supabase))) {
    redirect("/advisor/dashboard");
  }

  const [profile, loadedPreferences, savedProfileIds, capabilityVocabulary] = await Promise.all([
    getOwnDiscoveryProfile(user.id),
    getOwnSearchPreferences(user.id),
    getOwnSavedDiscoveryProfileIds(user.id),
    getCapabilityVocabulary(supabase),
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
  // Nur die Bilder derer, die sie fuer Mitglieder freigegeben haben. Wer das
  // nicht getan hat, erscheint wie bisher mit Initialen.
  const memberPhotos = await getMemberPhotos(
    supabase,
    result.candidates.map((candidate) => candidate.profile.userId)
  );
  // ---------------------------------------------------------------------------
  // WARUM KOENNTE DAS INTERESSANT SEIN?
  // ---------------------------------------------------------------------------
  //
  // Je Kandidat:in die Matchpunkte - hoechstens zwei auf einer Karte, damit
  // sie eine Karte bleibt. Die lange Fassung steht auf dem Profil.
  //
  // NUR IM SUCHMODUS. Beim Stoebern ("Fuer dich") gibt es keine Suchvorgaben,
  // gegen die etwas passen koennte.
  const tFind = await getTranslations("find.points");
  const tFindSearch = await getTranslations("find.search");
  const ownPreferences = await getOwnPreferences(user.id);
  const hasSearchPreferences = ownPreferences.preferences.some(
    (entry) => entry.importance > 0,
  );

  const matchCopy: MatchPointsCopy = {
    title: tFind("title"),
    themeTitle: (themeId: string) => tFindSearch(`themes.${themeId}.title`),
    kindTitle: (kind: MatchPointKind) => tFind(`kinds.${kind}.title`),
    kindText: (kind: MatchPointKind, name: string) => tFind(`kinds.${kind}.text`, { name }),
    noPreferences: tFind("noPreferences"),
    noPreferencesCta: tFind("noPreferencesCta"),
  };

  const matchByUserId = new Map<string, { points: ReturnType<typeof matchPoints> }>();
  if (mode === "search") {
    // Nacheinander und nicht alles auf einmal: Zwoelf Karten waeren zwoelf
    // gleichzeitige Abfragen, und eine Liste ist kein Grund, die Datenbank zu
    // ueberfahren.
    for (const candidate of result.candidates) {
      const { match, mutualStrongPoints } = await getCandidateMatch(
        user.id,
        candidate.profile.userId,
      );
      matchByUserId.set(candidate.profile.userId, {
        points: matchPoints(match.themes, mutualStrongPoints, 2),
      });
    }
  }

  const isActive = profile?.status === "active";
  const saved = searchParamValue(resolvedSearchParams.searchResult);

  async function resetSearch() {
    "use server";
    const actionResult = await saveDiscoveryV2SearchPreferencesAction(new FormData());
    redirect(`/discovery?mode=search&searchResult=${actionResult.ok ? "reset" : "failed"}#search`);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className={CARD_CLASS}>
          {/* Rechts oben, was einem selbst gehoert - identisch zu Connect,
              damit man es nicht zweimal lernen muss. "Anfragen" bleibt
              daneben stehen: Das ist ein Eingang, kein eigener Besitz. */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t("common.brandEyebrow")}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">{t("v2.title")}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{t("v2.subtitle")}</p>
            </div>
            <DiscoveryMineNav />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>{t("index.openRequests")}</Link>
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
            <p className={`mt-4 rounded-2xl px-4 py-3 text-sm ${WARNING_FEEDBACK.includes(saved ?? "") ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}>
              {t(`v2.search.feedback.${FEEDBACK_KEYS.includes(saved ?? "") ? saved : "saved"}`)}
            </p>
          ) : null}

          {/* ---------------------------------------------------------------
              DIE KRITERIEN STEHEN JETZT IN "DEINE SUCHE"
              ---------------------------------------------------------------

              Hier stand ein Aufklapper mit Rolle, Expertise, Region, Remote
              und Mindeststunden - mitten zwischen dem oeffentlichen Profil
              und den Treffern. Die FIND-Spec nennt genau diese Mischung in
              Abschnitt 3 als Grund fuer den Umbau: Alles Private gehoert an
              EINEN Ort, und der heisst "Deine Suche".

              Was gerade gilt, steht weiter oben im Ueberblick - man sieht
              also, wonach gefiltert wird, ohne die Felder vor sich zu haben. */}
          <p className="mt-5 text-sm leading-6 text-slate-600">
            {t("v2.search.criteriaMoved")}
          </p>
          <Link href="/discovery/suche" className={`${PRIMARY_CTA_CLASS} mt-4`}>
            {t("v2.search.toYourSearch")}
          </Link>
        </section> : null}

        {mode === "search" ? (
          <DiscoverySavedSearchForm
            preferences={preferences}
            families={capabilityVocabulary.families}
            areas={capabilityVocabulary.areas}
            className={CARD_CLASS}
            fieldClassName={FIELD_CLASS}
            buttonClassName={SECONDARY_CTA_CLASS}
          />
        ) : null}

        <section className={CARD_CLASS}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t(mode === "explore" ? "v2.explore.eyebrow" : "v2.results.eyebrow")}</p>
            <h2 className="mt-2 text-2xl font-semibold">{t(mode === "explore" ? "v2.explore.title" : "v2.results.title")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t(mode === "explore" ? "v2.explore.count" : "v2.results.count", { count: result.totalCount })}</p>
          </div>
        </section>

        {(mode === "explore" || isActive) && result.candidates.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {result.candidates.map((candidate) => <FounderDiscoveryCard key={candidate.profile.id} candidate={candidate} preferences={preferences.mustHaves} t={t} saved={savedProfileIds.has(candidate.profile.id)} photo={memberPhotos.get(candidate.profile.userId)} showMatchReasons={mode === "search"} match={{ points: matchByUserId.get(candidate.profile.userId)?.points ?? [], copy: matchCopy, hasPreferences: hasSearchPreferences }} />)}
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
