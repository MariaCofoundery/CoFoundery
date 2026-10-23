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
      className="rounded-2xl border border-[#d9cff8] bg-[#f5f2fe]/50 p-5 sm:p-6"
    >
      <h2 id="conversation-points-title" className="text-xl font-semibold text-[#0b1f3a]">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#5f5e7a]">{t("text")}</p>

      <ul className="mt-4 grid gap-3">
        {points.map((point) => {
          const name = point.partnerName ?? t("partnerFallback");
          const who = point.markedByMe && point.markedByPartner
            ? t("markedByBoth")
            : point.markedByPartner
              ? t("markedByPartner", { name })
              : t("markedByMe");
          return (
            <li key={`${point.roundId}-${point.position}`} className="rounded-xl border border-[#d9cff8] bg-white">
              <details className="group">
                <summary className="flex min-h-12 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0]">
                  <span className="font-medium text-[#0b1f3a]">{point.title}</span>
                  <span className="text-xs font-medium text-[#3a2394]">{who}</span>
                  <span className="text-xs uppercase tracking-[0.12em] text-[#8b89aa]">
                    {t(`experiences.${point.experience}`)}
                  </span>
                </summary>
                <div className="border-t border-[#efeafd] px-4 py-4">
                  <p className="text-sm leading-6 text-[#33325e]">{point.prompt}</p>
                  {point.answers ? (
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-[#f7f6fb] p-3">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-[#5f5e7a]">
                          {t("yourAnswer")}
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-[#0b1f3a]">
                          {point.answers.own.join(" · ")}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-[#f7f6fb] p-3">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-[#5f5e7a]">
                          {t("partnerAnswer", { name })}
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-[#0b1f3a]">
                          {point.answers.partner.join(" · ")}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    /* Kein Umweg um das Siegel: Wer die Karte im Lab nicht
                       aufgedeckt hat, sieht sie auch hier nicht. */
                    <p className="mt-4 rounded-xl bg-[#fff8e6] px-3 py-2 text-sm leading-6 text-[#5c3200]">
                      {t("sealed")}
                    </p>
                  )}
                  <Link
                    href={point.href}
                    prefetch={false}
                    className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#4a2fb8] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0]"
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
