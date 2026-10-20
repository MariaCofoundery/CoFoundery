import { getTranslations } from "next-intl/server";

import type { FindCardReason } from "@/features/discovery/discoveryTypes";

/**
 * Reasons auf einer FIND-Trefferkarte (Matching v0.1, E3c) - ruhig, als kurze Sätze.
 *
 * Bekommt NUR Presenter-Ausgabe (Message Key, erlaubte Parameter, Label-Namespaces).
 * Enum-Parameter werden über ihren Namespace übersetzt, Texte bleiben Originalwert.
 * Fehlt eine Übersetzung, entfällt der Reason - es wird kein Ersatztext erfunden.
 * Kein Score, kein Prozentwert, keine Platznummer, keine Gleichstandsmarkierung.
 */
export async function FindMatchingReasons({
  reasons,
  candidateName,
  title,
}: {
  reasons: readonly FindCardReason[];
  candidateName: string;
  title: string;
}) {
  if (reasons.length === 0) return null;
  const t = await getTranslations();
  const sentences = reasons.flatMap((reason) => {
    if (!t.has(reason.messageKey)) return [];
    const values: Record<string, string> = { name: candidateName };
    for (const [param, value] of Object.entries(reason.data)) {
      const namespace = reason.labels[param];
      if (!namespace) {
        values[param] = value;
        continue;
      }
      const key = `${namespace}.${value}`;
      if (!t.has(key)) return [];
      values[param] = t(key);
    }
    return [{ key: reason.messageKey, text: t(reason.messageKey, values) }];
  });
  if (sentences.length === 0) return null;
  return (
    <section className="mt-5 rounded-2xl bg-violet-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">{title}</p>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
        {sentences.map((sentence) => (
          <li key={sentence.key}>{sentence.text}</li>
        ))}
      </ul>
    </section>
  );
}
