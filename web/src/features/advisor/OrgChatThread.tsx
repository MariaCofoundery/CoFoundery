"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { DictationButton, DictationMessage, useDictationCopy } from "@/features/dictation/DictationControls";
import { useDictation } from "@/features/dictation/useDictation";
import { UserText } from "@/features/ui/UserText";
import { markOrgChatRead, retractOrgChatMessage, sendOrgChatMessage } from "@/features/advisor/orgChatActions";
import { dayBreaks, mergeMessages, messageOf, startsGroup, type ChatMessage } from "@/features/advisor/orgChatModel";

/**
 * Ein Gespraech im Teamraum-Chat (20270318120000) - fuer das Telefon gebaut: Nachrichten unten, eigene
 * rechts, Eingabe unten fest. Neue Nachrichten kommen per Echtzeit; steht die Verbindung nicht, fragt die
 * Seite alle 15 Sekunden nach. Die Zeilensicherheit gilt fuer beide Wege.
 */

const TONES = ["bg-violet-100 text-violet-800", "bg-teal-100 text-teal-800", "bg-pink-100 text-pink-800", "bg-sky-100 text-sky-800", "bg-amber-100 text-amber-900", "bg-emerald-100 text-emerald-800"];
const toneOf = (userId: string) => TONES[[...userId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONES.length];

export function OrgChatThread({
  chatId,
  me,
  names,
  initialMessages,
  canWrite,
  isDirect,
}: {
  chatId: string;
  me: string;
  names: Record<string, string>;
  initialMessages: ChatMessage[];
  canWrite: boolean;
  isDirect: boolean;
}) {
  const t = useTranslations("advisor.chat");
  const locale = useLocale();
  const copy = useDictationCopy();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const supabase = useMemo(() => createClient(), []);
  const dictation = useDictation({ value: draft, onChange: setDraft, locale, copy });

  // Echtzeit: neue und zurueckgenommene Nachrichten dieses Chats.
  useEffect(() => {
    const channel = supabase
      .channel(`org-chat-${chatId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "advisor_org_chat_messages", filter: `chat_id=eq.${chatId}` }, (payload) => {
        if (payload.new && typeof payload.new === "object" && "id" in payload.new) {
          setMessages((current) => mergeMessages(current, [messageOf(payload.new as Record<string, unknown>)]));
        }
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
      const { data } = await supabase
        .from("advisor_org_chat_messages")
        .select("id, chat_id, author_user_id, body, created_at, retracted_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (Array.isArray(data)) setMessages((current) => mergeMessages(current, (data as Record<string, unknown>[]).map(messageOf)));
    }, 15000);
    return () => window.clearInterval(timer);
  }, [live, supabase, chatId]);

  // Unten bleiben, wenn man unten war; gelesen melden, wenn etwas von anderen dazukommt.
  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    const box = scroller.current;
    if (box && nearBottom.current) box.scrollTop = box.scrollHeight;
    if (document.visibilityState === "visible") void markOrgChatRead(chatId);
  }, [lastId, chatId]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    if (dictation.active) dictation.toggle();
    const result = await sendOrgChatMessage(chatId, text);
    setSending(false);
    if (!result.ok) {
      setError(t(result.reason === "member" ? "errorMember" : "errorSend"));
      return;
    }
    setDraft("");
    nearBottom.current = true;
    // Falls die Echtzeit gerade hakt: die eigene Nachricht direkt holen.
    const { data } = await supabase.from("advisor_org_chat_messages").select("id, chat_id, author_user_id, body, created_at, retracted_at").eq("id", result.id).maybeSingle();
    if (data) setMessages((current) => mergeMessages(current, [messageOf(data as Record<string, unknown>)]));
  }

  async function retract(id: string) {
    setSelected(null);
    if (await retractOrgChatMessage(id)) setMessages((current) => current.map((message) => (message.id === id ? { ...message, body: "", retracted: true } : message)));
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
                  <button
                    type="button"
                    onClick={() => setSelected(mine && !message.retracted ? (selected === message.id ? null : message.id) : null)}
                    className={`max-w-[85vw] rounded-2xl px-3.5 py-2 text-left text-[15px] leading-6 shadow-sm sm:max-w-md ${
                      message.retracted
                        ? "border border-dashed border-slate-300 bg-white text-slate-400 italic"
                        : mine
                          ? "rounded-br-md bg-violet-600 text-white"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    {!mine && !isDirect && first ? <span className="block text-xs font-semibold text-violet-700">{name}</span> : null}
                    {message.retracted ? t("retracted") : <span className="whitespace-pre-line break-words"><UserText text={message.body} /></span>}
                    <span className={`mt-0.5 block text-right text-[11px] ${mine && !message.retracted ? "text-violet-100" : "text-slate-400"}`}>{timeFormat.format(new Date(message.createdAt))}</span>
                  </button>
                </div>
                {selected === message.id ? (
                  <div className="mt-1 flex justify-end">
                    <button type="button" onClick={() => void retract(message.id)} className="min-h-9 rounded-full border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700">{t("retract")}</button>
                  </div>
                ) : null}
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
          <DictationMessage dictation={dictation} />
          <div className="flex items-end gap-2">
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
              disabled={sending || draft.trim().length === 0}
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
