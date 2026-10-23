import Link from "next/link";
import { TeamDetailsEditor } from "@/features/teams/TeamDetailsEditor";
import { getTranslations } from "next-intl/server";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { ventureHref, type TeamJourneyState } from "@/features/teams/TeamJourneyStatus";

type Member = { userId: string; displayName: string; avatarId?: string | null; avatarUrl?: string | null };
type StepKey = "work" | "venture" | "report" | "setup";
type Tone = "done" | "doing" | "open";

/** Kleine Bildzeichen, rein beschreibend: Person, Vorhaben, Ueberlappung, Absprache. */
function StepGlyph({ name }: { name: StepKey }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "work")
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
      </svg>
    );
  if (name === "venture")
    return (
      <svg {...common}>
        <path d="M6 21V4" />
        <path d="M6 5h11l-2.5 3.5L17 12H6" />
      </svg>
    );
  if (name === "report")
    return (
      <svg {...common}>
        <circle cx="9" cy="12" r="5.5" />
        <circle cx="15" cy="12" r="5.5" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 9.5l1.5 1.5L14 7.5" />
      <path d="M9 15.5h6" />
    </svg>
  );
}

/**
 * Kopf der Teamseite: Menschen, ein naechster Schritt, vier Bereiche als Kacheln.
 * Zustaende stehen als Text UND Punkt (nie nur Farbe), es gibt keinen
 * gemeinsamen Fortschritt, keine Prozent und keine "x von y".
 */
export async function TeamOverview({
  teamId,
  title,
  teamName = null,
  teamDescription = null,
  members,
  journey,
  canInvite,
}: {
  teamId: string;
  title: string;
  /** Der gesetzte Name (nicht der Ersatzname aus den Mitgliedern). */
  teamName?: string | null;
  teamDescription?: string | null;
  members: Member[];
  journey: TeamJourneyState;
  canInvite: boolean;
}) {
  const t = await getTranslations("teams.homebase");
  const team = encodeURIComponent(teamId);
  const href: Record<StepKey, string> = {
    work: "/me/profile/workstyle",
    venture: ventureHref(teamId, journey.venture),
    report: `/teams/${team}/workstyle`,
    setup: `/teams/${team}/setup`,
  };
  const tone: Record<StepKey, Tone> = {
    work: journey.work === "present" ? "done" : journey.work === "inProgress" ? "doing" : "open",
    venture: journey.venture === "present" ? "done" : journey.venture === "inProgress" ? "doing" : "open",
    report: journey.report === "available" ? "done" : journey.report === "shareMissing" ? "doing" : "open",
    setup: journey.setup === "confirmed" ? "done" : journey.setup === "open" || journey.setup === "unavailable" ? "open" : "doing",
  };
  const status: Record<StepKey, string> = {
    work: t(`journey.assessment.${journey.work}`),
    venture: t(`journey.assessment.${journey.venture}`),
    report: t(`journey.report.${journey.report}`),
    setup: t(`journey.setup.${journey.setup}`),
  };
  // Der naechste Schritt: der erste Bereich, der noch nicht steht.
  const next: { key: string; href: string } =
    tone.work !== "done"
      ? { key: "work", href: href.work }
      : tone.venture !== "done"
        ? { key: "venture", href: href.venture }
        : journey.report === "shareMissing"
          ? { key: "share", href: "#teamfreigabe" }
          : journey.report === "available"
            ? { key: "report", href: href.report }
            : { key: "setup", href: href.setup };
  const steps: StepKey[] = ["work", "venture", "report", "setup"];

  const chip: Record<Tone, string> = {
    done: "bg-[#e3f6ec] text-[#17794a]",
    doing: "bg-[#efeafd] text-[#4a2fb8]",
    open: "bg-[#f1f0f7] text-[#33325e]",
  };
  // Die Station, die als Naechstes dran ist, pulsiert - die erste, die noch nicht steht.
  const here = steps.find((key) => tone[key] !== "done") ?? null;

  return (
    <>
      <section className="brand-panel relative mt-5 grid items-center gap-6 overflow-hidden rounded-[28px] px-6 py-8 sm:px-9 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" aria-labelledby="team-title">
        <span aria-hidden="true" className="orb -top-14 left-1/2 hidden h-44 w-44 md:block" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white opacity-90">{t("eyebrow")}</p>
          <h1 id="team-title" className="mt-1 break-words text-[32px] font-semibold leading-tight sm:text-4xl">{title}</h1>
          <div className="mt-1">
            <TeamDetailsEditor
              teamId={teamId}
              displayName={title}
              name={teamName}
              description={teamDescription}
              returnTo={`/teams/${encodeURIComponent(teamId)}`}
              tone="brand"
              summary={<span className="inline-flex min-h-10 items-center text-sm text-white underline underline-offset-4">{t("editDetails")}</span>}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <ul className="flex -space-x-2">
              {members.map((member) => (
                <li key={member.userId} title={member.displayName}>
                  <ProfileAvatar
                    displayName={member.displayName}
                    avatarId={member.avatarId}
                    imageUrl={member.avatarUrl}
                    alt={member.displayName}
                    className="h-11 w-11 rounded-full border-2 border-white object-cover"
                    fallbackClassName="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-white/90 text-sm font-semibold text-violet-800"
                  />
                </li>
              ))}
            </ul>
            <p className="text-[15px] text-white">{members.map((member) => member.displayName).join(" · ")}</p>
            {canInvite ? (
              <Link href={`/invite/new?team=${team}`} className="text-sm font-semibold text-white underline underline-offset-4">
                {t("membersInvite")}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2.5 rounded-[22px] bg-white p-5 text-[#0b1f3a]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#4a2fb8]">{t("overview.nextStep")}</p>
          <p className="text-[21px] font-semibold leading-tight">{t(`overview.next.${next.key}`)}</p>
          <div>
            <Link
              href={next.href}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-[18px] text-[15px] font-semibold text-white hover:opacity-90"
            >
              {t("overview.go")}
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="team-journey-title" className="mt-5 rounded-[24px] border border-[#e4e2f0] bg-white px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="team-journey-title" className="text-[22px] font-semibold tracking-tight text-[#0b1f3a]">{t("journey.label")}</h2>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((key) => (
            <li key={key} className="min-w-0">
              <Link
                href={href[key]}
                className={`card-lift flex h-full flex-col gap-2.5 rounded-[22px] border bg-white p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] ${
                  here === key ? "border-[#6d49e0] shadow-[0_0_0_4px_rgba(109,73,224,0.10)]" : "border-[#e4e2f0]"
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${
                    here === key
                      ? "profile-step-here bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] text-white"
                      : tone[key] === "done"
                        ? "bg-[#e3f6ec] text-[#17794a]"
                        : "bg-[#efeafd] text-[#4a2fb8]"
                  }`}
                >
                  <StepGlyph name={key} />
                </span>
                <span className="text-base font-semibold text-[#0b1f3a]">{t(`journey.items.${key}`)}</span>
                <span className={`mt-auto inline-flex items-center self-start rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${chip[tone[key]]}`}>{status[key]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
