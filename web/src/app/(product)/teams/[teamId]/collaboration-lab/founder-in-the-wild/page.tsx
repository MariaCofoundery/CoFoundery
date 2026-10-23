import Link from "next/link";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { startFounderInTheWildRoundAction } from "@/features/founderInTheWild/founderInTheWildActions";
import { findCompletedFounderInTheWildRounds, findOpenFounderInTheWildRoundsByPack, getFounderInTheWildTeam } from "@/features/founderInTheWild/founderInTheWildData";
import { founderInTheWildEntryHref, founderInTheWildRevealHref, founderInTheWildRoundHref } from "@/features/founderInTheWild/founderInTheWildRoutes";
import { FOUNDER_IN_THE_WILD_PACKS } from "@/features/founderInTheWild/founderInTheWildContent";
import { normalizeLocale } from "@/i18n/config";
import { GuessTallyCard } from "@/features/collaborationLab/GuessTallyCard";
import { getCollaborationGuessTally } from "@/features/collaborationLab/guessTally";
import { AppIcon, IconTile } from "@/features/ui/Icons";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export default async function FounderInTheWildEntryPage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ result?: string }> }) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const href = founderInTheWildEntryHref(teamId);
  const supabase = await createClient(); const { data: { user } } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(href)}`);
  const team = await getFounderInTheWildTeam(teamId, user.id, supabase); if (!team) return <TeamUnavailable teamId={teamId} />;
  const [t, openRounds, completedRounds, rawLocale] = await Promise.all([getTranslations("founderInTheWild.entry"), findOpenFounderInTheWildRoundsByPack(team, user.id, supabase), findCompletedFounderInTheWildRounds(team, supabase), getLocale()]);
  const locale = normalizeLocale(rawLocale);
  const tally = await getCollaborationGuessTally(supabase, teamId);
  const partnerName = team.members.find((member) => member.userId !== user.id)?.displayName
    ?? (locale === "de" ? "dein Co-Founder" : "your co-founder");
  return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
    <Link href={`/teams/${encodeURIComponent(teamId)}#founder-in-the-wild`} className="text-sm font-medium text-[#5f5e7a] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[#6d49e0]">{t("back")}</Link>
    <header className="brand-panel relative mt-5 overflow-hidden rounded-[28px] px-6 py-8 sm:px-9">
      <span aria-hidden="true" className="orb -top-14 right-36 hidden h-40 w-40 md:block" />
      <span aria-hidden="true" className="orb -bottom-6 right-12 hidden h-[70px] w-[70px] md:block" style={{ animationDelay: "0.6s" }} />
      <div className="relative flex items-center gap-[18px]">
        <span aria-hidden="true" className="hidden h-14 w-14 flex-none items-center justify-center rounded-[14px] bg-white/20 sm:inline-flex"><AppIcon name="game" /></span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white opacity-90">{t("eyebrow")}</p>
          <h1 className="mt-0.5 text-[30px] font-semibold leading-[1.15] sm:text-[34px]">{t("title")}</h1>
          <p className="mt-2 max-w-xl text-base leading-7 text-white opacity-95">{t("intro")}</p>
        </div>
      </div>
    </header>
    {query.result ? <p role="status" className="mt-4 rounded-2xl bg-[#f1f0f7] px-4 py-3 text-sm text-[#33325e]">{t(query.result === "unavailable" ? "twoFounders" : query.result === "discarded" ? "discarded" : query.result === "declined" ? "declined" : "changed")}</p> : null}
    {/* Zwei Packs statt eines: "Unter Druck" allein war einmal gespielt und
        dann vorbei. Eine laufende Runde blockiert beide - man spielt nicht
        zwei gleichzeitig. */}
    <div className="mt-6 grid gap-4">
      {FOUNDER_IN_THE_WILD_PACKS.map((pack) => {
        // REPARIERT AM 21.09.2026: Vorher wurde EINE offene Runde gesucht, und
        // zwar nur aus "Unter Druck". Eine laufende Runde des zweiten Packs war
        // damit unsichtbar - die Karte zeigte "Starten", obwohl die Runde lief.
        const openRound = openRounds.get(pack.key);
        const anyOpen = openRounds.size > 0;
        // Eine abgeschlossene Runde verschwand vorher vollstaendig - siehe
        // findCompletedFounderInTheWildRounds. Das Reveal und die markierten
        // Gespraechspunkte bleiben jetzt erreichbar.
        const completed = completedRounds.get(pack.key);
        return (
          <section key={pack.key} className="card-lift flex flex-col gap-4 rounded-[24px] border border-[#e4e2f0] bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <IconTile name="game" tone="blue" />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold leading-tight text-[#0b1f3a]">{pack.title[locale]}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#5f5e7a]">{pack.description[locale]}</p>
              {pack.hasGuess ? (
                <p className="mt-2 inline-flex rounded-full bg-[#efeafd] px-3 py-1 text-xs font-semibold text-[#3a2394]">{t("withGuess")}</p>
              ) : null}
              {completed && !openRound ? (
                <p className="mt-3 text-sm text-[#5f5e7a]">
                  <Link href={founderInTheWildRevealHref(teamId, completed.id)} className="font-semibold text-[#4a2fb8] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[#6d49e0]">
                    {t("openLastReveal")}
                  </Link>
                </p>
              ) : null}
            </div>
    <GuessTallyCard round={null} summary={tally} partnerName={partnerName} variant="entry" />
            {team.members.length !== 2 ? (
              <p className="text-sm text-[#5f5e7a]">{t("twoFounders")}</p>
            ) : openRound ? (
              <Link href={founderInTheWildRoundHref(teamId, openRound.id)} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl brand-cta px-5 py-3 text-sm font-semibold">
                {t(openRound.ownAnswerComplete ? "status" : "continue")}
              </Link>
            ) : anyOpen ? (
              <p className="shrink-0 text-sm text-[#5f5e7a]">{t("otherRoundOpen")}</p>
            ) : (
              <form action={startFounderInTheWildRoundAction.bind(null, teamId, pack.key)}>
                <button type="submit" className="min-h-11 shrink-0 rounded-xl brand-cta px-5 py-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[#6d49e0]">
                  {t("start")}
                </button>
              </form>
            )}
          </section>
        );
      })}
    </div>
  </main>;
}
