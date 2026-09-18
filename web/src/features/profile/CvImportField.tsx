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
  /**
   * Nur das Wort, ohne Zahl - die steht erst im Client fest, und eine
   * Uebersetzungsfunktion laesst sich nicht ueber die Grenze reichen. Ein
   * Platzhalter im Text waere hier eine Falle: next-intl liest jedes
   * `{...}` als ICU-Argument und rendert ohne Wert den Schluesselpfad.
   * Eine Pluralform braucht es nicht - "1 ausgewaehlt" und "3 ausgewaehlt"
   * beugen in beiden Sprachen gleich.
   */
  chosenCount: string;
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
    <details className="group rounded-2xl border border-slate-200 bg-white/60 p-5 open:bg-white">
      {/* Das Abzeichen steht an der zugeklappten Ueberschrift, nicht erst im
          Inneren: Wer aufklappt, soll vorher wissen, dass das hier noch im
          Werden ist. */}
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-4 w-4 shrink-0 fill-none stroke-slate-400 transition group-open:rotate-90"
          strokeWidth="2"
        >
          <path d="m6 3.5 5 4.5-5 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{copy.title}</span>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[.68rem] font-bold uppercase tracking-[.1em] text-violet-800">
          {copy.betaBadge}
        </span>
      </summary>

      <div className="mt-4 space-y-2 border-l-2 border-slate-100 pl-4">
        <p className="text-sm leading-6 text-slate-700">{copy.text}</p>
        <p className="text-sm leading-6 text-slate-500">{copy.betaNote}</p>
        {/* Das Versprechen, dass nichts das Geraet verlaesst, ist der Grund,
            warum jemand ein so dichtes Dokument hier hineinkopiert. Es steht
            deshalb mit eigenem Zeichen da und nicht als weiterer grauer
            Absatz. */}
        <p className="flex items-start gap-2 text-sm leading-6 text-slate-700">
          <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-1 h-4 w-4 shrink-0 fill-none stroke-slate-500" strokeWidth="1.6">
            <rect x="3.25" y="7" width="9.5" height="6.25" rx="1.5" />
            <path d="M5.75 7V5.25a2.25 2.25 0 0 1 4.5 0V7" strokeLinecap="round" />
          </svg>
          <span>{copy.privacyNote}</span>
        </p>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <label className="block bg-white px-4 pt-3">
          <span className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
            {copy.textareaLabel}
          </span>
          <textarea
            rows={8}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setApplied(false);
            }}
            placeholder={copy.placeholder}
            className="mt-2 w-full resize-y border-0 p-0 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />
        </label>
        {/* Die Handlungen sitzen an der Kante des Feldes, nicht frei darunter:
            Sie gehoeren zu dem Text, der darueber steht. */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
          <button
            type="button"
            onClick={run}
            disabled={text.trim().length === 0}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-400 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {copy.analyze}
          </button>
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-3 text-sm font-medium text-slate-600 transition hover:text-slate-900 focus-within:ring-2 focus-within:ring-amber-500">
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
          {text.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setText("");
                setAnalysis(null);
                setChosen(new Set());
                setApplied(false);
              }}
              className="ml-auto inline-flex min-h-11 items-center px-2 text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-800"
            >
              {copy.clear}
            </button>
          ) : null}
        </div>
      </div>

      {fileError ? (
        <p role="alert" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {copy.fileUnsupported}
        </p>
      ) : null}

      {tooShort ? (
        <p role="status" className="mt-4 text-sm leading-6 text-slate-600">
          {copy.tooShort}
        </p>
      ) : null}

      {analysis && !tooShort && !found ? (
        <div role="status" className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
          <p className="text-sm font-medium leading-6 text-slate-800">{copy.nothingFound}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{copy.nothingFoundHint}</p>
        </div>
      ) : null}

      {found ? (
        <div className="mt-6">
          {(["expertise", "industries"] as const).map((kind) =>
            analysis[kind].length > 0 ? (
              <section key={kind} className="mt-5 first:mt-0">
                <h3 className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                  {kind === "expertise" ? copy.expertiseTitle : copy.industriesTitle}
                </h3>
                {/* Zwei Spalten ab der mittleren Breite: Acht Vorschlaege
                    untereinander waren eine Liste, durch die man scrollt. */}
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {analysis[kind].map((suggestion) => {
                    const id = `${kind}:${suggestion.key}`;
                    const picked = chosen.has(id);
                    return (
                      <li key={id}>
                        <label
                          className={`flex h-full min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                            picked
                              ? "border-slate-900 bg-slate-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={picked}
                            onChange={() => toggle(id)}
                            className="mt-0.5 h-4 w-4 shrink-0"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-900">
                              {label(kind, suggestion.key)}
                            </span>
                            {/* Nie eine Blackbox: Wer einen Vorschlag sieht,
                                sieht auch, woran er haengt. */}
                            <span className="mt-1 flex flex-wrap gap-1">
                              {suggestion.matchedTerms.map((term) => (
                                <span
                                  key={term}
                                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[.7rem] leading-5 text-slate-600"
                                >
                                  {term}
                                </span>
                              ))}
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

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
            {/* Die eine Handlung, die etwas veraendert - und die einzige mit
                dem Markenverlauf. */}
            <button
              type="button"
              onClick={apply}
              disabled={chosen.size === 0}
              className="brand-cta inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              {copy.apply}
            </button>
            {chosen.size > 0 ? (
              <span className="text-sm text-slate-500">{chosen.size} {copy.chosenCount}</span>
            ) : null}
            {applied ? (
              <span role="status" className="text-sm font-medium text-slate-700">
                {copy.applied}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </details>
  );
}
