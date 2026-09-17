import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  DISCOVERY_COMMITMENT_OPTIONS,
  DISCOVERY_ROLE_OPTIONS,
  DISCOVERY_SELECTION_LIMITS,
  DISCOVERY_VENTURE_GOAL_OPTIONS,
  DISCOVERY_VENTURE_STAGE_OPTIONS,
} from "@/features/discovery/discoveryConfig";
import {
  pauseDiscoveryProfileAction,
  publishDiscoveryProfileFromFormAction,
  saveDiscoveryV2AlignmentPreferencesAction,
  saveDiscoveryProfileDraftAction,
} from "@/features/discovery/discoveryActions";
import { hasFounderDiscoveryAccess } from "@/features/discovery/discoveryAccess";
import { discoveryRoleLabels } from "@/features/discovery/discoveryPresentation";
import {
  getOwnDiscoveryProfile,
  getOwnSearchPreferences,
} from "@/features/discovery/discoveryData";
import {
  getOwnDiscoveryAssessmentSignalReadiness,
  getOwnDiscoveryV2AlignmentTendencies,
} from "@/features/discovery/discoveryAssessmentSignals";
import { DiscoveryAlignmentPreferencesEditor } from "@/features/discovery/DiscoveryAlignmentPreferencesEditor";
import { DiscoveryRoleField } from "@/features/discovery/DiscoveryRoleField";
import { DISCOVERY_PROFILE_PUBLISH_ISSUES } from "@/features/discovery/discoveryProfileFeedback";
import {
  resolveDiscoveryProfileDraftFeedback,
  resolveDiscoveryProfilePauseFeedback,
  resolveDiscoveryProfilePublishFeedback,
  resolveDiscoveryPreferencesFeedback,
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
import {
  DISCOVERY_SEARCH_INTENTS,
  DISCOVERY_START_HORIZONS,
} from "@/features/discovery/discoveryTypes";
import { getPersonCore } from "@/features/profile/personCoreData";
import { createClient } from "@/lib/supabase/server";
import { normalizeLocale } from "@/i18n/config";
import { SubmitButton } from "@/features/ui/SubmitButton";

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
// Ein Abschnitt im Formular, getrennt durch eine Haarlinie statt durch einen
// eigenen Rahmen: Karte im Kasten im Kasten war drei Rahmen tief und liess
// jede Ueberschrift wie eine eigene Seite aussehen.
const INNER_SECTION_CLASS = "border-t border-slate-200/70 pt-7 first:border-t-0 first:pt-0";

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
    locationRegion: "",
    remoteMode: "flexible",
    availabilityHoursPerWeek: null,
    commitmentLevel: "exploring",
    ventureStage: "undecided",
    ventureGoal: "undecided",
    searchIntent: null,
    startHorizon: null,
    publishedAt: null,
  };
}

function discoveryRoleLabel(t: DiscoveryT, value: DiscoveryFounderRole) {
  return t(`roles.${value}`);
}

function formatRoleList(
  values: DiscoveryFounderRole[] | undefined,
  other: string | null | undefined,
  t: DiscoveryT
) {
  if (!values || values.length === 0) return t("common.notProvided");
  // "Anderer Schwerpunkt" wird durch den Text ersetzt, den die Person dazu
  // geschrieben hat - sonst stuende die Floskel in der eigenen Vorschau.
  return discoveryRoleLabels(values, other, (role) =>
    discoveryRoleLabel(t, role as DiscoveryFounderRole)
  ).join(", ");
}

