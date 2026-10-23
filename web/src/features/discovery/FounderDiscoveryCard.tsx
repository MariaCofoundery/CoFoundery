import { DiscoveryWorkstyle } from "@/features/find/DiscoveryWorkstyle";
import { ConversationPoints } from "@/features/find/ConversationPoints";
import { conversationPoints, type ConversationProfile } from "@/features/find/conversationPrompts";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FindMatchingReasons } from "@/features/discovery/FindMatchingReasons";
import { FounderDiscoverySaveButton } from "@/features/discovery/FounderDiscoverySaveButton";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import type { MemberPhoto } from "@/features/profile/memberPhotoData";
import { FIND_CHIP, FIND_PRIMARY } from "@/features/discovery/findUi";
import {
  compactDiscoveryValues,
  discoveryRoleLabels,
} from "@/features/discovery/discoveryPresentation";
import type {
  DiscoveryCandidate,
  DiscoveryFounderRole,
  DiscoveryPracticalMatch,
  FindRankingMode,
  FounderSearchPreferences,
} from "@/features/discovery/discoveryTypes";

const CHIP_CLASS = FIND_CHIP;
const PRIMARY_CTA_CLASS = FIND_PRIMARY;
type DiscoveryT = Awaited<ReturnType<typeof getTranslations>>;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toLocaleUpperCase()).join("") || "?";
}

function roleLabel(t: DiscoveryT, role: DiscoveryFounderRole) {
  return t(`roles.${role}`);
}

function practicalMatchLabel(
  t: DiscoveryT,
  match: DiscoveryPracticalMatch,
  candidate: DiscoveryCandidate,
  preferences: FounderSearchPreferences["mustHaves"]
) {
  switch (match) {
    case "role":
      return candidate.profile.ownRoles
        .filter((role) => preferences.requiredRolesAny.includes(role))
        .map((role) => roleLabel(t, role))
        .join(", ");
    case "expertise":
      return candidate.profile.expertise
        .filter((expertise) => preferences.requiredExpertiseAny.some(
          (required) => required.toLocaleLowerCase() === expertise.toLocaleLowerCase()
        ))
        .join(", ");
    case "location": return candidate.profile.locationRegion ?? "";
    case "remote": return t(`remoteModes.${candidate.profile.remoteMode}`);
    case "availability":
      return `${t("profile.preview.hoursPerWeek", {
        hours: preferences.minimumAvailabilityHoursPerWeek ?? 0,
      })}+`;
  }
}

function CardValueGroup({
  title,
  values,
  remaining,
  t,
}: {
  title: string;
  values: string[];
  remaining: number;
  t: DiscoveryT;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-800">
        {values.length > 0 ? values.join(", ") : t("common.notProvided")}
        {remaining > 0 ? ` ${t("common.moreCount", { count: remaining })}` : ""}
      </p>
    </div>
  );
}

