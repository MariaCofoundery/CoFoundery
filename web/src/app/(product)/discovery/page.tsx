import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DISCOVERY_COMMITMENT_LABELS,
  DISCOVERY_REMOTE_MODE_LABELS,
  DISCOVERY_ROLE_LABELS,
  DISCOVERY_STATUS_LABELS,
  DISCOVERY_VENTURE_GOAL_LABELS,
} from "@/features/discovery/discoveryConfig";
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
import { createClient } from "@/lib/supabase/server";

const CARD_CLASS =
  "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6";
const PRIMARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_BADGE_CLASS =
  "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600";

type DiscoveryStatusView = {
  label: string;
  hint: string;
  cta: string;
  status: DiscoveryStatus | "missing";
};

const JOURNEY_STEPS = [
  {
    title: "Profil anlegen",
    description: "Zeig, wer du bist, was du mitbringst und wonach du suchst.",
  },
  {
    title: "Prioritäten setzen",
    description: "Lege fest, was dir bei einem Co-Founder besonders wichtig ist.",
  },
  {
    title: "Vorschläge erhalten",
    description: "Später schlagen wir dir Profile vor, die zu deinen Prioritäten passen.",
  },
  {
    title: "Intro anfragen",
    description: "Wenn beide Interesse haben, könnt ihr ein erstes Gespräch starten.",
  },
  {
    title: "Gemeinsames Cofoundery-Matching starten",
    description:
      "Danach könnt ihr eure Zusammenarbeit mit dem bestehenden Matching und Workbook vertiefen.",
  },
] as const;

function getStatusView(profile: FounderDiscoveryProfile | null): DiscoveryStatusView {
  if (!profile) {
    return {
      label: "Noch kein Suchprofil",
      hint: "Lege zuerst ein Suchprofil an. Du entscheidest später bewusst, wann es sichtbar wird.",
      cta: "Suchprofil erstellen",
      status: "missing",
    };
  }

  if (profile.status === "active") {
    return {
      label: DISCOVERY_STATUS_LABELS.active,
      hint: "Dein Profil ist für eingeloggte Cofoundery-Nutzer:innen sichtbar.",
      cta: "Profil bearbeiten",
      status: "active",
    };
  }

  if (profile.status === "paused") {
    return {
      label: DISCOVERY_STATUS_LABELS.paused,
      hint: "Dein Profil ist aktuell nicht sichtbar.",
      cta: "Profil reaktivieren",
      status: "paused",
    };
  }

  return {
    label: DISCOVERY_STATUS_LABELS.draft,
    hint: "Nur du siehst dieses Profil.",
    cta: "Profil weiter bearbeiten",
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

function formatRoleList(values: DiscoveryFounderRole[]) {
  return values.length > 0
    ? values.map((value) => DISCOVERY_ROLE_LABELS[value]).join(", ")
    : "Noch offen";
}

function CandidateCard({ candidate }: { candidate: DiscoveryCandidate }) {
  const { profile } = candidate;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Könnte interessant sein
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">{profile.displayName}</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{profile.headline}</p>
        </div>
        <Link href={`/discovery/${profile.id}`} className={PRIMARY_CTA_CLASS}>
          Profil ansehen
        </Link>
      </div>

      <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-900">Bringt mit</dt>
          <dd className="mt-1 text-slate-600">{formatRoleList(profile.ownRoles)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Sucht</dt>
          <dd className="mt-1 text-slate-600">{formatRoleList(profile.seekingRoles)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Ort / Remote</dt>
          <dd className="mt-1 text-slate-600">
            {profile.locationLabel ? `${profile.locationLabel} · ` : ""}
            {DISCOVERY_REMOTE_MODE_LABELS[profile.remoteMode]}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Commitment / Ziel</dt>
          <dd className="mt-1 text-slate-600">
            {DISCOVERY_COMMITMENT_LABELS[profile.commitmentLevel]} ·{" "}
            {DISCOVERY_VENTURE_GOAL_LABELS[profile.ventureGoal]}
          </dd>
        </div>
      </dl>

      {candidate.reasons.length > 0 ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">Warum spannend</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
            {candidate.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {candidate.conversationTopics.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <p className="text-sm font-semibold text-amber-950">Was ihr früh besprechen solltet</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-900">
            {candidate.conversationTopics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export default async function DiscoveryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent("/discovery")}`);
  }

  const [profile, candidates] = await Promise.all([
    getOwnDiscoveryProfile(user.id),
    getDiscoveryCandidatesForCurrentUser(user.id),
  ]);
  const statusView = getStatusView(profile);
  const isActive = profile?.status === "active";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)] backdrop-blur md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Founder Discovery
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
                Co-Founder suchen
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Erstelle dein Suchprofil, setze deine Prioritäten und bereite dich darauf vor,
                passende Co-Founder-Kandidat:innen vorgeschlagen zu bekommen.
              </p>
            </div>
            <Link href="/discovery/profile" className={PRIMARY_CTA_CLASS}>
              {statusView.cta}
            </Link>
          </div>
        </header>

        <section className={CARD_CLASS}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Dein Suchprofil
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
                  Aktuelle Headline: <span className="font-semibold">{profile.headline}</span>
                </p>
              ) : null}
            </div>
            <Link href="/discovery/profile" className={PRIMARY_CTA_CLASS}>
              {statusView.cta}
            </Link>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className={CARD_CLASS}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              So funktioniert es
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Dein Discovery-Weg</h2>
            <ol className="mt-4 grid gap-3">
              {JOURNEY_STEPS.map((step, index) => {
                return (
                  <li
                    key={step.title}
                    className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{step.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>
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
                  Kandidat:innenvorschläge
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Erste Profile entdecken
                </h2>
                {isActive ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Sortiert nach deinen privaten Prioritäten, ohne sie öffentlich anzuzeigen.
                  </p>
                ) : null}
              </div>
              <span className={SECONDARY_BADGE_CLASS}>Ohne Prozent-Score</span>
            </div>

            {isActive && candidates.length > 0 ? (
              <div className="mt-5 grid gap-4">
                {candidates.map((candidate) => (
                  <CandidateCard key={candidate.profile.id} candidate={candidate} />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <p className="text-sm leading-6 text-slate-600">
                  {isActive
                    ? "Noch keine aktiven Profile gefunden. Sobald weitere Founder ihre Suche aktivieren, erscheinen hier Vorschläge."
                    : "Veröffentliche dein Suchprofil, damit wir passende Profile besser einordnen können."}
                </p>
              </div>
            )}

            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-950">Datenschutz-Hinweis</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Deine privaten Suchprioritäten und Assessment-Antworten bleiben geschützt. Auf
                deinem Profil erscheinen nur Angaben, die du bewusst veröffentlichst.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