function previewText(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function formatIndustries(values: string[] | undefined, t: DiscoveryT) {
  return values && values.length > 0 ? values.join(", ") : t("common.notProvided");
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

function CompletionMeter({
  issues,
  t,
}: {
  issues: DiscoveryProfilePublishIssue[];
  t: DiscoveryT;
}) {
  const total = DISCOVERY_PROFILE_PUBLISH_ISSUES.length;
  const done = total - issues.length;
  const percent = Math.round((done / total) * 100);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {t("profile.status.completionTitle")}
        </p>
        <p className="text-sm font-semibold text-slate-900">
          {t("profile.status.completionCount", { done, total })}
        </p>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/80"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={t("profile.status.completionTitle")}
      >
        <div
          className={`discovery-meter-fill h-full rounded-full ${
            issues.length === 0 ? "bg-emerald-500" : "bg-[color:var(--brand-primary)]"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {issues.length === 0
          ? t("profile.status.completionDone")
          : t("profile.status.completionRemaining", { count: issues.length })}
      </p>
    </div>
  );
}

function StatusCard({
  profile,
  issues,
  t,
}: {
  profile: Partial<FounderDiscoveryProfile>;
  issues: DiscoveryProfilePublishIssue[];
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
    <section
      className={`${CARD_CLASS} discovery-rise`}
      style={{ "--rise-delay": "60ms" } as CSSProperties}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t("profile.status.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            {t("profile.actions.visibilityTitle")}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{hint}</p>
        </div>
        {/* Nur der Zustand, der gilt. Alle drei nebeneinander sahen aus wie
            eine Umschaltung, war aber reine Anzeige - und die Ueberschrift
            sagt dasselbe schon. */}
        <span
          className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
            status === "active"
              ? "bg-emerald-100 text-emerald-900"
              : status === "paused"
                ? "bg-amber-100 text-amber-900"
                : "bg-slate-100 text-slate-700"
          }`}
        >
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${
              status === "active"
                ? "bg-emerald-600"
                : status === "paused"
                  ? "bg-amber-600"
                  : "bg-slate-400"
            }`}
          />
          {t(`status.${status}`)}
        </span>
      </div>
      {status !== "active" || issues.length > 0 ? <CompletionMeter issues={issues} t={t} /> : null}
    </section>
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

/**
 * Ein Auswahlfeld, das sagt, was die Antworten bedeuten.
 *
 * "Nebenprojekt" oder "Ich validiere eine Idee" klingen eindeutig und sind es
 * nicht - jede Person legt etwas anderes hinein. Der Hinweis unter dem Feld
 * zeigt zur gewaehlten Option, was hier damit gemeint ist; ohne JavaScript
 * steht dort die Erklaerung zum gespeicherten Wert.
 */
function ExplainedSelect({
  name,
  label,
  help,
  value,
  options,
  optionLabel,
  optionHint,
}: {
  name: string;
  label: string;
  help: string;
  value: string;
  options: readonly string[];
  optionLabel: (option: string) => string;
  optionHint: (option: string) => string;
}) {
  return (
    <label>
      <span className={LABEL_CLASS}>{label}</span>
      <select name={name} defaultValue={value} className={FIELD_CLASS}>
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
      <span className="mt-2 block rounded-2xl bg-white px-3 py-2 text-xs leading-5 text-slate-600">
        {optionHint(value)}
      </span>
      <span className={HELP_CLASS}>{help}</span>
    </label>
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
  if (!(await hasFounderDiscoveryAccess(user.id, supabase))) {
    redirect("/advisor/dashboard");
  }

  const locale = normalizeLocale(await getLocale());
  const [loadedProfile, loadedPreferences, alignmentReadiness, ownAlignmentTendencies, core] = await Promise.all([
    getOwnDiscoveryProfile(user.id),
    getOwnSearchPreferences(user.id),
    getOwnDiscoveryAssessmentSignalReadiness(user.id),
    getOwnDiscoveryV2AlignmentTendencies({ ownerUserId: user.id, locale }),
    getPersonCore(supabase, user.id),
  ]);
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
  const preferencesFeedback = resolveDiscoveryPreferencesFeedback({
    result: searchParamValue(params.preferencesResult),
    error: searchParamValue(params.preferencesError),
  });
  const localizedFeedback = selectDiscoveryProfileFeedback({
    publish: publishFeedback,
    draft: draftFeedback,
    preferences: preferencesFeedback,
    pause: pauseFeedback,
  });
  const pageMessage = localizedFeedback ? t(localizedFeedback.messageKey) : null;
  const profile = { ...emptyProfile(), ...(loadedProfile ?? {}) };
  const publishIssues = getDiscoveryProfilePublishIssues(profile);
  async function saveProfileDraft(formData: FormData) {
    "use server";
    const result = await saveDiscoveryProfileDraftAction(formData);
    redirect(buildDiscoveryProfileDraftRedirect(result));
  }

  /**
   * Speichern und weggehen.
   *
   * Ein Link mitten im Formular verwirft alles, was noch nicht gespeichert
   * ist - lautlos. Drei solche Links standen hier. Statt sie zu verschieben
   * (was nichts aendert: die Stelle im Dokument schuetzt keine Eingabe),
   * speichern sie jetzt erst und gehen dann.
   *
   * Ohne Pflichtfeldpruefung: Ein Entwurf darf unvollstaendig sein, sonst
   * saesse jemand fest, der "Anderer Schwerpunkt" angekreuzt und den Text
   * noch nicht geschrieben hat.
   */
  async function saveDraftAndLeave(target: string, formData: FormData) {
    "use server";
    await saveDiscoveryProfileDraftAction(formData);
    redirect(target);
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

  async function saveAlignmentPreferences(formData: FormData) {
    "use server";
    const result = await saveDiscoveryV2AlignmentPreferencesAction(formData);
    redirect(
      `/discovery/profile?preferences${result.ok ? "Result=preferences_saved" : "Error=preferences_save_failed"}`
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header
          className="discovery-rise flex flex-col gap-4 rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)] backdrop-blur md:p-6"
          style={{ "--rise-delay": "0ms" } as CSSProperties}
        >
          <Link
            href="/discovery"
            className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            <span aria-hidden>←</span>
            {t("common.backToDiscovery")}
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

        <StatusCard profile={profile} issues={publishIssues} t={t} />
        <PageMessage
          message={pageMessage}
          issues={[]}
          tone={localizedFeedback ? (localizedFeedback.ok ? "success" : "error") : undefined}
          t={t}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)] lg:items-start">
          <div className="flex flex-col gap-5">
          <section
            className={`${CARD_CLASS} discovery-rise`}
            style={{ "--rise-delay": "120ms" } as CSSProperties}
          >
            <form action={saveProfileDraft} className="grid gap-5">
              <div className={INNER_SECTION_CLASS}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("profile.publicProfile.eyebrow")}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">
                    {t("profile.publicProfile.title")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t("profile.publicProfile.description")}
                  </p>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-semibold">{t("profile.publicProfile.identityTitle")}</h3>
                  {core?.display_name ? (
                    <>
                      <div className="mt-3 space-y-1 text-sm text-slate-700">
                        <p className="font-medium">{core.display_name}</p>
                        {core.headline ? <p>{core.headline}</p> : null}
                        {core.bio ? <p className="line-clamp-2 text-slate-600">{core.bio}</p> : null}
                        {core.location_region ? <p className="text-slate-600">{core.location_region}</p> : null}
                      </div>
                      {/* Expertise, Branchen und Arbeitsweise stehen in der
                          Vorschau rechts - kamen hier aber nicht vor. Wer sie
                          dort leer sah, fand keinen Ort, sie zu ergaenzen. */}
                      <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {t("profile.publicProfile.identityExpertise")}
                          </dt>
                          <dd className="mt-1 text-slate-700">
                            {core.expertise?.length
                              ? core.expertise.join(", ")
                              : t("profile.publicProfile.identityEmpty")}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {t("profile.publicProfile.identityIndustries")}
                          </dt>
                          <dd className="mt-1 text-slate-700">
                            {core.industries?.length
                              ? core.industries.join(", ")
                              : t("profile.publicProfile.identityEmpty")}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {t("profile.publicProfile.identityWorkFrame")}
                          </dt>
                          <dd className="mt-1 text-slate-700">
                            {core.remote_mode
                              ? t(`remoteModes.${core.remote_mode as DiscoveryRemoteMode}`)
                              : t("profile.publicProfile.identityEmpty")}
                          </dd>
                        </div>
                      </dl>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-amber-900">{t("profile.publicProfile.identityMissing")}</p>
                  )}
                  <p className={`${HELP_CLASS} mt-4`}>{t("profile.publicProfile.identityText")}</p>
                  <SubmitButton
                    formAction={saveDraftAndLeave.bind(null, "/profile?next=/discovery/profile")}
                    formNoValidate
                    intent="identity"
                    label={t("profile.publicProfile.identityLink")}
                    pendingLabel={t("profile.publicProfile.identityLinkPending")}
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline"
                  />
                </div>
              </div>

              <div className={INNER_SECTION_CLASS}>
                <h2 className="text-xl font-semibold text-slate-950">{t("profile.brings.title")}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("profile.brings.description")}</p>
                <div className="mt-5 grid gap-5">
                  <div>
                    <p className={LABEL_CLASS}>{t("profile.publicProfile.ownRoles")}</p>
                    <p className={HELP_CLASS}>{t("profile.publicProfile.ownRolesHelp", { count: DISCOVERY_SELECTION_LIMITS.ownRoles })}</p>
                    <DiscoveryRoleField
                      name="ownRoles"
                      otherName="ownRoleOther"
                      options={DISCOVERY_ROLE_OPTIONS.map((option) => ({
                        value: option.value,
                        label: discoveryRoleLabel(t, option.value),
                      }))}
                      initialSelected={profile.ownRoles ?? []}
                      initialOther={profile.ownRoleOther ?? null}
                      max={DISCOVERY_SELECTION_LIMITS.ownRoles}
                      copy={{
                        limitReached: t("profile.publicProfile.roleLimitReached"),
                        otherLabel: t("profile.publicProfile.ownRoleOtherLabel"),
                        otherPlaceholder: t("profile.publicProfile.ownRoleOtherPlaceholder"),
                        otherHint: t("profile.publicProfile.ownRoleOtherHint"),
                        counter: (selected, max) =>
                          t("profile.publicProfile.roleCounter", { selected, max }),
                      }}
                    />
                  </div>
                  <label>
                    <span className={LABEL_CLASS}>{t("profile.publicProfile.availabilityV2")}</span>
                    {/* Die Einheit gehoert ans Feld, nicht in die Frage allein:
                        "20" ohne Angabe liess offen, ob Stunden, Prozent oder
                        Tage gemeint sind. */}
                    <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-100">
                      <input
                        name="availabilityHoursPerWeek"
                        type="number"
                        min={1}
                        max={100}
                        defaultValue={profile.availabilityHoursPerWeek ?? ""}
                        className="w-24 border-0 bg-transparent p-0 text-sm text-slate-900 outline-none"
                        placeholder={t("profile.publicProfile.availabilityPlaceholder")}
                      />
                      <span className="text-sm font-medium text-slate-500">
                        {t("profile.publicProfile.availabilitySuffix")}
                      </span>
                    </span>
                    <span className={HELP_CLASS}>{t("profile.publicProfile.availabilityHelp")}</span>
                  </label>
                </div>
              </div>

              <div className={INNER_SECTION_CLASS}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("profile.venture.eyebrow")}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">
                    {t("profile.venture.title")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t("profile.venture.description")}
                  </p>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-3">
                  <ExplainedSelect
                    name="commitmentLevel"
                    label={t("profile.venture.commitment")}
                    help={t("profile.venture.commitmentHelp")}
                    value={profile.commitmentLevel ?? "exploring"}
                    options={DISCOVERY_COMMITMENT_OPTIONS.map((option) => option.value)}
                    optionLabel={(option) => t(`commitmentLevels.${option}`)}
                    optionHint={(option) => t(`commitmentLevelHints.${option}`)}
                  />
                  <ExplainedSelect
                    name="ventureStage"
                    label={t("profile.venture.stage")}
                    help={t("profile.venture.stageHelp")}
                    value={profile.ventureStage ?? "undecided"}
                    options={DISCOVERY_VENTURE_STAGE_OPTIONS.map((option) => option.value)}
                    optionLabel={(option) => t(`ventureStages.${option}`)}
                    optionHint={(option) => t(`ventureStageHints.${option}`)}
                  />
                  <ExplainedSelect
                    name="ventureGoal"
                    label={t("profile.venture.goal")}
                    help={t("profile.venture.goalHelp")}
                    value={profile.ventureGoal ?? "undecided"}
                    options={DISCOVERY_VENTURE_GOAL_OPTIONS.map((option) => option.value)}
                    optionLabel={(option) => t(`ventureGoals.${option}`)}
                    optionHint={(option) => t(`ventureGoalHints.${option}`)}
                  />
                </div>
                <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
                  <label>
                    <span className={LABEL_CLASS}>{t("profile.intent.searchIntent")}</span>
                    <select
                      name="searchIntent"
                      defaultValue={profile.searchIntent ?? ""}
                      className={FIELD_CLASS}
                    >
                      <option value="">{t("profile.intent.notProvided")}</option>
                      {DISCOVERY_SEARCH_INTENTS.map((value) => (
                        <option key={value} value={value}>
                          {t(`searchIntents.${value}.long`)}
                        </option>
                      ))}
                    </select>
                    <span className={HELP_CLASS}>{t("profile.intent.searchIntentHelp")}</span>
                  </label>
                  <label>
                    <span className={LABEL_CLASS}>{t("profile.intent.startHorizon")}</span>
                    <select
                      name="startHorizon"
                      defaultValue={profile.startHorizon ?? ""}
                      className={FIELD_CLASS}
                    >
                      <option value="">{t("profile.intent.notProvided")}</option>
                      {DISCOVERY_START_HORIZONS.map((value) => (
                        <option key={value} value={value}>
                          {t(`startHorizons.${value}.long`)}
                        </option>
                      ))}
                    </select>
                    <span className={HELP_CLASS}>{t("profile.intent.startHorizonHelp")}</span>
                  </label>
                </div>
                {/* Wer "offen fuer spaeter" waehlt, steht hier sonst in einer
                    Warteschleife. Im Connect-Bereich gibt es einen eigenen Weg
                    fuer genau diese Leute - und das Problembrett ist der Ort,
                    an dem aus "noch nichts" etwas wird. */}
                <div className="mt-5 rounded-2xl border-l-[3px] border-violet-400 bg-white px-4 py-4 shadow-[0_1px_0_rgba(15,23,42,0.06)]">
                  <p className="text-sm font-semibold text-slate-900">
                    {t("profile.intent.connectBridgeTitle")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t("profile.intent.connectBridgeText")}
                  </p>
                  <SubmitButton
                    formAction={saveDraftAndLeave.bind(null, "/connect/problems")}
                    formNoValidate
                    intent="connect"
                    label={t("profile.intent.connectBridgeCta")}
                    pendingLabel={t("profile.publicProfile.identityLinkPending")}
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline"
                  />
                </div>

                {!profile.searchIntent || !profile.startHorizon ? (
                  <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                    {t("profile.intent.missingHint")}
                  </p>
                ) : null}
              </div>

              <div className={INNER_SECTION_CLASS}>
                <h2 className="text-xl font-semibold text-slate-950">{t("profile.seeking.title")}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("profile.seeking.description")}</p>
                <div className="mt-5">
                  <p className={LABEL_CLASS}>{t("profile.publicProfile.seekingRoles")}</p>
                  <p className={HELP_CLASS}>{t("profile.publicProfile.seekingRolesHelp", { count: DISCOVERY_SELECTION_LIMITS.seekingRoles })}</p>
                  <DiscoveryRoleField
                    name="seekingRoles"
                    otherName="seekingRoleOther"
                    options={DISCOVERY_ROLE_OPTIONS.map((option) => ({
                      value: option.value,
                      label: discoveryRoleLabel(t, option.value),
                    }))}
                    initialSelected={profile.seekingRoles ?? []}
                    initialOther={profile.seekingRoleOther ?? null}
                    max={DISCOVERY_SELECTION_LIMITS.seekingRoles}
                    copy={{
                      limitReached: t("profile.publicProfile.roleLimitReached"),
                      otherLabel: t("profile.publicProfile.seekingRoleOtherLabel"),
                      otherPlaceholder: t("profile.publicProfile.seekingRoleOtherPlaceholder"),
                      otherHint: t("profile.publicProfile.seekingRoleOtherHint"),
                      counter: (selected, max) =>
                        t("profile.publicProfile.roleCounter", { selected, max }),
                    }}
                  />
                </div>
              </div>

              <PublishIssuesCard issues={publishIssues} t={t} />

              {/* Speichern steht zuerst - und zwar nicht nur optisch: Die
                  Eingabetaste in einem Textfeld loest den ersten Knopf im
                  Formular aus. Stuende dort das Veroeffentlichen, wuerde ein
                  Zeilenumbruch im falschen Moment das Profil sichtbar machen.
                  Die Hauptaktion steht deshalb rechts, wie ueberall sonst. */}
              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <SubmitButton
                  label={
                    profile.status === "active"
                      ? t("profile.actions.saveChanges")
                      : t("profile.actions.saveDraft")
                  }
                  pendingLabel={t("profile.actions.saving")}
                  className={profile.status === "active" ? PRIMARY_BUTTON_CLASS : SECONDARY_BUTTON_CLASS}
                />
                {profile.status !== "active" ? (
                  <SubmitButton
                    intent="publish"
                    formAction={publishProfileFromForm}
                    label={
                      profile.status === "paused"
                        ? t("profile.actions.resume")
                        : t("profile.actions.publish")
                    }
                    pendingLabel={
                      profile.status === "paused"
                        ? t("profile.actions.resuming")
                        : t("profile.actions.publishing")
                    }
                    className={PRIMARY_BUTTON_CLASS}
                  />
                ) : null}
              </div>
              <p className="text-xs leading-5 text-slate-500 sm:text-right">
                {t(
                  profile.status === "active"
                    ? "profile.actions.saveHelp"
                    : profile.status === "paused"
                      ? "profile.actions.resumeHelp"
                      : "profile.actions.publishHelp"
                )}
              </p>
            </form>

            {profile.status === "active" ? (
              <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-xs leading-5 text-slate-500">
                  {t("profile.actions.pauseHelp")}
                </p>
                <form action={pauseProfile}>
                  <SubmitButton
                    label={t("profile.actions.pause")}
                    pendingLabel={t("profile.actions.saving")}
                    className={SECONDARY_BUTTON_CLASS}
                  />
                </form>
              </div>
            ) : null}
          </section>

          {/* Eigener Rahmen: Das hier ist privat und gehoert nicht in
              denselben Kasten wie das, was andere sehen sollen. */}
          <section
            className={`${CARD_CLASS} discovery-rise border-violet-100 bg-violet-50/50`}
            style={{ "--rise-delay": "180ms" } as CSSProperties}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              {t("v2.alignment.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              {t("v2.alignment.choose")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t("v2.alignment.description")}
            </p>
            {alignmentReadiness.hasSubmittedBaseAssessment ? (
              <form action={saveAlignmentPreferences} className="mt-4">
                <label className="flex min-h-11 items-start gap-3 rounded-2xl border border-violet-100 bg-white p-3">
                  <input
                    type="checkbox"
                    name="discoveryV2AlignmentEnabled"
                    value="true"
                    defaultChecked={loadedPreferences?.discoveryV2AlignmentEnabled ?? false}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-900">
                    {t("v2.alignment.enable")}
                  </span>
                </label>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {t("v2.alignment.chooseHelp")}
                </p>
                <DiscoveryAlignmentPreferencesEditor
                  initialPreferences={
                    loadedPreferences?.discoveryV2AlignmentPreferences ?? {}
                  }
                  ownTendencies={ownAlignmentTendencies}
                />
                <p className="mt-4 text-xs leading-5 text-violet-900">
                  {t("v2.alignment.transparency")}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {t("v2.alignment.disclaimer")}
                </p>
                <SubmitButton
                  label={t("profile.intent.saveAlignment")}
                  pendingLabel={t("profile.actions.saving")}
                  className={`${PRIMARY_BUTTON_CLASS} mt-4`}
                />
              </form>
            ) : (
              <div className="mt-4 rounded-2xl bg-white p-4">
                <p className="text-sm text-slate-600">{t("v2.alignment.unavailable")}</p>
                <Link href="/me/base?next=/discovery/profile" className={`${SECONDARY_BUTTON_CLASS} mt-3`}>
                  {t("common.fillBaseQuestions")}
                </Link>
              </div>
            )}
          </section>
          </div>

          <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
            <section
              className={`${CARD_CLASS} discovery-rise`}
              style={{ "--rise-delay": "180ms" } as CSSProperties}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t("profile.preview.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {t("profile.preview.title")}
              </h2>
              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-950">
                  {previewText(
                    core?.display_name || profile.displayName,
                    t("profile.preview.displayNameFallback")
                  )}
                </p>
                <p className="mt-2 text-xl font-semibold leading-7 text-slate-950">
                  {previewText(
                    core?.headline || profile.headline,
                    t("profile.preview.headlineFallback")
                  )}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {previewText(core?.bio || profile.bio, t("profile.preview.bioFallback"))}
                </p>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div>
                    <dt className="font-semibold text-slate-900">{t("profile.preview.brings")}</dt>
                    <dd className="mt-1 text-slate-600">{formatRoleList(profile.ownRoles, profile.ownRoleOther, t)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t("profile.preview.seeks")}</dt>
                    <dd className="mt-1 text-slate-600">{formatRoleList(profile.seekingRoles, profile.seekingRoleOther, t)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t("profile.preview.interests")}</dt>
                    <dd className="mt-1 text-slate-600">
                      {formatIndustries(
                        core?.industries?.length ? core.industries : profile.industries ?? [],
                        t
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t("profile.preview.expertise")}</dt>
                    <dd className="mt-1 text-slate-600">
                      {formatIndustries(
                        core?.expertise?.length ? core.expertise : profile.expertise ?? [],
                        t
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t("profile.preview.workFrame")}</dt>
                    <dd className="mt-1 text-slate-600">
                      {core?.location_region || profile.locationRegion
                        ? `${core?.location_region || profile.locationRegion} · `
                        : ""}
                      {t(
                        `remoteModes.${(core?.remote_mode || profile.remoteMode || "flexible") as DiscoveryRemoteMode}`
                      )}{" "}
                      ·{" "}
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
