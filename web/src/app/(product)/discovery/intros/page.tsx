import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DISCOVERY_REMOTE_MODE_LABELS,
  DISCOVERY_ROLE_LABELS,
} from "@/features/discovery/discoveryConfig";
import {
  cancelDiscoveryIntroAction,
  type DiscoveryIntroActionState,
  respondDiscoveryIntroAction,
} from "@/features/discovery/discoveryIntroActions";
import {
  getReceivedDiscoveryIntroRequests,
  getSentDiscoveryIntroRequests,
} from "@/features/discovery/discoveryIntroData";
import {
  canCancelDiscoveryIntro,
  canRespondToDiscoveryIntro,
  type DiscoveryIntroRequestWithProfile,
} from "@/features/discovery/discoveryIntroTypes";
import type { DiscoveryFounderRole, DiscoveryProfilePreview } from "@/features/discovery/discoveryTypes";
import { createClient } from "@/lib/supabase/server";

const CARD_CLASS =
  "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6";
const PRIMARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";
const DANGER_LIGHT_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50";
const TEXTAREA_CLASS =
  "mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

type DiscoveryIntrosSearchParams = {
  introMessage?: string | string[];
  introOk?: string | string[];
};

const INTRO_STATUS_PILL_LABELS = {
  pending: "Offen",
  accepted: "Angenommen",
  declined: "Nicht angenommen",
  canceled: "Zurückgezogen",
} as const;

function searchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function introsResultUrl(result: DiscoveryIntroActionState) {
  const params = new URLSearchParams();
  params.set("introMessage", result.message ?? "Die Intro-Aktion wurde verarbeitet.");
  params.set("introOk", result.ok ? "1" : "0");
  return `/discovery/intros?${params.toString()}`;
}

