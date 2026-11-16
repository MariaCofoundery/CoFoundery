import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { alignPartHref } from "@/features/align/alignModel";
import { NewsletterAsk, type NewsletterState } from "@/features/newsletter/NewsletterAsk";

export type ProfileParts = { work: boolean; can: boolean; strengths: boolean; direction: boolean };

export type StandTeam = {
  id: string;
  name: string;
  setup: { total: number; settled: number; awaitingConfirmation: number } | null;
  everyday: boolean;
  testProjectClosed: boolean;
};

const BOX = "rounded-[20px] border border-[#dcdff0] bg-white px-5 py-5 sm:px-[22px]";
const CHIP_LINK = "inline-flex min-h-9 items-center rounded-full bg-white px-3 text-[14px] font-semibold text-violet-800 hover:bg-violet-100";
const BOX_TITLE = "text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6d28d9]";

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
  setupOpen = false,
  newsletter = null,
  className = "",
  waiting = null,
}: {
  parts: ProfileParts;
  team: StandTeam | null;
  otherTeams: { id: string; name: string }[];
  conversation: { label: string; question: string } | null;
  /** Ist "Co-Founder einladen" schon der naechste Schritt, steht es hier nicht noch einmal. */
  showInvite?: boolean;
  /** Das Profil-Setup hat noch offene Schritte: ein stiller Link dorthin. */
  setupOpen?: boolean;
  /** Platz im Raster der Startseite (Entwurf 17.11.2026). */
  className?: string;
  /** "Wartet auf dich": steht als letzter Abschnitt im getoenten Feld. */
  waiting?: React.ReactNode;
  /** Stand des Newsletters; null = Karte nicht zeigen (bestaetigt: nichts mehr zu fragen). */
  newsletter?: NewsletterState | null;
}) {
  const t = await getTranslations("dashboard.start");
  const tDash = await getTranslations("dashboard");
  const keys = ["work", "can", "strengths", "direction"] as const;
  const done = keys.filter((key) => parts[key]).map((key) => t(`stand.parts.${key}`));
  const open = keys.filter((key) => !parts[key]).map((key) => t(`stand.parts.${key}`));
  const teamPath = team ? `/teams/${encodeURIComponent(team.id)}` : null;
  // Jeder offene Teil fuehrt direkt dorthin (statt eines allgemeinen "Zum Profil").
  const openParts = keys.filter((key) => !parts[key]);

  return (
    <aside aria-label={t("stand.title")} className={`flex min-w-0 flex-col gap-5 ${className}`}>
      <div className="rounded-[26px] bg-[#ede7fb] p-5 sm:p-[22px]" data-dashboard-panel>
        <section aria-labelledby="dashboard-stand-title">
          <div className="flex items-center gap-3.5">
            <Image src="/brand/mia.png" alt="" width={203} height={286} className="h-[76px] w-auto shrink-0 rounded-xl border border-white/80 shadow-[0_6px_18px_rgba(76,29,149,.12)]" />
            <div className="min-w-0">
              <h2 id="dashboard-stand-title" className={BOX_TITLE}>{t("stand.title")}</h2>
              <p className="mt-1 text-[19px] font-bold leading-6 text-[#0b1f3a]">{open.length === 0 ? t("stand.profileAllDone") : t("stand.openCount", { count: open.length })}</p>
            </div>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {keys.map((key) => (
              <li key={key}>
                {parts[key] ? (
                  <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-[14px] font-semibold text-emerald-900">
                    <span aria-hidden="true">✓</span>{t(`stand.parts.${key}`)}
                    <span className="sr-only"> – {t("stand.partDone")}</span>
                  </span>
                ) : (
                  <Link href={alignPartHref(key, "open")} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-[#b9a9f5] px-3 text-[14px] font-semibold text-[#5b3df5] hover:bg-white/70">
                    <span aria-hidden="true">○</span>{t(`stand.parts.${key}`)}
                    <span className="sr-only"> – {t("stand.partOpen")}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 flex flex-wrap items-center gap-x-4">
            {setupOpen ? <Link href="/welcome/profil" className="inline-flex min-h-11 items-center text-[15px] font-bold text-violet-800 hover:underline">{t("stand.setupProfile")}</Link> : null}
            <Link href="/me/profile" className="inline-flex min-h-11 items-center text-[15px] text-violet-800 hover:underline">{t("stand.toProfile")}</Link>
            <Link href="/fragebogen" className="inline-flex min-h-11 items-center text-[15px] text-violet-800 hover:underline">{t("stand.allQuestionnaires")}</Link>
          </p>
        </section>

        {team ? (
          <>
            <hr className="my-4 border-[#d9d0f5]" />
            <section aria-labelledby="dashboard-team-title" data-dashboard-team>
              <h2 id="dashboard-team-title" className={BOX_TITLE}>{t("stand.teamTitle")}</h2>
              <Link href={teamPath!} className="mt-2.5 flex items-center gap-3 rounded-xl py-1 hover:bg-white/60">
                <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-lg font-bold text-violet-800">{team.name.trim()[0]?.toUpperCase() ?? "T"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[18px] font-bold leading-tight text-[#0b1f3a]">{team.name}</span>
                  <span className="block text-[14px] leading-snug text-[#4a4d68]">
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
                  </span>
                </span>
                <span aria-hidden="true" className="text-xl text-[#9a9cb8]">&rsaquo;</span>
              </Link>
              {team.everyday ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#5f5e7a]">{t("stand.maybe")}</span>
                  <Link href={`${teamPath}/finanzierung`} className={CHIP_LINK}>{t("stand.financing")}</Link>
                  <Link href={`${teamPath}/zielkonflikte`} className={CHIP_LINK}>{t("stand.tradeoffs")}</Link>
                </div>
              ) : null}
              {otherTeams.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#5f5e7a]">{t("stand.otherTeams")}</span>
                  {otherTeams.map((other) => (
                    <Link key={other.id} href={`/dashboard?team=${encodeURIComponent(other.id)}`} className={CHIP_LINK}>{other.name}</Link>
                  ))}
                </div>
              ) : null}
            </section>
          </>
        ) : null}

        {waiting ? (<><hr className="my-4 border-[#d9d0f5]" />{waiting}</>) : null}
      </div>

      {conversation && teamPath ? (
        <section aria-labelledby="dashboard-talk-title" className="rounded-[20px] border border-[#ddd3fb] bg-[#f3efff] px-5 py-5 sm:px-[22px]">
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
          {newsletter && newsletter !== "confirmed" ? <NewsletterAsk state={newsletter} source="dashboard" returnTo="/dashboard" t={tDash} /> : null}
    </aside>
  );
}
