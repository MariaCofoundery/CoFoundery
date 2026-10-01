import {
  markSectionDoneAction,
  unmarkSectionAction,
} from "@/features/profile/sectionMarkActions";

/**
 * „Damit bin ich für jetzt durch."
 *
 * Für die drei Bereiche, deren Ende nicht in den Daten steht: Fähigkeiten,
 * Stärken, Netzwerk. Es gibt keine Zahl, ab der es genug ist — 54 mögliche
 * Bereiche sind kein Ziel, und drei können vollständig sein.
 *
 * ES STEHT AUF DER SEITE DES BEREICHS und nicht auf der Übersicht: Man
 * entscheidet, dass es reicht, während man vor sich hat, was man eingetragen
 * hat.
 *
 * ES IST KEIN ABSCHLUSS. Der Satz sagt „für jetzt", die Markierung lässt sich
 * zurücknehmen, und spätere Änderungen heben sie nicht auf. Ein Profil, das
 * sich beim Pflegen selbst zurückstuft, bestraft das Pflegen.
 *
 * KEIN HÄKCHEN, KEIN UMSCHALTER. Zwei Formulare, die sagen, was sie wollen —
 * ein Umschalter, der aus dem gezeigten Zustand den nächsten errechnet, trifft
 * bei einem erneut abgeschickten Formular die falsche Entscheidung.
 */
export function SectionMarkToggle({
  section,
  marked,
  copy,
}: {
  section: string;
  marked: boolean;
  copy: { markedNote: string; mark: string; unmark: string };
}) {
  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      {marked ? (
        <p className="text-sm leading-6 text-slate-700">{copy.markedNote}</p>
      ) : null}
      <form action={marked ? unmarkSectionAction : markSectionDoneAction} className={marked ? "mt-2" : ""}>
        <input type="hidden" name="section" value={section} />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950"
        >
          {marked ? copy.unmark : copy.mark}
        </button>
      </form>
    </div>
  );
}
