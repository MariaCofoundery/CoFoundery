import { alignmentDisplayText } from "@/features/instruments/align/display";
import { statusFromAssessmentRows } from "@/features/modules/adapters/shared";
import { VENTURE_TRADEOFFS_MODULE } from "@/features/modules/definitions";
import { readTradeoffs } from "@/features/modules/tradeoffs/readout";
import { tradeoffItems } from "@/features/modules/tradeoffs/registry";
import {
  ModuleContextError,
  type ModuleAdapter,
  type ModuleContext,
  type ModuleStatus,
} from "@/features/modules/types";

/**
 * Werte & Zielkonflikte - der Adapter des ersten nativen Moduls.
 *
 * QUELLE DER WAHRHEIT: `assessments` je Vorhaben und `venture-tradeoffs-v1`.
 * `done_for_now` heisst: je abgegeben - auch wenn danach ein neuer Durchlauf
 * (Update-Entwurf) begonnen wurde. Die Datenbank laesst die Abgabe nur zu, wenn
 * alle vier Situationen beantwortet sind.
 *
 * PRIVAT. Es gibt keinen Freigabevertrag: `shareState` ist `none`. Eine
 * Freigabe, Readiness und ein Teamvergleich folgen mit Phase E.
 *
 * Die Lesbarmachung ist dieselbe wie auf der Detailseite (`readTradeoffs`):
 * nur gewaehlte Wege - keine Charakterisierung.
 */
function requireVenture(context: ModuleContext): string {
  if (!context.ventureId) throw new ModuleContextError("module_context_missing_venture");
  return context.ventureId;
}

function statusOf(context: ModuleContext): ModuleStatus {
  return statusFromAssessmentRows(
    context.tradeoffsAssessments,
    requireVenture(context),
    VENTURE_TRADEOFFS_MODULE.moduleId
  );
}

/**
 * Hoechstens zwei kurze Zeilen fuer das Profil - die ersten beiden Situationen.
 * Die uebrigen stehen im Detail. Ohne Uebersetzer oder Antworten: keine Zeilen.
 */
function teaserLines(context: ModuleContext): string[] | undefined {
  const { translate, tradeoffsAnswers } = context;
  if (!translate || !tradeoffsAnswers) return undefined;
  const locale = context.locale ?? "de";

  const items = tradeoffItems();
  return readTradeoffs(items, tradeoffsAnswers)
    .slice(0, 2)
    .map((readout) => {
      const situation = translate(`ventureTradeoffs.situations.${readout.itemId}`);
      const statement = readout.statements.find((entry) => entry.kind === "path");
      return statement && statement.kind === "path"
        ? translate("ventureTradeoffs.teaser.path", {
            situation,
            path: alignmentDisplayText(statement.path, locale),
          })
        : translate("ventureTradeoffs.teaser.open", { situation });
    });
}

export const ventureTradeoffsAdapter: ModuleAdapter = {
  describe: () => VENTURE_TRADEOFFS_MODULE,

  status: (_user, context) => statusOf(context),

  profileTeaser(_user, context) {
    const ventureId = requireVenture(context);
    const done = statusOf(context).state === "done_for_now";
    const lines = done ? teaserLines(context) : undefined;
    return {
      // Das Ziel kommt aus der Registry; das Vorhaben haengt als Parameter dran.
      href: `${VENTURE_TRADEOFFS_MODULE.renderers.detail}?venture=${encodeURIComponent(ventureId)}`,
      hasContent: done,
      ...(lines ? { lines } : {}),
    };
  },

  shareState: () => ({ contract: "none" }),
};
