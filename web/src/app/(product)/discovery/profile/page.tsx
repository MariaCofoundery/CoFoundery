import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  DISCOVERY_COMMITMENT_OPTIONS,
  DISCOVERY_REMOTE_MODE_OPTIONS,
  DISCOVERY_ROLE_OPTIONS,
  DISCOVERY_SELECTION_LIMITS,
  DISCOVERY_VENTURE_GOAL_OPTIONS,
  DISCOVERY_VENTURE_STAGE_OPTIONS,
} from "@/features/discovery/discoveryConfig";
import {
  pauseDiscoveryProfileAction,
  publishDiscoveryProfileFromFormAction,
  saveDiscoveryProfileDraftAction,
} from "@/features/discovery/discoveryActions";
import {
  getOwnDiscoveryProfile,
} from "@/features/discovery/discoveryData";
import {
  mapDiscoveryProfilePublishIssues,
  resolveDiscoveryProfileDraftFeedback,
  resolveDiscoveryProfilePauseFeedback,
  resolveDiscoveryProfilePublishFeedback,
  selectDiscoveryProfileFeedback,
  type DiscoveryProfileDraftResult,
  type DiscoveryProfilePauseResult,
  type DiscoveryProfilePublishIssue,
  type DiscoveryProfilePublishResult,
} from "@/features/discovery/discoveryProfileFeedback";
import { getDiscoveryProfilePublishIssues } from "@/features/discovery/discoveryValidation";
import type {
  DiscoveryFounderRole,
  DiscoveryRemoteMode,
  FounderDiscoveryProfile,
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
  draftResult?: string | string[];
  draftError?: string | string[];
  preferencesResult?: string | string[];
  preferencesError?: string | string[];
  pauseResult?: string | string[];
  pauseError?: string | string[];
  publishResult?: string | string[];
  publishError?: string | string[];
  publishIssue?: string | string[];
};

