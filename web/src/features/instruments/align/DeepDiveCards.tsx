import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { deepDiveLinks } from "@/features/instruments/align/deepDive";
import type { AssessmentScope } from "@/features/instruments/align/registries";

/**
 * Der Weg aus dem Vergleich heraus.
 *
 * ---------------------------------------------------------------------------
 * HIER ENDET DER BERICHT UND ETWAS ANDERES FÄNGT AN
 * ---------------------------------------------------------------------------
 *
 * Ein Vergleich sagt, worüber zu sprechen ist. Eine Vereinbarung entsteht
 * woanders - im Founder-Setup, wo sie einen Stand, eine Fassung und eine
 * Bestätigung von beiden bekommt. Diese Karten sind die Tür dazwischen.
 *
 * Sie SCHREIBEN NICHTS. Kein Thema wird eröffnet, keine Notiz vorbelegt, kein
 * Status gesetzt. Eine Notiz aus einem Zweiervergleich landete sonst in einem
 * Thema, das dem ganzen Team gehört - und wer zu dritt ist, hätte damit
 * Antworten an jemanden weitergegeben, dem sie niemand freigegeben hat.
 *
 * ---------------------------------------------------------------------------
 * DIE TITEL KOMMEN AUS DEM SETUP, NICHT VON HIER
 * ---------------------------------------------------------------------------
 *
 * Sonst hieße dasselbe Thema an zwei Stellen verschieden, und niemand wüsste,
 * ob das zwei Themen sind.
 */
export async function DeepDiveCards({
  scope,
  teamId,
  teamContext,
}: {
  scope: AssessmentScope;
  teamId: string;
  teamContext: "pre_founder" | "existing_team";
}) {
  const t = await getTranslations("teams.setup");
  const links = deepDiveLinks(scope, teamContext);

  if (links.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
      <h2 className="text-base font-semibold text-slate-900">Und dann?</h2>
      <p className="mt-1 text-sm text-slate-600">
        Dieser Vergleich ist keine Vereinbarung — er sagt nur, worüber ihr sprechen
        könnt. Festhalten könnt ihr das im Founder-Setup: Dort bekommt jedes Thema
        einen Stand und eine Bestätigung von euch beiden.
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.itemKey}>
            <Link
              href={`/teams/${encodeURIComponent(teamId)}/setup/${link.itemKey}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]"
            >
              <span className="block text-sm font-medium text-slate-900">
                {t(`items.${link.itemKey}.title`)}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">
                {t(`items.${link.itemKey}.question`)}
              </span>
              {/* Woher die Karte kommt - sonst steht sie da, als haetten wir
                  sie geraten. */}
              <span className="mt-2 block text-[11px] text-slate-500">
                aus {link.sections.join(", ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
