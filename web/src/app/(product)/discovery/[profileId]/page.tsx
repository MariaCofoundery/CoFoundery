import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DISCOVERY_COMMITMENT_LABELS,
  DISCOVERY_REMOTE_MODE_LABELS,
  DISCOVERY_ROLE_LABELS,
  DISCOVERY_VENTURE_GOAL_LABELS,
  DISCOVERY_VENTURE_STAGE_LABELS,
} from "@/features/discovery/discoveryConfig";
import { getActiveDiscoveryProfileById } from "@/features/discovery/discoveryData";
import {
  cancelDiscoveryIntroAction,
  requestDiscoveryIntroAction,
} from "@/features/discovery/discoveryIntroActions";
import { getDiscoveryIntroRequestForProfile } from "@/features/discovery/discoveryIntroData";
import {
  canCancelDiscoveryIntro,
  DISCOVERY_INTRO_STATUS_LABELS,
  type DiscoveryIntroRequest,
} from "@/features/discovery/discoveryIntroTypes";
import type { DiscoveryFounderRole, FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import { createClient } from "@/lib/supabase/server";

const CARD_CLASS =
  "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6";
const PRIMARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[color:var(--brand-primary-hover)]";
const DISABLED_CTA_CLASS =
  "inline-flex cursor-not-allowed items-center justify-center rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";
const TEXTAREA_CLASS =
  "mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

type DiscoveryProfileDetailPageParams = {
  profileId: string;
};

function formatRoleList(values: DiscoveryFounderRole[]) {
  return values.length > 0
    ? values.map((value) => DISCOVERY_ROLE_LABELS[value]).join(", ")
    : "Noch nicht angegeben";
}

function formatText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : "Noch nicht angegeben";
}

function formatIndustries(values: string[]) {
  return values.length > 0 ? values.join(", ") : "Noch nicht angegeben";
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-medium leading-6 text-slate-900">{value}</dd>
    </div>
  );
}

function EmptyState() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff,#f8fafc)] px-5 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-8">
        <Link href="/discovery" className="text-sm font-medium text-slate-500 hover:text-slate-900">
          Zurück zu Discovery
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Profil nicht sichtbar
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Dieses Discovery-Profil ist aktuell nicht öffentlich sichtbar oder existiert nicht.
        </p>
        <div className="mt-6">
          <Link href="/discovery" className={PRIMARY_CTA_CLASS}>
            Zurück zu Discovery
          </Link>
        </div>
      </section>
    </main>
  );
}

function ProfileDetails({ profile }: { profile: FounderDiscoveryProfile }) {
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      <DetailItem label="Bringt mit" value={formatRoleList(profile.ownRoles)} />
      <DetailItem label="Sucht" value={formatRoleList(profile.seekingRoles)} />
      <DetailItem label="Branchen / Interessen" value={formatIndustries(profile.industries)} />
      <DetailItem label="Standort" value={formatText(profile.locationLabel)} />
      <DetailItem label="Remote-Modus" value={DISCOVERY_REMOTE_MODE_LABELS[profile.remoteMode]} />
      <DetailItem
        label="Verfügbarkeit"
        value={
          profile.availabilityHoursPerWeek
            ? `${profile.availabilityHoursPerWeek} Std./Woche`
            : "Noch nicht angegeben"
        }
      />
      <DetailItem label="Commitment-Level" value={DISCOVERY_COMMITMENT_LABELS[profile.commitmentLevel]} />
      <DetailItem label="Venture Stage" value={DISCOVERY_VENTURE_STAGE_LABELS[profile.ventureStage]} />
      <DetailItem label="Venture Goal" value={DISCOVERY_VENTURE_GOAL_LABELS[profile.ventureGoal]} />
    </dl>
  );
}