function IntroPageMessage({ message, ok }: { message: string | null; ok: boolean }) {
  if (!message) {
    return null;
  }

  return (
    <section
      className={`rounded-3xl border p-4 ${
        ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <p className={`text-sm font-semibold ${ok ? "text-emerald-900" : "text-amber-900"}`}>
        {message}
      </p>
    </section>
  );
}

function formatRoleList(values: DiscoveryFounderRole[]) {
  return values.length > 0
    ? values.map((value) => DISCOVERY_ROLE_LABELS[value]).join(", ")
    : "Noch nicht angegeben";
}

function ProfileSummary({ profile }: { profile: DiscoveryProfilePreview | null }) {
  if (!profile) {
    return (
      <div>
        <h3 className="text-xl font-semibold text-slate-950">Discovery-Profil nicht sichtbar</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Das zugehörige Profil ist aktuell nicht öffentlich sichtbar.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-semibold text-slate-950">{profile.displayName}</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{profile.headline}</p>
      <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
        <p>
          <span className="font-semibold text-slate-900">Bringt mit:</span>{" "}
          {formatRoleList(profile.ownRoles)}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Sucht:</span>{" "}
          {formatRoleList(profile.seekingRoles)}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Arbeitsrahmen:</span>{" "}
          {profile.locationLabel ? `${profile.locationLabel} · ` : ""}
          {DISCOVERY_REMOTE_MODE_LABELS[profile.remoteMode]}
        </p>
      </div>
    </div>
  );
}

function StatusPill({ request }: { request: DiscoveryIntroRequestWithProfile }) {
  const statusClass =
    request.status === "accepted"
      ? "bg-emerald-100 text-emerald-800"
      : request.status === "declined"
        ? "bg-slate-100 text-slate-700"
        : request.status === "canceled"
          ? "bg-rose-100 text-rose-700"
          : "bg-amber-100 text-amber-800";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
      {INTRO_STATUS_PILL_LABELS[request.status]}
    </span>
  );
}

function RequestMessage({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function ReceivedIntroCard({ request }: { request: DiscoveryIntroRequestWithProfile }) {
  async function acceptIntro(formData: FormData) {
    "use server";
    const result = await respondDiscoveryIntroAction(request.id, "accepted", formData);
    redirect(introsResultUrl(result));
  }

  async function declineIntro(formData: FormData) {
    "use server";
    const result = await respondDiscoveryIntroAction(request.id, "declined", formData);
    redirect(introsResultUrl(result));
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <ProfileSummary profile={request.profile} />
        <StatusPill request={request} />
      </div>
      <div className="mt-4 grid gap-3">
        <RequestMessage label="Nachricht" value={request.message} />
        <RequestMessage label="Deine Antwort" value={request.responseMessage} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {request.profile ? (
          <Link href={`/discovery/${request.profile.id}`} className={SECONDARY_CTA_CLASS}>
            Profil ansehen
          </Link>
        ) : null}
        {request.status === "accepted" ? (
          <Link
            href={`/discovery/intros/${request.id}/matching`}
            className={PRIMARY_CTA_CLASS}
          >
            Gemeinsames Matching vorbereiten
          </Link>
        ) : null}
      </div>
      {canRespondToDiscoveryIntro(request) ? (
        <div className="mt-5 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
          <form action={acceptIntro}>
            <label>
              <span className="text-sm font-semibold text-slate-900">
                Antwortnachricht optional
              </span>
              <textarea
                name="responseMessage"
                maxLength={600}
                placeholder="Was möchtest du kurz zurückgeben?"
                className={TEXTAREA_CLASS}
              />
            </label>
            <button type="submit" className={`${PRIMARY_CTA_CLASS} mt-3`}>
              Annehmen
            </button>
          </form>
          <form action={declineIntro}>
            <label>
              <span className="text-sm font-semibold text-slate-900">
                Antwortnachricht optional
              </span>
              <textarea
                name="responseMessage"
                maxLength={600}
                placeholder="Du kannst kurz antworten, musst aber nicht."
                className={TEXTAREA_CLASS}
              />
            </label>
            <button type="submit" className={`${DANGER_LIGHT_CTA_CLASS} mt-3`}>
              Ablehnen
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

function SentIntroCard({ request }: { request: DiscoveryIntroRequestWithProfile }) {
  async function cancelIntro() {
    "use server";
    const result = await cancelDiscoveryIntroAction(request.id);
    redirect(introsResultUrl(result));
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <ProfileSummary profile={request.profile} />
        <StatusPill request={request} />
      </div>
      <div className="mt-4 grid gap-3">
        <RequestMessage label="Deine Nachricht" value={request.message} />
        <RequestMessage label="Antwort" value={request.responseMessage} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {request.profile ? (
          <Link href={`/discovery/${request.profile.id}`} className={SECONDARY_CTA_CLASS}>
            Profil ansehen
          </Link>
        ) : null}
        {request.status === "accepted" ? (
          <Link
            href={`/discovery/intros/${request.id}/matching`}
            className={PRIMARY_CTA_CLASS}
          >
            Gemeinsames Matching vorbereiten
          </Link>
        ) : null}
        {canCancelDiscoveryIntro(request) ? (
          <form action={cancelIntro}>
            <button type="submit" className={DANGER_LIGHT_CTA_CLASS}>
              Zurückziehen
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

function sortIntroRequests(requests: DiscoveryIntroRequestWithProfile[]) {
  return [...requests].sort((left, right) => {
    if (left.status === "pending" && right.status !== "pending") return -1;
    if (left.status !== "pending" && right.status === "pending") return 1;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export default async function DiscoveryIntrosPage({
  searchParams,
}: {
  searchParams?: Promise<DiscoveryIntrosSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent("/discovery/intros")}`);
  }

  const [received, sent] = await Promise.all([
    getReceivedDiscoveryIntroRequests(user.id),
    getSentDiscoveryIntroRequests(user.id),
  ]);

  const sortedReceived = sortIntroRequests(received);
  const sortedSent = sortIntroRequests(sent);
  const introMessage = searchParamValue(resolvedSearchParams.introMessage) ?? null;
  const introOk = searchParamValue(resolvedSearchParams.introOk) !== "0";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)] backdrop-blur md:p-7">
          <Link href="/discovery" className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Zurück zu Discovery
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Discovery Intros
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
            Meine Intros
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Hier siehst du, wer dich kennenlernen möchte und welche Intros du angefragt hast.
            Ein angenommenes Intro erzeugt noch keine Relationship, keine Invitation und kein
            Workbook.
          </p>
        </header>

        <IntroPageMessage message={introMessage} ok={introOk} />

        <section className={CARD_CLASS}>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Eingegangen
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Intro-Anfragen an dich
              </h2>
            </div>
          </div>
          {sortedReceived.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {sortedReceived.map((request) => (
                <ReceivedIntroCard key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm leading-6 text-slate-600">
              Noch keine eingegangenen Intro-Anfragen. Sobald jemand dein Profil spannend findet,
              erscheint die Anfrage hier.
            </p>
          )}
        </section>

        <section className={CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Gesendet
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Deine angefragten Intros
          </h2>
          {sortedSent.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {sortedSent.map((request) => (
                <SentIntroCard key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm leading-6 text-slate-600">
              Du hast noch keine Intros angefragt. Wenn ein Profil spannend wirkt, kannst du über
              die Profilseite ein erstes Interesse signalisieren.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
