/**
 * Teamraum-Chat (20270318120000): reine Typen und Umformungen - fuer Server und Browser.
 */

export type ChatAttachment = { name: string; type: string; size: number; isImage: boolean };
export type ChatMessage = { id: string; chatId: string; authorUserId: string; body: string; createdAt: string; retracted: boolean; attachment: ChatAttachment | null };
export type ChatReaction = { messageId: string; userId: string; emoji: string };
/** Die feste Auswahl - dieselbe wie advisor_org_chat_reactions_emoji (20270321120000). */
export const REACTIONS = ["👍", "❤️", "😂", "🎉", "🙏", "👀"] as const;
/** Was hochgeladen werden darf - dieselbe Liste wie der Speicher org-chat-files. */
export const ATTACHMENT_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic",
  "application/pdf", "text/plain", "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
/** Ein Dateiname fuer den Speicherpfad: nur sichere Zeichen, Endung bleibt. */
export function safeFileName(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "-").replace(/\.{2,}/g, ".").replace(/-+/g, "-").replace(/^[-.]+/, "").slice(-120);
  return cleaned || "datei";
}
export type ChatSummary = {
  chatId: string;
  kind: "team" | "direct" | "group";
  name: string | null;
  memberCount: number | null;
  createdByUserId: string | null;
  otherUserId: string | null;
  lastMessageAt: string | null;
  lastBody: string | null;
  lastAuthorUserId: string | null;
  unread: number;
  muted: boolean;
};

export function messageOf(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    chatId: row.chat_id as string,
    authorUserId: row.author_user_id as string,
    body: typeof row.body === "string" ? row.body : "",
    createdAt: row.created_at as string,
    retracted: row.retracted_at !== null && row.retracted_at !== undefined,
    attachment:
      typeof row.attachment_path === "string" && row.attachment_path
        ? {
            name: String(row.attachment_name ?? ""),
            type: String(row.attachment_type ?? ""),
            size: Number(row.attachment_size ?? 0),
            isImage: String(row.attachment_type ?? "").startsWith("image/"),
          }
        : null,
  };
}

/** Neue oder geaenderte Nachrichten einsortieren - ohne Doppelte, in zeitlicher Reihenfolge. */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1));
}

/** Tagestrenner: an welchem Index beginnt ein neuer Tag (in der Zeitzone des Browsers)? */
export function dayBreaks(messages: ChatMessage[], dayKey: (iso: string) => string): Set<number> {
  const breaks = new Set<number>();
  messages.forEach((message, index) => {
    if (index === 0 || dayKey(message.createdAt) !== dayKey(messages[index - 1].createdAt)) breaks.add(index);
  });
  return breaks;
}

/** Folgen mehrere Nachrichten derselben Person dicht aufeinander, steht der Name nur ueber der ersten. */
export function startsGroup(messages: ChatMessage[], index: number, gapMinutes = 5): boolean {
  if (index === 0) return true;
  const previous = messages[index - 1];
  const current = messages[index];
  return previous.authorUserId !== current.authorUserId || new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime() > gapMinutes * 60000;
}
