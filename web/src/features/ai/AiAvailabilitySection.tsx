import { getTranslations } from "next-intl/server";

/**
 * Der Zustand der KI-Auswertung, in Worten.
 *
 * WARUM DAS UEBERHAUPT SICHTBAR IST: Die Auswertung laeuft auf einem Rechner,
 * der auch aus sein kann. Wer das nicht weiss, haelt eine Wartezeit fuer einen
 * Fehler - und einen Fehler fuer eine Wartezeit. Ein Punkt und zwei Saetze
 * ersparen beides.
 *
 * KEIN ROT UND KEIN WARNDREIECK. "Gerade nicht verfuegbar" ist kein Ausfall,
 * sondern ein Zustand mit Ansage: Was wartet, wird spaeter gerechnet, und die
 * Plattform funktioniert daneben unveraendert weiter.
 *
 * DER SATZ SAGT AUCH, WO GERECHNET WIRD. Dass die Auswertung auf einem Rechner
 * der Betreiberin laeuft und nicht bei einem grossen Anbieter, ist keine
 * technische Fussnote - es ist der Grund, warum die Texte das Haus nicht
 * verlassen, und das gehoert den Menschen gesagt, deren Texte es sind.
 */
export async function AiAvailabilitySection({
  available,
  pendingJobs,
}: {
  available: boolean;
  pendingJobs: number;
}) {
  const t = await getTranslations("dashboard.account.ai");

  return (
    <section className="mt-5 border-t border-slate-200 pt-5" aria-labelledby="ai-status-title">
      <h3 id="ai-status-title" className="text-sm font-semibold text-slate-950">
        {t("title")}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t("text")}</p>

      <p className="mt-3 flex items-center gap-2 text-sm text-slate-700">
        <span aria-hidden className={available ? "text-emerald-600" : "text-slate-400"}>
          ●
        </span>
        {/* Der Punkt ist Schmuck; die Aussage steht im Text. Eine Farbe allein
            waere fuer eine Vorlesesoftware keine Auskunft. */}
        <strong className="font-semibold">{available ? t("online") : t("offline")}</strong>
      </p>

      {pendingJobs > 0 ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("pending", { count: pendingJobs })}</p>
      ) : null}
    </section>
  );
}
