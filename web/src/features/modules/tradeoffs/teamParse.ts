/**
 * Liest die Antworten der beiden Team-RPCs von „Werte & Zielkonflikte" - rein, ohne Netz.
 *
 * DIE DATENBANK ENTSCHEIDET. Ob der gemeinsame Vergleich bereit ist, steht nur
 * in `get_tradeoffs_team_readiness`; hier wird nichts zusammengesetzt. Ein
 * unbekanntes oder beschaedigtes Format ist `null` - nie „bereit".
 *
 * Ueber andere Personen kennt die Bereitschaft nur das Gesamtergebnis. Der Typ
 * hat deshalb keine Felder fuer Namen, Zaehler oder Versionen anderer.
 */
export type TradeoffsOwnState = "not_started" | "in_progress" | "completed";

export type TradeoffsReadiness = {
  /** `ready`: alle aktuellen Mitglieder haben abgegeben UND ihren Durchlauf freigegeben. */
  status: "ready" | "missing";
  own: {
    state: TradeoffsOwnState;
    /** Gibt es einen aktiven Share dieser Person? (Er bestimmt den Team-Stand - nicht der neueste private Durchlauf.) */
    shared: boolean;
    /** Der neueste abgegebene Durchlauf - das, was die Person als Naechstes freigeben koennte. */
    assessmentId: string | null;
    /** Der Durchlauf, der gerade aktiv geteilt ist - kann aelter sein als `assessmentId`. */
    sharedAssessmentId: string | null;
  };
};

export type TradeoffsComparisonPerson = {
  personId: string;
  name: string;
  isViewer: boolean;
  answers: { item_key: string; value: Record<string, unknown> | null; missing_reason: string | null }[];
};

export type TradeoffsComparison =
  | { status: "not_ready" }
  | { status: "ready"; people: TradeoffsComparisonPerson[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseTradeoffsReadiness(data: unknown): TradeoffsReadiness | null {
  if (!isRecord(data) || !isRecord(data.own)) return null;
  const { status, own } = data;
  if (status !== "ready" && status !== "missing") return null;
  const state = own.state;
  if (state !== "not_started" && state !== "in_progress" && state !== "completed") return null;
  const assessmentId = typeof own.assessment_id === "string" ? own.assessment_id : null;
  const sharedAssessmentId = typeof own.shared_assessment_id === "string" ? own.shared_assessment_id : null;
  return { status, own: { state, shared: own.shared === true, assessmentId, sharedAssessmentId } };
}

export function parseTradeoffsComparison(data: unknown): TradeoffsComparison | null {
  if (!isRecord(data)) return null;
  if (data.status === "not_ready") return { status: "not_ready" };
  if (data.status !== "ready" || !Array.isArray(data.people)) return null;
  const people: TradeoffsComparisonPerson[] = [];
  for (const entry of data.people) {
    if (!isRecord(entry) || typeof entry.person_id !== "string" || !Array.isArray(entry.answers)) return null;
    people.push({
      personId: entry.person_id,
      name: typeof entry.name === "string" && entry.name ? entry.name : "Founder",
      isViewer: entry.is_viewer === true,
      answers: entry.answers.filter(isRecord).map((answer) => ({
        item_key: String(answer.item_key ?? ""),
        value: isRecord(answer.value) ? answer.value : null,
        missing_reason: typeof answer.missing_reason === "string" ? answer.missing_reason : null,
      })),
    });
  }
  // Ein Vergleich mit weniger als zwei Personen ist keiner.
  return people.length >= 2 ? { status: "ready", people } : null;
}

/**
 * Welche Lage die Karte „Gemeinsam vertiefen" zeigt - aus der EIGENEN Lage und dem Gesamtergebnis.
 *
 * Nach einem Widerruf ist `own.shared` falsch und der Vergleich nicht mehr bereit: Die Karte faellt
 * auf `completed` zurueck und bietet die Freigabe wieder an. Ueber andere Personen kennt sie nichts.
 */
export type TradeoffsCardState = "not_started" | "in_progress" | "completed" | "shared_missing" | "ready";

export function tradeoffsCardState(readiness: TradeoffsReadiness): TradeoffsCardState {
  const { own } = readiness;
  if (own.state === "not_started") return "not_started";
  if (own.state === "in_progress" && !own.shared) return "in_progress";
  if (!own.shared) return "completed";
  return readiness.status === "ready" ? "ready" : "shared_missing";
}
