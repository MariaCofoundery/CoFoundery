"use client";

import { type ReactNode, useMemo, useState } from "react";
import { upsertProfileBasicsAction } from "@/features/profile/actions";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { AVATAR_LIBRARY } from "@/features/profile/avatarLibrary";
import {
  PROFILE_ROLE_OPTIONS,
  normalizeProfileRoles,
  profileRoleLabel,
  type ProfileRole,
} from "@/features/profile/profileRoles";

type ProfileBasicsValues = {
  display_name: string | null;
  focus_skill: string | null;
  intention: string | null;
  roles?: string[] | null;
  avatar_id?: string | null;
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

const SKILLS = ["Tech", "Sales", "Marketing", "Product", "Operations", "Finance"] as const;
const INTENTIONS = ["Suche", "Partner-Match", "Selbsttest"] as const;
const ONBOARDING_STEP_ORDER = ["welcome", "name", "role", "focus", "intention", "avatar", "next"] as const;

type OnboardingStepId = (typeof ONBOARDING_STEP_ORDER)[number];

function normalizePath(path: string | undefined, fallback: string) {
  const normalized = (path ?? "").trim();
  if (!normalized.startsWith("/")) {
    return fallback;
  }
  return normalized;
}

function getNextStepDisabled(step: OnboardingStepId, values: Record<OnboardingStepId, string>) {
  if (step === "welcome" || step === "avatar" || step === "next") {
    return false;
  }

  if (step === "role") {
    return values.role.length === 0;
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
  const successRedirect = normalizePath(onSuccessRedirectTo, "/dashboard");
  const errorRedirect = successRedirect;
  const cardClass =
    variant === "accent"
      ? "rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/80 via-white to-violet-50/70 p-6"
      : "rounded-2xl border border-slate-200/80 bg-white/95 p-6";

  const normalizedRoles = normalizeProfileRoles(initialValues.roles ?? ["founder"]);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState(initialValues.avatar_id?.trim() ?? "");
  const [displayName, setDisplayName] = useState(initialValues.display_name?.trim() ?? "");
  const [focusSkill, setFocusSkill] = useState(initialValues.focus_skill?.trim() ?? "");
  const [intention, setIntention] = useState(initialValues.intention?.trim() ?? "");
  const [primaryRole, setPrimaryRole] = useState<ProfileRole>(normalizedRoles[0] ?? "founder");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const previewName = displayName.trim() || "Founder";

  const onboardingValues = {
    welcome: "ready",
    name: displayName,
    role: primaryRole,
    focus: focusSkill,
    intention,
    avatar: selectedAvatarId,
    next: "ready",
  } satisfies Record<OnboardingStepId, string>;

  const activeStep = ONBOARDING_STEP_ORDER[activeStepIndex];
  const canGoBack = activeStepIndex > 0;
  const canGoNext =
    mode === "onboarding"
      ? !getNextStepDisabled(activeStep, onboardingValues)
      : true;

  const onboardingStepMeta = useMemo(
    () => ({
      welcome: {
        eyebrow: "Schritt 1 von 7",
        title: "Willkommen bei CoFoundery Align",
        hint: "Hier geht es nicht nur darum, wen du findest. Sondern wie gut ihr wirklich zusammenarbeitet.",
      },
      name: {
        eyebrow: "Schritt 2 von 7",
        title: "Wie sollen wir dich nennen?",
        hint: "So erscheinst du spaeter in deinem Profil und im Matching.",
      },
      role: {
        eyebrow: "Schritt 3 von 7",
        title: "Was bringst du aktuell vor allem mit?",
        hint: "Waehle die Rolle, mit der du gerade am ehesten unterwegs bist.",
      },
      focus: {
        eyebrow: "Schritt 4 von 7",
        title: "Worauf liegt dein Schwerpunkt?",
        hint: "Das hilft uns, dein Profil spaeter besser einzuordnen.",
      },
      intention: {
        eyebrow: "Schritt 5 von 7",
        title: "Woran arbeitest du gerade?",
        hint: "Deine Intention hilft uns, den richtigen Kontext fuer Matching und Zusammenarbeit zu setzen.",
      },
      avatar: {
        eyebrow: "Schritt 6 von 7",
        title: "Willst du noch ein Bild hinzufuegen?",
        hint: "Optional. Du kannst das auch spaeter machen.",
      },
      next: {
        eyebrow: "Schritt 7 von 7",
        title: "So geht es jetzt weiter",
        hint: "Du startest gleich nicht in ein Formular, sondern in ein Produkt, das Zusammenarbeit frueh klarer macht.",
      },
    }),
    []
  );

  function handleOnboardingEnter() {
    if (activeStepIndex < ONBOARDING_STEP_ORDER.length - 1 && canGoNext) {
      setActiveStepIndex((current) => Math.min(ONBOARDING_STEP_ORDER.length - 1, current + 1));
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
              imageUrl={selectedAvatarId ? null : fallbackAvatarUrl}
              className="h-16 w-16 rounded-[20px] border border-white/80 object-cover shadow-[0_10px_20px_rgba(15,23,42,0.08)]"
              fallbackClassName="flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/80 bg-[linear-gradient(135deg,rgba(103,232,249,0.16),rgba(255,255,255,0.92)_48%,rgba(124,58,237,0.08))] text-base font-semibold text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.06)]"
            />
            <div>
              <p className="text-sm font-medium text-slate-900">Avatar</p>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                Optional. Du kannst ihn jetzt setzen oder spaeter im Dashboard aendern.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAvatarPickerOpen((current) => !current)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {avatarPickerOpen ? "Auswahl schliessen" : "Avatar waehlen"}
          </button>
        </div>

        {avatarPickerOpen ? (
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {AVATAR_LIBRARY.map((avatar) => {
              const selected = selectedAvatarId === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setSelectedAvatarId(avatar.id)}
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
    description: string;
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
        <p className="mt-2 text-sm leading-6 text-slate-600">{params.description}</p>
      </button>
    );
  }

  function renderOnboardingStep() {
    const meta = onboardingStepMeta[activeStep];
    const isWelcomeStep = activeStep === "welcome";
    const isFinalStep = activeStep === "next";
    const showProgress = true;
    const nextButtonLabel =
      activeStep === "welcome"
        ? "Profil starten"
        : activeStep === "avatar"
          ? "Weiter"
          : "Weiter";

    return (
      <>
        {isWelcomeStep && welcomeVisual ? <div className="pb-5">{welcomeVisual}</div> : null}

        <div className={`pb-4 ${showProgress ? "border-b border-cyan-200" : ""}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{meta.eyebrow}</p>
          <h2 className={`mt-2 font-semibold text-slate-950 ${isWelcomeStep ? "text-3xl" : "text-2xl"}`}>
            {meta.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {meta.hint}
          </p>
          {isWelcomeStep ? (
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Du legst jetzt nur dein Kernprofil an. Das dauert kurz und bringt dich danach direkt in das Produkt.
            </p>
          ) : null}
          {showProgress ? (
            <div className="mt-5 flex gap-2">
              {ONBOARDING_STEP_ORDER.map((stepId, index) => (
                <span
                  key={stepId}
                  className={`h-2 flex-1 rounded-full ${
                    index <= activeStepIndex ? "bg-cyan-300" : "bg-slate-200"
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-5 pt-4">
          {activeStep === "name" ? (
            <label className="grid gap-2 text-sm text-slate-700">
              Name
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleOnboardingEnter();
                  }
                }}
                placeholder="Dein Name"
                autoComplete="name"
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
              />
            </label>
          ) : null}

          {activeStep === "role" ? (
            <div className="grid gap-3">
              {PROFILE_ROLE_OPTIONS.map((role) =>
                renderChoiceCard({
                  id: role,
                  title: profileRoleLabel(role),
                  description:
                    role === "advisor"
                      ? "Du begleitest Founder-Teams mit einer beratenden Perspektive."
                      : "Du nutzt CoFoundery fuer dein eigenes Matching, Profil und Alignment.",
                  selected: primaryRole === role,
                  onSelect: () => setPrimaryRole(role),
                })
              )}
            </div>
          ) : null}

          {activeStep === "focus" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {SKILLS.map((skill) =>
                renderChoiceCard({
                  id: skill,
                  title: skill,
                  description: "Das ist der Bereich, in dem dein Profil spaeter zuerst gelesen wird.",
                  selected: focusSkill === skill,
                  onSelect: () => setFocusSkill(skill),
                })
              )}
            </div>
          ) : null}

          {activeStep === "intention" ? (
            <div className="grid gap-3">
              {INTENTIONS.map((entry) =>
                renderChoiceCard({
                  id: entry,
                  title: entry,
                  description:
                    entry === "Suche"
                      ? "Du willst frueh sehen, mit wem Zusammenarbeit wirklich tragen koennte."
                      : entry === "Partner-Match"
                        ? "Du willst Passung und Unterschiede in einer konkreten Co-Founder-Konstellation klaeren."
                        : "Du willst dein eigenes Profil und deine Arbeitsweise erst einmal sauber einordnen.",
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
                Wenn du gerade ueberspringen willst, ist das voellig okay.
              </p>
            </>
          ) : null}

          {activeStep === "next" ? (
            <div className="grid gap-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">1</p>
                  <p className="mt-3 text-sm font-semibold text-slate-950">Profil aufbauen</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Dein Kernprofil gibt deinem Einstieg sofort Richtung.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">2</p>
                  <p className="mt-3 text-sm font-semibold text-slate-950">Insights bekommen</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Deine Antworten machen Unterschiede und Muster greifbar.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">3</p>
                  <p className="mt-3 text-sm font-semibold text-slate-950">Matching und Zusammenarbeit klaeren</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Daraus werden klare Gespraeche, Reports und spaeter konkrete Arbeitsregeln.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 px-5 py-4">
                <p className="text-sm leading-7 text-slate-800">
                  CoFoundery Align ist kein Persoenlichkeitstest. Es hilft dir, Zusammenarbeit frueh klarer und belastbarer zu machen.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActiveStepIndex((current) => Math.max(0, current - 1))}
            disabled={!canGoBack || isWelcomeStep}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Zurueck
          </button>
          {isFinalStep ? (
            <button
              type="submit"
              className="inline-flex items-center rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-cyan-400"
            >
              {submitLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setActiveStepIndex((current) => Math.min(ONBOARDING_STEP_ORDER.length - 1, current + 1))
              }
              disabled={!canGoNext}
              className="inline-flex items-center rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {activeStep === "welcome"
                ? "Profil starten"
                : activeStep === "avatar"
                  ? selectedAvatarId
                    ? "Weiter"
                    : "Ohne Bild weiter"
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
        <div className="grid gap-4 md:grid-cols-2">
          {renderAvatarCard()}

          <label className="grid gap-2 text-sm text-slate-700">
            Anzeigename
            <input
              name="displayName"
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Dein Name"
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
            />
          </label>

          <label className="grid gap-2 text-sm text-slate-700">
            Fokus
            <select
              name="focusSkill"
              required
              value={focusSkill}
              onChange={(event) => setFocusSkill(event.target.value)}
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
            >
              <option value="" disabled>
                Bitte auswaehlen
              </option>
              {SKILLS.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-slate-700">
            Intention
            <select
              name="intention"
              required
              value={intention}
              onChange={(event) => setIntention(event.target.value)}
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
            >
              <option value="" disabled>
                Bitte auswaehlen
              </option>
              {INTENTIONS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="mt-4 grid gap-3 text-sm text-slate-700">
          <legend className="text-sm font-medium text-slate-900">Deine Rollen</legend>
          <p className="text-xs leading-6 text-slate-500">
            Die Kernrolle fuer dein Onboarding ist bereits gesetzt. Hier kannst du zusaetzlich weitere Modi aktivieren.
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
                    <span className="block font-medium text-slate-900">{profileRoleLabel(role)}</span>
                    <span className="mt-1 block text-xs leading-6 text-slate-500">
                      {role === "advisor"
                        ? "Nutze CoFoundery auch, um Founder-Teams als Advisor zu begleiten."
                        : "Nutze CoFoundery fuer dein eigenes Founder-Profil, Matching und Alignment."}
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
      <form action={upsertProfileBasicsAction}>
        <input type="hidden" name="onSuccessRedirectTo" value={successRedirect} />
        <input type="hidden" name="onErrorRedirectTo" value={errorRedirect} />
        <input type="hidden" name="avatarId" value={selectedAvatarId} />

        {mode === "onboarding" ? (
          <>
            <input type="hidden" name="displayName" value={displayName} />
            <input type="hidden" name="focusSkill" value={focusSkill} />
            <input type="hidden" name="intention" value={intention} />
            <input type="hidden" name="primaryRole" value={primaryRole} />
            {renderOnboardingStep()}
          </>
        ) : (
          renderEditForm()
        )}
      </form>
    </section>
  );
}
