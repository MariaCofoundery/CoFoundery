import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { CollaborationConversationPoint } from "@/features/collaborationLab/collaborationConversationPoints";

/**
 * "Darüber wolltet ihr sprechen" - im Founder-Setup, aufklappbar.
 *
 * GEWÜNSCHT AM 21.09.2026: "Sodass man im Setup bleibt, aber nochmal sehen
 * kann, was da war."
 *
 * AUFGEKLAPPT UND NICHT VERLINKT ist der ganze Punkt. Ein Link hätte den
 * Faden abgeschnitten: Wer gerade eine Vereinbarung schreibt, verlässt die
 * Seite, sieht die Karte, kommt zurück - und hat den Satz verloren, den er
 * halb getippt hatte. Der Link ins Lab steht trotzdem darin, für den Rest der
 * Situation.
 *
 * DER DATEINAME weicht absichtlich vom Namen der Datenfunktion ab: Ein
 * `CollaborationConversationPoints.tsx` neben einem
 * `collaborationConversationPoints.ts` unterscheidet sich nur in der
 * Großschreibung. Auf diesem Dateisystem sind das zwei Namen für dieselbe
 * Datei, und TypeScript bricht darüber ab.
 *
 * ZUGEKLAPPT IST DER VORGABEZUSTAND, auch bei nur einem Punkt: Das Thema
 * gehört der Vereinbarung, nicht der Erinnerung an ein Spiel. Der Hinweis
 * soll sagen "hier war was", nicht die Seite übernehmen.
 */
export async function ConversationPointsCard({
  points,
}: {
  points: CollaborationConversationPoint[];
}) {
  if (points.length === 0) return null;
  const t = await getTranslations("teams.setup.conversationPoints");

  return (
    <section
      aria-labelledby="conversation-points-title"
      className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 sm:p-6"
    >
      <h2 id="conversation-points-title" className="text-xl font-semibold text-slate-950">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t("text")}</p>

      <ul className="mt-4 grid gap-3">
        {points.map((point) => {
          const name = point.partnerName ?? t("partnerFallback");
          const who = point.markedByMe && point.markedByPartner
            ? t("markedByBoth")
            : point.markedByPartner
              ? t("markedByPartner", { name })
              : t("markedByMe");
          return (
            <li key={`${point.roundId}-${point.position}`} className="rounded-xl border border-violet-200 bg-white">
              <details className="group">
                <summary className="flex min-h-12 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                  <span className="font-medium text-slate-950">{point.title}</span>
                  <span className="text-xs font-medium text-violet-900">{who}</span>
                  <span className="text-xs uppercase tracking-[0.12em] text-slate-400">
                    {t(`experiences.${point.experience}`)}
                  </span>
                </summary>
                <div className="border-t border-violet-100 px-4 py-4">
                  <p className="text-sm leading-6 text-slate-700">{point.prompt}</p>
                  {point.answers ? (
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {t("yourAnswer")}
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-slate-900">
                          {point.answers.own.join(" · ")}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {t("partnerAnswer", { name })}
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-slate-900">
                          {point.answers.partner.join(" · ")}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    /* Kein Umweg um das Siegel: Wer die Karte im Lab nicht
                       aufgedeckt hat, sieht sie auch hier nicht. */
                    <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
                      {t("sealed")}
                    </p>
                  )}
                  <Link
                    href={point.href}
                    prefetch={false}
                    className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    {t("openInLab")}
                  </Link>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
