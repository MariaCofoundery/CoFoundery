import { getTranslations } from "next-intl/server";
import { getDiscoveryTopics } from "@/features/instruments/v2/discoveryTopics";

/**
 * Deine Suchvorgaben, auf diese Person angewandt.
 *
 * ---------------------------------------------------------------------------
 * DREI ZUSTAENDE, UNTEREINANDER, IN DEINER REIHENFOLGE
 * ---------------------------------------------------------------------------
 *
 * Kein Gesamtergebnis, keine Trefferquote, kein „8 von 12". Wer drei Themen
 * gewählt hat, sieht drei Zeilen - und die oberste ist die, die er selbst nach
 * oben gestellt hat.
 *
 * DIE BASIS STEHT DABEI. „Passt, auf Grundlage von 2 von 3 Fragen" ist etwas
 * anderes als „passt" - Teil F2 verlangt, die Basis zu nennen, und ohne sie
 * liest sich ein dünnes Ergebnis wie ein belastbares.
 */

export type TopicVerdictRow = {
  topic_key: string;
  rank: number;
  wish: string;
  state: string;
  fulfilment: string;
  basis_comparable: number;
  basis_total: number;
};

const TONE: Record<string, string> = {
  met: "border-slate-900 bg-slate-50",
  unknown: "border-slate-200 bg-white",
  unmet: "border-slate-300 bg-white",
};

export async function DiscoveryVerdicts({ rows }: { rows: TopicVerdictRow[] }) {
  const t = await getTranslations("alignment");
  if (rows.length === 0) return null;

  const labels = new Map(getDiscoveryTopics().map((topic) => [topic.key, topic.label]));

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{t("discovery.verdictTitle")}</h2>
      <p className="text-sm text-slate-600">{t("discovery.verdictIntro")}</p>
      <ol className="space-y-2">
        {[...rows].sort((a, b) => a.rank - b.rank).map((row) => (
          <li
            key={row.topic_key}
            className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border px-3 py-2 ${TONE[row.fulfilment] ?? TONE.unknown}`}
          >
            <span className="w-5 text-sm text-slate-400">{row.rank}.</span>
            <span className="text-sm font-medium text-slate-900">
              {labels.get(row.topic_key) ?? row.topic_key}
            </span>
            <span className="text-sm text-slate-600">
              {t(`discovery.wish.${row.wish}`)} · {t(`discovery.fulfilment.${row.fulfilment}`)}
            </span>
            {/* DIE BASIS GEHOERT DANEBEN, nicht in eine Fussnote. */}
            <span className="text-xs text-slate-500">
              {t("discovery.basis", { comparable: row.basis_comparable, total: row.basis_total })}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
