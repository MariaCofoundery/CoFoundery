import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { startFounderInTheWildRoundAction } from "@/features/founderInTheWild/founderInTheWildActions";
import { findOpenFounderInTheWildRound, getFounderInTheWildTeam } from "@/features/founderInTheWild/founderInTheWildData";
import { createClient } from "@/lib/supabase/server";

export default async function FounderInTheWildEntryPage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ result?: string }> }) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const href = `/teams/${encodeURIComponent(teamId)}/collaboration-lab/founder-in-the-wild`;
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(href)}`);
  const team = await getFounderInTheWildTeam(teamId, user.id, supabase); if (!team) notFound();
  const [t, round] = await Promise.all([getTranslations("founderInTheWild.entry"), findOpenFounderInTheWildRound(team, user.id, supabase)]);
  return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
    <Link href={`/teams/${encodeURIComponent(teamId)}#collaboration-lab`} className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-violet-500">{t("back")}</Link>
    <header className="mt-6 rounded-[30px] border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-violet-50 p-6 shadow-[0_20px_50px_rgba(76,29,149,0.08)] sm:p-9"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{t("eyebrow")}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t("title")}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">{t("intro")}</p></header>
    {query.result ? <p role="status" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">{t(query.result === "unavailable" ? "twoFounders" : query.result === "discarded" ? "discarded" : query.result === "declined" ? "declined" : "changed")}</p> : null}
    <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold text-slate-950">{t("title")}</h2><p className="mt-2 text-sm text-slate-600">5 Situationen · 2 Founder</p></div>{team.members.length !== 2 ? <p className="text-sm text-slate-600">{t("twoFounders")}</p> : round ? <Link href={`${href}/${encodeURIComponent(round.id)}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white">{t(round.ownAnswerComplete ? "status" : "continue")}</Link> : <form action={startFounderInTheWildRoundAction.bind(null, teamId)}><button type="submit" className="min-h-11 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-violet-500">{t("start")}</button></form>}</section>
  </main>;
}
