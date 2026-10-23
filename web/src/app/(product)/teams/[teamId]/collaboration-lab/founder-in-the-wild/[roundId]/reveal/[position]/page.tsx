import Link from "next/link";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { markFounderInTheWildConversationAction, openFounderInTheWildRevealAction, unmarkFounderInTheWildConversationAction } from "@/features/founderInTheWild/founderInTheWildActions";
import { ConversationMarkerButton } from "@/features/collaborationLab/ConversationMarkerButton";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { getFounderInTheWildRound, getFounderInTheWildTeam, getOpenedFounderInTheWildReveal } from "@/features/founderInTheWild/founderInTheWildData";
import { normalizeLocale } from "@/i18n/config";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export default async function FounderInTheWildPromptReveal({ params }: { params: Promise<{ teamId: string; roundId: string; position: string }> }) {
  const { teamId, roundId, position: raw } = await params; const position = Number(raw); if (!Number.isInteger(position) || position < 0 || position > 4) notFound();
  const base = `/teams/${encodeURIComponent(teamId)}/collaboration-lab/founder-in-the-wild/${encodeURIComponent(roundId)}`; const supabase = await createClient(); const { data: { user } } = await getRequestUser(); if (!user) redirect(`/login?next=${encodeURIComponent(`${base}/reveal/${position}`)}`);
  const team = await getFounderInTheWildTeam(teamId, user.id, supabase); if (!team) return <TeamUnavailable teamId={teamId} />; const round = await getFounderInTheWildRound(team, roundId, user.id, supabase); const prompt = round?.prompts.find((entry) => entry.position === position); if (!round || !prompt) notFound(); if (!round.wholeRoundAnswerComplete) redirect(base);
  const [t, rawLocale] = await Promise.all([getTranslations("founderInTheWild.reveal"), getLocale()]); const locale = normalizeLocale(rawLocale); const partnerName = round.partner.displayName ?? (locale === "de" ? "dein Co-Founder" : "your co-founder"); const opened = round.openedPromptPositions.includes(position); const data = opened ? await getOpenedFounderInTheWildReveal({ team, roundId, position, userId: user.id, client: supabase }) : null;
  if (!opened) return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10"><Link href={`${base}/reveal`} className="text-sm text-[#5f5e7a] underline">{t("overview")}</Link><section className="mt-6 rounded-[24px] border border-[#d9cff8] bg-[#f5f2fe] p-8 text-center"><h1 className="text-3xl font-semibold">{prompt.content.title[locale]}</h1><p className="mt-3 text-sm text-[#5f5e7a]">{t("sealed")}</p><form action={openFounderInTheWildRevealAction.bind(null, teamId, roundId, position)} className="mt-6"><button className="min-h-12 rounded-xl brand-cta px-6 py-3 text-sm font-semibold">{t("open")}</button></form></section></main>;
  if (!data) notFound(); const reveal = data.reveal; const label = (keys: string[], type: "moves" | "matters" | "needs") => keys.flatMap((key) => reveal.prompt.content[type].find((choice) => choice.key === key)?.label[locale] ?? []); const ownMarked = round.conversationMarkers.find((entry) => entry.roundPromptId === prompt.roundPromptId)?.participantUserIds.includes(user.id) ?? false; const partnerMarked = round.conversationMarkers.find((entry) => entry.roundPromptId === prompt.roundPromptId)?.participantUserIds.includes(round.partner.userId) ?? false; const status = ownMarked && partnerMarked ? t("markedBoth") : partnerMarked ? t("markedPartner", { name: partnerName }) : ownMarked ? t("markedOwn") : null; const next = round.prompts.find((entry) => entry.position > position)?.position;
  const panel = (title: string, keys: string[], type: "moves" | "matters" | "needs", who: "you" | "them") => <article className={`rounded-[24px] border p-6 ${who === "you" ? "border-[#d9cff8] bg-[#f5f2fe]" : "border-[#c9e0f2] bg-[#eef6fc]"}`}><h3 className={`text-[13px] font-semibold uppercase tracking-[0.08em] ${who === "you" ? "text-[#4a2fb8]" : "text-[#0b5a8a]"}`}>{title}</h3><ul className="mt-3 grid gap-2">{label(keys, type).map((value) => <li key={value} className="text-sm leading-6 text-[#0b1f3a]">{value}</li>)}</ul></article>;
  return <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10"><Link href={`${base}/reveal`} className="text-sm font-medium text-[#5f5e7a] underline-offset-4 hover:underline">{t("overview")}</Link><header className="mt-6 rounded-[24px] border border-[#d9cff8] bg-[#f5f2fe] p-6 sm:p-9"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4a2fb8]">{t("eyebrow")}</p><h1 className="mt-3 text-3xl font-semibold">{prompt.content.title[locale]}</h1><p className="mt-4 text-base leading-7 text-[#33325e]">{prompt.content.situation[locale]}</p></header><p className="mt-6 inline-flex rounded-full bg-[#efeafd] px-3 py-1.5 text-xs font-semibold text-[#3a2394]">{t(reveal.own.move[0] === reveal.partner.move[0] ? "same" : "different")}</p>
    {/* Der Moment, um den es geht: Habe ich richtig geraten, wie der andere
        entscheidet? Nur in Packs mit Tipp - ownGuessHit ist dort null, und
        null heisst "nicht geraten", nicht "danebengelegen". */}
    {reveal.ownGuessHit !== null ? (
      <section className={`mt-4 rounded-2xl border p-5 ${reveal.ownGuessHit ? "border-[#b9a8f0] bg-[linear-gradient(120deg,rgba(124,58,237,.08),rgba(34,211,238,.09))]" : "border-[#e8c36a] bg-[#fff8e6]/70"}`}>
        <p className="text-base font-semibold text-[#0b1f3a]">
          {t(reveal.ownGuessHit ? "guessHit" : "guessMiss", { name: partnerName })}
        </p>
        {!reveal.ownGuessHit ? (
          <p className="mt-2 text-sm leading-6 text-[#33325e]">
            {t("guessMissDetail", { name: partnerName, guess: label(reveal.own.guess, "moves")[0] ?? "" })}
          </p>
        ) : null}
        {reveal.partnerGuessHit !== null ? (
          <p className="mt-3 text-sm leading-6 text-[#5f5e7a]">
            {t(reveal.partnerGuessHit ? "partnerGuessHit" : "partnerGuessMiss", { name: partnerName })}
          </p>
        ) : null}
      </section>
    ) : null}
    <section className="mt-4 grid gap-4 md:grid-cols-2">{panel(t("yourMove"), reveal.own.move, "moves", "you")}{panel(t("partnerMove", { name: partnerName }), reveal.partner.move, "moves", "them")}{panel(t("yourMatters"), reveal.own.matters, "matters", "you")}{panel(t("partnerMatters", { name: partnerName }), reveal.partner.matters, "matters", "them")}{panel(t("yourNeed"), reveal.own.need, "needs", "you")}{panel(t("partnerNeed", { name: partnerName }), reveal.partner.need, "needs", "them")}</section>
    <section className="mt-6 rounded-[24px] border border-[#d9cff8] bg-[#f5f2fe] p-6"><h2 className="text-lg font-semibold">{t("talkTitle")}</h2><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#33325e]"><li>{t("talk1")}</li><li>{t("talk2")}</li><li>{t("talk3")}</li></ol></section>
    <section id="conversation-marker" className="mt-6 rounded-[24px] border border-[#e4e2f0] bg-white p-6"><h2 className="text-lg font-semibold">{t("markerTitle")}</h2>{status ? <p className="mt-2 text-sm font-medium text-[#3a2394]">{status}</p> : null}<p className="mt-2 text-sm text-[#5f5e7a]">{t("visible")}</p><form action={(ownMarked ? unmarkFounderInTheWildConversationAction : markFounderInTheWildConversationAction).bind(null, teamId, roundId, position, prompt.roundPromptId)} className="mt-4"><ConversationMarkerButton marked={ownMarked} markLabel={t("mark")} unmarkLabel={t("unmark")} className="min-h-11 rounded-xl border border-[#b9a8f0] bg-white px-4 py-2 text-sm font-semibold text-[#3a2394] focus-visible:ring-2 focus-visible:ring-[#6d49e0]" /></form></section>
    {/* EIN SCHRITT STATT ZWEI, seit dem 21.09.2026.

        GEMELDET: "Da musstest du immer noch mal so einen Zwischenschritt
        machen mit jetzt wieder aufdecken und okay, naechstes und dann musst du
        das auch wieder aufdecken, obwohl du ja schon zu Anfang gesagt hast,
        dass du aufdecken willst."

        Wer auf "naechste Situation" drueckt, will sie sehen. Das Siegel bleibt
        als Moment erhalten - beim ERSTEN Aufdecken auf der Uebersicht. Ab dann
        deckt derselbe Knopf auf und geht hin. Der Beleg ("ich habe es
        gesehen") entsteht weiterhin je Karte, das Abschliessen verlangt ihn
        von beiden Seiten. */}
    <nav className="mt-6 flex justify-end">{next === undefined ? <Link href={`${base}/reveal`} className="inline-flex min-h-11 items-center rounded-xl brand-cta px-5 py-3 text-sm font-semibold">{t("roundOverview")}</Link> : round.openedPromptPositions.includes(next) ? <Link href={`${base}/reveal/${next}`} className="inline-flex min-h-11 items-center rounded-xl brand-cta px-5 py-3 text-sm font-semibold">{t("next")}</Link> : <form action={openFounderInTheWildRevealAction.bind(null, teamId, roundId, next)}><SubmitButton label={t("nextAndOpen")} pendingLabel={t("opening")} className="inline-flex min-h-11 items-center rounded-xl brand-cta px-5 py-3 text-sm font-semibold" /></form>}</nav>
  </main>;
}
