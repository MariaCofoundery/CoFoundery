"use client";

import { type ChangeEvent, type ReactNode, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { upsertProfileBasicsAction } from "@/features/profile/actions";
import { completeConnectOnboardingAction } from "@/features/profile/onboardingActions";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { AVATAR_LIBRARY } from "@/features/profile/avatarLibrary";
import {
  PROFILE_ROLE_OPTIONS,
  normalizeProfileRoles,
  type ProfileRole,
} from "@/features/profile/profileRoles";

type ProfileBasicsValues = {
  display_name: string | null;
  focus_skill: string | null;
  intention: string | null;
  roles?: string[] | null;
  avatar_id?: string | null;
  avatar_url?: string | null;
};

type Props = {
  mode: "onboarding" | "edit";
  initialValues: ProfileBasicsValues;
  submitLabel: string;
  onSuccessRedirectTo?: string;
  variant?: "default" | "accent";
  fallbackAvatarUrl?: string | null;
  welcomeVisual?: ReactNode;
};

const SKILLS = ["Tech", "Sales", "Marketing", "Product", "Operations", "Finance", "Allrounder", "Sonstiges"] as const;
const INTENTIONS = ["Suche", "Partner-Match", "Selbsttest"] as const;

/**
 * Zwei Wege, ein Formular.
 *
 * Wer gruenden oder begleiten will, legt das Kernprofil an - dafuer braucht
 * es Schwerpunkt und Intention. Wer erstmal nur Leute kennenlernen will,
 * braucht beides nicht: Es sind Gruendungsfragen, und die eigentliche Arbeit
 * passiert danach auf /connect/profile. Auch der Bild-Schritt entfaellt dort,
 * weil das Connect-Foto an einer Sichtbarkeitsentscheidung haengt, die dort
 * getroffen wird - sie hier vorwegzunehmen hiesse, sie zweimal zu stellen.
 *
 * Beide Wege teilen sich die ersten drei Schritte, damit ein Wechsel der Wahl
 * den Fortschritt nicht zurueckwirft: Index 2 ist in beiden "plan".
 */
const ONBOARDING_STEPS_FULL = ["welcome", "name", "plan", "focus", "intention", "avatar", "next"] as const;
const ONBOARDING_STEPS_CONNECT = ["welcome", "name", "plan", "next"] as const;

type OnboardingStepId = (typeof ONBOARDING_STEPS_FULL)[number];
type OnboardingPlan = ProfileRole | "both" | "connect";
const ONBOARDING_PLANS: OnboardingPlan[] = ["founder", "advisor", "both", "connect"];

type ProductArea = "align" | "find" | "connect";

/**
 * Was sich mit welcher Wahl oeffnet - und zwar nicht als Versprechen der
 * Oberflaeche, sondern als Abbild dessen, was die Datenbank tut:
 * `ensure_network_membership_for_product_role` macht jede Founderin und jeden
 * Advisor automatisch zum Netzwerkmitglied, und Find haengt an `hasFounder`.
 *
 * Deshalb ist die Frage "was hast du vor" und nicht "waehle deine Bereiche":
 * Man kann Find nicht ohne Align haben - es ist dieselbe Rolle.
 */
function areasForPlan(plan: OnboardingPlan): ProductArea[] {
  if (plan === "connect") return ["connect"];
  if (plan === "advisor") return ["align", "connect"];
  return ["align", "find", "connect"];
}

function normalizePath(path: string | undefined, fallback: string) {
  const normalized = (path ?? "").trim();
  if (!normalized.startsWith("/")) {
    return fallback;
  }
  if (normalized.startsWith("//")) {
    const sanitized = `/${normalized.replace(/^\/+/, "")}`;
    return sanitized.length > 1 ? sanitized : fallback;
  }
  return normalized;
}

function getNextStepDisabled(step: OnboardingStepId, values: Record<OnboardingStepId, string>) {
  if (step === "welcome" || step === "avatar" || step === "next") {
    return false;
  }

  if (step === "plan") {
    return values.plan.length === 0;
  }

  return values[step].trim().length === 0;
}

export function ProfileBasicsForm({
  mode,
  initialValues,
  submitLabel,
  onSuccessRedirectTo,
  variant = "default",
  fallbackAvatarUrl = null,
  welcomeVisual,
}: Props) {
  const t = useTranslations("profile.basicsForm");
  const successRedirect = normalizePath(onSuccessRedirectTo, "/dashboard");
  const errorRedirect = successRedirect;
  // Ruhiger als vorher: Der Verlauf lag frueher ueber der ganzen Flaeche und
  // konkurrierte mit allem, was darin steht. Jetzt traegt ihn nur der Rand.
  const cardClass =
    variant === "accent"
      ? "rounded-3xl border border-cyan-200/70 bg-[linear-gradient(180deg,rgba(236,254,255,.55),rgba(255,255,255,.97)_22%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,.07)] md:p-8"
      : "rounded-2xl border border-slate-200/80 bg-white/95 p-6";

  const normalizedRoles = normalizeProfileRoles(initialValues.roles ?? ["founder"]);
  const initialPlan: OnboardingPlan =
    normalizedRoles.includes("founder") && normalizedRoles.includes("advisor")
      ? "both"
      : (normalizedRoles[0] ?? "founder");
  const knownFocusSkill =
    initialValues.focus_skill && SKILLS.includes(initialValues.focus_skill as (typeof SKILLS)[number])
      ? initialValues.focus_skill
      : null;
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const initialAvatarUrl = initialValues.avatar_url?.trim() || fallbackAvatarUrl || "";
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState(
    initialValues.avatar_id?.trim() ? "" : initialAvatarUrl
  );
  const [uploadedAvatarLabel, setUploadedAvatarLabel] = useState<string | null>(
    initialValues.avatar_id?.trim() ? null : initialAvatarUrl ? t("uploadedImage") : null
  );
  const [selectedAvatarId, setSelectedAvatarId] = useState(initialValues.avatar_id?.trim() ?? "");
  const [displayName, setDisplayName] = useState(initialValues.display_name?.trim() ?? "");
  const [focusChoice, setFocusChoice] = useState<(typeof SKILLS)[number] | "">(
    (knownFocusSkill as (typeof SKILLS)[number] | null) ?? (initialValues.focus_skill?.trim() ? "Sonstiges" : "")
  );
  const [focusOtherText, setFocusOtherText] = useState(
    knownFocusSkill || !initialValues.focus_skill?.trim() ? "" : initialValues.focus_skill.trim()
  );
  const [intention, setIntention] = useState(initialValues.intention?.trim() ?? "");
  /**
   * Im Einstieg ist NICHTS vorausgewaehlt.
   *
   * Bis 18.09.2026 stand hier "founder" als Voreinstellung. Bei einer Frage,
   * die darueber entscheidet, welche Bereiche sich oeffnen, ist eine
   * Voreinstellung keine Hilfe, sondern eine Antwort, die man der Person in
   * den Mund legt - wer durchklickt, wird Founderin, ohne es gewaehlt zu
   * haben. Der Weiter-Knopf bleibt gesperrt, bis jemand etwas anklickt.
   */
  const [plan, setPlan] = useState<OnboardingPlan | "">(
    mode === "onboarding" && !initialValues.roles?.length ? "" : initialPlan
  );
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const avatarUploadRef = useRef<HTMLInputElement | null>(null);
  const previewName = displayName.trim() || "Founder";
  const resolvedFocusSkill =
    focusChoice === "Sonstiges" ? focusOtherText.trim() || "Sonstiges" : focusChoice;
  const resolvedAvatarImageUrl = selectedAvatarId ? null : uploadedAvatarUrl || initialAvatarUrl || null;
  const hasAvatarImage = Boolean(selectedAvatarId || resolvedAvatarImageUrl);

  const onboardingValues = {
    welcome: "ready",
    name: displayName,
    plan,
    focus: resolvedFocusSkill,
    intention,
    avatar: selectedAvatarId,
    next: "ready",
  } satisfies Record<OnboardingStepId, string>;

  const isConnectPlan = plan === "connect";
  const stepOrder: readonly OnboardingStepId[] = isConnectPlan
    ? ONBOARDING_STEPS_CONNECT
    : ONBOARDING_STEPS_FULL;
  const lastStepIndex = stepOrder.length - 1;
  // Ein Wechsel auf den kurzen Weg kann den Index hinter das Ende schieben.
  const activeStep = stepOrder[Math.min(activeStepIndex, lastStepIndex)];
  const canGoBack = activeStepIndex > 0;
  const canGoNext =
    mode === "onboarding"
      ? !getNextStepDisabled(activeStep, onboardingValues)
      : true;
  const openedAreas = areasForPlan(plan || "founder");

  /**
   * Titel und Hinweis je Schritt. Die Zaehlung steht nicht mehr drin.
   *
   * Vorher trug jeder Schritt "Schritt 4 von 7" fest im Text - das war
   * einerseits eine Ansage ("noch drei Formulare") und andererseits seit dem
   * kurzen Connect-Weg schlicht falsch, weil der nur vier Schritte hat. Die
   * Zaehlung wird jetzt aus der tatsaechlichen Schrittfolge berechnet.
   */
  const onboardingStepMeta = useMemo(
    () => ({
      welcome: { title: t("onboarding.steps.welcome.title"), hint: t("onboarding.steps.welcome.hint") },
      name: { title: t("onboarding.steps.name.title"), hint: t("onboarding.steps.name.hint") },
      plan: { title: t("onboarding.steps.plan.title"), hint: t("onboarding.steps.plan.hint") },
      focus: { title: t("onboarding.steps.focus.title"), hint: t("onboarding.steps.focus.hint") },
      intention: { title: t("onboarding.steps.intention.title"), hint: t("onboarding.steps.intention.hint") },
      avatar: { title: t("onboarding.steps.avatar.title"), hint: t("onboarding.steps.avatar.hint") },
      next: { title: t("onboarding.steps.next.title"), hint: t("onboarding.steps.next.hint") },
    }),
    [t]
  );

  function roleDisplayLabel(role: ProfileRole) {
    return t(`roles.${role}`);
  }

  function skillDisplayLabel(skill: (typeof SKILLS)[number]) {
    return t(`skills.${skill}`);
  }

  function intentionDisplayLabel(intentionValue: (typeof INTENTIONS)[number]) {
    return t(`intentions.${intentionValue}.label`);
  }

  function intentionDescription(intentionValue: (typeof INTENTIONS)[number]) {
    return t(`intentions.${intentionValue}.description`);
  }

  function handleOnboardingEnter() {
    if (activeStepIndex < lastStepIndex && canGoNext) {
      setActiveStepIndex((current) => Math.min(lastStepIndex, current + 1));
    }
  }

  function renderAvatarCard() {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/85 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ProfileAvatar
              displayName={previewName}
              avatarId={selectedAvatarId || null}
              imageUrl={resolvedAvatarImageUrl}
              className="h-16 w-16 rounded-[20px] border border-white/80 object-cover shadow-[0_10px_20px_rgba(15,23,42,0.08)]"
              fallbackClassName="flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/80 bg-[linear-gradient(135deg,rgba(103,232,249,0.16),rgba(255,255,255,0.92)_48%,rgba(124,58,237,0.08))] text-base font-semibold text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.06)]"
            />
            <div>
              <p className="text-sm font-medium text-slate-900">{t("avatar.title")}</p>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                {t("avatar.help")}
              </p>
              {uploadedAvatarLabel && !selectedAvatarId ? (
                <p className="mt-2 text-xs font-medium text-slate-700">{uploadedAvatarLabel}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAvatarPickerOpen((current) => !current)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {avatarPickerOpen ? t("avatar.closeSelection") : t("avatar.chooseAvatar")}
            </button>
            <button
              type="button"
              onClick={() => avatarUploadRef.current?.click()}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {t("avatar.uploadOwn")}
            </button>
          </div>
        </div>
        <input
          ref={avatarUploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />

        {avatarPickerOpen ? (
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {AVATAR_LIBRARY.map((avatar) => {
              const selected = selectedAvatarId === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => {
                    setSelectedAvatarId(avatar.id);
                    setUploadedAvatarLabel(null);
                  }}
                  className={`rounded-2xl border p-2 transition ${
                    selected
                      ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)]/10 shadow-[0_10px_24px_rgba(34,211,238,0.14)]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  aria-pressed={selected}
                  aria-label={avatar.label}
                >
                  <ProfileAvatar
                    displayName={avatar.label}
                    avatarId={avatar.id}
                    className="h-auto w-full rounded-[18px] border border-slate-100 object-cover"
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  function renderAvatarActionButton(params: {
    label: string;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={params.onClick}
        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        {params.label}
      </button>
    );
  }

  function renderEditProfileHeader() {
    return (
      <div className="grid gap-5 rounded-2xl border border-slate-200/80 bg-slate-50/85 p-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
        <div className="flex min-w-0 flex-col items-start gap-3">
          <ProfileAvatar
            displayName={previewName}
            avatarId={selectedAvatarId || null}
            imageUrl={resolvedAvatarImageUrl}
            className="h-20 w-20 shrink-0 rounded-[22px] border border-white/80 object-cover shadow-[0_10px_20px_rgba(15,23,42,0.08)]"
            fallbackClassName="flex h-20 w-20 shrink-0 items-center justify-center rounded-[22px] border border-white/80 bg-[linear-gradient(135deg,rgba(103,232,249,0.16),rgba(255,255,255,0.92)_48%,rgba(124,58,237,0.08))] text-lg font-semibold text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.06)]"
          />

          <div className="flex w-full flex-wrap gap-2">
            {renderAvatarActionButton({
              label: t("avatar.uploadImage"),
              onClick: () => avatarUploadRef.current?.click(),
            })}
            {renderAvatarActionButton({
              label: avatarPickerOpen ? t("avatar.closeSelection") : t("avatar.chooseAvatarEdit"),
              onClick: () => setAvatarPickerOpen((current) => !current),
            })}
          </div>

          {uploadedAvatarLabel && !selectedAvatarId ? (
            <p className="text-xs text-slate-500">{uploadedAvatarLabel}</p>
          ) : null}
        </div>

        <div className="min-w-0">
          <label className="grid gap-2 text-sm text-slate-700">
            {t("edit.displayNameLabel")}
            <input
              name="displayName"
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t("edit.displayNamePlaceholder")}
              className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
            />
          </label>
        </div>

        <input
          ref={avatarUploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />

        {avatarPickerOpen ? (
          <div className="md:col-span-2 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {AVATAR_LIBRARY.map((avatar) => {
              const selected = selectedAvatarId === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => {
                    setSelectedAvatarId(avatar.id);
                    setUploadedAvatarLabel(null);
                  }}
                  className={`rounded-2xl border p-2 transition ${
                    selected
                      ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)]/10 shadow-[0_10px_24px_rgba(34,211,238,0.14)]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  aria-pressed={selected}
                  aria-label={avatar.label}
                >
                  <ProfileAvatar
                    displayName={avatar.label}
                    avatarId={avatar.id}
                    className="h-auto w-full rounded-[18px] border border-slate-100 object-cover"
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  function renderChoiceCard(params: {
    id: string;
    title: string;
    description?: string;
    selected: boolean;
    onSelect: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={params.onSelect}
        className={`rounded-2xl border px-4 py-4 text-left transition ${
          params.selected
            ? "border-cyan-300 bg-cyan-50/90 shadow-[0_14px_32px_rgba(14,165,233,0.12)]"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <p className="text-sm font-semibold text-slate-950">{params.title}</p>
        {params.description ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">{params.description}</p>
        ) : null}
      </button>
    );
  }

  /**
   * Die Bereiche als kleine Marken.
   *
   * Sie stehen an jeder Wahl, damit niemand raten muss, was eine Entscheidung
   * bedeutet - und sie stehen dort in derselben Reihenfolge wie spaeter in
   * der Navigationsleiste.
   */
  function renderAreaChips(
    areas: ProductArea[],
    tone: "quiet" | "bright" = "quiet",
    className = "mt-3"
  ) {
    return (
      <span className={`flex flex-wrap gap-1.5 ${className}`}>
        {areas.map((area) => (
          <span
            key={area}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              tone === "bright"
                ? "bg-[linear-gradient(120deg,rgba(124,58,237,.14),rgba(34,211,238,.16))] text-violet-900"
                : "border border-slate-200 bg-white/80 text-slate-600"
            }`}
          >
            {t(`onboarding.areas.${area}.name`)}
          </span>
        ))}
      </span>
    );
  }

  function renderPlanStep() {
    return (
      <div className="grid gap-3">
        {ONBOARDING_PLANS.map((planOption) => {
          const selected = plan === planOption;
          return (
            <button
              key={planOption}
              type="button"
              onClick={() => setPlan(planOption)}
              aria-pressed={selected}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                selected
                  ? "border-violet-300/70 bg-[linear-gradient(120deg,rgba(124,58,237,.07),rgba(34,211,238,.09))] shadow-[0_14px_32px_rgba(124,58,237,0.10)]"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
              }`}
            >
              <p className="text-sm font-semibold text-slate-950">
                {t(`onboarding.plans.${planOption}.title`)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t(`onboarding.plans.${planOption}.description`)}
              </p>
              <span className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                  {t("onboarding.opens")}
                </span>
                {/* Ohne eigenen Abstand: Die Zeile darueber bringt ihn schon mit. */}
                {renderAreaChips(areasForPlan(planOption), selected ? "bright" : "quiet", "")}
              </span>
            </button>
          );
        })}

        {/* Zwei Saetze, weil zwei Dinge wahr sind.
            Founder und Advisors sehen das Rollenfeld auf /profile und aendern
            das selbst. Wer keine Rolle hat, sieht es NICHT - /profile blendet
            es bewusst aus ("eine Selbstfreischaltung ins Founder-Produkt
            waere eine Produktentscheidung, kein Formularfeld"). Ein
            pauschales "du kannst jederzeit erweitern" waere also ausgerechnet
            fuer die vorsichtigste Wahl gelogen. */}
        <p className="text-xs leading-6 text-slate-500">
          {t("onboarding.planChangeable")}
          {isConnectPlan ? ` ${t("onboarding.planChangeableConnect")}` : ""}
        </p>
      </div>
    );
  }

  function renderFinalStep() {
    return (
      <div className="grid gap-5">
        {/* Ausgeschriebene Klassen, nicht zusammengesetzte: Tailwind liest den
            Quelltext und findet `sm:grid-cols-${n}` nicht - die Klasse waere
            nie im CSS gelandet und das Raster stillschweigend einspaltig. */}
        <div
          className={`grid gap-3 ${
            openedAreas.length === 3 ? "sm:grid-cols-3" : openedAreas.length === 2 ? "sm:grid-cols-2" : ""
          }`}
        >
          {openedAreas.map((area) => (
            <div
              key={area}
              className="rounded-2xl border border-slate-200/90 bg-[linear-gradient(160deg,rgba(255,255,255,.96),rgba(248,250,252,.9))] px-4 py-4"
            >
              <p className="text-base font-semibold text-slate-950">
                {t(`onboarding.areas.${area}.name`)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t(`onboarding.areas.${area}.text`)}
              </p>
            </div>
          ))}
        </div>

        {/* Was NICHT offen ist, wird auch gesagt - sonst sucht jemand
            wochenlang eine Leiste, die bei ihm nicht steht. */}
        {openedAreas.length < 3 ? (
          <p className="text-sm leading-6 text-slate-500">
            {t(isConnectPlan ? "onboarding.areasLaterConnect" : "onboarding.areasLater")}
          </p>
        ) : null}

        <div className="rounded-2xl border border-violet-200/70 bg-[linear-gradient(120deg,rgba(124,58,237,.06),rgba(34,211,238,.08))] px-5 py-4">
          <p className="text-sm leading-7 text-slate-800">{t("onboarding.nonDiagnosticHint")}</p>
        </div>
      </div>
    );
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await toAvatarDataUrl(file);
      setUploadedAvatarUrl(dataUrl);
      setUploadedAvatarLabel(t("uploadedFile", { fileName: file.name }));
      setSelectedAvatarId("");
      setAvatarPickerOpen(false);
    } finally {
      event.target.value = "";
    }
  }

  function renderOnboardingStep() {
    const meta = onboardingStepMeta[activeStep];
    const isWelcomeStep = activeStep === "welcome";
    const isFinalStep = activeStep === "next";
    const stepsLeft = lastStepIndex - Math.min(activeStepIndex, lastStepIndex);
    const nextButtonLabel = t("onboarding.nextButton");

    return (
      <>
        {isWelcomeStep && welcomeVisual ? <div className="pb-5">{welcomeVisual}</div> : null}

        <div className="border-b border-cyan-200/70 pb-4">
          {/* Statt "Schritt 4 von 7": was noch kommt, nicht wie weit die
              Pflicht fortgeschritten ist. Auf dem Begruessungsschritt gar
              nichts - dort ist man noch nicht im Ablauf. */}
          {isWelcomeStep ? null : (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700/80">
              {t("onboarding.stepsLeft", { count: stepsLeft })}
            </p>
          )}
          <h2 className={`font-semibold text-slate-950 ${isWelcomeStep ? "text-3xl" : "mt-2 text-2xl"}`}>
            {meta.title}
          </h2>
          {meta.hint ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {meta.hint}
            </p>
          ) : null}
          {isWelcomeStep ? (
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              {t("onboarding.welcomeText")}
            </p>
          ) : null}
          {/* Der Balken zaehlt die Schritte des GEWAEHLTEN Weges - der kurze
              hat vier, der lange sieben. Ein fester Balken haette beim
              kurzen Weg nach dem Abschluss halb leer dagestanden. */}
          <div className="mt-5 flex gap-1.5" aria-hidden="true">
            {stepOrder.map((stepId, index) => (
              <span
                key={stepId}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                  index <= activeStepIndex
                    ? "bg-[linear-gradient(90deg,var(--brand-primary),var(--brand-accent))]"
                    : "bg-slate-200/80"
                }`}
              />
            ))}
          </div>
        </div>

        {/* key={activeStep}: haengt den Block beim Wechsel neu ein, damit die
            Bewegung erneut laeuft. Ohne ihn liefe sie genau einmal. */}
        <div key={activeStep} className="onboarding-step grid gap-5 pt-4">
          {activeStep === "name" ? (
            <label className="grid gap-2 text-sm text-slate-700">
              {t("onboarding.nameLabel")}
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleOnboardingEnter();
                  }
                }}
                placeholder={t("onboarding.namePlaceholder")}
                autoComplete="name"
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
              />
            </label>
          ) : null}

          {activeStep === "plan" ? renderPlanStep() : null}

          {activeStep === "focus" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {SKILLS.map((skill) =>
                renderChoiceCard({
                  id: skill,
                  title: skillDisplayLabel(skill),
                  selected: focusChoice === skill,
                  onSelect: () => setFocusChoice(skill),
                })
              )}
              {focusChoice === "Sonstiges" ? (
                <label className="sm:col-span-2 grid gap-2 text-sm text-slate-700">
                  {t("onboarding.focusOtherLabel")}
                  <input
                    value={focusOtherText}
                    onChange={(event) => setFocusOtherText(event.target.value)}
                    placeholder={t("onboarding.focusOtherPlaceholder")}
                    className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          {activeStep === "intention" ? (
            <div className="grid gap-3">
              {INTENTIONS.map((entry) =>
                renderChoiceCard({
                  id: entry,
                  title: intentionDisplayLabel(entry),
                  description: intentionDescription(entry),
                  selected: intention === entry,
                  onSelect: () => setIntention(entry),
                })
              )}
            </div>
          ) : null}

          {activeStep === "avatar" ? (
            <>
              {renderAvatarCard()}
              <p className="text-xs leading-6 text-slate-500">
                {t("onboarding.avatarSkipHint")}
              </p>
            </>
          ) : null}

          {activeStep === "next" ? renderFinalStep() : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActiveStepIndex((current) => Math.max(0, current - 1))}
            disabled={!canGoBack || isWelcomeStep}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {t("onboarding.backButton")}
          </button>
          {isFinalStep ? (
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-full bg-[linear-gradient(120deg,var(--brand-accent),var(--brand-primary))] px-6 text-sm font-semibold text-slate-900 shadow-[0_10px_28px_rgba(124,58,237,0.16)] transition hover:brightness-105"
            >
              {isConnectPlan ? t("onboarding.startConnectButton") : submitLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveStepIndex((current) => Math.min(lastStepIndex, current + 1))}
              disabled={!canGoNext}
              className="inline-flex min-h-11 items-center rounded-full bg-[linear-gradient(120deg,var(--brand-accent),var(--brand-primary))] px-6 text-sm font-semibold text-slate-900 shadow-[0_10px_28px_rgba(124,58,237,0.16)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {activeStep === "welcome"
                ? t("onboarding.startButton")
                : activeStep === "avatar"
                  ? hasAvatarImage
                    ? t("onboarding.nextButton")
                    : t("onboarding.skipImageButton")
                  : nextButtonLabel}
            </button>
          )}
        </div>
      </>
    );
  }

  function renderEditForm() {
    return (
      <>
        <div className="grid gap-4">
          {renderEditProfileHeader()}

          <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-700">
            {t("edit.focusLabel")}
            <div className="grid gap-3">
              <select
                required
                value={focusChoice}
                onChange={(event) => setFocusChoice(event.target.value as (typeof SKILLS)[number] | "")}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
              >
                <option value="" disabled>
                  {t("edit.selectPlaceholder")}
                </option>
                {SKILLS.map((skill) => (
                  <option key={skill} value={skill}>
                    {skillDisplayLabel(skill)}
                  </option>
                ))}
              </select>
              {focusChoice === "Sonstiges" ? (
                <input
                  value={focusOtherText}
                  onChange={(event) => setFocusOtherText(event.target.value)}
                  placeholder={t("edit.focusOtherPlaceholder")}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
                />
              ) : null}
            </div>
          </label>

          <label className="grid gap-2 text-sm text-slate-700">
            {t("edit.intentionLabel")}
            <select
              name="intention"
              required
              value={intention}
              onChange={(event) => setIntention(event.target.value)}
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
            >
              <option value="" disabled>
                {t("edit.selectPlaceholder")}
              </option>
              {INTENTIONS.map((entry) => (
                <option key={entry} value={entry}>
                  {intentionDisplayLabel(entry)}
                </option>
              ))}
            </select>
          </label>
        </div>
        </div>

        <fieldset className="mt-4 grid gap-3 text-sm text-slate-700">
          <legend className="text-sm font-medium text-slate-900">{t("edit.rolesLegend")}</legend>
          <p className="text-xs leading-6 text-slate-500">
            {t("edit.rolesHelp")}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {PROFILE_ROLE_OPTIONS.map((role) => {
              const checked = normalizedRoles.includes(role);
              return (
                <label
                  key={role}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                >
                  <input
                    type="checkbox"
                    name="roles"
                    value={role}
                    defaultChecked={checked}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-violet-200"
                  />
                  <span>
                    <span className="block font-medium text-slate-900">{roleDisplayLabel(role)}</span>
                    <span className="mt-1 block text-xs leading-6 text-slate-500">
                      {role === "advisor"
                        ? t("edit.advisorRoleHelp")
                        : t("edit.founderRoleHelp")}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-cyan-400"
          >
            {submitLabel}
          </button>
        </div>
      </>
    );
  }

  return (
    <section className={cardClass}>
      {/* Zwei Aktionen, weil es zwei Ergebnisse sind: Der Connect-Weg darf
          KEINE profiles-Zeile anlegen - `roles` traegt dort `default
          '{founder}'`, die Person waere sonst ungefragt Founderin. */}
      <form
        action={
          mode === "onboarding" && isConnectPlan
            ? completeConnectOnboardingAction
            : upsertProfileBasicsAction
        }
      >
        <input type="hidden" name="onSuccessRedirectTo" value={successRedirect} />
        <input type="hidden" name="onErrorRedirectTo" value={errorRedirect} />
        <input type="hidden" name="avatarId" value={selectedAvatarId} />
        <input type="hidden" name="avatarImageUrl" value={selectedAvatarId ? "" : uploadedAvatarUrl} />
        <input type="hidden" name="focusSkill" value={resolvedFocusSkill} />

        {mode === "onboarding" ? (
          <>
            <input type="hidden" name="displayName" value={displayName} />
            <input type="hidden" name="completesOnboarding" value="1" />
            {isConnectPlan ? null : (
              <>
                <input type="hidden" name="intention" value={intention} />
                <input type="hidden" name="primaryRole" value={plan} />
                {plan === "both" ? (
                  <>
                    <input type="hidden" name="roles" value="founder" />
                    <input type="hidden" name="roles" value="advisor" />
                  </>
                ) : null}
              </>
            )}
            {renderOnboardingStep()}
          </>
        ) : (
          renderEditForm()
        )}
      </form>
    </section>
  );
}

async function toAvatarDataUrl(file: File) {
  const imageBitmapUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(imageBitmapUrl);
    const maxSize = 320;
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("avatar_canvas_unavailable");
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(imageBitmapUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("avatar_image_load_failed"));
    image.src = src;
  });
}
