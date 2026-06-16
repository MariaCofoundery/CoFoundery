import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DISCOVERY_COMMITMENT_OPTIONS,
  DISCOVERY_PRIORITY_OPTIONS,
  DISCOVERY_REMOTE_MODE_OPTIONS,
  DISCOVERY_ROLE_LABELS,
  DISCOVERY_ROLE_OPTIONS,
  DISCOVERY_STATUS_LABELS,
  DISCOVERY_VENTURE_GOAL_OPTIONS,
  DISCOVERY_VENTURE_STAGE_OPTIONS,
  DISCOVERY_REMOTE_MODE_LABELS,
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

const CARD_CLASS = "rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]";
const FIELD_CLASS =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100";
const LABEL_CLASS = "text-sm font-medium text-slate-900";
const HELP_CLASS = "mt-1 text-xs leading-5 text-slate-500";
const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800";
const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

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

function emptyPreferences(): Pick<FounderSearchPreferences, "priorityWeights" | "mustHaves"> {
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
  };
}

function isChecked<T extends string>(values: readonly T[] | undefined, value: T) {
  return values?.includes(value) ?? false;
}

function formatRoleList(values: DiscoveryFounderRole[] | undefined) {
  if (!values || values.length === 0) return "Noch nicht angegeben";
  return values.map((value) => DISCOVERY_ROLE_LABELS[value]).join(", ");
}

function formatText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : "Noch nicht angegeben";
}

function formatIndustries(values: string[] | undefined) {
  return values && values.length > 0 ? values.join(", ") : "Noch nicht angegeben";
}

function searchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function searchParamValues(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function buildDiscoveryProfileRedirect(result: DiscoveryActionState, successMessage: string) {
  const params = new URLSearchParams();
  params.set("message", result.ok ? successMessage : result.message ?? "Aktion konnte gerade nicht abgeschlossen werden.");
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

function StatusCard({ profile }: { profile: Partial<FounderDiscoveryProfile> }) {
  const status = profile.status ?? "draft";
  const hint =
    status === "active"
      ? "Eingeloggte Cofoundery-Nutzer können dein Profil sehen."
      : status === "paused"
        ? "Dein Profil ist pausiert und für andere nicht sichtbar."
        : "Nur du siehst dieses Profil.";

  return (
    <section className={CARD_CLASS}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            {DISCOVERY_STATUS_LABELS[status]}
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
              {DISCOVERY_STATUS_LABELS[item]}
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
}: {
  name: string;
  selected: DiscoveryFounderRole[] | undefined;
}) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {DISCOVERY_ROLE_OPTIONS.map((option) => (
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

export default async function DiscoveryProfilePage({
  searchParams,
}: {
  searchParams: Promise<DiscoveryProfileSearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent("/discovery/profile")}`);
  }

  const [loadedProfile, loadedPreferences] = await Promise.all([
    getOwnDiscoveryProfile(user.id),
    getOwnSearchPreferences(user.id),
  ]);
  const params = await searchParams;
  const pageMessage = searchParamValue(params.message) ?? null;
  const pageIssues = searchParamValues(params.issue);
  const profile = { ...emptyProfile(), ...(loadedProfile ?? {}) };
  const preferences = loadedPreferences ?? emptyPreferences();
  const publishIssues = getDiscoveryProfilePublishIssues(profile);
  const canPublish = publishIssues.length === 0;

  async function saveProfileDraft(formData: FormData) {
    "use server";
    const result = await saveDiscoveryProfileDraftAction(formData);
    redirect(buildDiscoveryProfileRedirect(result, "Dein Discovery-Entwurf wurde gespeichert."));
  }

  async function publishProfileFromForm(formData: FormData) {
    "use server";
    const result = await publishDiscoveryProfileFromFormAction(formData);
    redirect(buildDiscoveryProfileRedirect(result, "Dein Discovery-Profil ist jetzt aktiv."));
  }

  async function pauseProfile() {
    "use server";
    const result = await pauseDiscoveryProfileAction();
    redirect(buildDiscoveryProfileRedirect(result, "Deine Co-Founder-Suche ist pausiert."));
  }

  async function savePreferences(formData: FormData) {
    "use server";
    const result = await saveDiscoveryPreferencesAction(formData);
    redirect(buildDiscoveryProfileRedirect(result, "Deine Suchprioritäten wurden gespeichert."));
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.16),transparent_34%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-10 text-slate-950 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/78 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur md:p-8">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-900">
            ← Zurück zum Dashboard
          </Link>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Founder Discovery
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
              Dein Co-Founder-Suchprofil
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Erstelle ein Profil für Menschen, die potenziell mit dir gründen könnten. Du
              entscheidest bewusst, wann es sichtbar wird.
            </p>
          </div>
        </header>

        <StatusCard profile={profile} />
        <PageMessage message={pageMessage} issues={pageIssues} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <section className={CARD_CLASS}>
            <div className="border-b border-slate-200 pb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Öffentlich sichtbares Profil
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Was andere später sehen</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Diese Angaben können nach Veröffentlichung für eingeloggte Cofoundery-Nutzer
                sichtbar werden. Dein privates Cofoundery-Profil bleibt davon getrennt.
              </p>
            </div>

            <form action={saveProfileDraft} className="mt-6 grid gap-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className={LABEL_CLASS}>Anzeigename</span>
                  <input
                    name="displayName"
                    type="text"
                    defaultValue={profile.displayName}
                    maxLength={80}
                    className={FIELD_CLASS}
                    placeholder="z. B. Sascha"
                  />
                </label>
                <label>
                  <span className={LABEL_CLASS}>Headline</span>
                  <input
                    name="headline"
                    type="text"
                    defaultValue={profile.headline}
                    maxLength={160}
                    className={FIELD_CLASS}
                    placeholder="z. B. Product-Founder sucht Tech-Gegenpart"
                  />
                </label>
              </div>

              <label>
                <span className={LABEL_CLASS}>Kurzbeschreibung</span>
                <textarea
                  name="bio"
                  defaultValue={profile.bio}
                  rows={5}
                  maxLength={1200}
                  className={FIELD_CLASS}
                  placeholder="Woran du arbeitest, was du einbringst und welche Art Zusammenarbeit du suchst."
                />
              </label>

              <div>
                <p className={LABEL_CLASS}>Eigene Rollen</p>
                <p className={HELP_CLASS}>Was bringst du selbst am stärksten ein?</p>
                <RoleCheckboxGrid name="ownRoles" selected={profile.ownRoles} />
              </div>

              <div>
                <p className={LABEL_CLASS}>Gesuchte Rollen</p>
                <p className={HELP_CLASS}>Welche Ergänzung suchst du bei einem Co-Founder?</p>
                <RoleCheckboxGrid name="seekingRoles" selected={profile.seekingRoles} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className={LABEL_CLASS}>Branchen / Interessen</span>
                  <input
                    name="industries"
                    type="text"
                    defaultValue={(profile.industries ?? []).join(", ")}
                    className={FIELD_CLASS}
                    placeholder="z. B. Climate, B2B SaaS, Bildung"
                  />
                  <p className={HELP_CLASS}>Mehrere Begriffe einfach mit Komma trennen.</p>
                </label>
                <label>
                  <span className={LABEL_CLASS}>Standort</span>
                  <input
                    name="locationLabel"
                    type="text"
                    defaultValue={profile.locationLabel ?? ""}
                    maxLength={120}
                    className={FIELD_CLASS}
                    placeholder="z. B. Berlin, DACH, Remote"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className={LABEL_CLASS}>Remote-Modus</span>
                  <select
                    name="remoteMode"
                    defaultValue={profile.remoteMode}
                    className={FIELD_CLASS}
                  >
                    {DISCOVERY_REMOTE_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={LABEL_CLASS}>Verfügbarkeit pro Woche</span>
                  <input
                    name="availabilityHoursPerWeek"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={profile.availabilityHoursPerWeek ?? ""}
                    className={FIELD_CLASS}
                    placeholder="z. B. 20"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className={LABEL_CLASS}>Commitment-Level</span>
                  <select
                    name="commitmentLevel"
                    defaultValue={profile.commitmentLevel}
                    className={FIELD_CLASS}
                  >
                    {DISCOVERY_COMMITMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={LABEL_CLASS}>Venture Stage</span>
                  <select
                    name="ventureStage"
                    defaultValue={profile.ventureStage}
                    className={FIELD_CLASS}
                  >
                    {DISCOVERY_VENTURE_STAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                <span className={LABEL_CLASS}>Venture Goal</span>
                <select name="ventureGoal" defaultValue={profile.ventureGoal} className={FIELD_CLASS}>
                  {DISCOVERY_VENTURE_GOAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                <button type="submit" className={PRIMARY_BUTTON_CLASS}>
                  Entwurf speichern
                </button>
                <button type="submit" formAction={publishProfileFromForm} className={PRIMARY_BUTTON_CLASS}>
                  Profil veröffentlichen
                </button>
              </div>
              <p className="-mt-3 text-xs leading-5 text-slate-500">
                Beim Veröffentlichen speichern wir deine aktuellen Angaben und machen dein Profil
                sichtbar, wenn alles vollständig ist.
              </p>
            </form>

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
              <form action={pauseProfile}>
                <button type="submit" className={SECONDARY_BUTTON_CLASS}>
                  Suche pausieren
                </button>
              </form>
            </div>

            {!canPublish ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Noch nicht bereit zur Veröffentlichung
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-800">
                  {publishIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <aside className="flex flex-col gap-6">
            <section className={CARD_CLASS}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Vorschau
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                So wirkt dein Profil später
              </h2>
              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-950">
                  {formatText(profile.displayName)}
                </p>
                <p className="mt-2 text-xl font-semibold leading-7 text-slate-950">
                  {formatText(profile.headline)}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{formatText(profile.bio)}</p>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div>
                    <dt className="font-semibold text-slate-900">Bringt mit</dt>
                    <dd className="mt-1 text-slate-600">{formatRoleList(profile.ownRoles)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">Sucht</dt>
                    <dd className="mt-1 text-slate-600">{formatRoleList(profile.seekingRoles)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">Interessen</dt>
                    <dd className="mt-1 text-slate-600">{formatIndustries(profile.industries)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">Arbeitsrahmen</dt>
                    <dd className="mt-1 text-slate-600">
                      {DISCOVERY_REMOTE_MODE_LABELS[profile.remoteMode as DiscoveryRemoteMode]} ·{" "}
                      {profile.availabilityHoursPerWeek
                        ? `${profile.availabilityHoursPerWeek} Std./Woche`
                        : "Zeit offen"}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>
          </aside>
        </div>

        <section className={CARD_CLASS}>
          <div className="border-b border-slate-200 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Private Suchpräferenzen
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Was ist dir bei einem Co-Founder besonders wichtig?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Diese Präferenzen sind privat. Sie werden nicht auf deinem Profil angezeigt und
              dienen später nur dazu, Vorschläge sinnvoller zu sortieren.
            </p>
          </div>

          <form action={savePreferences} className="mt-6 grid gap-8">
            <div className="grid gap-4 md:grid-cols-2">
              {DISCOVERY_PRIORITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <span className="text-sm font-semibold text-slate-950">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {option.description}
                  </span>
                  <input
                    name={`priorityWeights.${option.value}`}
                    type="range"
                    min={0}
                    max={5}
                    step={1}
                    defaultValue={preferences.priorityWeights[option.value] ?? 0}
                    className="mt-4 w-full accent-slate-950"
                  />
                  <span className="mt-1 block text-xs text-slate-500">0 = egal, 5 = sehr wichtig</span>
                </label>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-950">Must-haves</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Halte das ruhig grob. Diese Angaben sind als spätere Filter vorbereitet, nicht als
                starre Bewertung von Menschen.
              </p>

              <div className="mt-5 grid gap-5">
                <label>
                  <span className={LABEL_CLASS}>Mindestverfügbarkeit pro Woche</span>
                  <input
                    name="minimumAvailabilityHoursPerWeek"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={preferences.mustHaves.minimumAvailabilityHoursPerWeek ?? ""}
                    className={FIELD_CLASS}
                    placeholder="z. B. 10"
                  />
                </label>

                <div>
                  <p className={LABEL_CLASS}>Akzeptierte Remote-Modi</p>
                  <MultiCheckboxGrid<DiscoveryRemoteMode>
                    name="acceptedRemoteModes"
                    selected={preferences.mustHaves.acceptedRemoteModes}
                    options={DISCOVERY_REMOTE_MODE_OPTIONS}
                  />
                </div>

                <div>
                  <p className={LABEL_CLASS}>Rollen, die unbedingt vorkommen sollten</p>
                  <RoleCheckboxGrid
                    name="requiredRolesAny"
                    selected={preferences.mustHaves.requiredRolesAny}
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  <div>
                    <p className={LABEL_CLASS}>Commitment-Level</p>
                    <MultiCheckboxGrid<DiscoveryCommitmentLevel>
                      name="acceptedCommitmentLevels"
                      selected={preferences.mustHaves.acceptedCommitmentLevels}
                      options={DISCOVERY_COMMITMENT_OPTIONS}
                    />
                  </div>
                  <div>
                    <p className={LABEL_CLASS}>Venture Stages</p>
                    <MultiCheckboxGrid<DiscoveryVentureStage>
                      name="acceptedVentureStages"
                      selected={preferences.mustHaves.acceptedVentureStages}
                      options={DISCOVERY_VENTURE_STAGE_OPTIONS}
                    />
                  </div>
                  <div>
                    <p className={LABEL_CLASS}>Venture Goals</p>
                    <MultiCheckboxGrid<DiscoveryVentureGoal>
                      name="acceptedVentureGoals"
                      selected={preferences.mustHaves.acceptedVentureGoals}
                      options={DISCOVERY_VENTURE_GOAL_OPTIONS}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <button type="submit" className={PRIMARY_BUTTON_CLASS}>
                Suchpräferenzen speichern
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
