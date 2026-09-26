import { getReportContent } from "@/features/reporting/content/reportContent";
import {
  FOUNDER_DIMENSION_ORDER,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";
import type { AppLocale } from "@/i18n/config";

/**
 * Die Selbstbilder nebeneinander.
 *
 * GEWUENSCHT AM 26.09.2026 als Inhalt der gemeinsamen Auswertung: "ein
 * Nebeneinander der Selbstbilder aus dem Fragebogen".
 *
 * ---------------------------------------------------------------------------
 * ES STEHT NEBENEINANDER, ES WIRD NICHT VERRECHNET
 * ---------------------------------------------------------------------------
 *
 * Kein Passungswert, kein Abstand in Zahlen, keine Reihenfolge nach
 * Aehnlichkeit. Die Punkte liegen auf derselben Achse, und was daraus folgt,
 * folgt im Gespraech.
 *
 * Der Unterschied ist nicht kosmetisch. Eine Zahl "73 % Passung" wird
 * unweigerlich zum Auswahlkriterium, sobald sie existiert - und dieses
 * Instrument gibt sie nicht her. Zwei Punkte auf einer Achse sagen dasselbe,
 * was die Daten hergeben ("hier liegt ihr auseinander"), ohne zu behaupten,
 * wie viel das wert ist.
 *
 * WEIT AUSEINANDER IST NICHT SCHLECHT. Deshalb keine Ampel, keine Einfaerbung
 * nach Abstand, kein Ausrufezeichen bei grossen Unterschieden. Die Farben
 * unterscheiden PERSONEN, nicht Bewertungen - wer welcher Punkt ist, steht
 * daneben.
 *
 * WER NICHTS FREIGEGEBEN HAT, FEHLT SICHTBAR. Eine Achse mit zwei statt drei
 * Punkten sieht sonst aus wie eine Aussage ueber ein Paar, obwohl sie eine
 * ueber eine unvollstaendige Freigabe ist.
 */

/**
 * Personenfarben. Bewusst aus derselben Reihe wie die Saeulen im Gesamtbild
 * und ausdruecklich NICHT Bernstein oder Rose - die sind fuer Bedeutung
 * reserviert (Bruchstelle, Luecke), und hier bedeutet keine Farbe etwas
 * ausser "diese Person".
 */
const PERSON_COLORS = [
  { dot: "bg-indigo-500", text: "text-indigo-700" },
  { dot: "bg-emerald-500", text: "text-emerald-700" },
  { dot: "bg-violet-500", text: "text-violet-700" },
  { dot: "bg-sky-500", text: "text-sky-700" },
  { dot: "bg-slate-700", text: "text-slate-700" },
  { dot: "bg-teal-600", text: "text-teal-700" },
  { dot: "bg-fuchsia-500", text: "text-fuchsia-700" },
  { dot: "bg-cyan-600", text: "text-cyan-700" },
] as const;

export type AlignmentPerson = {
  userId: string;
  name: string;
  scores: Record<string, number | null>;
};

/**
 * Wo auf der Achse. Die Skala des Modells laeuft von 1 bis 5; die Mitte ist
 * die Mitte, und ein fehlender Wert bekommt keine Stelle - er wird
 * weggelassen und nicht auf 50 % gesetzt.
 */
function toPercent(score: number | null | undefined): number | null {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  const clamped = Math.min(5, Math.max(1, score));
  return ((clamped - 1) / 4) * 100;
}

export function AlignmentSideBySide({
  people,
  locale,
  copy,
}: {
  people: AlignmentPerson[];
  locale: AppLocale;
  copy: { title: string; intro: string; noValue: string; basis: string };
}) {
  const content = getReportContent(locale);
  const withColor = people.map((person, index) => ({
    ...person,
    color: PERSON_COLORS[index % PERSON_COLORS.length],
  }));

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-950">{copy.title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{copy.intro}</p>

      {/* Wer welcher Punkt ist. Ohne diese Zeile ist die Grafik unlesbar -
          und eine unlesbare Grafik ueber Menschen ist schlimmer als keine. */}
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {withColor.map((person) => (
          <li key={person.userId} className="flex items-center gap-2">
            <span aria-hidden className={`size-2.5 rounded-full ${person.color.dot}`} />
            <span className={person.color.text}>{person.name}</span>
          </li>
        ))}
      </ul>

      <ul className="mt-6 grid gap-6">
        {FOUNDER_DIMENSION_ORDER.map((dimension: FounderDimensionKey) => {
          const meta = content.dimensions[dimension];
          const placed = withColor
            .map((person) => ({ person, position: toPercent(person.scores[dimension]) }))
            .filter((entry): entry is { person: (typeof withColor)[number]; position: number } =>
              entry.position !== null
            );
          const missing = withColor.filter(
            (person) => toPercent(person.scores[dimension]) === null
          );

          return (
            <li key={dimension}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {meta.canonicalName}
              </p>

              <div className="relative mt-3 h-6">
                <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-slate-200" />
                <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-slate-300" />
                {placed.map(({ person, position }) => (
                  <span
                    key={person.userId}
                    // `title` traegt den Namen auch dann, wenn zwei Punkte
                    // uebereinanderliegen - und das tun sie oft.
                    title={person.name}
                    className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${person.color.dot}`}
                    style={{ left: `${position}%` }}
                  />
                ))}
              </div>

              <div className="mt-1 flex justify-between gap-4 text-xs leading-5 text-slate-500">
                <span>{meta.reportLeftPole}</span>
                <span className="text-right">{meta.reportRightPole}</span>
              </div>

              {/* DIESELBE AUSKUNFT IN WORTEN. Wer mit einem Screenreader
                  liest oder Farben nicht unterscheidet, verliert nichts. */}
              <p className="sr-only">
                {placed.map(({ person }) => `${person.name}: ${person.scores[dimension]}`).join(", ")}
              </p>

              {missing.length > 0 ? (
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {copy.noValue.replace("{names}", missing.map((person) => person.name).join(", "))}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-xs leading-5 text-slate-500">{copy.basis}</p>
    </section>
  );
}