export function FounderDiscoveryCard({
  candidate,
  preferences,
  t,
  saved,
  photo,
  showMatchReasons = true,
  viewer = null,
  rankingMode = "legacy",
}: {
  candidate: DiscoveryCandidate;
  preferences: FounderSearchPreferences["mustHaves"];
  t: DiscoveryT;
  saved: boolean;
  /** Nur gesetzt, wenn diese Person ihr Bild fuer Mitglieder freigegeben hat. */
  photo?: MemberPhoto;
  showMatchReasons?: boolean;
  /** Eigenes FIND-Profil der betrachtenden Person - fuer hoechstens zwei Gespraechsanlaesse. */
  viewer?: ConversationProfile | null;
  /**
   * Welche Reihenfolge die Suchseite tatsächlich hat (DiscoverySearchPage.rankingMode).
   * "v01": bilaterale v0.1-Reasons statt der einseitigen Kriterien-Chips - beides wird nicht
   * gemischt. Standard "legacy": Karte wie bisher.
   */
  rankingMode?: FindRankingMode;
}) {
  const { profile } = candidate;
  // Kein Score und keine Reihenfolge: einzelne Angaben nebeneinander, siehe conversationPrompts.ts.
  const allWhy = viewer ? conversationPoints({ viewer, candidate: profile }).why : [];
  // v0.1: Steht dieselbe Rollenaussage schon unter „Aus euren Angaben“, entfällt der Rollenpunkt
  // im Gesprächsblock (Preview-QA E3d) - nur wenn ALLE seine Rollen dort schon stehen, sonst
  // ginge eine Angabe verloren. Alle anderen Punkte bleiben; Legacy unverändert.
  const shownRoles = (code: string) =>
    new Set(
      showMatchReasons && rankingMode === "v01"
        ? (candidate.matchingReasons ?? []).filter((r) => r.messageKey === `find.matchingReasons.${code}`).map((r) => r.data.role)
        : []
    );
  const coveredBy = (code: string, roles: string[] | undefined) => {
    const shown = shownRoles(code);
    return (roles ?? []).length > 0 && (roles ?? []).every((role) => shown.has(role));
  };
  const why = allWhy.filter(
    (point) =>
      !(point.claim === "FIND.WHY.ROLE_SOUGHT_BY_YOU" && coveredBy("FIND_ROLE_NEED_COVERED", point.values.roles)) &&
      !(point.claim === "FIND.WHY.ROLE_SOUGHT_BY_THEM" && coveredBy("FIND_ROLE_NEED_COVERED_REVERSE", point.values.roles))
  );
  const roles = compactDiscoveryValues(
    discoveryRoleLabels(profile.ownRoles, profile.ownRoleOther, (role) =>
      roleLabel(t, role as DiscoveryFounderRole)
    )
  );
  const expertise = compactDiscoveryValues(profile.expertise);
  const seekingRoles = compactDiscoveryValues(
    discoveryRoleLabels(profile.seekingRoles, profile.seekingRoleOther, (role) =>
      roleLabel(t, role as DiscoveryFounderRole)
    )
  );

  return (
    <article className="card-lift flex h-full flex-col rounded-[24px] border border-[#e4e2f0] bg-white p-6">
      <div className="flex items-start gap-4">
        {/* Das Bild, wenn diese Person es fuer Mitglieder freigegeben hat -
            sonst wie bisher die Initialen. */}
        <ProfileAvatar
          displayName={profile.displayName}
          avatarId={photo?.avatarId}
          imageUrl={photo?.avatarUrl}
          className="h-14 w-14 shrink-0 rounded-full object-cover"
          fallbackClassName="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] text-lg font-bold text-white"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-[19px] font-semibold leading-tight text-[#0b1f3a]">{profile.displayName}</h3>
          <p className="mt-1 text-sm leading-6 text-[#5f5e7a]">{profile.headline}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
        {profile.searchIntent ? <span className="inline-flex items-center rounded-full bg-[#efeafd] px-2.5 py-0.5 text-[13px] font-semibold text-[#4a2fb8]">{t(`searchIntents.${profile.searchIntent}.short`)}</span> : null}
        {profile.startHorizon ? <span className={CHIP_CLASS}>{t(`startHorizons.${profile.startHorizon}.short`)}</span> : null}
        {profile.locationRegion ? <span className={CHIP_CLASS}>{profile.locationRegion}</span> : null}
        <span className={CHIP_CLASS}>{t(`remoteModes.${profile.remoteMode}`)}</span>
        {profile.availabilityHoursPerWeek ? <span className={CHIP_CLASS}>{t("profile.preview.hoursPerWeek", { hours: profile.availabilityHoursPerWeek })}</span> : null}
        {/* Steht direkt neben der Stundenzahl: Sie sagt erst zusammen mit
            dieser Angabe, was sie bedeutet. */}
        {profile.availabilityFlexibility ? <span className={`${CHIP_CLASS} border-violet-200 bg-violet-50 text-violet-900`}>{t(`profile.publicProfile.availabilityFlexShort.${profile.availabilityFlexibility}`)}</span> : null}
      </div>

      <div className="mt-5 grid gap-4 border-t border-[#e4e2f0] pt-5 sm:grid-cols-2">
        <CardValueGroup title={t("v2.cards.brings")} values={[...roles.visible, ...expertise.visible]} remaining={roles.remaining + expertise.remaining} t={t} />
        <CardValueGroup title={t("v2.cards.seeks")} values={seekingRoles.visible} remaining={seekingRoles.remaining} t={t} />
      </div>

      <div className="mt-5 border-t border-[#e4e2f0] pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t("v2.cards.foundingFrame")}</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{[
          t(`commitmentLevels.${profile.commitmentLevel}`),
          t(`ventureStages.${profile.ventureStage}`),
          t(`ventureGoals.${profile.ventureGoal}`),
        ].join(" · ")}</p>
      </div>

      {/* MATCHING v0.1 (E3c): nur, wenn der v0.1-Pfad diese Seite geliefert hat - die
          heutige Suche setzt keine matchingReasons, ihre Karten bleiben unverändert. */}
      {showMatchReasons && rankingMode === "v01" && (candidate.matchingReasons?.length ?? 0) > 0 ? (
        <FindMatchingReasons
          reasons={candidate.matchingReasons ?? []}
          candidateName={profile.displayName}
          title={t("v2.cards.matchingReasons")}
        />
      ) : null}

      {/* Kriterien-Chips aus der heutigen, einseitigen Suche - nur dort. */}
      {showMatchReasons && rankingMode === "legacy" && (candidate.practicalMatches?.length ?? 0) > 0 ? (
        <section className="mt-5 border-t border-emerald-100 pt-4">
          <p className="text-xs font-semibold text-emerald-800">{t("v2.cards.practicalMatches")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {candidate.practicalMatches?.map((match) => <span key={match} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">{practicalMatchLabel(t, match, candidate, preferences)}</span>)}
          </div>
        </section>
      ) : null}

      <ConversationPoints points={why} kind="why" candidateName={profile.displayName} variant="card" />

      {showMatchReasons && <DiscoveryWorkstyle candidateId={candidate.profile.userId} compact />}

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
        <Link href={`/discovery/${profile.id}`} className={PRIMARY_CTA_CLASS}>{t("common.viewProfile")}</Link>
        <FounderDiscoverySaveButton profileId={profile.id} saved={saved} saveLabel={t("common.saveProfile")} savedLabel={t("common.savedProfile")} />
      </div>
    </article>
  );
}
