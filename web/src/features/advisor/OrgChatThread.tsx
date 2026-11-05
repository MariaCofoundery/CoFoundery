"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { DictationButton, DictationMessage, useDictationCopy } from "@/features/dictation/DictationControls";
import { useDictation } from "@/features/dictation/useDictation";
import { UserText } from "@/features/ui/UserText";
import { markOrgChatRead, prepareOrgChatUpload, retractOrgChatMessage, sendOrgChatMessage, toggleOrgChatReaction } from "@/features/advisor/orgChatActions";
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_TYPES,
  REACTIONS,
  dayBreaks,
  mergeMessages,
  messageOf,
  startsGroup,
  type ChatMessage,
  type ChatReaction,
} from "@/features/advisor/orgChatModel";

/**
 * Ein Gespraech im Teamraum-Chat (20270318120000, Stufe 2: 20270321120000) - fuer das Telefon gebaut:
 * Nachrichten unten, eigene rechts, Eingabe unten fest. Neue Nachrichten und Reaktionen kommen per
 * Echtzeit; steht die Verbindung nicht, fragt die Seite alle 15 Sekunden nach. Die Zeilensicherheit gilt
 * fuer beide Wege. Anhaenge laedt der Browser direkt in den privaten Speicher (Erlaubnis vom Server),
 * angezeigt werden sie ueber /api/org-chat-file, das vorher prueft, ob man die Nachricht lesen darf.
 */

