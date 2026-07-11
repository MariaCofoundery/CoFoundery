import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getDiscoveryCandidatesForCurrentUser,
  getOwnDiscoveryProfile,
} from "@/features/discovery/discoveryData";
import type {
  DiscoveryCandidate,
  DiscoveryFounderRole,
  DiscoveryStatus,
  FounderDiscoveryProfile,
} from "@/features/discovery/discoveryTypes";
import { getRequestLocale } from "@/i18n/getLocale";
import { createClient } from "@/lib/supabase/server";

const CARD_CLASS =
  "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6";
const PRIMARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";
const SECONDARY_BADGE_CLASS =
  "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600";
const CHIP_CLASS =
  "inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm";
const SOFT_CHIP_CLASS =
  "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700";

type DiscoveryT = Awaited<ReturnType<typeof getTranslations>>;

type DiscoveryStatusView = {
  label: string;
  hint: string;
  cta: string;
  status: DiscoveryStatus | "missing";
};

const JOURNEY_STEPS = [
  "profile",
  "priorities",
  "suggestions",
  "intro",
  "matching",
] as const;

function discoveryRoleLabel(t: DiscoveryT, value: DiscoveryFounderRole) {
  return t(`roles.${value}`);
}

function getStatusView(
  profile: FounderDiscoveryProfile | null,
  t: DiscoveryT
): DiscoveryStatusView {
  if (!profile) {
    return {
      label: t("index.missingProfile.label"),
      hint: t("index.missingProfile.hint"),
      cta: t("index.missingProfile.cta"),
      status: "missing",
    };
  }

  if (profile.status === "active") {
    return {
      label: t("status.active"),
      hint: t("index.activeProfile.hint"),
      cta: t("index.activeProfile.cta"),
      status: "active",
    };
  }

  if (profile.status === "paused") {
    return {
      label: t("status.paused"),
      hint: t("index.pausedProfile.hint"),
      cta: t("index.pausedProfile.cta"),
      status: "paused",
    };
  }

  return {
    label: t("status.draft"),
    hint: t("index.draftProfile.hint"),
    cta: t("index.draftProfile.cta"),
    status: "draft",
  };
}

function statusBadgeClass(status: DiscoveryStatusView["status"]) {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "paused") {
    return "bg-amber-100 text-amber-800";
  }
  if (status === "draft") {
    return "bg-slate-100 text-slate-700";
  }
  return "bg-slate-950 text-white";
}

function RoleChips({
  values,
  emptyLabel,
  t,
}: {
  values: DiscoveryFounderRole[];
  emptyLabel: string;
  t: DiscoveryT;
}) {
  if (values.length === 0) {
    return <span className={SOFT_CHIP_CLASS}>{emptyLabel}</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span key={value} className={CHIP_CLASS}>
          {discoveryRoleLabel(t, value)}
        </span>
      ))}
    </div>
  );
}

