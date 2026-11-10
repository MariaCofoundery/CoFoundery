import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getMyProgramAiTips, getTeamAiStart } from "@/features/aiStart/aiStartData";
import { AI_ITEM_KEYS, clearedCount } from "@/features/aiStart/aiStartModel";

/**
 * Programmtipp aus Sicht eines Startups (Entwurf 09.11.2026): "Tipp vom <Organisation>" mit Hinweis, Stand der eigenen
 * Checkliste und den empfohlenen Links. Der Stand ist der des eigenen Teams - die Organisation sieht ihn nicht.
 */
export async function AiTipCards({ client }: { client: SupabaseClient }) {
  const tips = await getMyProgramAiTips(client);
  if (tips.length === 0) return null;
  const t = await getTranslations("teams.aiStart.tip");
  const progress = new Map(await Promise.all(tips.map(async (tip) => [tip.teamId, clearedCount((await getTeamAiStart(client, tip.teamId)).items)] as const)));
  return (
    <div className="mt-6 grid gap-4">
      {tips.map((tip) => (
        <section key={tip.programId} aria-label={t("label", { org: tip.orgName })} className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[.08em] text-violet-800">{t("eyebrow", { org: tip.orgName })}</p>
          <h2 className="text-lg font-semibold text-slate-950">{t("title")}</h2>
          {tip.note ? <p className="whitespace-pre-line text-[14.5px] leading-6 text-slate-800">„{tip.note}“</p> : null}
          <div className="flex items-center gap-3 text-sm">
            <b>{t("progress", { done: progress.get(tip.teamId) ?? 0, total: AI_ITEM_KEYS.length })}</b>
            <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"><span className="block h-1.5 rounded-full bg-[#6D49E0]" style={{ width: `${((progress.get(tip.teamId) ?? 0) / AI_ITEM_KEYS.length) * 100}%` }} /></span>
          </div>
          <Link href={`/teams/${tip.teamId}/ki-start`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white">{t("open")}</Link>
          {tip.links.length > 0 ? (
            <div className="grid gap-1 border-t border-slate-100 pt-3">
              <b className="text-[13.5px]">{t("links")}</b>
              {tip.links.map((link) => <a key={link.url} href={link.url} rel="noopener noreferrer" target="_blank" className="inline-flex min-h-9 items-center text-[14px] font-medium text-violet-800 underline-offset-4 hover:underline">{link.label} ↗</a>)}
            </div>
          ) : null}
          <p className="text-xs leading-5 text-slate-600">{t("privacy")}</p>
        </section>
      ))}
    </div>
  );
}
