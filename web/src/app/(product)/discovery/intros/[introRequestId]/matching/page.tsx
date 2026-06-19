import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DISCOVERY_COMMITMENT_LABELS,
  DISCOVERY_REMOTE_MODE_LABELS,
  DISCOVERY_ROLE_LABELS,
  DISCOVERY_VENTURE_GOAL_LABELS,
} from "@/features/discovery/discoveryConfig";
import { getAcceptedDiscoveryIntroForMatchingPreparation } from "@/features/discovery/discoveryIntroData";
import type {
  DiscoveryFounderRole,
  DiscoveryProfilePreview,
} from "@/features/discovery/discoveryTypes";
import { createClient } from "@/lib/supabase/server";

const CARD_CLASS =
  "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6";
const PRIMARY_DISABLED_CTA_CLASS =
  "inline-flex cursor-not-allowed items-center justify-center rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

type MatchingPreparationPageParams = {
  introRequestId: string;
};

function formatRoleList(values: DiscoveryFounderRole[]) {
  return values.length > 0
    ? values.map((value) => DISCOVERY_ROLE_LABELS[value]).join(", ")
    : "Noch nicht angegeben";
}

function profileDetailUrl(profile: DiscoveryProfilePreview) {
  return `/discovery/${profile.id}`;
}

function ProfileCard({
  eyebrow,
  profile,
}: {
  eyebrow: string;
  profile: DiscoveryProfilePreview;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-950">{profile.displayName}</h2>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{profile.headline}</p>
      <dl className="mt-5 grid gap-3 text-sm text-slate-600">
        <div>
          <dt className="font-semibold text-slate-900">Bringt mit</dt>
          <dd className="mt-1">{formatRoleList(profile.ownRoles)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Sucht</dt>
          <dd className="mt-1">{formatRoleList(profile.seekingRoles)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Arbeitsrahmen</dt>
          <dd className="mt-1">
            {profile.locationLabel ? `${profile.locationLabel} · ` : ""}
            {DISCOVERY_REMOTE_MODE_LABELS[profile.remoteMode]}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Commitment / Zielbild</dt>
          <dd className="mt-1">
            {DISCOVERY_COMMITMENT_LABELS[profile.commitmentLevel]} ·{" "}
            {DISCOVERY_VENTURE_GOAL_LABELS[profile.ventureGoal]}
          </dd>
        </div>
      </dl>
      <div className="mt-5">
        <Link href={profileDetailUrl(profile)} className={SECONDARY_CTA_CLASS}>
          Profil ansehen
        </Link>
      </div>
    </article>
  );
}

function UnavailableState() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff,#f8fafc)] px-5 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-8">
        <Link
          href="/discovery/intros"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Zurück zu meinen Intros
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Dieser Matching-Schritt ist aktuell nicht verfügbar.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Das Intro ist nicht verfügbar, nicht mehr angenommen oder gehört nicht zu deinem
          Account. Private Details werden hier bewusst nicht angezeigt.
        </p>
        <div className="mt-6">
          <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
            Zurück zu meinen Intros
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function DiscoveryIntroMatchingPreparationPage({
  params,
}: {
  params: Promise<MatchingPreparationPageParams>;
}) {
  const resolvedParams = await params;
  const introRequestId = resolvedParams.introRequestId;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    const next = `/discovery/intros/${introRequestId}/matching`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const preparation = await getAcceptedDiscoveryIntroForMatchingPreparation(
    introRequestId,
    user.id
  );

  if (!preparation) {
    return <UnavailableState />;
  }

  const currentUserProfile =
    preparation.currentUserRole === "requester"
      ? preparation.requesterProfile
      : preparation.recipientProfile;
  const otherProfile =
    preparation.currentUserRole === "requester"
      ? preparation.recipientProfile
      : preparation.requesterProfile;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)] backdrop-blur md:p-7">
          <Link
            href="/discovery/intros"
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Zurück zu meinen Intros
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Discovery Intro
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
            Gemeinsames Cofoundery-Matching vorbereiten
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            Ihr habt beide Interesse signalisiert. Der nächste sinnvolle Schritt ist ein
            vollständiges Cofoundery-Matching, damit ihr Rollen, Commitment, Arbeitsweise und
            Erwartungen gemeinsam reflektieren könnt.
          </p>
        </header>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold leading-6 text-amber-950">
            Hier wird noch nichts automatisch erstellt: keine Einladung, keine Relationship,
            kein Report und kein Workbook.
          </p>
        </section>

        {preparation.relationshipExists || preparation.invitationExists ? (
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-5">
            <h2 className="text-xl font-semibold text-slate-950">
              Es gibt bereits einen bestehenden Cofoundery-Kontext
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Für euch scheint bereits ein Matching- oder Verbindungsstand zu existieren. Damit
              nichts doppelt angelegt wird, startet diese Vorbereitungsseite keinen neuen Prozess.
            </p>
          </section>
        ) : null}

        <section className={CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Beteiligte Profile
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Öffentliche Discovery-Projektion
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Angezeigt werden nur Angaben, die ihr bewusst über Discovery veröffentlicht habt.
            E-Mail-Adressen, private Suchprioritäten und Assessment-Daten bleiben verborgen.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <ProfileCard eyebrow="Du" profile={currentUserProfile} />
            <ProfileCard eyebrow="Gegenüber" profile={otherProfile} />
          </div>
        </section>

        <section className={CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Was als Nächstes passiert
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Vom Interesse zum gemeinsamen Reflexionsraum
          </h2>
          <ol className="mt-5 grid gap-3 text-sm leading-6 text-slate-700">
            <li className="rounded-2xl bg-slate-50 px-4 py-3">
              1. Ihr startet das vollständige Cofoundery-Matching.
            </li>
            <li className="rounded-2xl bg-slate-50 px-4 py-3">
              2. Beide füllen die relevanten Cofoundery-Fragen aus oder bestätigen vorhandene
              Antworten.
            </li>
            <li className="rounded-2xl bg-slate-50 px-4 py-3">
              3. Danach entsteht ein gemeinsamer Dynamik-Report und ihr könnt mit dem Workbook
              weiterarbeiten.
            </li>
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled className={PRIMARY_DISABLED_CTA_CLASS}>
              Matching starten - kommt als nächster Schritt
            </button>
            <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
              Zurück zu meinen Intros
            </Link>
            <Link href={profileDetailUrl(otherProfile)} className={SECONDARY_CTA_CLASS}>
              Profil ansehen
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
