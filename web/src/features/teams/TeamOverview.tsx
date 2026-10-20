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

  return (
    <>
      <section className="brand-panel mt-5 rounded-[28px] p-6 sm:p-8" aria-labelledby="team-title">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{t("eyebrow")}</p>
        <h1 id="team-title" className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
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
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
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
          <p className="text-sm text-white">{members.map((member) => member.displayName).join(" · ")}</p>
          {canInvite ? (
            <Link href={`/invite/new?team=${team}`} className="text-sm text-white underline underline-offset-4">
              {t("membersInvite")}
            </Link>
          ) : null}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-white/15 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{t("overview.nextStep")}</p>
            <p className="mt-1 text-lg font-semibold">{t(`overview.next.${next.key}`)}</p>
          </div>
          <Link
            href={next.href}
            className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-violet-800 transition hover:bg-violet-50"
          >
            {t("overview.go")}
          </Link>
        </div>
      </section>

      <ul aria-label={t("journey.label")} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((key) => (
          <li key={key} className="min-w-0">
            <Link
              href={href[key]}
              className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-sky-600 text-white">
                <StepGlyph name={key} />
              </span>
              <span className="text-base font-semibold text-slate-950">{t(`journey.items.${key}`)}</span>
              <span className="mt-auto inline-flex items-center gap-2 text-sm text-slate-600">
                <span
                  aria-hidden="true"
                  className={
                    tone[key] === "done"
                      ? "h-2.5 w-2.5 rounded-full bg-teal-600"
                      : tone[key] === "doing"
                        ? "h-2.5 w-2.5 rounded-full bg-violet-600"
                        : "h-2.5 w-2.5 rounded-full border-2 border-slate-300"
                  }
                />
                {status[key]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
