"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { sortInterviewAnswerAction } from "./capabilityInterviewActions";
import type { AreaProposal } from "./capabilityProposalData";
import {
  APPLICATION_LEVELS,
  MAX_CONFIRMED_AREAS,
  OWNERSHIP_WISHES,
  type OwnershipWish,
} from "./capabilityTypes";
import { analyzeNarrativeWithRules, type NarrativeAnalysis } from "./narrativeAnalysis";

/**
 * Eine Antwort einordnen.
 *
 * ZWEI QUELLEN, GETRENNT AUSGEWIESEN, und das ist die wichtigste Entscheidung
 * in dieser Datei:
 *
 *   AUS DEM TEXT. Die Regel-Auswertung nennt Bereiche und dazu die Begriffe,
 *   an denen sie sie erkannt hat. Nie eine Blackbox.
 *
 *   AUS DER FRAGE. Wer auf "wann hast du zuletzt ein unangenehmes Thema
 *   angesprochen" ueberhaupt etwas erzaehlt, hat Unangenehmes angesprochen.
 *   Das ist kein Fund im Text, sondern folgt aus der Frage - und es steht
 *   deshalb unter einer eigenen Ueberschrift. Beides in einen Topf zu werfen
 *   waere ein Vorschlag, dessen Herkunft niemand mehr pruefen kann.
 *
 * NICHTS IST VORANGEHAKT. Vorbelegen wuerde die Frage beantworten, die wir
 * gerade stellen - dieselbe Regel wie im Textfeld. Eine leere Auswahl ist eine
 * gueltige Antwort; dann landet die Erzaehlung im Auffangwert.
 *
 * DIE AUSWERTUNG LAEUFT IM BROWSER. Der Text liegt schon auf dem Server, aber
 * die Zuordnung braucht ihn dort nicht - und die Person sieht das Ergebnis
 * ohne Umweg. Dieselbe auswechselbare Schnittstelle wie im Textfeld; ein
 * Sprachmodell wuerde hier spaeter nur `engine` aendern.
 */
