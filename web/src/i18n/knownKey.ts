/**
 * Nimmt einen Query-Parameter nur an, wenn er ein bekannter Textschluessel ist.
 *
 * Der Grund: Seiten setzen ihre Rueckmeldungen ueber die URL
 * (`?saved=…`, `?error=…`) und geben den Wert an `t()`. Ein erfundener Wert
 * landet dann als roher Schluesselpfad auf der Seite - `next-intl` wirft bei
 * einem fehlenden Schluessel nicht, es loggt einen IntlError und rendert den
 * Pfad selbst. Also kein Absturz, aber "connect.errors.abc" mitten im
 * Meldungsband.
 *
 * Das wurde bisher pro Seite einzeln geloest, und deshalb an acht Stellen
 * gar nicht. Eine Funktion, ein Muster:
 *
 *   const errorKey = knownKey(params.error, CONNECT_ERROR_KEYS);
 *
 * Die Schluesselliste bleibt bewusst beim Aufrufer und wird nicht aus der
 * Nachrichtendatei abgeleitet: Nicht jeder vorhandene Schluessel gehoert auf
 * jede Seite, und eine Liste im Code ist die Stelle, an der auffaellt, dass
 * eine Aktion einen neuen Wert setzt.
 */
export function knownKey<TKey extends string>(
  value: string | undefined | null,
  allowed: readonly TKey[]
): TKey | null {
  const candidate = (value ?? "").trim();
  return (allowed as readonly string[]).includes(candidate) ? (candidate as TKey) : null;
}
