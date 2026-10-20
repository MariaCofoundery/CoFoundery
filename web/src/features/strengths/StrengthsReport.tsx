import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { PersonStrength } from "@/features/capability/strengthData";
import {
  STRENGTH_DOMAINS,
  STRENGTH_THEMES_BY_DOMAIN,
  type EvidenceLevel,
  type StrengthDomain,
  type StrengthThemeId,
} from "@/features/strengths/strengthThemes";

/**
 * Der Einzelreport zu den Stärken: vier Bereiche, darin die Themen, die die
 * Person übernommen hat.
 *
 * KEINE RANGFOLGE, KEINE ZAHL, KEIN TYP. Die Themen stehen gleichwertig in
 * ihrem Bereich, in der festen Reihenfolge des Wortschatzes - nicht nach
 * Belegstärke sortiert, damit keine "Top 5" entsteht. Die Belegstärke steht
 * als Wort am Thema ("Zeigt sich deutlich / Zeigt sich / Hinweis") und sagt,
 * wie gut es belegt ist, nicht wie stark es ist.
 *
 * "WO DU UNTERSTÜTZUNG BRAUCHST" sind die eigenen Worte aus den Gegenfragen,
 * unverändert. Daraus wird nie eine Stärke und nichts ausgewertet.
 */
const DOMAIN_STYLE: Record<StrengthDomain, { dot: string; soft: string; text: string }> = {
  execute: { dot: "bg-violet-600", soft: "bg-violet-50 border-violet-100", text: "text-violet-900" },
  influence: { dot: "bg-sky-600", soft: "bg-sky-50 border-sky-100", text: "text-sky-900" },
  relate: { dot: "bg-teal-600", soft: "bg-teal-50 border-teal-100", text: "text-teal-900" },
  think: { dot: "bg-indigo-600", soft: "bg-indigo-50 border-indigo-100", text: "text-indigo-900" },
};

const LEVEL_DOTS: Record<EvidenceLevel, number> = { clear: 3, shown: 2, hint: 1 };

export type CounterAnswer = { questionId: "avoid_task" | "hand_off" | "others_better"; answer: string };

export async function StrengthsReport({
  strengths,
  counterAnswers,
  hasInterview,
}: {
  strengths: PersonStrength[];
  counterAnswers: CounterAnswer[];
  hasInterview: boolean;
}) {
  const t = await getTranslations("strengths");
  const themed = strengths.filter((strength) => strength.theme);
  const others = strengths.filter((strength) => !strength.theme);
  const byTheme = new Map<StrengthThemeId, PersonStrength>();
  for (const strength of themed) if (strength.theme && !byTheme.has(strength.theme)) byTheme.set(strength.theme, strength);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
      <Link href="/me/profile" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950">
        ← {t("report.back")}
      </Link>

      <header className="brand-panel mt-3 rounded-[28px] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-white">{t("report.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{t("report.title")}</h1>
        <p className="mt-3 max-w-2xl leading-7 text-white">{t("report.text")}</p>
      </header>

      {byTheme.size === 0 ? (
        <section className="mt-6 rounded-3xl border border-dashed border-violet-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-slate-950">{t("report.emptyTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">{t("report.emptyText")}</p>
          <Link href="/profile/strengths-interview" className="brand-cta mt-4 inline-flex min-h-11 items-center rounded-full px-5 py-3 text-sm font-semibold">
            {t("report.start")}
          </Link>
        </section>
      ) : (
        <>
          <p className="mt-4 max-w-3xl text-xs leading-5 text-slate-500">{t("report.levelNote")}</p>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            {STRENGTH_DOMAINS.map((domain) => {
              const style = DOMAIN_STYLE[domain];
              const items = (STRENGTH_THEMES_BY_DOMAIN[domain] as readonly StrengthThemeId[])
                .map((id) => byTheme.get(id))
                .filter((item): item is PersonStrength => Boolean(item));
              return (
                <section key={domain} aria-labelledby={`domain-${domain}`} className="flex flex-col rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center gap-3">
                    <span aria-hidden className={`h-3 w-3 rounded-full ${style.dot}`} />
                    <div>
                      <h2 id={`domain-${domain}`} className="text-lg font-semibold text-slate-950">{t(`themes.domains.${domain}.title`)}</h2>
                      <p className="text-xs text-slate-500">{t(`themes.domains.${domain}.text`)}</p>
                    </div>
                  </div>
                  {items.length === 0 ? (
                    <p className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-sm leading-6 text-slate-600">{t("report.domainEmpty")}</p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {items.map((item) => {
                        const id = item.theme as StrengthThemeId;
                        const level = item.evidenceLevel ?? "hint";
                        return (
                          <li key={item.id} className={`rounded-2xl border p-4 ${style.soft}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className={`text-base font-semibold ${style.text}`}>{t(`themes.items.${id}.name`)}</h3>
                              <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700" title={t("levelNoteShort")}>
                                <span aria-hidden className="flex gap-1">
                                  {[1, 2, 3].map((n) => (
                                    <span key={n} className={`h-2 w-2 rounded-full ${n <= LEVEL_DOTS[level] ? style.dot : "bg-slate-300"}`} />
                                  ))}
                                </span>
                                {t(`proposals.level.${level}`)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-800">{item.statement}</p>
                            <p className="mt-2 text-xs leading-5 text-slate-600">
                              <span className="font-semibold">{t("report.helps")}:</span>{" "}
                              {t(`themes.items.${id}.helps`)}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-600">
                              <span className="font-semibold">{t("report.prompt")}:</span> {t(`themes.items.${id}.prompt`)}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      {counterAnswers.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-amber-100 bg-amber-50/60 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950">{t("report.needs.title")}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700">{t("report.needs.text")}</p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            {counterAnswers.map((entry) => (
              <div key={entry.questionId} className="rounded-2xl bg-white p-4">
                <dt className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t(`report.needs.${entry.questionId}`)}</dt>
                <dd className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-800">{entry.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {others.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950">{t("report.other.title")}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{t("report.other.text")}</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {others.map((item) => (
              <li key={item.id} className="py-3">
                {item.label ? <p className="text-sm font-semibold text-slate-950">{item.label}</p> : null}
                <p className="text-sm leading-6 text-slate-700">{item.statement}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 border-t border-slate-200 pt-5">
        <Link href="/profile/strengths-interview" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">
          {hasInterview ? t("report.again") : t("report.start")} →
        </Link>
      </div>
    </main>
  );
}
