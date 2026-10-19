import { getLocale, getTranslations } from "next-intl/server";

import { buildDeepeningCards, deepeningsOf } from "@/features/modules/deepeningCards";
import { getModuleAdapter } from "@/features/modules/adapters";
import { loadModuleContext } from "@/features/modules/loadModuleContext";
import { DeepeningCards, type DeepeningCardEntry } from "@/features/modules/ui/DeepeningCards";
import type { ModuleStatus, ModuleTeaser } from "@/features/modules/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Die Vertiefungskarten unter einem Core-Bereich des Profils.
 *
 * NEUTRAL, SOLANGE NICHTS REGISTRIERT IST. Gibt es zu diesem Core-Modul keine
 * registrierte Vertiefung, kehrt die Komponente zurueck, BEVOR sie eine Abfrage
 * stellt oder Markup erzeugt - die Seite sieht aus und kostet wie vorher. Das
 * ist der Schalter: Eine Vertiefung zu registrieren (Phase D) schaltet ihre
 * Karte ein, sonst nichts.
 *
 * DIE METADATEN KOMMEN AUS DER REGISTRY (Titel und Zusammenfassung ueber das
 * Sprachbundle `modules`, Ziel aus `renderers.detail`), der Zustand aus dem
 * Adapter des Moduls. Hier steht keine zweite Modulliste.
 */
export async function ProfileDeepenings({
  anchorModuleId,
  userId,
  ventureId,
}: {
  /** Das Core-Modul, an dem die Vertiefungen haengen (`workstyle`, `venture_core`, ...). */
  anchorModuleId: string;
  userId: string;
  /** Das gewaehlte Vorhaben - nur fuer `person_in_venture`. */
  ventureId?: string | null;
}) {
  const defs = deepeningsOf(anchorModuleId);
  if (defs.length === 0) return null;

  const client = await createClient();
  const [t, tModules, tRoot, locale] = await Promise.all([
    getTranslations("profile.founderProfile.deepening"),
    getTranslations("modules"),
    getTranslations(),
    getLocale(),
  ]);
  // Die kurzen Zeilen abgeschlossener Vertiefungen kommen vom Modul selbst; der
  // Uebersetzer gibt ihm die Sprachdatei, ohne dass die Karte den Inhalt kennt.
  const context = await loadModuleContext(client, userId, {
    ventureId: ventureId ?? null,
    translate: (key, values) => tRoot(key as never, values as never),
    locale: locale === "en" ? "en" : "de",
  });

  const user = { id: userId };
  const cards = buildDeepeningCards(defs, (def) => {
    const adapter = getModuleAdapter(def.moduleId);
    if (!adapter) return null;
    try {
      const status: ModuleStatus = adapter.status(user, context);
      const teaser: ModuleTeaser | null = adapter.profileTeaser(user, context);
      return { status, teaser };
    } catch {
      // Nicht lesbar: lieber keine Karte als eine falsche.
      return null;
    }
  });

  const entry = (model: DeepeningCardEntry["model"]): DeepeningCardEntry => ({
    model,
    copy: {
      title: tModules(`${model.moduleId}.title`),
      summary: tModules(`${model.moduleId}.summary`),
      stateLabel: t(`state.${model.state}`),
      cta: t(`cta.${model.state}`),
    },
  });

  return (
    <DeepeningCards
      visible={cards.visible.map((model) => entry(model))}
      more={cards.more.map((model) => entry(model))}
      copy={{ heading: t("heading"), intro: t("intro"), more: t("more") }}
    />
  );
}
