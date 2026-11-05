import "server-only";

import { programStorageClient } from "@/features/advisor/programPageStorage";

/**
 * Anhaenge im Teamraum-Chat liegen im privaten Speicher `org-chat-files` (20270321120000). Er hat keine
 * Policies: Geschrieben und gelesen wird nur mit dem Dienstschluessel - und nur, nachdem die Datenbank
 * gesagt hat, dass die Person den Chat beschreiben (can_write_org_chat) bzw. die Nachricht lesen darf
 * (Zeilensicherheit). Pfad: <person>/<organisation>/<chat>/<datei> - die Kontoloeschung findet so die
 * eigenen Dateien.
 */
export const ORG_CHAT_BUCKET = "org-chat-files";
export const orgChatStorageClient = programStorageClient;
