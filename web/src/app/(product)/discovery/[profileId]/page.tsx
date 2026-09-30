import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DisclosedCapability } from "@/features/capability/DisclosedCapability";
import { getDisclosedCapability } from "@/features/capability/capabilityData";
import { getActiveDiscoveryProfileById } from "@/features/discovery/discoveryData";
import { hasFounderDiscoveryAccess } from "@/features/discovery/discoveryAccess";
import { FounderDiscoverySaveButton } from "@/features/discovery/FounderDiscoverySaveButton";
import { getOwnSavedDiscoveryProfileIds } from "@/features/discovery/discoverySavesData";
import {
  cancelDiscoveryIntroAction,
  requestDiscoveryIntroAction,
} from "@/features/discovery/discoveryIntroActions";
import { getDiscoveryIntroRequestForProfile } from "@/features/discovery/discoveryIntroData";
import { getCandidateMatch } from "@/features/find/matchData";
import { matchPoints, type MatchPointKind } from "@/features/find/matchPoints";
import { getOwnPreferences } from "@/features/find/preferenceData";
import { MatchPointsView, type MatchPointsCopy } from "@/features/find/MatchPointsView";
import {
  resolveDiscoveryIntroFeedback,
  type DiscoveryIntroActionState,
} from "@/features/discovery/discoveryIntroFeedback";
import {
  canCancelDiscoveryIntro,
  type DiscoveryIntroRequest,
} from "@/features/discovery/discoveryIntroTypes";
import type { DiscoveryFounderRole, FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import { getMemberPhotos } from "@/features/profile/memberPhotoData";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { createClient, getRequestUser } from "@/lib/supabase/server";

const CARD_CLASS =
  "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6";
const PRIMARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";
const TEXTAREA_CLASS =
  "mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

type DiscoveryT = Awaited<ReturnType<typeof getTranslations>>;

type DiscoveryProfileDetailPageParams = {
  profileId: string;
};

type DiscoveryProfileDetailSearchParams = {
  introMessage?: string | string[];
  introOk?: string | string[];
};

function formatRoleList(values: DiscoveryFounderRole[], t: DiscoveryT) {
  return values.length > 0
    ? values.map((value) => t(`roles.${value}`)).join(", ")
    : t("common.notProvided");
}

function formatText(value: string | null | undefined, t: DiscoveryT) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : t("common.notProvided");
}

function formatIndustries(values: string[], t: DiscoveryT) {
  return values.length > 0 ? values.join(", ") : t("common.notProvided");
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-medium leading-6 text-slate-900">{value}</dd>
    </div>
  );
}

function searchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function introResultUrl(
  profileId: string,
  result: DiscoveryIntroActionState
) {
  const params = new URLSearchParams();
  params.set("introMessage", result.reason);
  params.set("introOk", result.ok ? "1" : "0");
  return `/discovery/${profileId}?${params.toString()}`;
}

