/**
 * Wann ein Zeitplanlauf Bescheid sagen soll, und was in der Mail steht.
 *
 * WARUM: Vercel Cron zeigt einen Fehlschlag nur im Protokoll. Der Löschlauf ist
 * ein Versprechen aus der Datenschutzerklärung; scheitert er, soll das nicht
 * erst beim nächsten Blick ins Protokoll auffallen.
 *
 * ALARM NUR FÜR BERECHTIGTE AUFRUFE. Ein 401 oder ein fehlendes Geheimnis
 * (503 `cron_secret_not_configured`) kann jeder aus dem Netz auslösen - das darf
 * keine Mail kosten. Alarm gibt es nur, wenn der Aufruf echt war und die Arbeit
 * trotzdem scheiterte: 500 oder 503 `missing_service_role`.
 *
 * DIE MAIL NENNT NUR LAUF, STATUS UND SCHRITTE. Keine Zahlen von Personen, keine
 * IDs, keine Fehlertexte der Datenbank.
 */

export type CronJobName = "privacy-retention" | "connect-suggestions";

type AlertBody = { ok?: boolean; reason?: string } & Record<string, unknown>;

export function cronAlertNeeded(status: number, body: AlertBody): boolean {
  if (status === 500) return true;
  return status === 503 && body.reason === "missing_service_role";
}

const STEP_KEYS = ["researchCleanup", "eventCleanup", "operationalCleanup"] as const;

export function buildCronAlertPayload(job: CronJobName, status: number, body: AlertBody) {
  const steps = STEP_KEYS.filter((key) => key in body).map((key) => `- ${key}: ${String(body[key])}`);
  const lines = [
    `Der geplante Lauf „${job}“ ist fehlgeschlagen.`,
    "",
    `HTTP-Status: ${status}`,
    ...(typeof body.reason === "string" ? [`Grund: ${body.reason}`] : []),
    ...(steps.length ? ["", "Schritte:", ...steps] : []),
    "",
    "Nächster Schritt: Vercel, Logs, Filter auf den Pfad dieses Laufs. Bei „missing_service_role“ fehlt SUPABASE_SERVICE_ROLE_KEY in Production.",
    "Der Lauf wiederholt sich nach Zeitplan; bis er gelingt, wird für diesen Lauf nichts gelöscht bzw. versendet.",
  ];
  return { subject: `Zeitplanlauf fehlgeschlagen: ${job}`, text: lines.join("\n") };
}
