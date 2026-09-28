import Link from "next/link";
import { ReportMark } from "@/features/instruments/v2/ReportMark";
import { getTranslations } from "next-intl/server";
import type { AlignmentReport } from "@/features/instruments/v2/alignmentReportData";
import type { ReadoutEntry, ReadoutValue } from "@/features/instruments/v2/alignmentReadout";

/**
 * Der Einzelreport auf dem Bildschirm.
 *
 * KEINE BALKEN, KEINE ACHSEN, KEINE PROZENTE. Eine Antwort steht als Satz da:
 * die Frage, darunter was gewählt wurde. Ein Balken würde aus „manchmal" eine
 * Länge machen - und eine Länge lädt zum Vergleichen ein, wo es nichts zu
 * vergleichen gibt.
 *
 * Die Reihenfolge der Abschnitte ist dieselbe wie im Fragebogen. Wer den
 * Report liest, soll sich erinnern, wo er war.
 */

export async function AlignmentReportView({ report }: { report: AlignmentReport }) {
  const t = await getTranslations("alignment");

  if (report.isEmpty) {
    // Ein leerer Report sagt, dass er leer ist - und wohin es weitergeht.
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6">
        <p className="text-slate-800">{t("report.emptyTitle")}</p>
        <p className="mt-2 text-sm text-slate-600">{t("report.emptyIntro")}</p>
        <Link href="/debug/alignment-v2/base"
              className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          {t("report.emptyAction")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {report.soloNote && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-slate-800">{report.soloNote.observed}</p>
          <p className="mt-1 text-slate-600">{report.soloNote.meaning}</p>
          <p className="mt-2 text-sm text-slate-700">{report.soloNote.question}</p>
        </section>
      )}

      {report.open.length > 0 && (
        // WAS OFFEN IST, STEHT OBEN UND NICHT VERSTREUT. Es ist der
        // nützlichste Teil - genau hier wäre zu sprechen.
        <section className="rounded-xl border border-amber-300 bg-amber-50/50 p-5">
          <h2 className="text-lg font-semibold text-slate-900">{t("report.openTitle")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("report.openIntro")}</p>
          <ul className="mt-4 space-y-3">
            {report.open.map(({ entry, label }) => (
              <li key={entry.blockId} className="text-sm">
                <span className="text-slate-800">{entry.prompt}</span>
                <span className="mt-0.5 block text-slate-600">{label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Die Erklaerung zur Markierung - einmal, ueber allen Abschnitten. */}
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        {t("discussion.markHint")}
      </p>

      {report.sections.map((section) => (
        <section key={section.key} className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{section.label}</h2>
          {section.condition && (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              {section.condition}
            </p>
          )}
          <ul className="space-y-4">
            {section.entries.map((entry) => (
              <li key={entry.blockId} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-800">{entry.prompt}</p>
                {entry.answered && entry.value.kind === "category" ? (
                  <ScalePosition
                    label={entry.value.label}
                    position={entry.value.position}
                    of={entry.value.of}
                  />
                ) : (
                  <p className="mt-2 text-base font-medium text-slate-900">{describe(entry)}</p>
                )}
                {/* HIER WIRD MARKIERT, NICHT IM FRAGEBOGEN. Erst wenn die
                    eigenen Antworten nebeneinanderstehen, weiss man, worueber
                    zu sprechen waere. */}
                <ReportMark
                  blockId={entry.blockId}
                  initialMarked={report.marked[entry.blockId]?.marked ?? false}
                  initialNote={report.marked[entry.blockId]?.note ?? null}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* DIE DREI UNSICHERHEITEN STEHEN AM ENDE UND VOLLSTAENDIG. Sie zu
          kuerzen hiesse, ein Versprechen zu machen, das das Instrument nicht
          halten kann. */}
      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("report.limitsTitle")}
        </h2>
        <ul className="mt-3 space-y-2">
          {report.uncertainties.map((entry) => (
            <li key={entry.key} className="text-sm text-slate-600">{entry.text}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * Eine Kategorie als Punktreihe.
 *
 * ---------------------------------------------------------------------------
 * WARUM PUNKTE UND KEIN BALKEN
 * ---------------------------------------------------------------------------
 *
 * Maria wollte, dass es „ein bisschen farbig" ist und nicht nur Text. Ein
 * Balken waere das Naheliegende - und genau das Falsche: Er macht aus
 * „manchmal" eine LAENGE, und Laengen laden zum Messen und Vergleichen ein.
 * Zwei Balken nebeneinander lesen sich wie ein Abstand, und ein Abstand
 * sieht aus wie ein Ergebnis.
 *
 * Fuenf Punkte, von denen einer gefuellt ist, zeigen dasselbe, was der
 * Readout sagt: eine POSITION unter benannten Kategorien, drei von fuenf.
 * Nichts daran ist eine Strecke, nichts laesst sich davon subtrahieren - und
 * die Beschriftung steht weiterhin daneben, weil sie die eigentliche Antwort
 * ist.
 */
function ScalePosition({ label, position, of }: { label: string; position: number; of: number }) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="flex gap-1.5" role="img" aria-label={`${label} (${position}/${of})`}>
        {Array.from({ length: of }, (_, index) => (
          <span
            key={index}
            className={[
              "h-2.5 w-2.5 rounded-full",
              index + 1 === position ? "bg-slate-900" : "bg-slate-200",
            ].join(" ")}
          />
        ))}
      </div>
      <span className="text-base font-medium text-slate-900">{label}</span>
    </div>
  );
}

/** Eine Antwort als Satz - nie als Zahl, nie als Balken. */
function describe(entry: ReadoutEntry): string {
  if (!entry.answered) return entry.missing!.label ?? "keine Angabe";
  return describeValue(entry.value);
}

function describeValue(value: ReadoutValue): string {
  switch (value.kind) {
    case "category": return value.label;
    case "choice": return value.labels.join(" · ") + (value.own ? ` (${value.own})` : "");
    case "text": return value.text;
    case "fields": return value.fields.map((one) => `${one.label}: ${one.text}`).join(" · ");
    case "range": return `${value.min}${value.max != null ? `–${value.max}` : ""} ${value.unit}`;
    case "money":
      return `${value.min}${value.max != null ? `–${value.max}` : ""} ${value.currency}` +
        (value.basis ? ` (${value.basis})` : "");
    case "recipients":
      return value.per
        .map((one) => `${one.recipient}: ${one.min}${one.max != null ? `–${one.max}` : ""} ${value.unit}`)
        .join(" · ");
    case "windows":
      return value.windows.map((one) => `${one.days.join("/")} ${one.from}–${one.to}`).join(" · ");
    case "date": return value.date;
    case "case":
      // BEIDE ANLIEGEN BLEIBEN SICHTBAR, auch im Report. Nur den gewählten Weg
      // zu zeigen hiesse, die Abwägung wegzulassen, die die Antwort ausmacht.
      return (
        `${value.path.label} — ` +
        value.concerns.map((one) => `${one.label}: ${one.importance.label}`).join(", ")
      );
  }
}
