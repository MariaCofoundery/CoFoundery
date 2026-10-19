import { TAKEOVER_ELIGIBLE, translateV1Value } from "@/features/modules/ventureBeta/takeover";

/** Eine Antwortzeile der Beta (oder, vor der Uebernahme, einer v1-Antwort in Beta-IDs). */
export type BetaAnswerRow = {
  block_id: string;
  answer_format: string;
  value: Record<string, unknown> | null;
  missing_code: string | null;
};

/** Die uebernahmefaehigen v1-Antworten eines v1-Durchlaufs - nur identische Items, nur Antworten (keine Auslassungen). */
export function takeoverRowsFrom(v1Rows: readonly BetaAnswerRow[]): BetaAnswerRow[] {
  const rows: BetaAnswerRow[] = [];
  for (const [betaId, v1Id] of TAKEOVER_ELIGIBLE) {
    const row = v1Rows.find((candidate) => candidate.block_id === v1Id);
    // Eine Auslassung („habe ich noch nicht entschieden“) ist keine Antwort, die man mitnimmt.
    if (!row || row.value === null) continue;
    rows.push({ block_id: betaId, answer_format: row.answer_format, value: translateV1Value(betaId, row.value), missing_code: null });
  }
  return rows;
}

