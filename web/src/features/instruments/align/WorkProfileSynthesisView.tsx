import { getTranslations } from "next-intl/server";

import {
  synthesiseWorkProfile,
  type SynthesisStatement,
} from "@/features/instruments/align/workProfileSynthesis";
import type { ReadoutEntry } from "@/features/instruments/v21/readoutV21";

/**
 * „Was sich in deinen Antworten zeigt".
 *
 * ---------------------------------------------------------------------------
 * DIE EBENE ZWISCHEN BILD UND LISTE
 * ---------------------------------------------------------------------------
 *
 * Darüber steht die Punktekarte: wo die Antworten liegen. Darunter liegen die
 * sechzehn Fragen mit ihren Antworten. Dazwischen fehlte das, was ein Mensch
 * eigentlich wissen will — *was heisst das jetzt?*
 *
 * ---------------------------------------------------------------------------
 * ES STEHT OFFEN, NICHT IM AUFKLAPPER
 * ---------------------------------------------------------------------------
 *
 * Die Rohantworten sind das Nachschlagewerk und bleiben eingeklappt. Diese
 * Beschreibung ist das Ergebnis — sie hinter einen Klick zu legen hiesse, das
 * Nachschlagewerk zur Hauptsache zu machen.
 *
 * ---------------------------------------------------------------------------
 * JEDER SATZ KOMMT AUS EINER REGEL, NICHT AUS EINEM MODELL
 * ---------------------------------------------------------------------------
 *
 * Welche Sätze erscheinen, entscheidet `workProfileSynthesis.ts` allein aus
 * den Antworten. Dieselben Antworten ergeben immer dieselben Sätze. Hier wird
 * nur nachgeschlagen, wie ein Satz in der gelesenen Sprache heisst.
 *
 * Und es wird nichts zusammengerechnet: keine Punktzahl, kein Mittelwert,
 * kein Vergleich mit anderen.
 */
export async function WorkProfileSynthesisView({
  sections,
  heading = "h2",
}: {
  sections: { section: string; entries: ReadoutEntry[] }[];
  /** `h3`, wo die Überschrift darüber schon eine `h2` ist. */
  heading?: "h2" | "h3";
}) {
  const themen = synthesiseWorkProfile(sections);
  // Ohne sichtbare Antworten gibt es nichts zu beschreiben. Ein leerer Kasten
  // mit Überschrift sähe aus, als fehlte etwas.
  if (themen.length === 0) return null;

  const t = await getTranslations("alignment.synthesis");
  const Titel = heading;

  const satz = (statement: SynthesisStatement) => {
    switch (statement.kind) {
      case "theme":
        return t(`themes.${statement.theme}.${statement.band}`);
      case "item":
        return t(`items.${statement.itemId}.${statement.band}`);
      case "choice":
        return t(`choices.${statement.itemId}.${statement.optionIndex}`);
      case "tooFew":
        return t("tooFew");
    }
  };

  /** Ein Satz braucht einen stabilen Schlüssel - zwei Sätze eines Themas
      unterscheiden sich an der Frage, nicht an ihrer Reihenfolge. */
  const schluessel = (statement: SynthesisStatement) => {
    switch (statement.kind) {
      case "theme":
        return `${statement.theme}-${statement.band}`;
      case "item":
        return `${statement.itemId}-${statement.band}`;
      case "choice":
        return `${statement.itemId}-${statement.optionIndex}`;
      case "tooFew":
        return `${statement.theme}-leer`;
    }
  };

  return (
    <section className="page-section rounded-2xl border border-slate-200 bg-white p-5 print:rounded-none print:border-none print:px-0">
      <Titel className="text-base font-semibold text-slate-900">{t("title")}</Titel>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{t("intro")}</p>

      <div className="mt-5 space-y-5">
        {themen.map((thema) => (
          <div key={thema.theme} className="print-keep">
            <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t(`themes.${thema.theme}.title`)}
            </h4>
            <div className="mt-1.5 space-y-1.5">
              {thema.statements.map((statement) => (
                <p
                  key={schluessel(statement)}
                  className="max-w-3xl text-sm leading-6 text-slate-900"
                >
                  {satz(statement)}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Was das hier ist - und was nicht. Der Satz stand bis zum 01.10.2026
          an der Karte und hiess „zu dieser Fassung gibt es noch keine
          Auswertung". Das stimmt nicht mehr, seit es diese Beschreibung
          gibt. */}
      <p className="mt-5 max-w-3xl text-xs leading-5 text-slate-500">{t("note")}</p>
    </section>
  );
}