const TONES = ["bg-violet-100 text-violet-800", "bg-teal-100 text-teal-800", "bg-pink-100 text-pink-800", "bg-sky-100 text-sky-800", "bg-amber-100 text-amber-900", "bg-emerald-100 text-emerald-800"];
const toneOf = (userId: string) => TONES[[...userId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONES.length];
const MESSAGE_COLUMNS = "id, chat_id, author_user_id, body, created_at, retracted_at, attachment_path, attachment_name, attachment_type, attachment_size";
const BUCKET = "org-chat-files";

function sizeLabel(bytes: number, locale: string) {
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return bytes >= 1024 * 1024 ? `${format.format(bytes / (1024 * 1024))} MB` : `${format.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

export function OrgChatThread({
  chatId,
  me,
  names,
  initialMessages,
  initialReactions,
  canWrite,
  isDirect,
}: {
  chatId: string;
  me: string;
  names: Record<string, string>;
  initialMessages: ChatMessage[];
  initialReactions: ChatReaction[];
  canWrite: boolean;
  isDirect: boolean;
}) {
  const t = useTranslations("advisor.chat");
  const locale = useLocale();
  const copy = useDictationCopy();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [reactions, setReactions] = useState<ChatReaction[]>(initialReactions);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const nearBottom = useRef(true);
  const supabase = useMemo(() => createClient(), []);
  const dictation = useDictation({ value: draft, onChange: setDraft, locale, copy });

  // Echtzeit: Nachrichten (neu, zurueckgenommen) und Reaktionen. Reaktionen werden bei jedem Ereignis
  // neu gelesen - so zaehlt immer, was die Zeilensicherheit herausgibt, nicht was im Ereignis stand.
  useEffect(() => {
    const reloadReactions = async () => {
      const { data } = await supabase.from("advisor_org_chat_reactions").select("message_id, user_id, emoji").eq("chat_id", chatId).limit(2000);
      if (Array.isArray(data)) setReactions((data as { message_id: string; user_id: string; emoji: string }[]).map((row) => ({ messageId: row.message_id, userId: row.user_id, emoji: row.emoji })));
    };
    const channel = supabase
      .channel(`org-chat-${chatId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "advisor_org_chat_messages", filter: `chat_id=eq.${chatId}` }, (payload) => {
        if (payload.new && typeof payload.new === "object" && "id" in payload.new) {
          setMessages((current) => mergeMessages(current, [messageOf(payload.new as Record<string, unknown>)]));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "advisor_org_chat_reactions", filter: `chat_id=eq.${chatId}` }, () => {
        void reloadReactions();
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, chatId]);

  // Ohne Echtzeit: nachfragen.
  useEffect(() => {
    if (live) return;
    const timer = window.setInterval(async () => {
      const [{ data }, { data: reactionRows }] = await Promise.all([
        supabase.from("advisor_org_chat_messages").select(MESSAGE_COLUMNS).eq("chat_id", chatId).order("created_at", { ascending: false }).limit(50),
        supabase.from("advisor_org_chat_reactions").select("message_id, user_id, emoji").eq("chat_id", chatId).limit(2000),
      ]);
      if (Array.isArray(data)) setMessages((current) => mergeMessages(current, (data as Record<string, unknown>[]).map(messageOf)));
      if (Array.isArray(reactionRows)) setReactions((reactionRows as { message_id: string; user_id: string; emoji: string }[]).map((row) => ({ messageId: row.message_id, userId: row.user_id, emoji: row.emoji })));
    }, 15000);
    return () => window.clearInterval(timer);
  }, [live, supabase, chatId]);

  // Unten bleiben, wenn man unten war; gelesen melden, wenn etwas dazukommt.
  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    const box = scroller.current;
    if (box && nearBottom.current) box.scrollTop = box.scrollHeight;
    if (document.visibilityState === "visible") void markOrgChatRead(chatId);
  }, [lastId, chatId]);

  function pickFile(next: File | null) {
    setError(null);
    if (!next) return setFile(null);
    if (!(ATTACHMENT_TYPES as readonly string[]).includes(next.type)) return setError(t("errorFileType"));
    if (next.size > ATTACHMENT_MAX_BYTES) return setError(t("errorFileSize"));
    setFile(next);
  }

  async function send() {
    const text = draft.trim();
    if ((!text && !file) || sending) return;
    setSending(true);
    setError(null);
    if (dictation.active) dictation.toggle();
    let uploaded: { path: string; name: string; type: string; size: number } | null = null;
    if (file) {
      const ticket = await prepareOrgChatUpload(chatId, file.name, file.type, file.size);
      if (!ticket.ok) {
        setSending(false);
        setError(t(ticket.reason === "type" ? "errorFileType" : ticket.reason === "size" ? "errorFileSize" : "errorSend"));
        return;
      }
      const { error: uploadError } = await supabase.storage.from(BUCKET).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (uploadError) {
        setSending(false);
        setError(t("errorUpload"));
        return;
      }
      uploaded = { path: ticket.path, name: file.name, type: file.type, size: file.size };
    }
    const result = await sendOrgChatMessage(chatId, text, uploaded);
    setSending(false);
    if (!result.ok) {
      setError(t(result.reason === "member" ? "errorMember" : "errorSend"));
      return;
    }
    setDraft("");
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    nearBottom.current = true;
    // Falls die Echtzeit gerade hakt: die eigene Nachricht direkt holen.
    const { data } = await supabase.from("advisor_org_chat_messages").select(MESSAGE_COLUMNS).eq("id", result.id).maybeSingle();
    if (data) setMessages((current) => mergeMessages(current, [messageOf(data as Record<string, unknown>)]));
  }

  async function retract(id: string) {
    setSelected(null);
    if (await retractOrgChatMessage(id)) setMessages((current) => current.map((message) => (message.id === id ? { ...message, body: "", retracted: true, attachment: null } : message)));
  }

  async function react(messageId: string, emoji: string) {
    setSelected(null);
    // Sofort zeigen, dann bestaetigen lassen.
    setReactions((current) =>
      current.some((reaction) => reaction.messageId === messageId && reaction.userId === me && reaction.emoji === emoji)
        ? current.filter((reaction) => !(reaction.messageId === messageId && reaction.userId === me && reaction.emoji === emoji))
        : [...current, { messageId, userId: me, emoji }],
    );
    await toggleOrgChatReaction(messageId, emoji);
  }

  const dayFormat = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  const dayKey = (iso: string) => new Date(iso).toDateString();
  const timeFormat = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  const breaks = dayBreaks(messages, dayKey);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        onScroll={(event) => {
          const box = event.currentTarget;
          nearBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
        }}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5"
        aria-live="polite"
        aria-label={t("messagesLabel")}
      >
        {messages.length === 0 ? <p className="mx-auto mt-10 max-w-sm text-center text-sm leading-6 text-slate-500">{isDirect ? t("emptyDirect") : t("emptyTeam")}</p> : null}
        <ol className="grid gap-1">
          {messages.map((message, index) => {
            const mine = message.authorUserId === me;
            const name = names[message.authorUserId] ?? t("formerMember");
            const first = startsGroup(messages, index);
            const counts = REACTIONS.map((emoji) => ({
              emoji,
              count: reactions.filter((reaction) => reaction.messageId === message.id && reaction.emoji === emoji).length,
              mineToo: reactions.some((reaction) => reaction.messageId === message.id && reaction.emoji === emoji && reaction.userId === me),
            })).filter((entry) => entry.count > 0);
            return (
              <li key={message.id} className="grid">
                {breaks.has(index) ? (
                  <p className="my-3 justify-self-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{dayFormat.format(new Date(message.createdAt))}</p>
                ) : null}
                <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${first ? "mt-2" : ""}`}>
                  {!mine && !isDirect ? (
                    first ? (
                      <span aria-hidden="true" className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${toneOf(message.authorUserId)}`}>{(name.trim()[0] ?? "?").toUpperCase()}</span>
                    ) : (
                      <span className="w-7 shrink-0" />
                    )
                  ) : null}
                  <div className={`grid max-w-[85vw] gap-1 sm:max-w-md ${mine ? "justify-items-end" : "justify-items-start"}`}>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={selected === message.id}
                      onClick={() => setSelected(!message.retracted && canWrite ? (selected === message.id ? null : message.id) : null)}
                      onKeyDown={(event) => {
                        if ((event.key === "Enter" || event.key === " ") && !message.retracted && canWrite) {
                          event.preventDefault();
                          setSelected(selected === message.id ? null : message.id);
                        }
                      }}
                      className={`rounded-2xl px-3.5 py-2 text-left text-[15px] leading-6 shadow-sm ${
                        message.retracted
                          ? "border border-dashed border-slate-300 bg-white italic text-slate-400"
                          : mine
                            ? "rounded-br-md bg-violet-600 text-white"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      {!mine && !isDirect && first ? <span className="block text-xs font-semibold text-violet-700">{name}</span> : null}
                      {message.attachment && !message.retracted ? (
                        message.attachment.isImage ? (
                          <a href={`/api/org-chat-file/${message.id}`} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="mt-1 block">
                            {/* eslint-disable-next-line @next/next/no-img-element -- privater Speicher, geprueft ueber die eigene Route */}
                            <img src={`/api/org-chat-file/${message.id}`} alt={message.attachment.name} loading="lazy" className="max-h-72 rounded-xl object-cover" />
                          </a>
                        ) : (
                          <a
                            href={`/api/org-chat-file/${message.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className={`mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${mine ? "bg-violet-500/60 text-white" : "bg-slate-100 text-slate-800"}`}
                          >
                            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{message.attachment.name}</span>
                              <span className="block text-xs opacity-80">{sizeLabel(message.attachment.size, locale)}</span>
                            </span>
                          </a>
                        )
                      ) : null}
                      {message.retracted ? t("retracted") : message.body ? <span className="block whitespace-pre-line break-words"><UserText text={message.body} /></span> : null}
                      <span className={`mt-0.5 block text-right text-[11px] ${mine && !message.retracted ? "text-violet-100" : "text-slate-400"}`}>{timeFormat.format(new Date(message.createdAt))}</span>
                    </div>
                    {counts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {counts.map((entry) => (
                          <button
                            key={entry.emoji}
                            type="button"
                            disabled={!canWrite}
                            onClick={() => void react(message.id, entry.emoji)}
                            aria-pressed={entry.mineToo}
                            aria-label={t("reactionCount", { emoji: entry.emoji, count: entry.count })}
                            className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2 text-xs ${entry.mineToo ? "border-violet-300 bg-violet-50 font-semibold text-violet-900" : "border-slate-200 bg-white text-slate-700"}`}
                          >
                            <span aria-hidden="true">{entry.emoji}</span>
                            {entry.count}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {selected === message.id ? (
                      <div className="flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-1 shadow-md">
                        {REACTIONS.map((emoji) => (
                          <button key={emoji} type="button" onClick={() => void react(message.id, emoji)} aria-label={t("react", { emoji })} className="grid h-9 w-9 place-items-center rounded-full text-lg hover:bg-slate-100">
                            {emoji}
                          </button>
                        ))}
                        {mine ? (
                          <button type="button" onClick={() => void retract(message.id)} className="ml-1 min-h-9 rounded-full px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50">{t("retract")}</button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {canWrite ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
          className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:px-5"
        >
          {error ? <p role="alert" className="mb-2 text-sm text-rose-700">{error}</p> : null}
          {file ? (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-800">
              <span className="min-w-0 truncate">📎 {file.name} · {sizeLabel(file.size, locale)}</span>
              <button type="button" onClick={() => pickFile(null)} className="shrink-0 text-xs font-semibold text-slate-600 underline-offset-4 hover:underline">{t("removeFile")}</button>
            </div>
          ) : null}
          <DictationMessage dictation={dictation} />
          <div className="flex items-end gap-2">
            <input ref={fileInput} type="file" accept={ATTACHMENT_TYPES.join(",")} className="sr-only" id={`chat-file-${chatId}`} onChange={(event) => pickFile(event.target.files?.[0] ?? null)} />
            <label htmlFor={`chat-file-${chatId}`} className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full text-slate-500 hover:bg-slate-100" title={t("attach")}>
              <span className="sr-only">{t("attach")}</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" /></svg>
            </label>
            <label htmlFor={`chat-input-${chatId}`} className="sr-only">{t("inputLabel")}</label>
            <div className="relative min-w-0 flex-1">
              <textarea
                id={`chat-input-${chatId}`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                maxLength={4000}
                placeholder={t("placeholder")}
                className="max-h-40 min-h-11 w-full resize-none rounded-2xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-12 text-[15px] leading-6"
              />
              <DictationButton dictation={dictation} />
            </div>
            <button
              type="submit"
              disabled={sending || (draft.trim().length === 0 && !file)}
              aria-label={t("send")}
              className="brand-cta grid h-11 w-11 shrink-0 place-items-center rounded-full disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" />
              </svg>
            </button>
          </div>
          <p className="mt-1 hidden text-[11px] text-slate-400 sm:block">{t("enterHint")}</p>
        </form>
      ) : (
        <p className="border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">{t("readOnly")}</p>
      )}
    </div>
  );
}
