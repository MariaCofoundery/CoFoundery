/**
 * Die Adresse, an die gerade ein Code geschickt wurde.
 *
 * Sie steht in einem kurzlebigen Cookie und NICHT in der Adresszeile: Ein
 * `?email=` landet im Verlauf des Browsers, in geteilten Links und in jedem
 * Referrer. Der Zweck ist bescheiden - das Codefeld soll nach dem Absenden
 * wissen, wen es fragt, damit niemand seine Adresse zweimal tippt.
 *
 * httpOnly, weil kein Skript sie braucht: Die Seite liest das Cookie auf dem
 * Server und reicht die Adresse an das Formular weiter.
 *
 * Die Laufzeit entspricht der Gueltigkeit des Codes (eine Stunde, siehe
 * `otp_expiry` in supabase/config.toml). Kuerzer waere schlechter: Das Feld
 * verschwaende sonst, waehrend der Code noch gilt.
 */
export const PENDING_EMAIL_COOKIE = "cofoundery_pending_email";
export const PENDING_EMAIL_MAX_AGE = 60 * 60;
