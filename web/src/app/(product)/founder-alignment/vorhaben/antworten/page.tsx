import Link from "next/link";
import { redirect } from "next/navigation";
import { AlignNav } from "@/features/instruments/align/AlignNav";
import { getAlignNavState } from "@/features/instruments/align/navState";
import { ReportViewV21 } from "@/features/instruments/v21/ReportViewV21";
import { VentureDirection, WorkMap } from "@/features/instruments/align/AlignMaps";
import { getScopeReport } from "@/features/instruments/align/reportData";
import { VENTURE_ALIGNMENT, getItemsV22 } from "@/features/instruments/align/registries";
import { withPartner } from "@/features/instruments/align/questionnaireData";
import { getShareState } from "@/features/instruments/align/shareData";
import { ShareForm } from "@/features/instruments/align/ShareForm";
import { resolveVenture } from "@/features/instruments/align/ventureResolution";
import { getRequestUser } from "@/lib/supabase/server";

/**
 * Die eigenen Antworten zu einem Vorhaben.
 *
 * SIE GELTEN FÜR DIESES EINE. Deshalb steht der Name darüber - dieselbe Person
 * kann bei zwei Vorhaben verschiedene Zusagen machen, ohne sich zu
 * widersprechen, und ein Bericht ohne Zuordnung wäre eine Auskunft ohne
 * Bezug.
 */
export default async function VentureAnswersPage({
  searchParams,
}: {
  searchParams: Promise<{ venture?: string; erstellt?: string }>;
}) {
  const { erstellt } = await searchParams;
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/founder-alignment/vorhaben/antworten")}`);
  }

  const navState = await getAlignNavState(auth.user.id);

  const { venture: gewaehlt } = await searchParams;
  const { venture, choices } = await resolveVenture(auth.user.id, gewaehlt);

  if (!venture) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
      <AlignNav current="/founder-alignment/vorhaben/antworten" state={navState} />
        <h1 className="text-2xl font-semibold text-slate-900">Welches Vorhaben?</h1>
        <ul className="mt-6 space-y-2">
          {choices.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/founder-alignment/vorhaben/antworten?venture=${encodeURIComponent(entry.id)}`}
                className="text-slate-900 underline"
              >
                {entry.name ?? "Ohne Namen"}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const report = await getScopeReport(auth.user.id, "venture_alignment", venture.id);
  const teilen = await getShareState(auth.user.id, "venture_alignment", venture.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <AlignNav current="/founder-alignment/vorhaben/antworten" state={navState} />
      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        Testfassung
      </p>
      {/* ---------------------------------------------------------------
          DER MOMENT NACH DEM ABSENDEN
          ---------------------------------------------------------------

          Gemeldet am 30.09.2026: Nach dem Absenden passierte nichts
          Spuerbares. Hier liegt der laengste Teil hinter einem - und das darf
          man sehen. Der Kasten steht nur beim ersten Mal da; wer die Seite
          spaeter wieder aufruft, braucht keine Gratulation mehr. */}
      {erstellt === "1" && (
        <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
          <h2 className="text-xl font-semibold text-slate-950">
            Das steht jetzt für {venture.name ?? "dein Vorhaben"}.
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            Unten siehst du deine Angaben — und oben auf einen Blick, wohin es gehen
            soll. Wenn jemand dazukommt, lässt sich daraus ein Vergleich machen.
          </p>
          {/* EIN WEG UND NICHT ZWEI. Beim Arbeitsprofil steht hier "Weiter:
              Was du aufbauen willst" - dort kommt noch ein Teil. Hier kommt
              keiner mehr, und "Später" neben "Zur Übersicht" waere zweimal
              derselbe Weg mit zwei Namen. */}
          <div className="mt-4">
            <Link
              href="/dashboard"
              className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Zur Übersicht
            </Link>
          </div>
        </section>
      )}

      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {venture.name ?? "Ohne Namen"}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        Was dir bei diesem Vorhaben wichtig ist
      </h1>
      <p className="mt-4 text-slate-700">
        Das ist, was du geantwortet hast — keine Auswertung und keine Punktzahl.
      </p>
      <p className="mt-2 text-sm text-slate-500">{VENTURE_ALIGNMENT.validity}</p>

      {!report ? (
        <p className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
          Hier steht noch nichts.{" "}
          <Link href="/founder-alignment/vorhaben" className="underline">
            Zum Fragebogen
          </Link>
          .
        </p>
      ) : (
        <div className="mt-10">
          <p className="mb-4 text-sm text-slate-500">
            {report.answered} von {report.of} Fragen beantwortet
            {report.submittedAt && (
              <> · abgegeben am {new Date(report.submittedAt).toLocaleDateString("de-DE")}</>
            )}
          </p>
          {/* DAS BILD VOR DER LISTE. Es zeigt dieselben Antworten kompakt -
              wer den Ueberblick hat, liest die Liste anders als jemand, der
              sich durch sechzehn Kaesten arbeitet. */}
          {/* DIE RICHTUNG ZUERST. Wohin es gehen soll, ordnet alles
              darunter - Zusagen und Regeln liest man anders, wenn man das
              Ziel kennt. */}
          <div className="mb-8">
            <VentureDirection
              entries={report.sections.flatMap((group) => group.entries)}
              items={getItemsV22("venture_alignment")}
            />
          </div>

          <div className="mb-8">
            <WorkMap sections={report.sections} />
          </div>

          <ReportViewV21
            sections={report.sections}
            orphans={report.orphans}
            marked={report.marked}
            canMark
            markScope="venture_alignment"
            markVentureId={venture.id}
          />

          <div className="mt-10">
            <ShareForm
              scope="venture_alignment"
              ventureId={venture.id}
              label="Deine Angaben zu diesem Vorhaben"
              recipients={teilen.recipients}
              hiddenByRecipient={teilen.hiddenByRecipient}
              items={getItemsV22("venture_alignment").map((item) => ({
                itemId: item.itemId,
                prompt: withPartner(item.prompt),
              }))}
            />
          </div>
        </div>
      )}
    </main>
  );
}
