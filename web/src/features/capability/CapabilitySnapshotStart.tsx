"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConnectSubmitButton as SubmitButton } from "@/features/connect/ConnectSubmitButton";
import { DictatedTextarea } from "@/features/dictation/DictatedTextarea";
import {
  APPLICATION_LEVELS,
  MAX_CONFIRMED_AREAS,
  NARRATIVE_MAX_LENGTH,
  NARRATIVE_MIN_LENGTH,
} from "./capabilityTypes";
import { analyzeNarrativeWithRules, type NarrativeAnalysis } from "./narrativeAnalysis";

/**
 * Schritt 1 des Snapshots, in zwei Phasen.
 *
 * Vorher hat das System die Erzaehlung still zugeordnet und die Person stand
 * im naechsten Schritt vor gesetzten Haken. Das ist die falsche Reihenfolge:
 * Eine Zuordnung, die niemand bestaetigt hat, ist eine Behauptung ueber einen
 * Menschen.
 *
 * Jetzt zeigt die zweite Phase, was erkannt wurde, sagt dazu, woran es erkannt
 * wurde und dass es falsch sein kann - und fragt die Person, was davon
 * wirklich ihre Staerke war. Bis zu drei.
 *
 * Die Auswertung laeuft hier im Browser, nicht auf dem Server. Zwei Gruende:
 * Die Person sieht das Ergebnis ohne Umweg noch vor dem Speichern, und der
 * Text muss fuer die Auswertung das Geraet nicht verlassen. Gespeichert wird
 * erst, was sie abschickt.
 *
 * Ohne JavaScript entfaellt die Bestaetigung und das Formular geht direkt an
 * die Server Action, die dann selbst zuordnet - dieselbe Regel-Auswertung, nur
 * ohne Rueckfrage. Der Weg bleibt begehbar, statt in einem toten Knopf zu
 * enden.
 */