function emptyProfile(): Partial<FounderDiscoveryProfile> {
  return {
    status: "draft",
    displayName: "",
    headline: "",
    bio: "",
    ownRoles: [],
    seekingRoles: [],
    expertise: [],
    industries: [],
    locationLabel: "",
    locationRegion: "",
    remoteMode: "flexible",
    availabilityHoursPerWeek: null,
    commitmentLevel: "exploring",
    ventureStage: "undecided",
    ventureGoal: "undecided",
    publishedAt: null,
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

function buildDiscoveryProfilePublishRedirect(result: DiscoveryProfilePublishResult) {
  const params = new URLSearchParams();
  if (result.ok) {
    params.set("publishResult", result.reason);
  } else {
    params.set("publishError", result.reason);
    for (const issue of result.issues ?? []) {
      params.append("publishIssue", issue);
    }
  }
  return `/discovery/profile?${params.toString()}`;
}

function buildDiscoveryProfileDraftRedirect(result: DiscoveryProfileDraftResult) {
  const params = new URLSearchParams();
  params.set(result.ok ? "draftResult" : "draftError", result.reason);
  return `/discovery/profile?${params.toString()}`;
}

function buildDiscoveryProfilePauseRedirect(result: DiscoveryProfilePauseResult) {
  const params = new URLSearchParams();
  params.set(result.ok ? "pauseResult" : "pauseError", result.reason);
  return `/discovery/profile?${params.toString()}`;
}

function translatePublishIssue(issue: DiscoveryProfilePublishIssue, t: DiscoveryT) {
  return t(`profile.publishIssueItems.${issue}`);
}

function PageMessage({
  message,
  issues,
  tone,
  t,
}: {
  message: string | null;
  issues: DiscoveryProfilePublishIssue[];
  tone?: "success" | "error";
  t: DiscoveryT;
}) {
  if (!message && issues.length === 0) {
    return null;
  }

  const isError = tone ? tone === "error" : issues.length > 0;
  return (
    <section
      className={`rounded-3xl border p-5 ${
        isError ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"
      }`}
    >
      {message ? (
        <p className={`text-sm font-semibold ${isError ? "text-amber-900" : "text-emerald-900"}`}>
          {message}
        </p>
      ) : null}
      {issues.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-800">
          {issues.map((issue) => (
            <li key={issue}>{translatePublishIssue(issue, t)}</li>
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

function PublishIssuesCard({
  issues,
  t,
}: {
  issues: DiscoveryProfilePublishIssue[];
  t: DiscoveryT;
}) {
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
          <li key={issue}>{translatePublishIssue(issue, t)}</li>
        ))}
      </ul>
    </div>
  );
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

  const loadedProfile = await getOwnDiscoveryProfile(user.id);
  const params = await searchParams;
  const publishFeedback = resolveDiscoveryProfilePublishFeedback({
    result: searchParamValue(params.publishResult),
    error: searchParamValue(params.publishError),
    issues: searchParamValues(params.publishIssue),
  });
  const draftFeedback = resolveDiscoveryProfileDraftFeedback({
    result: searchParamValue(params.draftResult),
    error: searchParamValue(params.draftError),
  });
  const pauseFeedback = resolveDiscoveryProfilePauseFeedback({
    result: searchParamValue(params.pauseResult),
    error: searchParamValue(params.pauseError),
  });
  const localizedFeedback = selectDiscoveryProfileFeedback({
    publish: publishFeedback,
    draft: draftFeedback,
    preferences: null,
    pause: pauseFeedback,
  });
  const pageMessage = localizedFeedback ? t(localizedFeedback.messageKey) : null;
  const pageIssues = localizedFeedback
    ? "issues" in localizedFeedback
      ? localizedFeedback.issues
      : []
    : [];
  const profile = { ...emptyProfile(), ...(loadedProfile ?? {}) };
  const publishIssues = mapDiscoveryProfilePublishIssues(getDiscoveryProfilePublishIssues(profile));
  const ownRolesAtLimit =
    (profile.ownRoles?.length ?? 0) >= DISCOVERY_SELECTION_LIMITS.ownRoles;
  const seekingRolesAtLimit =
    (profile.seekingRoles?.length ?? 0) >= DISCOVERY_SELECTION_LIMITS.seekingRoles;
  const industriesAtLimit =
    (profile.industries?.length ?? 0) >= DISCOVERY_SELECTION_LIMITS.industries;
  async function saveProfileDraft(formData: FormData) {
    "use server";
    const result = await saveDiscoveryProfileDraftAction(formData);
    redirect(buildDiscoveryProfileDraftRedirect(result));
  }

  async function publishProfileFromForm(formData: FormData) {
    "use server";
    const result = await publishDiscoveryProfileFromFormAction(formData);
    redirect(buildDiscoveryProfilePublishRedirect(result));
  }

  async function pauseProfile() {
    "use server";
    const result = await pauseDiscoveryProfileAction();
    redirect(buildDiscoveryProfilePauseRedirect(result));
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
        <PageMessage
          message={pageMessage}
          issues={pageIssues}
          tone={localizedFeedback ? (localizedFeedback.ok ? "success" : "error") : undefined}
          t={t}
        />

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
                      <input name="displayName" type="text" defaultValue={profile.displayName} maxLength={80} className={FIELD_CLASS} placeholder={t("profile.publicProfile.displayNamePlaceholder")} />
                    </label>
                    <label>
                      <span className={LABEL_CLASS}>{t("profile.publicProfile.headline")}</span>
                      <input name="headline" type="text" defaultValue={profile.headline} maxLength={160} className={FIELD_CLASS} placeholder={t("profile.publicProfile.headlinePlaceholder")} />
                    </label>
                  </div>
                  <label>
                    <span className={LABEL_CLASS}>{t("profile.publicProfile.bio")}</span>
                    <textarea name="bio" defaultValue={profile.bio} rows={5} maxLength={1200} className={FIELD_CLASS} placeholder={t("profile.publicProfile.bioPlaceholder")} />
                  </label>
                  <input type="hidden" name="locationLabel" value={profile.locationLabel ?? ""} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <label>
                      <span className={LABEL_CLASS}>{t("profile.publicProfile.locationRegion")}</span>
                      <input name="locationRegion" type="text" defaultValue={profile.locationRegion ?? ""} maxLength={120} className={FIELD_CLASS} placeholder={t("profile.publicProfile.locationRegionPlaceholder")} />
                      <span className={HELP_CLASS}>{t("profile.publicProfile.locationRegionHelp")}</span>
                    </label>
                    <label>
                      <span className={LABEL_CLASS}>{t("profile.publicProfile.remoteMode")}</span>
                      <select name="remoteMode" defaultValue={profile.remoteMode} className={FIELD_CLASS}>
                        {DISCOVERY_REMOTE_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{t(`remoteModes.${option.value}`)}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <div className={INNER_SECTION_CLASS}>
                <h2 className="text-2xl font-semibold text-slate-950">{t("profile.brings.title")}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("profile.brings.description")}</p>
                <div className="mt-5 grid gap-5">
                  <div>
                    <p className={LABEL_CLASS}>{t("profile.publicProfile.ownRoles")}</p>
                    <p className={HELP_CLASS}>{t("profile.publicProfile.ownRolesHelp", { count: DISCOVERY_SELECTION_LIMITS.ownRoles })}</p>
                    <RoleCheckboxGrid name="ownRoles" selected={profile.ownRoles} t={t} />
                    {limitHint(ownRolesAtLimit, t("profile.publicProfile.ownRolesLimit"))}
                  </div>
                  <label>
                    <span className={LABEL_CLASS}>{t("profile.publicProfile.expertise")}</span>
                    <input name="expertise" type="text" defaultValue={(profile.expertise ?? []).join(", ")} className={FIELD_CLASS} placeholder={t("profile.publicProfile.expertisePlaceholder")} />
                    <span className={HELP_CLASS}>{t("profile.publicProfile.expertiseHelp", { count: DISCOVERY_SELECTION_LIMITS.expertise })}</span>
                  </label>
                  <label>
                    <span className={LABEL_CLASS}>{t("profile.publicProfile.availabilityV2")}</span>
                    <input name="availabilityHoursPerWeek" type="number" min={1} max={100} defaultValue={profile.availabilityHoursPerWeek ?? ""} className={FIELD_CLASS} placeholder={t("profile.publicProfile.availabilityPlaceholder")} />
                  </label>
                  <label>
                    <span className={LABEL_CLASS}>{t("profile.publicProfile.industries")}</span>
                    <input name="industries" type="text" defaultValue={(profile.industries ?? []).join(", ")} className={FIELD_CLASS} placeholder={t("profile.publicProfile.industriesPlaceholder")} />
                    <p className={HELP_CLASS}>{t("profile.publicProfile.industriesLegacyHelp", { count: DISCOVERY_SELECTION_LIMITS.industries })}</p>
                    {limitHint(industriesAtLimit, t("profile.publicProfile.industriesLimit"))}
                  </label>
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

              <div className={INNER_SECTION_CLASS}>
                <h2 className="text-2xl font-semibold text-slate-950">{t("profile.seeking.title")}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("profile.seeking.description")}</p>
                <div className="mt-5">
                  <p className={LABEL_CLASS}>{t("profile.publicProfile.seekingRoles")}</p>
                  <p className={HELP_CLASS}>{t("profile.publicProfile.seekingRolesHelp", { count: DISCOVERY_SELECTION_LIMITS.seekingRoles })}</p>
                  <RoleCheckboxGrid name="seekingRoles" selected={profile.seekingRoles} t={t} />
                  {limitHint(seekingRolesAtLimit, t("profile.publicProfile.seekingRolesLimit"))}
                </div>
                <Link href="/discovery#search" className={`${SECONDARY_BUTTON_CLASS} mt-5`}>
                  {t("profile.seeking.editPrivateSearch")}
                </Link>
              </div>

              <PublishIssuesCard issues={publishIssues} t={t} />

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                <button type="submit" className={PRIMARY_BUTTON_CLASS}>
                  {profile.status === "active" ? t("profile.actions.saveChanges") : t("profile.actions.saveDraft")}
                </button>
                {profile.status !== "active" ? (
                  <button type="submit" formAction={publishProfileFromForm} className={PRIMARY_BUTTON_CLASS}>
                    {t("profile.actions.publish")}
                  </button>
                ) : null}
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
                    <dt className="font-semibold text-slate-900">{t("profile.preview.expertise")}</dt>
                    <dd className="mt-1 text-slate-600">{formatIndustries(profile.expertise ?? [], t)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t("profile.preview.workFrame")}</dt>
                    <dd className="mt-1 text-slate-600">
                      {profile.locationRegion ? `${profile.locationRegion} · ` : ""}{t(`remoteModes.${profile.remoteMode as DiscoveryRemoteMode}`)} ·{" "}
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

      </div>
    </main>
  );
}
