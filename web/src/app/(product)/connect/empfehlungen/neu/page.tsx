import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { searchPeople, searchVentures } from "@/features/recommendations/recommendationsData";
import { createRecommendationAction } from "@/features/recommendations/recommendationsActions";
import { REC_COMMENT_MAX, REC_KINDS, REC_TOPICS, isRecKind } from "@/features/recommendations/recommendationsModel";
import { SubmitButton } from "@/features/ui/SubmitButton";

export const dynamic = "force-dynamic";

const CHIP = "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50";
const FIELD = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px]";

/**
 * Etwas empfehlen. Die Art waehlt man per Link (kein Skript noetig): Software und Organisation tragen Name und Adresse ein,
 * Personen und Projekte werden in Connect gesucht. Wer als Person empfohlen wird, muss erst zustimmen.
 */
export default async function NewRecommendationPage({ searchParams }: { searchParams: Promise<{ art?: string; suche?: string; fehler?: string; person?: string; projekt?: string }> }) {
  const sp = await searchParams;
  const { client } = await requireConnectMember("/connect/empfehlungen/neu");
  const t = await getTranslations("connect.recommendations");
  const kind = isRecKind(sp.art) ? sp.art : "software";
  const q = (sp.suche ?? "").trim();
  const people = kind === "person" ? await searchPeople(client, q) : [];
  const ventures = kind === "project" ? await searchVentures(client, q) : [];
  const needsPick = kind === "person" || kind === "project";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/connect/empfehlungen" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950">← {t("back")}</Link>
      <h1 className="font-brand mt-2 text-3xl font-semibold text-slate-950">{t("give.title")}</h1>
      {sp.fehler ? <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{t(`give.errors.${["guidelines", "profile", "url", "invalid"].includes(sp.fehler) ? sp.fehler : "invalid"}`)}</p> : null}

      <nav aria-label={t("give.kind")} className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {REC_KINDS.map((k) => <Link key={k} href={`/connect/empfehlungen/neu?art=${k}`} aria-current={k === kind ? "page" : undefined} className={`inline-flex min-h-12 items-center justify-center rounded-xl border-2 text-[15px] font-semibold text-slate-950 ${k === kind ? "border-violet-600 bg-violet-50" : "border-slate-200 bg-white"}`}>{t(`kinds.${k}`)}</Link>)}
      </nav>

      {needsPick ? (
        <section aria-labelledby="pick" className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 id="pick" className="text-base font-semibold text-slate-950">{t(`give.pick.${kind}`)}</h2>
          <form method="get" className="mt-2 flex flex-wrap items-end gap-2">
            <input type="hidden" name="art" value={kind} />
            <label className="min-w-56 flex-1 text-sm font-semibold text-slate-900">{t("give.search")}<input name="suche" defaultValue={q} className={FIELD} /></label>
            <SubmitButton label={t("give.searchBtn")} pendingLabel={t("give.searching")} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950" />
          </form>
          {q && people.length + ventures.length === 0 ? <p className="mt-3 text-sm text-slate-700">{t("give.noMatch")}</p> : null}
        </section>
      ) : null}

      <form action={createRecommendationAction} className="mt-5 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5">
        <input type="hidden" name="kind" value={kind} />
        {kind === "person" ? (
          <fieldset className="grid gap-2"><legend className="text-sm font-semibold text-slate-900">{t("give.who")}</legend>
            {people.length === 0 ? <p className="text-sm text-slate-600">{t("give.searchFirst")}</p> : null}
            {people.map((p, i) => <label key={p.userId} className={CHIP}><input type="radio" name="subjectUserId" value={p.userId} required defaultChecked={i === 0 && people.length === 1} className="h-4 w-4" /><span>{p.name}{p.sub ? <span className="font-normal text-slate-600"> · {p.sub}</span> : null}</span></label>)}
            <p className="text-xs leading-5 text-slate-700">{t("give.personNote")}</p>
          </fieldset>
        ) : kind === "project" ? (
          <fieldset className="grid gap-2"><legend className="text-sm font-semibold text-slate-900">{t("give.which")}</legend>
            {ventures.length === 0 ? <p className="text-sm text-slate-600">{t("give.searchFirst")}</p> : null}
            {ventures.map((v, i) => <label key={v.id} className={CHIP}><input type="radio" name="ventureId" value={v.id} required defaultChecked={i === 0 && ventures.length === 1} className="h-4 w-4" /><span>{v.name}{v.sub ? <span className="font-normal text-slate-600"> · {v.sub}</span> : null}</span></label>)}
            <p className="text-xs leading-5 text-slate-700">{t("give.projectNote")}</p>
          </fieldset>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-900">{t("give.name")}<input name="title" required maxLength={120} className={FIELD} /></label>
            <label className="block text-sm font-semibold text-slate-900">{t("give.url")}<input name="url" type="url" inputMode="url" placeholder="https://" maxLength={400} className={FIELD} /></label>
            <label className="block text-sm font-semibold text-slate-900 sm:col-span-2">{t("give.sub")}<input name="sub" maxLength={160} className={FIELD} /></label>
            {kind === "org" ? <p className="text-xs leading-5 text-slate-700 sm:col-span-2">{t("give.orgNote")}</p> : null}
          </div>
        )}

        <fieldset><legend className="text-sm font-semibold text-slate-900">{t("give.topics")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">{REC_TOPICS.map((k) => <label key={k} className={CHIP}><input type="checkbox" name="topic" value={k} className="h-4 w-4" />{t(`topics.${k}`)}</label>)}</div>
          <p className="mt-1 text-xs text-slate-600">{t("give.topicsHint")}</p>
        </fieldset>
        <label className="block text-sm font-semibold text-slate-900">{t("give.region")}<input name="region" maxLength={60} placeholder={t("give.regionPlaceholder")} className={FIELD} /></label>
        <label className="block text-sm font-semibold text-slate-900">{t("give.comment", { max: REC_COMMENT_MAX })}
          <textarea name="comment" required rows={4} maxLength={REC_COMMENT_MAX} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-[15px] font-normal" />
          <span className="mt-1 block text-xs font-normal text-slate-600">{t("give.commentHint")}</span>
        </label>

        <fieldset className="rounded-2xl bg-slate-50 p-4">
          <legend className="sr-only">{t("give.rulesTitle")}</legend>
          <p className="text-sm font-semibold text-slate-950">{t("give.rulesTitle")}</p>
          <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-slate-800">{(["a", "b", "c", "d"] as const).map((k) => <li key={k}>{t(`give.rules.${k}`)}</li>)}</ul>
          <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 text-sm font-semibold text-slate-950"><input type="checkbox" name="guidelines" value="yes" required className="mt-1 h-5 w-5" />{t("give.rulesAccept")}</label>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton label={kind === "person" ? t("give.submitPerson") : t("give.submit")} pendingLabel={t("give.submitting")} className="inline-flex min-h-12 items-center rounded-xl bg-violet-700 px-6 text-[15px] font-semibold text-white" />
          <span className="text-sm text-slate-700">{kind === "person" ? t("give.afterPerson") : t("give.afterOther")}</span>
        </div>
      </form>
      <p className="mt-4 text-xs leading-5 text-slate-600">{t("give.footnote")}</p>
    </main>
  );
}
