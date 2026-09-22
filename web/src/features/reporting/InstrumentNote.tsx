/**
 * Was das hier ist - und was nicht.
 *
 * GEWÜNSCHT AM 23.09.2026: "Mir ist natürlich auch wichtig, dass das, was da
 * so drin steht, auch valide, reliabel, objektiv ist - wirklich auch
 * bestmöglich wissenschaftlichen Standards entspricht. Jetzt ist es alles ein
 * bisschen fancy."
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: Die Dokumentation im Repository ist ehrlich -
 * `docs/self-report-model-validation.md` sagt in der ersten Zeile "empirisch
 * noch nicht validiert", und `capability-model-technical-brief.md` sagt
 * "Validierung: keine". Das PRODUKT sagte davon nichts. Wer den Report
 * ausdruckt und einem Accelerator gibt, übergibt etwas, das aussieht wie ein
 * Testergebnis.
 *
 * SIE STEHT UNTEN UND NICHT OBEN. Ein Warnhinweis über dem Ergebnis wird
 * überlesen oder macht das Ergebnis wertlos, bevor man es gelesen hat. Unten
 * steht er dort, wo man aufhört zu lesen und anfängt, es zu benutzen.
 *
 * UND SIE WIRD MITGEDRUCKT. Anders als die Hinweise auf fehlende Teile
 * (`no-print`, weil sie eine Aufforderung an die falsche Person wären) gehört
 * dieser Satz genau in die Fassung, die weitergegeben wird - dort ist er am
 * wichtigsten.
 */
export function InstrumentNote({
  copy,
}: {
  copy: {
    title: string;
    selfReport: string;
    notATest: string;
    snapshot: string;
    purpose: string;
    /** Wann die Angaben entstanden sind, wenn bekannt. */
    dated: string | null;
  };
}) {
  return (
    <section
      aria-labelledby="instrument-note-title"
      className="page-section mt-8 rounded-2xl border border-slate-300 bg-slate-50/80 p-5 text-sm leading-6 text-slate-700 print:mt-6 print:rounded-none print:border print:border-slate-300 print:bg-white"
    >
      <h2 id="instrument-note-title" className="text-sm font-semibold text-slate-900">
        {copy.title}
      </h2>
      <ul className="mt-3 space-y-2">
        <li>{copy.selfReport}</li>
        <li>{copy.notATest}</li>
        <li>{copy.snapshot}</li>
        <li>{copy.purpose}</li>
      </ul>
      {copy.dated ? <p className="mt-3 text-xs text-slate-500">{copy.dated}</p> : null}
    </section>
  );
}
