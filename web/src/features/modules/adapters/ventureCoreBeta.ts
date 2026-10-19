import { statusFromAssessmentRows } from "@/features/modules/adapters/shared";
import { VENTURE_CORE_BETA_MODULE } from "@/features/modules/definitions";
import {
  ModuleContextError,
  type ModuleAdapter,
  type ModuleContext,
  type ModuleStatus,
} from "@/features/modules/types";
import { answerContextFor } from "@/features/modules/ventureBeta/answerContext";
import { answerText } from "@/features/modules/ventureBeta/answerText";
import { parseAnswer } from "@/features/modules/ventureBeta/compare";
import { findBetaItem } from "@/features/modules/ventureBeta/registry";

/**
 * Venture Alignment (Beta) - der Adapter des zweiten nativen Moduls.
 *
 * QUELLE DER WAHRHEIT: `assessments` je Vorhaben und `venture-alignment-v2-beta1`. `done_for_now`
 * heisst: je abgegeben - auch wenn danach ein neuer Durchlauf begonnen wurde.
 *
 * PRIVAT, BIS DIE PERSON FREIGIBT. `shareState` meldet die Freigabe EINES Durchlaufs
 * (`assessment_share`) - von der Datenbank gelesen, nie zusammengesetzt. Abgeben teilt nichts.
 *
 * Er liest nur: kein Schreiben, keine Freigabe. Er ersetzt den Adapter von `venture_core` (v1) nicht.
 */
function requireVenture(context: ModuleContext): string {
  if (!context.ventureId) throw new ModuleContextError("module_context_missing_venture");
  return context.ventureId;
}

function statusOf(context: ModuleContext): ModuleStatus {
  return statusFromAssessmentRows(context.betaAssessments, requireVenture(context), VENTURE_CORE_BETA_MODULE.moduleId);
}

/** Hoechstens zwei kurze Zeilen fuers Profil: das Zukunftsbild und der geplante Einsatz. */
function teaserLines(context: ModuleContext): string[] | undefined {
  const { translate, betaAnswers } = context;
  if (!translate || !betaAnswers) return undefined;
  const ctx = answerContextFor(context.locale ?? "de");
  return ["Z01", "C01"]
    .map((itemId) => {
      const item = findBetaItem(itemId);
      const row = betaAnswers.find((candidate) => candidate.block_id === itemId);
      if (!item || !row) return null;
      const text = answerText(item, parseAnswer({ value: row.value, missing_reason: row.missing_code }), ctx);
      return text ? translate(`ventureBeta.summary.${itemId}`, { answer: text }) : null;
    })
    .filter((line): line is string => line !== null);
}

export const ventureCoreBetaAdapter: ModuleAdapter = {
  describe: () => VENTURE_CORE_BETA_MODULE,

  status: (_user, context) => statusOf(context),

  profileTeaser(_user, context) {
    const ventureId = requireVenture(context);
    const done = statusOf(context).state === "done_for_now";
    const lines = done ? teaserLines(context) : undefined;
    return {
      href: `${VENTURE_CORE_BETA_MODULE.renderers.detail}?venture=${encodeURIComponent(ventureId)}`,
      hasContent: done,
      ...(lines ? { lines } : {}),
    };
  },

  // Die Datenbank sagt, ob es einen aktiven Share gibt; ohne Auskunft gilt: nicht geteilt.
  shareState: (_user, context) => ({
    contract: "assessment_share",
    assessmentId: context.betaReadiness?.own.assessmentId ?? null,
    active: context.betaReadiness?.own.shared === true,
  }),
};