function IntroRequestCard({
  profile,
  introRequest,
}: {
  profile: FounderDiscoveryProfile;
  introRequest: DiscoveryIntroRequest | null;
}) {
  async function requestIntro(formData: FormData) {
    "use server";
    await requestDiscoveryIntroAction(profile.id, formData);
  }

  if (!introRequest) {
    return (
      <section className={CARD_CLASS}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Discovery Intro
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Intro anfragen</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Wenn das Profil spannend wirkt, kannst du ein erstes Interesse signalisieren. Die
          andere Person entscheidet, ob sie das Intro annehmen möchte.
        </p>
        <form action={requestIntro} className="mt-5 grid gap-4">
          <label>
            <span className="text-sm font-semibold text-slate-900">Kurze Nachricht</span>
            <textarea
              name="message"
              maxLength={600}
              placeholder="Was macht das Profil für dich spannend?"
              className={TEXTAREA_CLASS}
            />
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              Optional, maximal 600 Zeichen. Teile nur, was du bewusst senden möchtest.
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className={PRIMARY_CTA_CLASS}>
              Intro anfragen
            </button>
            <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
              Meine Intros
            </Link>
          </div>
        </form>
      </section>
    );
  }

  if (introRequest.status === "accepted") {
    return (
      <section className={CARD_CLASS}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          {DISCOVERY_INTRO_STATUS_LABELS.accepted}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Beidseitiges Interesse</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Ihr habt beide Interesse signalisiert. Als nächster Schritt könnt ihr ein erstes Gespräch
          führen oder ein gemeinsames Cofoundery-Matching starten.
        </p>
        {introRequest.responseMessage ? (
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            Antwort: {introRequest.responseMessage}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled className={DISABLED_CTA_CLASS}>
            Gemeinsames Matching vorbereiten
          </button>
          <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
            Meine Intros
          </Link>
        </div>
      </section>
    );
  }

  if (introRequest.status === "declined") {
    return (
      <section className={CARD_CLASS}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {DISCOVERY_INTRO_STATUS_LABELS.declined}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Aktuell kein Intro</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Diese Person möchte das Intro aktuell nicht weiterverfolgen.
        </p>
        {introRequest.responseMessage ? (
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            Antwort: {introRequest.responseMessage}
          </p>
        ) : null}
        <div className="mt-5">
          <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
            Meine Intros
          </Link>
        </div>
      </section>
    );
  }

  if (introRequest.status === "canceled") {
    return (
      <section className={CARD_CLASS}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {DISCOVERY_INTRO_STATUS_LABELS.canceled}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Anfrage zurückgezogen</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Du hast diese Intro-Anfrage zurückgezogen. Wenn das Profil später wieder spannend wirkt,
          kannst du eine neue Anfrage stellen.
        </p>
        <div className="mt-5">
          <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
            Meine Intros
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={CARD_CLASS}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
        {DISCOVERY_INTRO_STATUS_LABELS.pending}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">Intro angefragt</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Die Anfrage wartet auf Antwort.
      </p>
      {introRequest.message ? (
        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          Deine Nachricht: {introRequest.message}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3">
        {canCancelDiscoveryIntro(introRequest) ? (
          <form
            action={async () => {
              "use server";
              await cancelDiscoveryIntroAction(introRequest.id);
            }}
          >
            <button type="submit" className={SECONDARY_CTA_CLASS}>
              Anfrage zurückziehen
            </button>
          </form>
        ) : null}
        <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
          Meine Intros
        </Link>
      </div>
    </section>
  );
}

export default async function DiscoveryProfileDetailPage({
  params,
}: {
  params: Promise<DiscoveryProfileDetailPageParams>;
}) {
  const resolvedParams = await params;
  const profileId = resolvedParams.profileId;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/discovery/${profileId}`)}`);
  }

  const profile = await getActiveDiscoveryProfileById(profileId);
  if (!profile) {
    return <EmptyState />;
  }

  const isOwner = profile.userId === user.id;
  const introRequest = isOwner
    ? null
    : await getDiscoveryIntroRequestForProfile(user.id, profile.id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)] backdrop-blur md:p-7">
          <Link href="/discovery" className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Zurück zu Discovery
          </Link>
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Discovery-Profil
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
                {formatText(profile.displayName)}
              </h1>
              <p className="mt-3 max-w-3xl text-xl font-semibold leading-8 text-slate-900">
                {formatText(profile.headline)}
              </p>
            </div>
            {isOwner ? (
              <Link href="/discovery/profile" className={PRIMARY_CTA_CLASS}>
                Mein Suchprofil bearbeiten
              </Link>
            ) : (
              <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
                Meine Intros
              </Link>
            )}
          </div>
        </header>

        <section className={CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Kurzbeschreibung
          </p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
            {formatText(profile.bio)}
          </p>
        </section>

        <section className={CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Suchprofil
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Was diese Person veröffentlicht hat
          </h2>
          <div className="mt-5">
            <ProfileDetails profile={profile} />
          </div>
        </section>

        {isOwner ? null : <IntroRequestCard profile={profile} introRequest={introRequest} />}

        <section className="rounded-3xl border border-slate-200 bg-white/80 p-5">
          <p className="text-sm leading-6 text-slate-600">
            Dieses Profil zeigt nur Angaben, die die Person bewusst für Discovery veröffentlicht
            hat. Private Suchprioritäten und Assessment-Antworten werden nicht angezeigt.
          </p>
        </section>
      </div>
    </main>
  );
}