export function InterviewSortForm({
  turnId,
  answer,
  suggestedAreas,
  suggestedWish,
  areaLabels,
  proposals,
  vocabulary,
  suggestedFamily,
}: {
  turnId: string;
  answer: string;
  /** Bereiche, die die FRAGE nahelegt. Leer bei den meisten Fragen. */
  suggestedAreas: readonly string[];
  /** Vorauswahl fuer den Wunsch - nur bei den beiden Fragen nach dem Wollen. */
  suggestedWish: OwnershipWish | null;
  /** Beschriftungen aller Bereiche, die vorgeschlagen werden koennen. */
  areaLabels: Record<string, string>;
  /** Was ein Sprachmodell in dieser Antwort gesehen hat - je Vorschlag mit Zitat. */
  proposals: readonly AreaProposal[];
  /**
   * Das ganze Vokabular, nach Familien.
   *
   * DAZUGEKOMMEN AM 21.09.2026: Bis dahin gab es Haken NUR fuer das, was
   * vorgeschlagen wurde. Fand die Erkennung nichts, stand man vor einer Seite
   * ohne einen einzigen Haken - und die Erzaehlung landete in "Sonstiges".
   * Maria hat es als "es filtert immer noch keine Soft Skills heraus"
   * gemeldet; die Ursache war nicht die Erkennung, sondern der fehlende Weg
   * daneben. Ein Werkzeug, das nur anbietet, was es selbst gefunden hat, laesst
   * Menschen mit ihrem eigenen Wissen alleine.
   */
  vocabulary: readonly { familyId: string; label: string; areas: { id: string; label: string }[] }[];
  /** Welche Familie diese Frage nahelegt - sie wird aufgeklappt. */
  suggestedFamily: string | null;
}) {
  const t = useTranslations("capability");
  const [analysis, setAnalysis] = useState<NarrativeAnalysis | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);

  // Die Antwort steht schon da - also sofort auswerten, nicht erst auf einen
  // Klick warten. Im Textfeld ist es umgekehrt: Dort tippt jemand noch.
  useEffect(() => {
    let active = true;
    void analyzeNarrativeWithRules({ narrative: answer, locale: "de" }).then((result) => {
      if (active) setAnalysis(result);
    });
    return () => {
      active = false;
    };
  }, [answer]);

  const proposedIds = proposals.map((proposal) => proposal.areaId);
  // Was das Modell gesehen hat, erscheint nicht noch einmal weiter unten: Ein
  // Vorschlag mit Zitat ist die staerkere Fassung desselben Hinweises.
  const fromText = (analysis?.areas ?? []).filter(
    (area) => !suggestedAreas.includes(area.areaId) && !proposedIds.includes(area.areaId)
  );
  const atLimit = chosen.length >= MAX_CONFIRMED_AREAS;

  const toggle = (areaId: string) => {
    setChosen((current) =>
      current.includes(areaId)
        ? current.filter((id) => id !== areaId)
        : current.length >= MAX_CONFIRMED_AREAS
          ? current
          : [...current, areaId]
    );
  };

  const box =
    "flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-3 transition has-[:checked]:border-violet-300 has-[:checked]:bg-violet-50/50";

  return (
    <form action={sortInterviewAnswerAction}>
      <input type="hidden" name="turnId" value={turnId} />

      {/* ------------------------------------------------------------------
          WAS DAS MODELL GESEHEN HAT - mit dem wörtlichen Satz dazu.

          GEWUENSCHT AM 21.09.2026: "Das Tool hat schon rausgefiltert, ey, das
          könnte das und das sein, dass man aber trotzdem noch sagen müsste,
          vielleicht mit einem Schieberegler: so würde ich mich selber
          einschätzen."

          DAS ZITAT IST NICHT SCHMUCK, sondern die ganze Absicherung: Die
          Datenbank hat beim Ablegen geprüft, dass dieser Satz wörtlich in der
          Antwort steht (`insert_ai_capability_proposal`). Ein Modell, das
          etwas hinzudichtet, kann es nicht belegen - und was es nicht belegen
          kann, ist hier nie angekommen. Deshalb steht der Satz sichtbar
          daneben: Man kann den Vorschlag gegen die eigene Erzählung prüfen,
          ohne uns zu glauben.

          UND DER REGLER IST DIE VORHANDENE SKALA. Keine Notenskala, sondern
          die Anwendungsstufen 1-5, die situativ verankert sind: "noch nicht
          praktisch angewandt" bis "auch in schwierigen Situationen angewandt,
          kann andere unterstützen". Ein "wie krass bist du hier?" hätte
          Selbstvertrauen gemessen statt Können - und Selbstvertrauen ist
          ungleich verteilt.
          ------------------------------------------------------------------ */}
      {proposals.length > 0 ? (
        <fieldset className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
          <legend className="px-1 text-sm font-semibold text-violet-900">
            {t("interview.sort.fromModel")}
          </legend>
          <p className="mt-1 text-xs leading-5 text-violet-900/80">
            {t("interview.sort.fromModelHint")}
          </p>

          <div className="mt-3 grid gap-3">
            {proposals.map((proposal) => {
              const isChosen = chosen.includes(proposal.areaId);
              return (
                <div
                  key={proposal.id}
                  className="rounded-2xl border border-violet-100 bg-white p-3"
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      name="area_id"
                      value={proposal.areaId}
                      checked={isChosen}
                      disabled={atLimit && !isChosen}
                      onChange={() => toggle(proposal.areaId)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 accent-violet-600"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-900">
                        {areaLabels[proposal.areaId] ?? proposal.areaId}
                      </span>
                      {/* Der Beleg, wörtlich. */}
                      <span className="mt-1 block text-sm italic leading-6 text-slate-600">
                        „{proposal.quote}“
                      </span>
                    </span>
                  </label>

                  {/* Der Regler erscheint erst, wenn der Vorschlag angenommen
                      ist: Eine Stufe zu einem Bereich, den man nicht
                      bestätigt hat, wäre eine Angabe ins Leere. */}
                  {isChosen ? (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <label
                        htmlFor={`level_${proposal.areaId}`}
                        className="block text-xs font-medium text-slate-700"
                      >
                        {t("interview.sort.levelFor", {
                          area: areaLabels[proposal.areaId] ?? proposal.areaId,
                        })}
                      </label>
                      <select
                        id={`level_${proposal.areaId}`}
                        name={`level_${proposal.areaId}`}
                        defaultValue=""
                        className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="">{t("levels.unset")}</option>
                        {APPLICATION_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level} – {t(`levels.${level}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {suggestedAreas.length > 0 ? (
        <fieldset className={proposals.length > 0 ? "mt-6" : ""}>
          <legend className="text-sm font-medium text-slate-900">
            {t("interview.sort.fromQuestion")}
          </legend>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {t("interview.sort.fromQuestionHint")}
          </p>
          <div className="mt-3 grid gap-2">
            {suggestedAreas.map((areaId) => (
              <label key={areaId} className={box}>
                <input
                  type="checkbox"
                  name="area_id"
                  value={areaId}
                  checked={chosen.includes(areaId)}
                  disabled={atLimit && !chosen.includes(areaId)}
                  onChange={() => toggle(areaId)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 accent-violet-600"
                />
                <span className="text-sm font-medium text-slate-900">
                  {areaLabels[areaId] ?? areaId}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset className={suggestedAreas.length > 0 || proposals.length > 0 ? "mt-6" : ""}>
        <legend className="text-sm font-medium text-slate-900">
          {t("interview.sort.fromText")}
        </legend>

        {analysis === null ? (
          <p className="mt-2 text-sm text-slate-500">{t("interview.sort.analysing")}</p>
        ) : fromText.length === 0 ? (
          /* Nichts erkannt sagt nichts über die Erzählung. Derselbe Satz wie im
             Textfeld, und aus demselben Grund: Ein leeres Ergebnis darf nicht
             wie ein Mangel der Person klingen. */
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("interview.sort.nothingFound")}</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {fromText.map((area) => (
              <label key={area.areaId} className={box}>
                <input
                  type="checkbox"
                  name="area_id"
                  value={area.areaId}
                  checked={chosen.includes(area.areaId)}
                  disabled={atLimit && !chosen.includes(area.areaId)}
                  onChange={() => toggle(area.areaId)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 accent-violet-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    {areaLabels[area.areaId] ?? area.areaId}
                  </span>
                  {/* Woran es erkannt wurde. Ohne diese Zeile muesste man einer
                      Maschine glauben. */}
                  {area.matchedTerms.length > 0 ? (
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {t("interview.sort.because", { terms: area.matchedTerms.join(", ") })}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        )}

        <p className="mt-2 text-xs leading-5 text-slate-500">
          {t("interview.sort.limit", { max: MAX_CONFIRMED_AREAS })}
        </p>
      </fieldset>

      {/* ------------------------------------------------------------------
          SELBST AUSWÄHLEN - der Weg daneben.

          Ohne ihn hängt die Einordnung an Stichwortglück: Wer von einem
          Gespräch mit einer Behörde erzählt, benutzt keines unserer
          Erkennungswörter und stand dann vor einer Seite ohne einen einzigen
          Haken. Ein Werkzeug, das nur anbietet, was es selbst gefunden hat,
          lässt Menschen mit ihrem eigenen Wissen alleine.

          AUFGEKLAPPT, WENN NICHTS VORLIEGT - oder wenn die Frage auf eine
          Familie zielt. Dann sind die Bereiche einen Griff entfernt statt
          unter siebenundvierzig.
          ------------------------------------------------------------------ */}
      <details
        className="mt-6 rounded-2xl border border-slate-200 bg-white/60 p-4"
        open={
          proposals.length === 0 && suggestedAreas.length === 0 && fromText.length === 0
        }
      >
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-700">
          {t("interview.sort.ownChoice")}
        </summary>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {t("interview.sort.ownChoiceHint")}
        </p>

        <div className="mt-3 grid gap-3">
          {vocabulary.map((family) => (
            <details
              key={family.familyId}
              // Die Familie, auf die die Frage zielt, ist offen. Das ist keine
              // Vorauswahl - es ist ein Weg, der nicht erst gesucht werden
              // muss.
              open={family.familyId === suggestedFamily}
            >
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-slate-800">
                {family.label}
                {family.familyId === suggestedFamily ? (
                  <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[.68rem] font-semibold text-violet-800">
                    {t("interview.sort.familyHint")}
                  </span>
                ) : null}
              </summary>
              <div className="mt-2 grid gap-1.5 pl-1 sm:grid-cols-2">
                {family.areas.map((area) => {
                  const isChosen = chosen.includes(area.id);
                  return (
                    <label
                      key={area.id}
                      className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        name="area_id"
                        value={area.id}
                        checked={isChosen}
                        disabled={atLimit && !isChosen}
                        onChange={() => toggle(area.id)}
                        className="h-4 w-4 rounded border-slate-300 accent-violet-600"
                      />
                      {area.label}
                    </label>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </details>

      {/* Stufe und Wunsch. Beide duerfen leer bleiben: "noch nicht eingestuft"
          ist ein Zustand und nicht die niedrigste Stufe. */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="application_level" className="block text-sm font-medium text-slate-900">
            {t("levels.label")}
          </label>
          {/* Die gemeinsame Stufe gilt fuer den fuehrenden Bereich. Wo ein
              Regler oben gesetzt ist, gewinnt er - das entscheidet
              `attachCapabilityEvidence` und nicht diese Seite. */}
          <select
            id="application_level"
            name="application_level"
            defaultValue=""
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">{t("levels.unset")}</option>
            {APPLICATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`levels.${level}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ownership_wish" className="block text-sm font-medium text-slate-900">
            {t("ownershipWishes.label")}
          </label>
          <select
            id="ownership_wish"
            name="ownership_wish"
            // VORAUSGEWAEHLT NUR, WO DIE FRAGE DANACH GEFRAGT HAT: Wer auf
            // "was wuerdest du lieber abgeben" geantwortet hat, hat den Wunsch
            // schon genannt - ihn erneut zu erfragen waere, als haette man
            // nicht zugehoert. Bei allen anderen Fragen bleibt es offen.
            defaultValue={suggestedWish ?? ""}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">{t("ownershipWishes.unset")}</option>
            {OWNERSHIP_WISHES.map((wish) => (
              <option key={wish} value={wish}>
                {t(`ownershipWishes.${wish}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white"
        >
          {t("interview.sort.submit")}
        </button>
        <span className="text-xs leading-5 text-slate-500">{t("interview.sort.emptyAllowed")}</span>
      </div>
    </form>
  );
}
