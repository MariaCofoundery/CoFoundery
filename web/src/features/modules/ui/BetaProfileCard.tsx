import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { getModuleAdapter } from "@/features/modules/adapters";
import type { AssessmentRow, ModuleContext } from "@/features/modules/types";
import { loadBetaPageState } from "@/features/modules/ventureBeta/data";
import { loadBetaReadiness } from "@/features/modules/ventureBeta/teamData";
import { VENTURE_ALIGNMENT_BETA_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { createClient } from "@/lib/supabase/server";

/**
 * Venture Alignment (Beta) im Profil - unter „So willst du gründen", vor den Vertiefungen.
 *
 * Nur fuer freigeschaltete Konten (`enabled`); sonst gibt es sie nicht, und nichts wird gelesen. Die
 * Beta ersetzt die bisherigen Antworten nicht - die Karte ist ein Angebot zum Ausprobieren. Zustand und
 * Kurzzeilen kommen vom Adapter des Moduls (`venture_core_beta`).
 *
 * Drei Zustaende, keiner eine Luecke: Angebot, begonnen, abgeschlossen. Keine Prozentzahl, kein
 * „x von y", kein Balken.
 */
export async function BetaProfileCard({
  userId,
  ventureId,
}: {
  userId: string;
  ventureId: string | null;
}) {
  if (!ventureId) return null;

  const client = await createClient();
  const [t, tModules, tRoot, localeRaw, state, readiness] = await Promise.all([
    getTranslations("ventureBeta"),
    getTranslations("modules"),
    getTranslations(),
    getLocale(),
    loadBetaPageState(client, userId, ventureId),
    loadBetaReadiness(client, ventureId),
  ]);
  const adapter = getModuleAdapter("venture_core_beta");
  if (!adapter) return null;

  const rows: AssessmentRow[] = [
    ...(state.draft
      ? [{ id: state.draft.id, instrument_id: VENTURE_ALIGNMENT_BETA_INSTRUMENT_ID, venture_id: ventureId, submitted_at: null, created_at: null }]
      : []),
    ...(state.submitted
      ? [{ id: state.submitted.id, instrument_id: VENTURE_ALIGNMENT_BETA_INSTRUMENT_ID, venture_id: ventureId, submitted_at: state.submitted.submittedAt, created_at: state.submitted.submittedAt }]
      : []),
  ];
  const context: ModuleContext = {
    ventureId,
    betaAssessments: rows,
    betaAnswers: state.submitted?.answers ?? [],
    betaReadiness: readiness,
    translate: (key, values) => tRoot(key as never, values as never),
    locale: localeRaw === "en" ? "en" : "de",
  };

  let moduleState: "not_started" | "in_progress" | "done_for_now";
  let lines: readonly string[] = [];
  let href = `/founder-alignment/vorhaben/beta?venture=${encodeURIComponent(ventureId)}`;
  try {
    moduleState = adapter.status({ id: userId }, context).state;
    const teaser = adapter.profileTeaser({ id: userId }, context);
    lines = moduleState === "done_for_now" ? (teaser?.lines ?? []).slice(0, 2) : [];
    href = teaser?.href ?? href;
  } catch {
    // Nicht lesbar: lieber keine Karte als eine falsche.
    return null;
  }

  const label =
    moduleState === "done_for_now" ? t("profile.completed") : moduleState === "in_progress" ? t("profile.in_progress") : t("profile.not_started");
  const cta = moduleState === "done_for_now" ? t("profile.view") : moduleState === "in_progress" ? t("profile.continue") : t("profile.start");

  return (
    <section className="no-print mt-6" aria-labelledby="beta-profile-card-title" data-beta-card={moduleState}>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
          <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] normal-case tracking-normal text-slate-600">{t("badge")}</span>
        </p>
        <h3 id="beta-profile-card-title" className="mt-1.5 text-sm font-semibold text-slate-900">
          {tModules("venture_core_beta.title")}
        </h3>
        {lines.length > 0 ? (
          <ul className="mt-1.5 space-y-1">
            {lines.map((line) => (
              <li key={line} className="text-sm leading-6 text-slate-700">
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-sm leading-6 text-slate-600">{tModules("venture_core_beta.summary")}</p>
        )}
        <Link href={href} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-slate-700 underline underline-offset-2">
          {cta}
        </Link>
      </div>
    </section>
  );
}
