import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  DISCOVERY_COMMITMENT_OPTIONS,
  DISCOVERY_PRIORITY_OPTIONS,
  DISCOVERY_REMOTE_MODE_OPTIONS,
  DISCOVERY_ROLE_OPTIONS,
  DISCOVERY_SELECTION_LIMITS,
  DISCOVERY_VENTURE_GOAL_OPTIONS,
  DISCOVERY_VENTURE_STAGE_OPTIONS,
} from "@/features/discovery/discoveryConfig";
import {
  pauseDiscoveryProfileAction,
  publishDiscoveryProfileFromFormAction,
  saveDiscoveryPreferencesAction,
  saveDiscoveryProfileDraftAction,
  type DiscoveryActionState,
} from "@/features/discovery/discoveryActions";
import {
  getOwnDiscoveryProfile,
  getOwnSearchPreferences,
} from "@/features/discovery/discoveryData";
import {
  getOwnDiscoveryAssessmentSignalReadiness,
  type OwnDiscoveryAssessmentSignalReadiness,
} from "@/features/discovery/discoveryAssessmentSignals";
import { getDiscoveryProfilePublishIssues } from "@/features/discovery/discoveryValidation";
import type {
  DiscoveryCommitmentLevel,
  DiscoveryFounderRole,
  DiscoveryRemoteMode,
  DiscoveryVentureGoal,
  DiscoveryVentureStage,
  FounderDiscoveryProfile,
  FounderSearchPreferences,
} from "@/features/discovery/discoveryTypes";
import { createClient } from "@/lib/supabase/server";

const CARD_CLASS =
  "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6";
const FIELD_CLASS =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100";
const LABEL_CLASS = "text-sm font-medium text-slate-900";
const HELP_CLASS = "mt-1 text-xs leading-5 text-slate-500";
const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";
const INNER_SECTION_CLASS = "rounded-3xl border border-slate-200 bg-slate-50/60 p-5";

type DiscoveryT = Awaited<ReturnType<typeof getTranslations>>;

type DiscoveryProfileSearchParams = {
  message?: string | string[];
  issue?: string | string[];
};

function emptyProfile(): Partial<FounderDiscoveryProfile> {
  return {
    status: "draft",
    displayName: "",
    headline: "",
    bio: "",
    ownRoles: [],
    seekingRoles: [],
    industries: [],
    locationLabel: "",
    remoteMode: "flexible",
    availabilityHoursPerWeek: null,
    commitmentLevel: "exploring",
    ventureStage: "undecided",
    ventureGoal: "undecided",
    publishedAt: null,
  };
}

function emptyPreferences(): Pick<
  FounderSearchPreferences,
  "priorityWeights" | "mustHaves" | "includeAssessmentSignals" | "assessmentSignalsConsentedAt"
> & { isDefaultedForSubmittedBase: boolean } {
  return {
    priorityWeights: {},
    mustHaves: {
      minimumAvailabilityHoursPerWeek: null,
      acceptedRemoteModes: [],
      requiredRolesAny: [],
      requiredIndustriesAny: [],
      acceptedCommitmentLevels: [],
      acceptedVentureStages: [],
      acceptedVentureGoals: [],
    },
    includeAssessmentSignals: false,
    assessmentSignalsConsentedAt: null,
    isDefaultedForSubmittedBase: false,
  };
}

function isChecked<T extends string>(values: readonly T[] | undefined, value: T) {
  return values?.includes(value) ?? false;
}

function discoveryRoleLabel(t: DiscoveryT, value: DiscoveryFounderRole) {
  return t(`roles.${value}`);
}

function formatRoleList(
  values: DiscoveryFounderRole[] | undefined,
  t: DiscoveryT
) {
  if (!values || values.length === 0) return t("common.notProvided");
  return values.map((value) => discoveryRoleLabel(t, value)).join(", ");
}

