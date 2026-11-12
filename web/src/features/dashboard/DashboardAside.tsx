import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CURRENT_WORKSTYLE_HREF } from "@/features/instruments/workstyle/current";

export type ProfileParts = { work: boolean; can: boolean; strengths: boolean; direction: boolean };

export type StandTeam = {
  id: string;
  name: string;
  setup: { total: number; settled: number; awaitingConfirmation: number } | null;
  everyday: boolean;
  testProjectClosed: boolean;
};

const BOX = "rounded-[20px] border border-[#e4e2f0] bg-[#f8f9fc] px-5 py-5 sm:px-[22px]";
const BOX_TITLE = "text-[15px] font-semibold uppercase tracking-[0.06em] text-[#5f5e7a]";

/**
 * Die leise Spalte neben dem naechsten Schritt. Alles hier ist freiwillig:
 * nichts davon ist eine Aufgabe, nichts wird hervorgehoben.
 *
 *   Dein Stand        Welche Profilteile fertig sind, und fuer das gewaehlte
 *                     Team, was vereinbart ist - Zahlen als Tatsachen, ohne
 *                     "von", ohne Balken.
 *   Naechstes Gespraech  Eine Frage aus dem eigenen Teambericht.
 *   Ohne Team         Einladen und Find, statt eines leeren Stands.
 */
