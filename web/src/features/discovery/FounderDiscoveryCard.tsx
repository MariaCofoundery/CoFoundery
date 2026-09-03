import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FounderDiscoverySaveButton } from "@/features/discovery/FounderDiscoverySaveButton";
import { compactDiscoveryValues } from "@/features/discovery/discoveryPresentation";
import type {
  DiscoveryAlignmentDimension,
  DiscoveryCandidate,
  DiscoveryFounderRole,
  DiscoveryPracticalMatch,
  FounderSearchPreferences,
} from "@/features/discovery/discoveryTypes";

const CHIP_CLASS =
  "inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700";
const PRIMARY_CTA_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[color:var(--brand-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200";
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
  showMatchReasons = true,
}: {
  candidate: DiscoveryCandidate;
  preferences: FounderSearchPreferences["mustHaves"];
  t: DiscoveryT;
  saved: boolean;
  showMatchReasons?: boolean;
}) {
  const { profile } = candidate;
  const roles = compactDiscoveryValues(profile.ownRoles.map((role) => roleLabel(t, role)));
  const expertise = compactDiscoveryValues(profile.expertise);
  const seekingRoles = compactDiscoveryValues(profile.seekingRoles.map((role) => roleLabel(t, role)));

  return (
    <article className="flex h-full flex-col rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.055)] md:p-6">
      <div className="flex items-start gap-4">
        <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
          {initials(profile.displayName)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold text-slate-950">{profile.displayName}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{profile.headline}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
        {profile.searchIntent ? <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-900">{t(`searchIntents.${profile.searchIntent}.short`)}</span> : null}
        {profile.startHorizon ? <span className={CHIP_CLASS}>{t(`startHorizons.${profile.startHorizon}.short`)}</span> : null}
        {profile.locationRegion ? <span className={CHIP_CLASS}>{profile.locationRegion}</span> : null}
        <span className={CHIP_CLASS}>{t(`remoteModes.${profile.remoteMode}`)}</span>
        {profile.availabilityHoursPerWeek ? <span className={CHIP_CLASS}>{t("profile.preview.hoursPerWeek", { hours: profile.availabilityHoursPerWeek })}</span> : null}
      </div>

      <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
        <CardValueGroup title={t("v2.cards.brings")} values={[...roles.visible, ...expertise.visible]} remaining={roles.remaining + expertise.remaining} t={t} />
        <CardValueGroup title={t("v2.cards.seeks")} values={seekingRoles.visible} remaining={seekingRoles.remaining} t={t} />
      </div>

      <div className="mt-5 border-t border-slate-100 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t("v2.cards.foundingFrame")}</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{[
          t(`commitmentLevels.${profile.commitmentLevel}`),
          t(`ventureStages.${profile.ventureStage}`),
          t(`ventureGoals.${profile.ventureGoal}`),
        ].join(" · ")}</p>
      </div>

      {showMatchReasons && (candidate.practicalMatches?.length ?? 0) > 0 ? (
        <section className="mt-5 border-t border-emerald-100 pt-4">
          <p className="text-xs font-semibold text-emerald-800">{t("v2.cards.practicalMatches")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {candidate.practicalMatches?.map((match) => <span key={match} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">{practicalMatchLabel(t, match, candidate, preferences)}</span>)}
          </div>
        </section>
      ) : null}

      {showMatchReasons && (candidate.alignmentSignals?.length ?? 0) > 0 ? (
        <section className="mt-3 border-t border-violet-100 pt-4 text-xs leading-5 text-violet-900">
          <p className="font-semibold">{t("v2.cards.alignmentSignals")}</p>
          <ul className="mt-1 space-y-1">
            {candidate.alignmentSignals?.slice(0, 2).map((entry) => <li key={entry.dimension}>{t(`v2.alignment.dimensions.${entry.dimension as DiscoveryAlignmentDimension}`)} · {t(`v2.alignment.signals.${entry.signal}`)}</li>)}
          </ul>
        </section>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
        <Link href={`/discovery/${profile.id}`} className={PRIMARY_CTA_CLASS}>{t("common.viewProfile")}</Link>
        <FounderDiscoverySaveButton profileId={profile.id} saved={saved} saveLabel={t("common.saveProfile")} savedLabel={t("common.savedProfile")} />
      </div>
    </article>
  );
}
