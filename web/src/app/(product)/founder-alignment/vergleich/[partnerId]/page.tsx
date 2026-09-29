import { redirect } from "next/navigation";
import { ComparisonViewV21 } from "@/features/instruments/v21/ComparisonViewV21";
import { ExpectationGapsView } from "@/features/instruments/v21/ExpectationGapsView";
import { ConversationCardsView } from "@/features/instruments/v21/ConversationCardsView";
import { buildScopeComparison } from "@/features/instruments/align/comparisonData";
import { registryOf } from "@/features/instruments/align/registries";
import { resolveVenture } from "@/features/instruments/align/ventureResolution";
import { getRequestUser } from "@/lib/supabase/server";

/**
 * Zwei Menschen nebeneinander - Arbeitsprofil und Vorhaben getrennt.
 *
 * ---------------------------------------------------------------------------
 * GETRENNT, WEIL DIE GUELTIGKEIT EINE ANDERE IST
 * ---------------------------------------------------------------------------
 *
 * Ein Arbeitsprofil gilt für die Person, eine Zusage für ein Vorhaben und
 * einen Zeitraum. Beides in eine Liste zu werfen hieße, eine Lücke im einen
 * als Aussage im anderen zu lesen.
 *
 * Und was hier weiterhin nicht steht: eine Passungszahl, eine Ampel, ein
 * Prozentwert. Auch keine Stufenzahl mehr - eine Zahl neben zwei Antworten
 * wird zu DER Zahl, über die man spricht.
 */
export default async function AlignComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<{ venture?: string }>;
}) {
  const { partnerId } = await params;
  const { venture: gewaehlt } = await searchParams;

  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(
      `/login?next=${encodeURIComponent(`/founder-alignment/vergleich/${partnerId}`)}`,
    );
  }

  const { venture } = await resolveVenture(auth.user.id, gewaehlt);

  const profil = await buildScopeComparison(
    "founder_profile", auth.user.id, partnerId, null,
  );
  const vorhaben = venture
    ? await buildScopeComparison(
        "venture_alignment", auth.user.id, partnerId, venture.id,
      )
    : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        Testfassung
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">Nebeneinander</h1>
      <p className="mt-4 text-slate-700">
        Eure Antworten nebeneinander — keine Passungszahl, keine Bewertung. Wo ihr
        unterschiedlich geantwortet habt, heißt das nicht, dass etwas nicht passt. Es
        heißt, dass ihr darüber noch nicht gesprochen habt.
      </p>

      {/* DAS VORHABEN ZUERST. Zusagen und Ziele sind konkreter als
          Arbeitspraeferenzen - ueber eine Zahl laesst sich am Dienstag reden. */}
      {vorhaben && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-slate-900">
            {venture?.name ?? "Euer Vorhaben"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {registryOf("venture_alignment").validity}
          </p>

          {!vorhaben.hasAnything ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              Zu diesem Vorhaben hat noch niemand von euch abgegeben. Das heißt nicht,
              dass ihr euch einig seid — es heißt, dass es noch nichts zu vergleichen
              gibt.
            </p>
          ) : (
            <>
              {vorhaben.expectations && (
                <div className="mt-4">
                  <ExpectationGapsView
                    result={vorhaben.expectations}
                    nameA="Du"
                    nameB="Die andere Person"
                  />
                </div>
              )}
              {/* DIE KARTEN VOR DER TABELLE. Wer zuerst die Tabelle sieht,
                  hat schon gedeutet, bevor die Frage danebensteht - und die
                  Karten sind genau dafuer da, das zu verhindern. */}
              <div className="mt-6">
                <h3 className="text-base font-medium text-slate-900">Gesprächskarten</h3>
                <div className="mt-3">
                  <ConversationCardsView cards={vorhaben.cards} />
                </div>
              </div>

              <div className="mt-8">
                <ComparisonViewV21
                  comparison={{
                    sections: vorhaben.sections,
                    agenda: vorhaben.agenda,
                    notShared: [],
                    expectations: vorhaben.expectations ?? { gaps: [], unmatched: [] },
                  }}
                  nameA="Du"
                  nameB="Die andere Person"
                />
              </div>
            </>
          )}
        </section>
      )}

      <section className="mt-16">
        <h2 className="text-lg font-semibold text-slate-900">Wie ihr arbeitet</h2>
        <p className="mt-1 text-sm text-slate-500">
          {registryOf("founder_profile").validity}
        </p>

        {!profil.hasAnything ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
            Zum Arbeitsprofil hat noch niemand von euch abgegeben.
          </p>
        ) : (
          <>
          <div className="mt-6">
            <h3 className="text-base font-medium text-slate-900">Gesprächskarten</h3>
            <div className="mt-3">
              <ConversationCardsView cards={profil.cards} />
            </div>
          </div>

          <div className="mt-8">
            <ComparisonViewV21
              comparison={{
                sections: profil.sections,
                agenda: profil.agenda,
                notShared: [],
                expectations: { gaps: [], unmatched: [] },
              }}
              nameA="Du"
              nameB="Die andere Person"
            />
          </div>
          </>
        )}
      </section>
    </main>
  );
}
