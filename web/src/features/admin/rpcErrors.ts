/**
 * Fehlt die Datenbankfunktion, ist fast immer eine Migration noch nicht
 * eingespielt (neuer Code, alte Datenbank). Das ist etwas anderes als ein
 * Lesefehler und soll auch so aussehen - sonst sucht man den Fehler im Code.
 *
 * PGRST202: PostgREST kennt die Funktion nicht. 42883: Postgres kennt sie nicht.
 */
export function isMissingDatabaseFunction(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return error.code === "PGRST202" || error.code === "42883" || /could not find the function|does not exist/i.test(error.message ?? "");
}