function IntroPageMessage({ message, ok }: { message: string | null; ok: boolean }) {
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

function EmptyState({ t }: { t: DiscoveryT }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff,#f8fafc)] px-5 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-8">
        <Link href="/discovery" className="text-sm font-medium text-slate-500 hover:text-slate-900">
          {t("common.backToDiscovery")}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          {t("detail.emptyTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t("detail.emptyText")}
        </p>
        <div className="mt-6">
          <Link href="/discovery" className={PRIMARY_CTA_CLASS}>
            {t("common.backToDiscovery")}
          </Link>
        </div>
      </section>
    </main>
  );
}

function IntroRequestCard({
  profile,
  introRequest,
  t,
}: {
  profile: FounderDiscoveryProfile;
  introRequest: DiscoveryIntroRequest | null;
  t: DiscoveryT;
}) {
  async function requestIntro(formData: FormData) {
    "use server";
    const result = await requestDiscoveryIntroAction(profile.id, formData);
    redirect(introResultUrl(profile.id, result));
  }

  if (!introRequest) {
    return (
      <section className={CARD_CLASS}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t("detail.intro.eyebrow")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("detail.intro.requestTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t("detail.intro.requestText")}
        </p>
        <form action={requestIntro} className="mt-5 grid gap-4">
          <label>
            <span className="text-sm font-semibold text-slate-900">{t("detail.intro.messageLabel")}</span>
            <textarea
              name="message"
              maxLength={600}
              placeholder={t("detail.intro.messagePlaceholder")}
              className={TEXTAREA_CLASS}
            />
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              {t("detail.intro.messageHelp")}
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className={PRIMARY_CTA_CLASS}>
              {t("detail.intro.request")}
            </button>
            <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
              {t("common.myIntros")}
            </Link>
          </div>
        </form>
      </section>
    );
  }

  if (introRequest.status === "accepted") {
    return (
      <section className={CARD_CLASS}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          {t("introStatus.accepted")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("detail.intro.acceptedTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t("detail.intro.acceptedText")}
        </p>
        {introRequest.responseMessage ? (
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            {t("detail.intro.responsePrefix")} {introRequest.responseMessage}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/discovery/intros/${introRequest.id}/matching`}
            className={PRIMARY_CTA_CLASS}
          >
            {t("common.prepareSharedMatching")}
          </Link>
          <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
            {t("common.myIntros")}
          </Link>
        </div>
      </section>
    );
  }

  if (introRequest.status === "declined") {
    return (
      <section className={CARD_CLASS}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t("introStatus.declined")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          {t("detail.intro.declinedTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t("detail.intro.declinedText")}
        </p>
        {introRequest.responseMessage ? (
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            {t("detail.intro.responsePrefix")} {introRequest.responseMessage}
          </p>
        ) : null}
        <div className="mt-5">
          <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
            {t("common.myIntros")}
          </Link>
        </div>
      </section>
    );
  }

  if (introRequest.status === "canceled") {
    return (
      <section className={CARD_CLASS}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t("introStatus.canceled")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("detail.intro.canceledTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t("detail.intro.canceledText")}
        </p>
        <div className="mt-5">
          <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
            {t("common.myIntros")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={CARD_CLASS}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
        {t("introStatus.pending")}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("detail.intro.pendingTitle")}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {t("detail.intro.pendingText")}
      </p>
      {introRequest.message ? (
        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          {t("detail.intro.yourMessagePrefix")} {introRequest.message}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3">
        {canCancelDiscoveryIntro(introRequest) ? (
          <form
            action={async () => {
              "use server";
              const result = await cancelDiscoveryIntroAction(introRequest.id);
              redirect(introResultUrl(profile.id, result));
            }}
          >
            <button type="submit" className={SECONDARY_CTA_CLASS}>
              {t("detail.intro.cancel")}
            </button>
          </form>
        ) : null}
        <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
          {t("common.myIntros")}
        </Link>
      </div>
    </section>
  );
}

export default async function DiscoveryProfileDetailPage({
  params,
  searchParams,
}: {
  params: Promise<DiscoveryProfileDetailPageParams>;
  searchParams?: Promise<DiscoveryProfileDetailSearchParams>;
}) {
  const t = await getTranslations("discovery");
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const profileId = resolvedParams.profileId;
  const supabase = await createClient();
  const {
    data: { user },
  } = await getRequestUser();

  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/discovery/${profileId}`)}`);
  }
  if (!(await hasFounderDiscoveryAccess(user.id, supabase))) {
    redirect("/advisor/dashboard");
  }

  const profile = await getActiveDiscoveryProfileById(profileId);
  if (!profile) {
    return <EmptyState t={t} />;
  }

  // Nur wenn diese Person ihr Bild fuer Mitglieder freigegeben hat.
  const memberPhoto = (await getMemberPhotos(supabase, [profile.userId])).get(profile.userId);

  const isOwner = profile.userId === user.id;
  // `getDiscoveryV2AlignmentContextForCandidate` faellt hier weg: Die alten
  // Alignment-Dimensionen stehen nicht mehr auf dieser Seite, und eine
  // Abfrage fuer etwas, das niemand mehr anzeigt, ist eine Abfrage zu viel.
  const [introRequest, savedProfileIds] = isOwner
    ? [null, new Set<string>()]
    : await Promise.all([
        getDiscoveryIntroRequestForProfile(user.id, profile.id),
        getOwnSavedDiscoveryProfileIds(user.id),
      ]);
  // ---------------------------------------------------------------------------
  // WARUM KOENNTE DAS INTERESSANT SEIN?
  // ---------------------------------------------------------------------------
  //
  // Auf dem Profil ALLE Punkte - wer hier ist, hat sich fuer diese Person
  // entschieden und will lesen. Auf der Ergebniskarte sind es hoechstens zwei.
  const tFind = await getTranslations("find.points");
  const tFindSearch = await getTranslations("find.search");
  const ownPreferences = isOwner
    ? { preferences: [] }
    : await getOwnPreferences(user.id);
  const hasSearchPreferences = ownPreferences.preferences.some(
    (entry) => entry.importance > 0,
  );
  const findMatch = isOwner
    ? { match: { themes: [], rankingScore: null, weightedThemes: 0 }, mutualStrongPoints: [] }
    : await getCandidateMatch(user.id, profile.userId);
  const findMatchPoints = matchPoints(
    findMatch.match.themes,
    findMatch.mutualStrongPoints,
  );
  const matchCopy: MatchPointsCopy = {
    title: tFind("title"),
    themeTitle: (themeId: string) => tFindSearch(`themes.${themeId}.title`),
    kindTitle: (kind: MatchPointKind) => tFind(`kinds.${kind}.title`),
    kindText: (kind: MatchPointKind, name: string) => tFind(`kinds.${kind}.text`, { name }),
    noPreferences: tFind("noPreferences"),
    noPreferencesCta: tFind("noPreferencesCta"),
  };

  // Die Bedingungen prueft get_disclosed_capability; hier wird nur nicht
  // gefragt, wenn es das eigene Profil ist.
  const disclosedCapability = isOwner
    ? []
    : await getDisclosedCapability(supabase, profile.userId, "discovery");
  const capabilityT = await getTranslations("capability");
  const introReason = searchParamValue(resolvedSearchParams.introMessage) ?? null;
  const introFeedback = introReason ? resolveDiscoveryIntroFeedback(introReason) : null;
  const introMessage = introFeedback ? t(introFeedback.messageKey) : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)] backdrop-blur md:p-7">
          <Link href="/discovery" className="text-sm font-medium text-slate-500 hover:text-slate-900">
            {t("common.backToDiscovery")}
          </Link>
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t("detail.eyebrow")}
              </p>
              {/* Das Bild, wenn diese Person es fuer Mitglieder freigegeben
                  hat - sonst die Initialen, wie ueberall sonst. */}
              <ProfileAvatar
                displayName={profile.displayName}
                avatarId={memberPhoto?.avatarId}
                imageUrl={memberPhoto?.avatarUrl}
                className="mt-4 h-20 w-20 rounded-full object-cover"
                fallbackClassName="mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-950 text-lg font-semibold text-white"
              />
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
                {formatText(profile.displayName, t)}
              </h1>
              <p className="mt-3 max-w-3xl text-xl font-semibold leading-8 text-slate-900">
                {formatText(profile.headline, t)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                {profile.searchIntent ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-900">
                    {t(`searchIntents.${profile.searchIntent}.short`)}
                  </span>
                ) : null}
                {profile.startHorizon ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                    {t(`startHorizons.${profile.startHorizon}.short`)}
                  </span>
                ) : null}
                {profile.locationRegion ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                    {profile.locationRegion}
                  </span>
                ) : null}
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                  {t(`remoteModes.${profile.remoteMode}`)}
                </span>
                {profile.availabilityHoursPerWeek ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                    {t("profile.preview.hoursPerWeek", { hours: profile.availabilityHoursPerWeek })}
                  </span>
                ) : null}
                {profile.availabilityFlexibility ? (
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-900">
                    {t(
                      `profile.publicProfile.availabilityFlexShort.${profile.availabilityFlexibility}`
                    )}
                  </span>
                ) : null}
              </div>
              {/* Die Bedingung steht nur hier, nicht auf der Karte: Sie ist
                  ein Satz, ueber den man redet - kein Merkmal zum Ueberfliegen. */}
              {profile.availabilityCondition ? (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {profile.availabilityCondition}
                </p>
              ) : null}
              {/* Der letzte Schritt steht nur hier, nicht auf der Karte: Er
                  ist ein Satz zum Lesen, kein Merkmal zum Ueberfliegen. */}
              {profile.recentStep ? (
                <div className="mt-4 rounded-2xl border-l-[3px] border-violet-400 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {t("profile.venture.recentStepTitle")}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{profile.recentStep}</p>
                </div>
              ) : null}
            </div>
            {isOwner ? (
              <Link href="/discovery/profile" className={PRIMARY_CTA_CLASS}>
                {t("detail.editOwn")}
              </Link>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
                  {t("common.myIntros")}
                </Link>
                <FounderDiscoverySaveButton profileId={profile.id} saved={savedProfileIds.has(profile.id)} saveLabel={t("common.saveProfile")} savedLabel={t("common.savedProfile")} />
              </div>
            )}
          </div>
        </header>

        <IntroPageMessage message={introMessage} ok={introFeedback?.ok ?? false} />

        {/* Oben steht nur, was eine Information ist: dass eine Anfrage laeuft,
            angenommen oder abgelehnt wurde. Die FRAGE "moechtest du diese
            Person kennenlernen" steht unten - erst lesen, dann entscheiden. */}
        {isOwner || !introRequest ? null : (
          <IntroRequestCard
            profile={profile}
            introRequest={introRequest}
            t={t}
          />
        )}

        <section className={CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t("detail.sections.interests.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            {t("detail.sections.interests.title")}
          </h2>
          {profile.bio.trim() ? (
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{profile.bio}</p>
          ) : null}
          <dl className="mt-5 grid gap-3 md:grid-cols-2">
            {profile.industries.length > 0 ? (
              <DetailItem label={t("detail.details.industries")} value={formatIndustries(profile.industries, t)} />
            ) : null}
            <DetailItem label={t("detail.details.stage")} value={t(`ventureStages.${profile.ventureStage}`)} />
          </dl>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className={CARD_CLASS}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("detail.sections.brings.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("detail.sections.brings.title")}</h2>
            <dl className="mt-5 grid gap-3">
              <DetailItem label={t("detail.details.brings")} value={formatRoleList(profile.ownRoles, t)} />
              {profile.expertise.length > 0 ? (
                <DetailItem label={t("detail.details.expertise")} value={formatIndustries(profile.expertise, t)} />
              ) : null}
            </dl>
          </section>

          <section className={CARD_CLASS}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("detail.sections.seeks.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("detail.sections.seeks.title")}</h2>
            <dl className="mt-5 grid gap-3">
              <DetailItem label={t("detail.details.seeks")} value={formatRoleList(profile.seekingRoles, t)} />
            </dl>
          </section>
        </div>

        <section className={CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t("detail.sections.founding.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("detail.sections.founding.title")}</h2>
          <dl className="mt-5 grid gap-3 md:grid-cols-2">
            <DetailItem label={t("detail.details.commitment")} value={t(`commitmentLevels.${profile.commitmentLevel}`)} />
            <DetailItem label={t("detail.details.goal")} value={t(`ventureGoals.${profile.ventureGoal}`)} />
          </dl>
        </section>

        {/* ---------------------------------------------------------------
            WARUM KOENNTE DAS INTERESSANT SEIN?
            ---------------------------------------------------------------

            Hier standen bis zum 30.09.2026 die sechs alten
            Alignment-Dimensionen: Unternehmenslogik, Entscheidungslogik,
            Arbeitsstruktur, Commitment, Risikoorientierung, Konfliktstil -
            mit "dieselbe grobe Tendenz" daneben. Diese Kategorien stammen aus
            einer aelteren Architektur und vermischen venturebezogene Themen
            mit portablen Arbeitspraeferenzen; die FIND-Spec streicht sie in
            Abschnitt 20 ausdruecklich.

            AUF DEM PROFIL ALLE PUNKTE, AUF DER KARTE ZWEI. Wer hier ist, hat
            sich fuer diese Person entschieden und will lesen. */}
        {!isOwner ? (
          <section className={CARD_CLASS}>
            <MatchPointsView
              points={findMatchPoints}
              candidateName={profile.displayName}
              copy={matchCopy}
              hasPreferences={hasSearchPreferences}
            />
          </section>
        ) : null}

        <DisclosedCapability
          rows={disclosedCapability}
          copy={{
            title: capabilityT("foreign.title"),
            familyLabel: (familyId) => capabilityT(`families.${familyId}`),
            areaLabel: (areaId) => capabilityT(`areaLabels.${areaId}`),
            levelLabel: (level) => capabilityT(`levels.${level}`),
            ownershipLabel: (wish) => capabilityT(`ownershipWishes.${wish}`),
          }}
        />

        {/* Die Frage am Ende: Vorher stand sie direkt unter dem Kopf und
            fragte nach einer Entscheidung, bevor irgendetwas gelesen war. */}
        {isOwner || introRequest ? null : (
          <IntroRequestCard
            profile={profile}
            introRequest={introRequest}
            t={t}
          />
        )}

        <section className="rounded-3xl border border-slate-200 bg-white/80 p-5">
          <p className="text-sm leading-6 text-slate-600">
            {t("detail.privacy")}
          </p>
        </section>
      </div>
    </main>
  );
}
