import Link from "next/link";
import { redirect } from "next/navigation";
import { ReportViewV21 } from "@/features/instruments/v21/ReportViewV21";
import { getScopeReport } from "@/features/instruments/align/reportData";
import { VENTURE_ALIGNMENT } from "@/features/instruments/align/registries";
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
  searchParams: Promise<{ venture?: string }>;
}) {
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/founder-alignment/vorhaben/antworten")}`);
  }

  const { venture: gewaehlt } = await searchParams;
  const { venture, choices } = await resolveVenture(auth.user.id, gewaehlt);

  if (!venture) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        Testfassung
      </p>
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
          <ReportViewV21 sections={report.sections} />
        </div>
      )}
    </main>
  );
}
