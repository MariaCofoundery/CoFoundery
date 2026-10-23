import { getTranslations } from "next-intl/server";

import { IconTile } from "@/features/ui/Icons";

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
    <section className="mt-5 border-t border-[#e4e2f0] pt-5" aria-labelledby="ai-status-title">
      <div className="flex items-start gap-3">
        <IconTile name="robot" tone="amber" size="sm" />
        <div className="min-w-0 flex-1">
          <h3 id="ai-status-title" className="font-semibold text-[#0b1f3a]">
            {t("title")}
          </h3>
          <p className="mt-0.5 text-[13.5px] leading-[1.5] text-[#5f5e7a]">{t("text")}</p>
          {pendingJobs > 0 ? (
            <p className="mt-2 text-[13.5px] leading-[1.5] text-[#5f5e7a]">{t("pending", { count: pendingJobs })}</p>
          ) : null}
        </div>
        {/* Der Punkt ist Schmuck; die Aussage steht im Text. Keine Farbe allein, kein Rot, kein Warndreieck. */}
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${available ? "bg-[#e3f6ec] text-[#17794a]" : "bg-[#fdecc8] text-[#7a4300]"}`}>
          <span aria-hidden="true">●</span>
          {available ? t("online") : t("offline")}
        </span>
      </div>
    </section>
  );
}
