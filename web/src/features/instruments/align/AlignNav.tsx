import Link from "next/link";

/**
 * Die Wege innerhalb der neuen Fassung.
 *
 * ---------------------------------------------------------------------------
 * WARUM ES SIE BRAUCHT
 * ---------------------------------------------------------------------------
 *
 * Die zweite Reihe der Hauptnavigation zeigt die BEREICHE von Align —
 * Verbindungen, Gesamtbild, Neue Fassung, Library. Ist man einmal in der
 * neuen Fassung, hilft sie nicht weiter: Zwischen Arbeitsprofil, Vorhaben und
 * Suche kommt man nur über das Dashboard, und zurück führt gar nichts.
 *
 * Die alte Testfassung hatte dafür eine eigene Leiste. Die neue hatte keine —
 * gebaut wurde Seite für Seite, und der Weg dazwischen ist dabei liegen
 * geblieben.
 *
 * ---------------------------------------------------------------------------
 * EINE TÜR JE SACHE, NICHT ZWEI
 * ---------------------------------------------------------------------------
 *
 * Für jeden Bogen steht hier EIN Eintrag, und wohin er führt, hängt davon ab,
 * wo man steht: Wer noch nicht abgegeben hat, kommt zum Fragebogen; wer
 * abgegeben hat, zu seinen Antworten. Zwei Einträge nebeneinander
 * („ausfüllen" und „ansehen") wären zwei Orte für dieselbe Sache — und man
 * müsste wissen, in welchem Zustand man ist, um den richtigen zu treffen.
 */
export type AlignNavState = {
  profileSubmitted: boolean;
  ventureSubmitted: boolean;
  ventureId: string | null;
};

export function AlignNav({
  current,
  state,
}: {
  /** Die eigene Adresse — der aktive Eintrag wird nicht verlinkt. */
  current: string;
  state: AlignNavState;
}) {
  const venture = state.ventureId
    ? `?venture=${encodeURIComponent(state.ventureId)}`
    : "";

  const eintraege = [
    {
      href: state.profileSubmitted
        ? "/founder-alignment/profil/antworten"
        : "/founder-alignment/profil",
      label: "Wie du arbeitest",
      // Beide Seiten desselben Bogens gelten als derselbe Ort.
      matches: (path: string) => path.startsWith("/founder-alignment/profil"),
    },
    {
      href: state.ventureSubmitted
        ? `/founder-alignment/vorhaben/antworten${venture}`
        : `/founder-alignment/vorhaben${venture}`,
      // "Euer Vorhaben" setzt ein Wir voraus, das es oft noch nicht gibt -
      // Solo-Foundernde und Leute vor der Co-Founder-Suche fielen damit
      // durch. UX-Review Teil 2 vom 30.09.2026.
      label: "Was du aufbauen willst",
      matches: (path: string) => path.startsWith("/founder-alignment/vorhaben"),
    },
    // "Wonach du suchst" stand hier bis zum 30.09.2026. Es ist nach FIND
    // gezogen: Die FIND-Spec, Abschnitt 1, ordnet die Frage fachlich dorthin -
    // ALIGN klaert, wie man arbeitet und was man aufbauen will; wen man dafuer
    // sucht, gehoert zur Suche. Zwei Orte fuer dieselbe Frage waeren zwei
    // Suchen, die nichts voneinander wissen.
  ];

  return (
    <nav aria-label="Neue Fassung" className="mb-6">
      {/* ZURÜCK STEHT ÜBER DEN REITERN, NICHT DAZWISCHEN. Es ist kein
          weiterer Bereich, sondern der Weg hinaus - und wer ihn sucht, sucht
          ihn oben links. */}
      <Link
        href="/dashboard"
        className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Übersicht
      </Link>

      <div className="mt-2 flex flex-wrap gap-2">
        {eintraege.map((eintrag) =>
          eintrag.matches(current) ? (
            <span
              key={eintrag.label}
              aria-current="page"
              className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white"
            >
              {eintrag.label}
            </span>
          ) : (
            <Link
              key={eintrag.label}
              href={eintrag.href}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              {eintrag.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