function previewText(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function formatIndustries(values: string[] | undefined, t: DiscoveryT) {
  return values && values.length > 0 ? values.join(", ") : t("common.notProvided");
}

function limitHint(isAtLimit: boolean, text: string) {
  return isAtLimit ? (
    <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
      {text}
    </p>
  ) : null;
}

function searchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function searchParamValues(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function buildDiscoveryProfileRedirect(
  result: DiscoveryActionState,
  successMessage: string,
  fallbackErrorMessage: string
) {
  const params = new URLSearchParams();
  params.set("message", result.ok ? successMessage : result.message ?? fallbackErrorMessage);
  for (const issue of result.issues ?? []) {
    params.append("issue", issue);
  }
  return `/discovery/profile?${params.toString()}`;
}

function PageMessage({ message, issues }: { message: string | null; issues: string[] }) {
  if (!message && issues.length === 0) {
    return null;
  }

  const hasIssues = issues.length > 0;
  return (
    <section
      className={`rounded-3xl border p-5 ${
        hasIssues ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"
      }`}
    >
      {message ? (
        <p className={`text-sm font-semibold ${hasIssues ? "text-amber-900" : "text-emerald-900"}`}>
          {message}
        </p>
      ) : null}
      {hasIssues ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-800">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function OptionCheckbox({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-slate-300 text-slate-950"
      />
      <span>{label}</span>
    </label>
  );
}

function StatusCard({
  profile,
  t,
}: {
  profile: Partial<FounderDiscoveryProfile>;
  t: DiscoveryT;
}) {
  const status = profile.status ?? "draft";
  const hint =
    status === "active"
      ? t("profile.status.activeHint")
      : status === "paused"
        ? t("profile.status.pausedHint")
        : t("profile.status.draftHint");

  return (
    <section className={CARD_CLASS}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t("profile.status.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            {t(`status.${status}`)}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["draft", "active", "paused"] as const).map((item) => (
            <span
              key={item}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                item === status
                  ? "bg-[color:var(--brand-primary)] text-slate-950"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {t(`status.${item}`)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function RoleCheckboxGrid({
  name,
  selected,
  t,
}: {
  name: string;
  selected: DiscoveryFounderRole[] | undefined;
  t: DiscoveryT;
}) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {DISCOVERY_ROLE_OPTIONS.map((option) => (
        <OptionCheckbox
          key={option.value}
          name={name}
          value={option.value}
          label={discoveryRoleLabel(t, option.value)}
          defaultChecked={isChecked(selected, option.value)}
        />
      ))}
    </div>
  );
}

function PublishIssuesCard({ issues, t }: { issues: string[]; t: DiscoveryT }) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">
        {t("profile.actions.publishIssues")}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-800">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </div>
  );
}

function MultiCheckboxGrid<T extends string>({
  name,
  selected,
  options,
}: {
  name: string;
  selected: T[] | undefined;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <OptionCheckbox
          key={option.value}
          name={name}
          value={option.value}
          label={option.label}
          defaultChecked={isChecked(selected, option.value)}
        />
      ))}
    </div>
  );
}

function assessmentSignalStatusCopy(
  readiness: OwnDiscoveryAssessmentSignalReadiness,
  t: DiscoveryT
) {
  if (!readiness.hasSubmittedBaseAssessment) {
    return t("profile.assessment.missingBase");
  }

  if (!readiness.includeAssessmentSignals) {
    return t("profile.assessment.inactive");
  }

  return t("profile.assessment.active");
}

function assessmentSignalStatusClass(readiness: OwnDiscoveryAssessmentSignalReadiness) {
  if (readiness.isAssessmentSignalReady) {
    return "bg-emerald-50 text-emerald-900";
  }

  if (!readiness.hasSubmittedBaseAssessment) {
    return "bg-amber-50 text-amber-900";
  }

  return "bg-slate-100 text-slate-600";
}

