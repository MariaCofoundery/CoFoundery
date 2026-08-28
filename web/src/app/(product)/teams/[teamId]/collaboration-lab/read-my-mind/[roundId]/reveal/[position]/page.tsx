import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { completeReadMyMindRoundAction, openReadMyMindRevealAction } from "@/features/collaborationLab/readMyMindActions";
import { getOpenedReadMyMindPromptReveal, getReadMyMindRound, getReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindData";
import type { ReadMyMindResponseContract } from "@/features/collaborationLab/readMyMindContent";
import { normalizeLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

function ChoiceList({ keys, contract, locale }: { keys: string[]; contract: ReadMyMindResponseContract; locale: "de" | "en" }) {
  const labels = keys.map((key) => contract.choices.find((choice) => choice.key === key)?.label[locale]).filter((label): label is string => Boolean(label));
  return <ul className="mt-3 grid gap-2">{labels.map((label) => <li key={label} className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm leading-6 text-slate-800">{label}</li>)}</ul>;
}

export default async function ReadMyMindPromptRevealPage({ params }: { params: Promise<{ teamId: string; roundId: string; position: string }> }) {
  const { teamId, roundId, position: rawPosition } = await params;
  const position = Number(rawPosition);
  if (!Number.isInteger(position) || position < 0 || position > 4) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const roundHref = `/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind/${encodeURIComponent(roundId)}`;
  const revealHref = `${roundHref}/reveal`;
  if (!user) redirect(`/login?next=${encodeURIComponent(`${revealHref}/${position}`)}`);
  const team = await getReadMyMindTeamContext(teamId, user.id, supabase);
  if (!team) notFound();
  const round = await getReadMyMindRound(team, roundId, user.id, supabase);
  const prompt = round?.prompts.find((entry) => entry.position === position);
  if (!round || !prompt) notFound();
  if (round.status === "abandoned" || !round.wholeRoundAnswerComplete) redirect(roundHref);
  const [t, rawLocale] = await Promise.all([getTranslations("collaborationLab.reveal"), getLocale()]);
  const locale = normalizeLocale(rawLocale);
  const partnerName = round.partner.displayName ?? t(round.status === "completed" ? "historicalPartnerFallback" : "partnerFallback");
  const opened = round.openedPromptPositions.includes(position);
  const openedData = opened ? await getOpenedReadMyMindPromptReveal({ team, roundId, position, currentUserId: user.id, client: supabase }) : null;
  const reveal = openedData?.reveal ?? null;
  const previous = [...round.openedPromptPositions].filter((entry) => entry < position).sort((a, b) => b - a)[0];
  const next = round.prompts.find((entry) => entry.position > position)?.position;
  const comparison = (exact: boolean) => prompt.content.selfGuess.format === "multi_choice" ? t("multiComparison") : t(exact ? "exact" : "different");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={revealHref} className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">{t("back")}</Link>
      <header className="mt-6 rounded-[28px] border border-violet-200/80 bg-gradient-to-br from-violet-100 via-white to-amber-50 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{t("eyebrow")}</p>
        <p className="mt-3 text-sm font-semibold text-violet-900">{t("progress", { current: position + 1, total: round.prompts.length })}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{prompt.content.title[locale]}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">{prompt.content.selfQuestion[locale]}</p>
      </header>

      {!opened ? (
        <section className="mt-6 rounded-[28px] border border-violet-200 bg-white p-6 text-center shadow-[0_20px_50px_rgba(76,29,149,0.1)] sm:p-10" aria-labelledby="reveal-open-title">
          <h2 id="reveal-open-title" className="text-2xl font-semibold text-slate-950">{prompt.content.title[locale]}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">{t("openHint")}</p>
          <form action={openReadMyMindRevealAction.bind(null, teamId, roundId, position)} className="mt-7">
            <button type="submit" className="min-h-12 w-full rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 sm:w-auto">{t("open")}</button>
          </form>
        </section>
      ) : reveal ? (
        <div id="opened-reveal" className="mt-6 grid gap-6" tabIndex={-1}>
          <section className="rounded-[28px] border border-violet-200 bg-violet-50/70 p-5 sm:p-7" aria-labelledby="own-perspective-title">
            <h2 id="own-perspective-title" className="text-xl font-semibold text-slate-950">{t("ownSelf")}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl bg-white p-5 ring-1 ring-violet-200"><h3 className="text-sm font-semibold text-violet-900">{t("ownSelf")}</h3><ChoiceList keys={reveal.ownPerspective.self} contract={prompt.content.selfGuess} locale={locale} /></article>
              <article className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200"><h3 className="text-sm font-semibold text-amber-950">{t("partnerGuess", { name: partnerName })}</h3><ChoiceList keys={reveal.ownPerspective.partnerGuess} contract={prompt.content.selfGuess} locale={locale} /></article>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">{comparison(reveal.ownPerspective.exact)}</p>
          </section>

          <section className="rounded-[28px] border border-amber-200 bg-amber-50/70 p-5 sm:p-7" aria-labelledby="partner-perspective-title">
            <h2 id="partner-perspective-title" className="text-xl font-semibold text-slate-950">{t("partnerSelf", { name: partnerName })}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl bg-white p-5 ring-1 ring-amber-200"><h3 className="text-sm font-semibold text-amber-950">{t("partnerSelf", { name: partnerName })}</h3><ChoiceList keys={reveal.partnerPerspective.self} contract={prompt.content.selfGuess} locale={locale} /></article>
              <article className="rounded-2xl bg-violet-50 p-5 ring-1 ring-violet-200"><h3 className="text-sm font-semibold text-violet-900">{t("ownGuess", { name: partnerName })}</h3><ChoiceList keys={reveal.partnerPerspective.ownGuess} contract={prompt.content.selfGuess} locale={locale} /></article>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">{comparison(reveal.partnerPerspective.exact)}</p>
          </section>

          {reveal.needs && prompt.content.need ? <section className="rounded-[28px] border border-slate-200 bg-white p-5 sm:p-7" aria-labelledby="needs-reveal-title"><h2 id="needs-reveal-title" className="text-xl font-semibold text-slate-950">{t("needsTitle")}</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><article><h3 className="text-sm font-semibold text-violet-900">{t("ownNeed", { name: partnerName })}</h3><ChoiceList keys={reveal.needs.own} contract={prompt.content.need} locale={locale} /></article><article><h3 className="text-sm font-semibold text-amber-950">{t("partnerNeed", { name: partnerName })}</h3><ChoiceList keys={reveal.needs.partner} contract={prompt.content.need} locale={locale} /></article></div></section> : null}

          <p className="rounded-2xl bg-slate-50 px-5 py-4 text-center text-sm leading-6 text-slate-600">{t("reflection")}</p>
          {next === undefined ? <section className="rounded-[28px] border border-violet-200 bg-gradient-to-br from-violet-100 to-amber-50 p-6 text-center"><h2 className="text-2xl font-semibold text-slate-950">{t(round.status === "completed" ? "completedTitle" : "allSeenTitle")}</h2><p className="mt-3 text-sm leading-7 text-slate-700">{t(round.status === "completed" ? "completedText" : "allSeenText")}</p></section> : null}
          <nav className="flex flex-wrap items-center justify-between gap-3" aria-label={t("progress", { current: position + 1, total: round.prompts.length })}>
            {previous !== undefined ? <Link prefetch={false} href={`${revealHref}/${previous}`} className="min-h-11 px-3 py-3 text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-slate-400">{t("previous")}</Link> : <span />}
            {next !== undefined ? <Link prefetch={false} href={`${revealHref}/${next}`} className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">{t("next")}</Link> : round.status === "completed" ? <Link href={revealHref} className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white">{t("roundOverview")}</Link> : <form action={completeReadMyMindRoundAction.bind(null, teamId, roundId)}><button type="submit" className="min-h-11 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">{t("complete")}</button></form>}
          </nav>
        </div>
      ) : notFound()}
    </main>
  );
}