export async function DashboardAside({
  parts,
  team,
  otherTeams,
  conversation,
  showInvite = true,
}: {
  parts: ProfileParts;
  team: StandTeam | null;
  otherTeams: { id: string; name: string }[];
  conversation: { label: string; question: string } | null;
  /** Ist "Co-Founder einladen" schon der naechste Schritt, steht es hier nicht noch einmal. */
  showInvite?: boolean;
}) {
  const t = await getTranslations("dashboard.start");
  const keys = ["work", "can", "strengths", "direction"] as const;
  const done = keys.filter((key) => parts[key]).map((key) => t(`stand.parts.${key}`));
  const open = keys.filter((key) => !parts[key]).map((key) => t(`stand.parts.${key}`));
  const teamPath = team ? `/teams/${encodeURIComponent(team.id)}` : null;
  // Jeder offene Teil fuehrt direkt dorthin (statt eines allgemeinen "Zum Profil").
  const PART_HREF = { work: CURRENT_WORKSTYLE_HREF, can: "/profile?step=areas", strengths: "/profile/strengths-interview", direction: "/profile/direction" } as const;
  const openParts = keys.filter((key) => !parts[key]);

  return (
    <aside aria-label={t("stand.title")} className="flex min-w-0 flex-col gap-4">
      <section aria-labelledby="dashboard-stand-title" className={BOX}>
        <h2 id="dashboard-stand-title" className={BOX_TITLE}>{t("stand.title")}</h2>
        <dl className="mt-3.5 flex flex-col gap-3 text-base leading-snug">
          <div>
            <dt className="font-semibold text-[#0b1f3a]">{t("stand.profile")}</dt>
            <dd className="mt-0.5 text-[#33325e]">
              {open.length === 0
                ? t("stand.profileAllDone")
                : [done.length > 0 ? t("stand.profileDone", { done: done.join(", ") }) : null, t("stand.profileOpen", { open: open.join(", ") })]
                    .filter(Boolean)
                    .join(" ")}
            </dd>
          </div>
          {team ? (
            <div>
              <dt className="font-semibold text-[#0b1f3a]">
                <Link href={teamPath!} className="hover:underline">{team.name}</Link>
              </dt>
              <dd className="mt-0.5 text-[#33325e]">
                {team.everyday
                  ? [t("stand.teamAllSettled"), team.testProjectClosed ? t("stand.testProjectClosed") : null].filter(Boolean).join(" · ")
                  : team.setup
                    ? [
                        t("stand.teamSettled", { settled: team.setup.settled }),
                        team.setup.awaitingConfirmation > 0 ? t("stand.teamAwaiting", { count: team.setup.awaitingConfirmation }) : null,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : null}
              </dd>
            </div>
          ) : null}
          {team?.everyday ? (
            <div>
              <dt className="font-semibold text-[#0b1f3a]">{t("stand.maybe")}</dt>
              <dd className="mt-0.5 text-[#33325e]">
                <Link href={`${teamPath}/finanzierung`} className="text-violet-800 underline underline-offset-4">{t("stand.financing")}</Link>
                {" · "}
                <Link href={`${teamPath}/zielkonflikte`} className="text-violet-800 underline underline-offset-4">{t("stand.tradeoffs")}</Link>
              </dd>
            </div>
          ) : null}
          {otherTeams.length > 0 ? (
            <div>
              <dt className="font-semibold text-[#0b1f3a]">{t("stand.otherTeams")}</dt>
              <dd className="mt-0.5">
                {otherTeams.map((other, index) => (
                  <span key={other.id}>
                    {index > 0 ? " · " : null}
                    <Link href={`/dashboard?team=${encodeURIComponent(other.id)}`} className="text-violet-800 underline underline-offset-4">{other.name}</Link>
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
        {openParts.length > 0 ? (
          <p className="mt-3.5 flex flex-wrap items-center gap-x-1 text-[15px]">
            <span className="text-[#33325e]">{t("stand.continueWith")}</span>
            {openParts.map((key, index) => (
              <span key={key}>
                {index > 0 ? " · " : " "}
                <Link href={PART_HREF[key]} className="inline-flex min-h-10 items-center text-violet-800 underline underline-offset-4">{t(`stand.parts.${key}`)}</Link>
              </span>
            ))}
          </p>
        ) : null}
        <p className="flex flex-wrap items-center gap-x-4">
          <Link href="/me/profile" className="inline-flex min-h-10 items-center text-[15px] text-violet-800 hover:underline">{t("stand.toProfile")}</Link>
          <Link href="/fragebogen" className="inline-flex min-h-10 items-center text-[15px] text-violet-800 hover:underline">{t("stand.allQuestionnaires")}</Link>
        </p>
      </section>

      {conversation && teamPath ? (
        <section aria-labelledby="dashboard-talk-title" className={BOX}>
          <h2 id="dashboard-talk-title" className={BOX_TITLE}>{t("talk.title")}</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-[#0b1f3a]">{conversation.question}</p>
          <p className="mt-2 text-sm text-[#5f5e7a]">{t("talk.from", { label: conversation.label })}</p>
          <Link href={`${teamPath}/workstyle`} className="mt-2 inline-flex min-h-10 items-center text-[15px] text-violet-800 hover:underline">{t("talk.link")}</Link>
        </section>
      ) : null}

      {!team ? (
        <>
          {showInvite ? (
          <section aria-labelledby="dashboard-solo-invite" className={BOX}>
            <h2 id="dashboard-solo-invite" className={BOX_TITLE}>{t("solo.inviteTitle")}</h2>
            <p className="mt-3 text-[17px] leading-relaxed text-[#0b1f3a]">{t("solo.inviteText")}</p>
            <Link href="/invite/new" className="mt-3.5 inline-flex min-h-11 items-center rounded-full border border-violet-300 px-[18px] text-[15px] font-semibold text-violet-800 hover:bg-violet-50">{t("solo.inviteCta")}</Link>
          </section>
          ) : null}
          <section aria-labelledby="dashboard-solo-find" className={BOX}>
            <h2 id="dashboard-solo-find" className={BOX_TITLE}>{t("solo.findTitle")}</h2>
            <p className="mt-3 text-[17px] leading-relaxed text-[#0b1f3a]">{t("solo.findText")}</p>
            <Link href="/discovery" className="mt-2 inline-flex min-h-10 items-center text-[15px] text-violet-800 hover:underline">{t("solo.findCta")}</Link>
          </section>
        </>
      ) : null}
    </aside>
  );
}
