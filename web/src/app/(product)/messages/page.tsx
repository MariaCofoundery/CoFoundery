import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ConnectAvatar } from "@/features/connect/ConnectAvatar";
import { requireSignedInForMessages } from "@/features/connect/conversationAccess";
import {
  getConnectConversations,
  getConnectProfilesByUserIds,
} from "@/features/connect/connectData";
import { WaitingNotices } from "@/features/notifications/WaitingNotices";
import { getWaitingInAppNotices } from "@/features/notifications/inAppNoticeData";

/**
 * Ein Postfach fuer alles.
 *
 * WARUM EINES UND NICHT ZWEI: Gespraeche entstehen inzwischen an drei Stellen -
 * aus einer angenommenen Kontaktanfrage, aus einem Problem und aus einem
 * angenommenen Intro in Find. Zwei Postfaecher hiessen zwei Ungelesen-Zaehler
 * und zwei Orte, an denen man nachsieht; und wer nur Align und Find nutzt,
 * haette in Connect gar keinen Zugang gehabt. Jedes Gespraech sagt hier
 * stattdessen, woraus es entstanden ist.
 *
 * Diese Seite gab es vorher NICHT: Die Gespraechsliste stand mitten auf der
 * Connect-Kontaktseite, zwischen den offenen Anfragen. Man kam an ein Gespraech
 * also nur ueber den Bereich heran, aus dem es stammte.
 *
 * SEIT DEM 21.09.2026 STEHT "DU BIST DRAN" DARUEBER: Wer in Align etwas
 * ausfuellt, gibt damit an die andere Seite ab - und das kam bis dahin nur per
 * Mail an. Wer die Mails abbestellt hatte oder sie uebersah, liess jemanden
 * warten, ohne es zu wissen. Es steht hier und nicht in einem eigenen
 * Bereich: Zwei Orte zum Nachsehen heissen, dass man an einem nicht nachsieht.
 */
export default async function MessagesPage() {
  const [t, locale] = await Promise.all([getTranslations("connect"), getLocale()]);
  const { client } = await requireSignedInForMessages();

  const [conversations, notices] = await Promise.all([
    getConnectConversations(client),
    getWaitingInAppNotices(client),
  ]);
  const counterpartIds = conversations
    .map((conversation) => conversation.counterpart_user_id)
    .filter((id): id is string => Boolean(id));
  const profiles = await getConnectProfilesByUserIds(client, counterpartIds);

  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        {t("messages.inboxTitle")}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("messages.inboxText")}</p>

      <WaitingNotices notices={notices} />

      {conversations.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 px-5 py-8 text-center">
          <h2 className="text-lg font-semibold text-slate-950">{t("messages.inboxEmptyTitle")}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            {t("messages.inboxEmptyText")}
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {conversations.map((conversation) => {
            const name =
              conversation.counterpart_display_name ?? t("messages.formerMember");
            const profile = conversation.counterpart_user_id
              ? profiles.get(conversation.counterpart_user_id)
              : undefined;
            return (
              <li key={conversation.conversation_id}>
                <Link
                  href={`/messages/${conversation.conversation_id}`}
                  prefetch={false}
                  className="flex min-h-16 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <ConnectAvatar profile={profile} displayName={name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-950">{name}</span>
                      {conversation.unread_count > 0 ? (
                        <span
                          aria-label={t("messages.unreadCount", {
                            count: conversation.unread_count,
                          })}
                          className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[.68rem] font-bold leading-none text-white"
                        >
                          {Math.min(conversation.unread_count, 99)}
                        </span>
                      ) : null}
                    </span>
                    {/* Woher es kommt - der Grund, warum ein gemeinsames
                        Postfach trotzdem lesbar bleibt. */}
                    <span className="mt-1 block text-xs font-medium uppercase tracking-[.12em] text-slate-500">
                      {t(`messages.origins.${conversation.origin}`)}
                      {conversation.listing_title ? ` · ${conversation.listing_title}` : ""}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {conversation.last_message_at
                        ? t("messages.lastMessage", {
                            date: dateTime.format(new Date(conversation.last_message_at)),
                          })
                        : t("messages.noMessages")}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
