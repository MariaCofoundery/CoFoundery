import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { sendConnectMessageAction } from "@/features/connect/connectActions";
import { getConnectBlockState, getConnectConversation, getConnectMessages, getConnectProfilesByUserIds } from "@/features/connect/connectData";
import { ConnectMarkConversationRead } from "@/features/connect/ConnectMarkConversationRead";
import { ConnectSubmitButton } from "@/features/connect/ConnectSubmitButton";
import { ConnectAvatar } from "@/features/connect/ConnectAvatar";
import { ConnectSafetyActions } from "@/features/connect/ConnectSafetyActions";

export default async function ConnectConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { conversationId } = await params;
  const [t, locale, query] = await Promise.all([
    getTranslations("connect"),
    getLocale(),
    searchParams,
  ]);
  const { client, user } = await requireConnectMember(`/connect/messages/${conversationId}`);
  const conversation = await getConnectConversation(client, conversationId);
  if (!conversation) notFound();
  const [messages, profiles, blockState] = await Promise.all([
    getConnectMessages(client, conversationId),
    getConnectProfilesByUserIds(client, [conversation.counterpart_user_id]),
    getConnectBlockState(client, conversation.counterpart_user_id),
  ]);
  const counterpartProfile = profiles.get(conversation.counterpart_user_id);
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-3xl">
      <ConnectMarkConversationRead conversationId={conversationId} unreadCount={conversation.unread_count} />
      <Link href="/connect/contacts" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">← {t("messages.back")}</Link>
      <header className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">{t("messages.eyebrow")}</p>
        <div className="mt-3 flex items-center gap-4"><ConnectAvatar profile={counterpartProfile} displayName={conversation.counterpart_display_name} className="h-14 w-14 rounded-full object-cover" /><h1 className="text-2xl font-semibold text-slate-950">{conversation.counterpart_display_name}</h1></div>
        <Link href={`/connect/listings/${conversation.listing_id}`} className="mt-2 inline-block text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">{conversation.listing_title}</Link>
        <ConnectSafetyActions otherUserId={conversation.counterpart_user_id} contactRequestId={conversation.contact_request_id} returnTo={`/connect/messages/${conversationId}`} blockedByMe={blockState.blocked_by_current_user} interactionBlocked={blockState.interaction_blocked} copy={{
          blockedState: t("safety.blockedState"), unblock: t("safety.unblock"), unblocking: t("safety.unblocking"), blockConfirm: t("safety.blockConfirm"),
          block: t("safety.block"), blocking: t("safety.blocking"), report: t("safety.report"), reportCategory: t("safety.reportCategory"), reportComment: t("safety.reportComment"),
          reportSubmit: t("safety.reportSubmit"), reporting: t("safety.reporting"), spam: t("safety.categories.spam"), harassment: t("safety.categories.harassment"),
          misleading: t("safety.categories.misleading"), other: t("safety.categories.other"),
        }} />
      </header>

      <section aria-label={t("messages.historyLabel")} className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
        {messages.length ? <ol className="space-y-4">
          {messages.map((message) => {
            const own = message.sender_user_id === user.id;
            return <li key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
              <article className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${own ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900"}`}>
                <p className={`text-xs font-semibold ${own ? "text-slate-300" : "text-slate-500"}`}>{own ? t("messages.you") : conversation.counterpart_display_name}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
                <time dateTime={message.created_at} className={`mt-2 block text-[11px] ${own ? "text-slate-400" : "text-slate-500"}`}>{dateTime.format(new Date(message.created_at))}</time>
              </article>
            </li>;
          })}
        </ol> : <div className="py-8 text-center"><h2 className="text-lg font-semibold text-slate-950">{t("messages.emptyTitle")}</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{t("messages.emptyText")}</p></div>}
      </section>

      {query.safety ? <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t(`safety.success.${query.safety}`)}</p> : null}
      {blockState.interaction_blocked ? <p className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">{t("safety.chatStopped")}</p> : <form action={sendConnectMessageAction} className="sticky bottom-3 mt-5 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:p-5">
        <input type="hidden" name="conversation_id" value={conversationId} />
        <label htmlFor="network-message" className="text-sm font-semibold text-slate-900">{t("messages.composeLabel")}</label>
        <textarea id="network-message" name="body" required maxLength={2000} rows={3} className="mt-2 w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:ring-4 focus:ring-slate-100" aria-describedby="network-message-hint" />
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="network-message-hint" className="text-xs text-slate-500">{query.error ? t("messages.error") : t("messages.hint")}</p>
          <ConnectSubmitButton label={t("messages.send")} pendingLabel={t("messages.sending")} className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-6 py-3 text-sm font-semibold text-slate-950" />
        </div>
      </form>}
    </div>
  </main>;
}