export default async function DiscoveryProfilePage({
  searchParams,
}: {
  searchParams: Promise<DiscoveryProfileSearchParams>;
}) {
  const t = await getTranslations("discovery");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent("/discovery/profile")}`);
  }

  const [loadedProfile, loadedPreferences, assessmentSignalReadiness] = await Promise.all([
    getOwnDiscoveryProfile(user.id),
    getOwnSearchPreferences(user.id),
    getOwnDiscoveryAssessmentSignalReadiness(user.id),
  ]);
  const params = await searchParams;
  const pageMessage = searchParamValue(params.message) ?? null;
  const pageIssues = searchParamValues(params.issue);
  const profile = { ...emptyProfile(), ...(loadedProfile ?? {}) };
  const defaultAssessmentSignalsForSubmittedBase =
    !loadedPreferences && assessmentSignalReadiness.hasSubmittedBaseAssessment;
  const preferences = loadedPreferences
    ? { ...loadedPreferences, isDefaultedForSubmittedBase: false }
    : {
        ...emptyPreferences(),
        includeAssessmentSignals: defaultAssessmentSignalsForSubmittedBase,
        isDefaultedForSubmittedBase: defaultAssessmentSignalsForSubmittedBase,
      };
  const effectiveAssessmentSignalReadiness: OwnDiscoveryAssessmentSignalReadiness = {
    ...assessmentSignalReadiness,
    includeAssessmentSignals: preferences.includeAssessmentSignals,
    isAssessmentSignalReady:
      preferences.includeAssessmentSignals && assessmentSignalReadiness.hasSubmittedBaseAssessment,
  };
  const publishIssues = getDiscoveryProfilePublishIssues(profile);
  const selectedPriorityCount = Object.values(preferences.priorityWeights).filter(
    (value) => typeof value === "number" && value > 0
  ).length;
  const ownRolesAtLimit =
    (profile.ownRoles?.length ?? 0) >= DISCOVERY_SELECTION_LIMITS.ownRoles;
  const seekingRolesAtLimit =
    (profile.seekingRoles?.length ?? 0) >= DISCOVERY_SELECTION_LIMITS.seekingRoles;
  const industriesAtLimit =
    (profile.industries?.length ?? 0) >= DISCOVERY_SELECTION_LIMITS.industries;
  const prioritiesAtLimit =
    selectedPriorityCount >= DISCOVERY_SELECTION_LIMITS.priorityWeightsAboveZero;
  const actionMessages = {
    draftSaved: t("profile.messages.draftSaved"),
    published: t("profile.messages.published"),
    paused: t("profile.messages.paused"),
    preferencesSaved: t("profile.messages.preferencesSaved"),
    fallbackError: t("profile.messages.fallbackError"),
  };

  async function saveProfileDraft(formData: FormData) {
    "use server";
    const result = await saveDiscoveryProfileDraftAction(formData);
    redirect(
      buildDiscoveryProfileRedirect(
        result,
        actionMessages.draftSaved,
        actionMessages.fallbackError
      )
    );
  }

  async function publishProfileFromForm(formData: FormData) {
    "use server";
    const result = await publishDiscoveryProfileFromFormAction(formData);
    redirect(
      buildDiscoveryProfileRedirect(
        result,
        actionMessages.published,
        actionMessages.fallbackError
      )
    );
  }

  async function pauseProfile() {
    "use server";
    const result = await pauseDiscoveryProfileAction();
    redirect(
      buildDiscoveryProfileRedirect(
        result,
        actionMessages.paused,
        actionMessages.fallbackError
      )
    );
  }

  async function savePreferences(formData: FormData) {
    "use server";
    const result = await saveDiscoveryPreferencesAction(formData);
    redirect(
      buildDiscoveryProfileRedirect(
        result,
        actionMessages.preferencesSaved,
        actionMessages.fallbackError
      )
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)] backdrop-blur md:p-6">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-900">
            {t("common.backToDashboard")}
          </Link>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("common.brandEyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
              {t("profile.title")}
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              {t("profile.subtitle")}
            </p>
          </div>
        </header>

        <StatusCard profile={profile} t={t} />
        <PageMessage message={pageMessage} issues={pageIssues} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)] lg:items-start">
          <section className={CARD_CLASS}>
            <form action={saveProfileDraft} className="grid gap-5">
              <div className={INNER_SECTION_CLASS}>
                <div className="border-b border-slate-200 pb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("profile.publicProfile.eyebrow")}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    {t("profile.publicProfile.title")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t("profile.publicProfile.description")}
                  </p>
                </div>

                <div className="mt-5 grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className={LABEL_CLASS}>{t("profile.publicProfile.displayName")}</span>
                  <input
                    name="displayName"
                    type="text"
                    defaultValue={profile.displayName}
                    maxLength={80}
                    className={FIELD_CLASS}
                    placeholder={t("profile.publicProfile.displayNamePlaceholder")}
                  />
                </label>
                <label>
                  <span className={LABEL_CLASS}>{t("profile.publicProfile.headline")}</span>
                  <input
                    name="headline"
                    type="text"
                    defaultValue={profile.headline}
                    maxLength={160}
                    className={FIELD_CLASS}
                    placeholder={t("profile.publicProfile.headlinePlaceholder")}
                  />
                </label>
              </div>

              <label>
                <span className={LABEL_CLASS}>{t("profile.publicProfile.bio")}</span>
                <textarea
                  name="bio"
                  defaultValue={profile.bio}
                  rows={5}
                  maxLength={1200}
                  className={FIELD_CLASS}
                  placeholder={t("profile.publicProfile.bioPlaceholder")}
                />
              </label>

              <div>
                <p className={LABEL_CLASS}>{t("profile.publicProfile.ownRoles")}</p>
                <p className={HELP_CLASS}>
                  {t("profile.publicProfile.ownRolesHelp", {
                    count: DISCOVERY_SELECTION_LIMITS.ownRoles,
                  })}
                </p>
                <RoleCheckboxGrid name="ownRoles" selected={profile.ownRoles} t={t} />
                {limitHint(ownRolesAtLimit, t("profile.publicProfile.ownRolesLimit"))}
              </div>

              <div>
                <p className={LABEL_CLASS}>{t("profile.publicProfile.seekingRoles")}</p>
                <p className={HELP_CLASS}>
                  {t("profile.publicProfile.seekingRolesHelp", {
                    count: DISCOVERY_SELECTION_LIMITS.seekingRoles,
                  })}
                </p>
                <RoleCheckboxGrid name="seekingRoles" selected={profile.seekingRoles} t={t} />
                {limitHint(
                  seekingRolesAtLimit,
                  t("profile.publicProfile.seekingRolesLimit")
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className={LABEL_CLASS}>{t("profile.publicProfile.industries")}</span>
                  <input
                    name="industries"
                    type="text"
                    defaultValue={(profile.industries ?? []).join(", ")}
                    className={FIELD_CLASS}
                    placeholder={t("profile.publicProfile.industriesPlaceholder")}
                  />
                  <p className={HELP_CLASS}>
                    {t("profile.publicProfile.industriesHelp", {
                      count: DISCOVERY_SELECTION_LIMITS.industries,
                    })}
                  </p>
                  {limitHint(
                    industriesAtLimit,
                    t("profile.publicProfile.industriesLimit")
                  )}
                </label>
                <label>
                  <span className={LABEL_CLASS}>{t("profile.publicProfile.location")}</span>
                  <input
                    name="locationLabel"
                    type="text"
                    defaultValue={profile.locationLabel ?? ""}
                    maxLength={120}
                    className={FIELD_CLASS}
                    placeholder={t("profile.publicProfile.locationPlaceholder")}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className={LABEL_CLASS}>{t("profile.publicProfile.remoteMode")}</span>
                  <select
                    name="remoteMode"
                    defaultValue={profile.remoteMode}
                    className={FIELD_CLASS}
                  >
                    {DISCOVERY_REMOTE_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(`remoteModes.${option.value}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={LABEL_CLASS}>{t("profile.publicProfile.availability")}</span>
                  <input
                    name="availabilityHoursPerWeek"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={profile.availabilityHoursPerWeek ?? ""}
                    className={FIELD_CLASS}
                    placeholder={t("profile.publicProfile.availabilityPlaceholder")}
                  />
                </label>
              </div>
                </div>
              </div>

              <div className={INNER_SECTION_CLASS}>
                <div className="border-b border-slate-200 pb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("profile.venture.eyebrow")}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    {t("profile.venture.title")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t("profile.venture.description")}
                  </p>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label>
                  <span className={LABEL_CLASS}>{t("profile.venture.commitment")}</span>
                  <select
                    name="commitmentLevel"
                    defaultValue={profile.commitmentLevel}
                    className={FIELD_CLASS}
                  >
                    {DISCOVERY_COMMITMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(`commitmentLevels.${option.value}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={LABEL_CLASS}>{t("profile.venture.stage")}</span>
                  <select
                    name="ventureStage"
                    defaultValue={profile.ventureStage}
                    className={FIELD_CLASS}
                  >
                    {DISCOVERY_VENTURE_STAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(`ventureStages.${option.value}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={LABEL_CLASS}>{t("profile.venture.goal")}</span>
                  <select name="ventureGoal" defaultValue={profile.ventureGoal} className={FIELD_CLASS}>
                  {DISCOVERY_VENTURE_GOAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(`ventureGoals.${option.value}`)}
                    </option>
                  ))}
                  </select>
                </label>
                </div>
              </div>

              <PublishIssuesCard issues={publishIssues} t={t} />

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                <button type="submit" className={PRIMARY_BUTTON_CLASS}>
                  {t("profile.actions.saveDraft")}
                </button>
                <button type="submit" formAction={publishProfileFromForm} className={PRIMARY_BUTTON_CLASS}>
                  {t("profile.actions.publish")}
                </button>
              </div>
              <p className="-mt-3 text-xs leading-5 text-slate-500">
                {t("profile.actions.publishHelp")}
              </p>
            </form>

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
              <form action={pauseProfile}>
                <button type="submit" className={SECONDARY_BUTTON_CLASS}>
                  {t("profile.actions.pause")}
                </button>
              </form>
            </div>
          </section>

          <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
            <section className={CARD_CLASS}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t("profile.preview.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {t("profile.preview.title")}
              </h2>
              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-950">
                  {previewText(profile.displayName, t("profile.preview.displayNameFallback"))}
                </p>
                <p className="mt-2 text-xl font-semibold leading-7 text-slate-950">
                  {previewText(profile.headline, t("profile.preview.headlineFallback"))}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {previewText(
                    profile.bio,
                    t("profile.preview.bioFallback")
                  )}
                </p>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div>
                    <dt className="font-semibold text-slate-900">{t("profile.preview.brings")}</dt>
                    <dd className="mt-1 text-slate-600">{formatRoleList(profile.ownRoles, t)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t("profile.preview.seeks")}</dt>
                    <dd className="mt-1 text-slate-600">{formatRoleList(profile.seekingRoles, t)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t("profile.preview.interests")}</dt>
                    <dd className="mt-1 text-slate-600">{formatIndustries(profile.industries, t)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t("profile.preview.workFrame")}</dt>
                    <dd className="mt-1 text-slate-600">
                      {t(`remoteModes.${profile.remoteMode as DiscoveryRemoteMode}`)} ·{" "}
                      {profile.availabilityHoursPerWeek
                        ? t("profile.preview.hoursPerWeek", {
                            hours: profile.availabilityHoursPerWeek,
                          })
                        : t("profile.preview.timeOpen")}
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {t("profile.preview.privacy")}
              </p>
            </section>

          </aside>
        </div>

        <section className={CARD_CLASS}>
          <div className="border-b border-slate-200 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("profile.preferences.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              {t("profile.preferences.title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t("profile.preferences.description", {
                count: DISCOVERY_SELECTION_LIMITS.priorityWeightsAboveZero,
              })}
            </p>
            {limitHint(
              prioritiesAtLimit,
              t("profile.preferences.limit", {
                count: DISCOVERY_SELECTION_LIMITS.priorityWeightsAboveZero,
              })
            )}
          </div>

          <form action={savePreferences} className="mt-6 grid gap-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {DISCOVERY_PRIORITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                >
                  <span className="text-sm font-semibold text-slate-950">
                    {t(`priorities.${option.value}.label`)}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {t(`priorities.${option.value}.description`)}
                  </span>
                  <input
                    name={`priorityWeights.${option.value}`}
                    type="range"
                    min={0}
                    max={5}
                    step={1}
                    defaultValue={preferences.priorityWeights[option.value] ?? 0}
                    className="mt-3 w-full accent-[color:var(--brand-primary)]"
                  />
                  <span className="mt-1 block text-xs text-slate-500">
                    {t("profile.preferences.rangeHelp")}
                  </span>
                </label>
              ))}
            </div>

            <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t("profile.assessment.eyebrow")}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                {t("profile.assessment.title")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("profile.assessment.description")}
              </p>
              <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <input
                  type="checkbox"
                  name="includeAssessmentSignals"
                  value="true"
                  defaultChecked={preferences.includeAssessmentSignals}
                  disabled={!effectiveAssessmentSignalReadiness.hasSubmittedBaseAssessment}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-950">
                    {t("profile.assessment.checkbox")}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {t("profile.assessment.checkboxHelp")}
                  </span>
                </span>
              </label>
              {!effectiveAssessmentSignalReadiness.hasSubmittedBaseAssessment ? (
                <Link href="/me/base?next=/discovery/profile" className={`${PRIMARY_BUTTON_CLASS} mt-4`}>
                  {t("profile.assessment.fillBase")}
                </Link>
              ) : null}
              {preferences.isDefaultedForSubmittedBase ? (
                <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-900">
                  {t("profile.assessment.defaulted")}
                </p>
              ) : null}
              <p
                className={`mt-4 rounded-2xl px-4 py-3 text-sm leading-6 ${assessmentSignalStatusClass(
                  effectiveAssessmentSignalReadiness
                )}`}
              >
                {assessmentSignalStatusCopy(effectiveAssessmentSignalReadiness, t)}
              </p>
            </section>

            <details className="rounded-3xl border border-slate-200 bg-white p-5">
              <summary className="cursor-pointer text-lg font-semibold text-slate-950">
                {t("profile.filters.title")}
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {t("profile.filters.description")}
              </p>

              <div className="mt-5 grid gap-5">
                <label>
                  <span className={LABEL_CLASS}>{t("profile.filters.minimumAvailability")}</span>
                  <input
                    name="minimumAvailabilityHoursPerWeek"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={preferences.mustHaves.minimumAvailabilityHoursPerWeek ?? ""}
                    className={FIELD_CLASS}
                    placeholder={t("profile.filters.minimumAvailabilityPlaceholder")}
                  />
                </label>

                <div>
                  <p className={LABEL_CLASS}>{t("profile.filters.acceptedRemoteModes")}</p>
                  <MultiCheckboxGrid<DiscoveryRemoteMode>
                    name="acceptedRemoteModes"
                    selected={preferences.mustHaves.acceptedRemoteModes}
                    options={DISCOVERY_REMOTE_MODE_OPTIONS.map((option) => ({
                      value: option.value,
                      label: t(`remoteModes.${option.value}`),
                    }))}
                  />
                </div>

                <div>
                  <p className={LABEL_CLASS}>{t("profile.filters.requiredRoles")}</p>
                  <RoleCheckboxGrid
                    name="requiredRolesAny"
                    selected={preferences.mustHaves.requiredRolesAny}
                    t={t}
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  <div>
                    <p className={LABEL_CLASS}>{t("profile.filters.commitment")}</p>
                    <MultiCheckboxGrid<DiscoveryCommitmentLevel>
                      name="acceptedCommitmentLevels"
                      selected={preferences.mustHaves.acceptedCommitmentLevels}
                      options={DISCOVERY_COMMITMENT_OPTIONS.map((option) => ({
                        value: option.value,
                        label: t(`commitmentLevels.${option.value}`),
                      }))}
                    />
                  </div>
                  <div>
                    <p className={LABEL_CLASS}>{t("profile.filters.stages")}</p>
                    <MultiCheckboxGrid<DiscoveryVentureStage>
                      name="acceptedVentureStages"
                      selected={preferences.mustHaves.acceptedVentureStages}
                      options={DISCOVERY_VENTURE_STAGE_OPTIONS.map((option) => ({
                        value: option.value,
                        label: t(`ventureStages.${option.value}`),
                      }))}
                    />
                  </div>
                  <div>
                    <p className={LABEL_CLASS}>{t("profile.filters.goals")}</p>
                    <MultiCheckboxGrid<DiscoveryVentureGoal>
                      name="acceptedVentureGoals"
                      selected={preferences.mustHaves.acceptedVentureGoals}
                      options={DISCOVERY_VENTURE_GOAL_OPTIONS.map((option) => ({
                        value: option.value,
                        label: t(`ventureGoals.${option.value}`),
                      }))}
                    />
                  </div>
                </div>
              </div>
            </details>

            <div>
              <button type="submit" className={PRIMARY_BUTTON_CLASS}>
                {t("profile.preferences.save")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
