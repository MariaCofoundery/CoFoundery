"use client";

import { useRef, useState } from "react";
import {
  CV_MAX_EXPERTISE,
  CV_MAX_INDUSTRIES,
  CV_MIN_LENGTH,
  analyzeCv,
  mergeIntoList,
  type CvAnalysis,
} from "@/features/profile/cvMatching";

type Copy = {
  title: string;
  /** Kurzes Abzeichen an der Ueberschrift - sichtbar, bevor man aufklappt. */
  betaBadge: string;
  betaNote: string;
  text: string;
  privacyNote: string;
  textareaLabel: string;
  placeholder: string;
  fileLabel: string;
  analyze: string;
  tooShort: string;
  nothingFound: string;
  nothingFoundHint: string;
  expertiseTitle: string;
  industriesTitle: string;
  because: string;
  apply: string;
  applied: string;
  clear: string;
  fileUnsupported: string;
};

/**
 * Lebenslauf einlesen - im Browser, ohne dass er irgendwo ankommt.
 *
 * Das ist der Kern der Entscheidung: `analyzeCv` ist eine reine Funktion, und
 * sie laeuft hier, im Client. Der Text geht nicht an einen Server, nicht an ein
 * Sprachmodell und wird nirgends gespeichert. Beim Verlassen der Seite ist er
 * weg. Deshalb steht dieser Hinweis auch sichtbar ueber dem Feld und nicht im
 * Kleingedruckten - er ist der Grund, warum man das Dokument ueberhaupt
 * hineinkopiert.
 *
 * WAS DAS VERFAHREN NICHT KANN, und was hier auch so dasteht:
 *   Es erkennt nur, was in den Begriffslisten steht. Findet es nichts, sagt es
 *   das - statt einen schwachen Treffer als Ergebnis auszugeben.
 *
 * NICHTS WIRD AUTOMATISCH UEBERNOMMEN:
 *   Jeder Vorschlag ist ein Haekchen, und jeder traegt die Woerter mit, die zu
 *   ihm gefuehrt haben. Wer "Vertrieb" vorgeschlagen bekommt, soll sehen, dass
 *   "key account" im Text stand - und widersprechen koennen.
 *
 * Uebernommen wird ERGAENZEND: Bestehende eigene Eintraege bleiben stehen und
 * behalten bei Ueberlauf den Platz. Was jemand selbst formuliert hat, ist die
 * bessere Angabe.
 */
export function CvImportField({
  expertiseLabels,
  industryLabels,
  copy,
}: {
  expertiseLabels: Record<string, string>;
  industryLabels: Record<string, string>;
  copy: Copy;
}) {
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState(false);
  const [fileError, setFileError] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const label = (kind: "expertise" | "industries", key: string) =>
    (kind === "expertise" ? expertiseLabels : industryLabels)[key] ?? key;

  const toggle = (id: string) => {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setApplied(false);
  };

  const run = () => {
    const result = analyzeCv(text);
    setAnalysis(result);
    setApplied(false);
    // Alles vorausgewaehlt waere eine Uebernahme durch die Hintertuer: Wer auf
    // "Uebernehmen" drueckt, ohne zu lesen, haette dann die Liste der Maschine
    // im Profil. Angehakt wird einzeln.
    setChosen(new Set());
  };

  const readFile = async (file: File) => {
    setFileError(false);
    // Nur Text. PDF und Word im Browser zu zerlegen hiesse eine grosse
    // Fremdbibliothek zu laden - fuer eine Bequemlichkeit, die ein
    // Kopieren-und-Einfuegen auch loest.
    if (!/\.(txt|md|markdown)$/i.test(file.name) && !file.type.startsWith("text/")) {
      setFileError(true);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setText(await file.text());
    if (fileInput.current) fileInput.current.value = "";
  };

  /** Traegt die angehakten Vorschlaege in die beiden Profilfelder ein. */
  const apply = () => {
    const pick = (kind: "expertise" | "industries", max: number) => {
      const field = document.querySelector<HTMLInputElement>(`input[name="${kind}"]`);
      if (!field || !analysis) return;
      const additions = analysis[kind]
        .filter((suggestion) => chosen.has(`${kind}:${suggestion.key}`))
        .map((suggestion) => label(kind, suggestion.key));
      field.value = mergeIntoList(field.value, additions, max);
    };
    pick("expertise", CV_MAX_EXPERTISE);
    pick("industries", CV_MAX_INDUSTRIES);
    setApplied(true);
  };

  const found = analysis && (analysis.expertise.length > 0 || analysis.industries.length > 0);
  const tooShort = analysis !== null && text.trim().length < CV_MIN_LENGTH;

  return (
    <details className="rounded-2xl border border-slate-200 p-5">
      {/* Das Abzeichen steht an der zugeklappten Ueberschrift, nicht erst im
          Inneren: Wer aufklappt, soll vorher wissen, dass das hier noch im
          Werden ist. */}
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-900">
        <span>{copy.title}</span>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[.68rem] font-bold uppercase tracking-[.1em] text-violet-800">
          {copy.betaBadge}
        </span>
      </summary>

      <p className="mt-3 text-sm leading-6 text-slate-600">{copy.text}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{copy.betaNote}</p>
      <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-700">
        {copy.privacyNote}
      </p>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        {copy.textareaLabel}
        <textarea
          rows={7}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setApplied(false);
          }}
          placeholder={copy.placeholder}
          className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-slate-700 underline underline-offset-4">
          {copy.fileLabel}
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
        </label>
        <button
          type="button"
          onClick={run}
          disabled={text.trim().length === 0}
          className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {copy.analyze}
        </button>
        {text.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setText("");
              setAnalysis(null);
              setChosen(new Set());
              setApplied(false);
            }}
            className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline underline-offset-4"
          >
            {copy.clear}
          </button>
        ) : null}
      </div>

      {fileError ? (
        <p role="alert" className="mt-3 text-sm leading-6 text-amber-900">
          {copy.fileUnsupported}
        </p>
      ) : null}

      {tooShort ? (
        <p role="status" className="mt-4 text-sm leading-6 text-slate-600">
          {copy.tooShort}
        </p>
      ) : null}

      {analysis && !tooShort && !found ? (
        <div role="status" className="mt-4">
          <p className="text-sm leading-6 text-slate-700">{copy.nothingFound}</p>
          <p className="mt-1 text-xs leading-6 text-slate-500">{copy.nothingFoundHint}</p>
        </div>
      ) : null}

      {found ? (
        <div className="mt-5 space-y-5">
          {(["expertise", "industries"] as const).map((kind) =>
            analysis[kind].length > 0 ? (
              <section key={kind}>
                <h3 className="text-sm font-semibold text-slate-900">
                  {kind === "expertise" ? copy.expertiseTitle : copy.industriesTitle}
                </h3>
                <ul className="mt-2 space-y-2">
                  {analysis[kind].map((suggestion) => {
                    const id = `${kind}:${suggestion.key}`;
                    return (
                      <li key={id}>
                        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={chosen.has(id)}
                            onChange={() => toggle(id)}
                            className="mt-1 h-4 w-4"
                          />
                          <span>
                            <span className="block text-sm font-medium text-slate-900">
                              {label(kind, suggestion.key)}
                            </span>
                            {/* Nie eine Blackbox: Wer einen Vorschlag sieht,
                                sieht auch, woran er haengt. */}
                            <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                              {copy.because} {suggestion.matchedTerms.join(", ")}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={apply}
              disabled={chosen.size === 0}
              className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {copy.apply}
            </button>
            {applied ? (
              <span role="status" className="text-sm text-slate-600">
                {copy.applied}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </details>
  );
}