function InsightList({
  title,
  eyebrow,
  items,
  tone,
}: {
  title: string;
  eyebrow: string;
  items: string[];
  tone: "slate" | "amber";
}) {
  if (items.length === 0) {
    return null;
  }

  const isAmber = tone === "amber";
  return (
    <section
      className={`rounded-[1.35rem] border p-4 ${
        isAmber
          ? "border-amber-100 bg-amber-50/70"
          : "border-slate-200 bg-slate-50/80"
      }`}
    >
      <p
        className={`text-[0.68rem] font-semibold uppercase tracking-[0.16em] ${
          isAmber ? "text-amber-700" : "text-slate-500"
        }`}
      >
        {eyebrow}
      </p>
      <h4 className={`mt-1 text-sm font-semibold ${isAmber ? "text-amber-950" : "text-slate-950"}`}>
        {title}
      </h4>
      <ul className={`mt-3 space-y-2 text-sm leading-6 ${isAmber ? "text-amber-900" : "text-slate-600"}`}>
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span
              aria-hidden="true"
              className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                isAmber ? "bg-amber-400" : "bg-slate-400"
              }`}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CandidateCard({ candidate, t }: { candidate: DiscoveryCandidate; t: DiscoveryT }) {
  const { profile } = candidate;

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.055)]">
      <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#fff,rgba(248,250,252,0.9))] p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t("index.candidateCard.eyebrow")}
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              {profile.displayName}
            </h3>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-700">
              {profile.headline}
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <Link href={`/discovery/${profile.id}`} className={PRIMARY_CTA_CLASS}>
              {t("index.candidateCard.view")}
            </Link>
            <p className="max-w-56 text-xs leading-5 text-slate-500 lg:text-right">
              {t("index.candidateCard.hint")}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className={SOFT_CHIP_CLASS}>
            {profile.locationLabel ? `${profile.locationLabel} · ` : ""}
            {t(`remoteModes.${profile.remoteMode}`)}
          </span>
          <span className={SOFT_CHIP_CLASS}>
            {t(`commitmentLevels.${profile.commitmentLevel}`)}
          </span>
          <span className={SOFT_CHIP_CLASS}>
            {t("index.candidateCard.goalPrefix")} {t(`ventureGoals.${profile.ventureGoal}`)}
          </span>
        </div>
      </div>

      <div className="grid gap-5 p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t("index.candidateCard.brings")}
            </p>
            <div className="mt-3">
              <RoleChips values={profile.ownRoles} emptyLabel={t("index.candidateCard.emptyRole")} t={t} />
            </div>
          </section>
          <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t("index.candidateCard.seeks")}
            </p>
            <div className="mt-3">
              <RoleChips values={profile.seekingRoles} emptyLabel={t("index.candidateCard.emptyRole")} t={t} />
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <InsightList
            eyebrow={t("index.candidateCard.reasonsEyebrow")}
            title={t("index.candidateCard.reasonsTitle")}
            items={candidate.reasons}
            tone="slate"
          />
          <InsightList
            eyebrow={t("index.candidateCard.topicsEyebrow")}
            title={t("index.candidateCard.topicsTitle")}
            items={candidate.conversationTopics}
            tone="amber"
          />
        </div>
      </div>
    </article>
  );
}

export default async function DiscoveryPage() {
  const t = await getTranslations("discovery");
  const locale = getRequestLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent("/discovery")}`);
  }

  const [profile, candidates] = await Promise.all([
    getOwnDiscoveryProfile(user.id),
    getDiscoveryCandidatesForCurrentUser(user.id, undefined, locale),
  ]);
  const statusView = getStatusView(profile, t);
  const isActive = profile?.status === "active";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)] backdrop-blur md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t("common.brandEyebrow")}
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
                {t("index.title")}
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600">
                {t("index.subtitle")}
              </p>
            </div>
          </div>
        </header>

        <section className={CARD_CLASS}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t("index.profileEyebrow")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-slate-950 md:text-2xl">{statusView.label}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(statusView.status)}`}>
                  {statusView.label}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{statusView.hint}</p>
              {profile?.headline ? (
                <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {t("index.headlinePrefix")} <span className="font-semibold">{profile.headline}</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/discovery/profile" className={PRIMARY_CTA_CLASS}>
                {statusView.cta}
              </Link>
              <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
                {t("index.openRequests")}
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className={CARD_CLASS}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("index.journeyEyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("index.journeyTitle")}</h2>
            <ol className="mt-4 grid gap-3">
              {JOURNEY_STEPS.map((step, index) => {
                return (
                  <li
                    key={step}
                    className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{t(`index.journey.${step}.title`)}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{t(`index.journey.${step}.description`)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className={CARD_CLASS}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t("index.candidateEyebrow")}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {t("index.candidateTitle")}
                </h2>
                {isActive ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t("index.candidateHint")}
                  </p>
                ) : null}
              </div>
              <span className={SECONDARY_BADGE_CLASS}>{t("index.noPublicScore")}</span>
            </div>

            {isActive && candidates.length > 0 ? (
              <div className="mt-5 grid gap-5">
                {candidates.map((candidate) => (
                  <CandidateCard key={candidate.profile.id} candidate={candidate} t={t} />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-5">
                <p className="text-sm font-semibold text-slate-950">
                  {isActive ? t("index.emptyActiveTitle") : t("index.emptyInactiveTitle")}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isActive ? t("index.emptyActiveText") : t("index.emptyInactiveText")}
                </p>
              </div>
            )}

            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-950">{t("index.privacyTitle")}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("index.privacyText")}
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
