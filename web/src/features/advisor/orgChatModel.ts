/**
 * Teamraum-Chat (20270318120000): reine Typen und Umformungen - fuer Server und Browser.
 */

export type ChatMessage = { id: string; chatId: string; authorUserId: string; body: string; createdAt: string; retracted: boolean };
export type ChatSummary = {
  chatId: string;
  kind: "team" | "direct";
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