export function CapabilitySnapshotStart({
  action,
  fieldClassName,
  hintClassName,
  primaryClassName,
  secondaryClassName,
}: {
  action: (formData: FormData) => void | Promise<void>;
  fieldClassName: string;
  hintClassName: string;
  primaryClassName: string;
  secondaryClassName: string;
}) {
  const t = useTranslations("capability");
  const commonT = useTranslations("common");
  const [narrative, setNarrative] = useState("");
  const [level, setLevel] = useState<string>("");
  const [analysis, setAnalysis] = useState<NarrativeAnalysis | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);

  const tooShort = narrative.trim().length < NARRATIVE_MIN_LENGTH;

  async function confirmNarrative() {
    const result = await analyzeNarrativeWithRules({ narrative, locale: "de" });
    setAnalysis(result);
    // Die Vorschlaege stehen bewusst unangehakt da. Vorbelegen wuerde die
    // Frage beantworten, die wir gerade stellen.
    setChosen([]);
  }

  function toggle(areaId: string) {
    setChosen((current) =>
      current.includes(areaId)
        ? current.filter((id) => id !== areaId)
        : current.length < MAX_CONFIRMED_AREAS
          ? [...current, areaId]
          : current
    );
  }

  if (analysis) {
    return (
      <form action={action} className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
        {/* Was die Person geschrieben hat, reist unsichtbar mit - sie hat es
            in der vorigen Phase eingegeben und sieht es unten noch einmal. */}
        <input type="hidden" name="narrative" value={narrative} />
        {level ? <input type="hidden" name="application_level" value={level} /> : null}
        {/* Sagt der Server Action, dass die Zuordnung bestaetigt wurde. Ohne
            diese Marke wuerde sie selbst zuordnen und eine bewusste
            Nicht-Auswahl wieder ueberschreiben. */}
        <input type="hidden" name="areas_confirmed" value="1" />

        <div>
          <h2 className="text-xl font-semibold">
            {analysis.areas.length ? t("confirm.title") : t("confirm.emptyTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {analysis.areas.length ? t("confirm.text") : t("confirm.emptyText")}
          </p>
        </div>

        {analysis.areas.length ? (
          <fieldset>
            <legend className="text-sm font-medium">
              {t("confirm.pickLabel", { max: MAX_CONFIRMED_AREAS })}
            </legend>
            <div className="mt-3 grid gap-2">
              {analysis.areas.map((area) => {
                const isChosen = chosen.includes(area.areaId);
                const blocked = !isChosen && chosen.length >= MAX_CONFIRMED_AREAS;
                return (
                  <label
                    key={area.areaId}
                    className={`flex min-h-11 items-start gap-3 rounded-xl border px-3 py-2 text-sm ${
                      isChosen ? "border-slate-900 bg-slate-50" : "border-slate-200"
                    } ${blocked ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      name="area_id"
                      value={area.areaId}
                      checked={isChosen}
                      disabled={blocked}
                      onChange={() => toggle(area.areaId)}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium">{t(`areaLabels.${area.areaId}`)}</span>
                      {/* Nie eine Blackbox: die Begriffe, die zum Vorschlag
                          gefuehrt haben, stehen dabei. Wer sie sieht, kann
                          beurteilen, ob die Zuordnung Substanz hat. */}
                      <span className={hintClassName}>
                        {t("confirm.matchedTerms", { terms: area.matchedTerms.join(", ") })}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <p className={hintClassName}>{t("confirm.noneIsFine")}</p>
          </fieldset>
        ) : null}

        {/* Die Herkunft der Zuordnung gehoert dazu, solange sie erkennbar
            begrenzt ist - und spaeter erst recht, wenn ein Modell dahinter
            steht. */}
        <p className={hintClassName}>{t(`confirm.engine.${analysis.engine}`)}</p>

        <details className="rounded-2xl border border-slate-200 px-4 py-3">
          <summary className="min-h-11 cursor-pointer text-sm font-semibold">
            {t("confirm.showNarrative")}
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{narrative}</p>
        </details>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton
            label={t("confirm.submit")}
            pendingLabel={t("pending.save")}
            className={primaryClassName}
          />
          <button
            type="button"
            onClick={() => setAnalysis(null)}
            className={secondaryClassName}
          >
            {t("confirm.back")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={action} className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-xl font-semibold">{t("evidence.title")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("evidence.text")}</p>
      </div>
      {/* Diktierbar: Erzaehlen faellt den meisten leichter als schreiben, und
          wer erzaehlt, schreibt konkreter - genau das braucht die Zuordnung. */}
      <label className="block text-sm font-medium" htmlFor="capability-narrative">
        {t("evidence.narrativeLabel")}
        <DictatedTextarea
          id="capability-narrative"
          name="narrative"
          required
          rows={5}
          minLength={NARRATIVE_MIN_LENGTH}
          maxLength={NARRATIVE_MAX_LENGTH}
          placeholder={t("evidence.narrativePlaceholder")}
          className={fieldClassName}
          defaultValue={narrative}
          onValueChange={setNarrative}
        />
        <span className={hintClassName}>
          {t("evidence.narrativeHint", { min: NARRATIVE_MIN_LENGTH })}
        </span>
        <span className={hintClassName}>{commonT("dictation.browserHint")}</span>
      </label>
      <p className={hintClassName}>{t("evidence.assignmentNote")}</p>
      <fieldset>
        <legend className="text-sm font-medium">{t("evidence.levelLabel")}</legend>
        <div className="mt-3 grid gap-2">
          {APPLICATION_LEVELS.map((value) => (
            <label
              key={value}
              className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm"
            >
              <input
                type="radio"
                name="application_level"
                value={value}
                checked={level === String(value)}
                onChange={() => setLevel(String(value))}
              />
              {t(`levels.${value}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        {/* type="button": Der Weiter-Knopf fuehrt zur Rueckfrage, nicht zum
            Speichern. Ohne JavaScript bleibt der Submit-Knopf darunter der
            Weg, und die Server Action ordnet selbst zu. */}
        <button
          type="button"
          onClick={confirmNarrative}
          disabled={tooShort}
          aria-disabled={tooShort}
          className={`${primaryClassName} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {t("evidence.submit")}
        </button>
        <noscript>
          <button type="submit" className={secondaryClassName}>
            {t("evidence.submit")}
          </button>
        </noscript>
        <Link href="/profile?step=areas" className="text-sm font-semibold text-slate-600 hover:underline">
          {t("evidence.skip")}
        </Link>
      </div>
    </form>
  );
}
