import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireNetworkMember } from "@/features/network/networkAccess";
import { sendNetworkMessageAction } from "@/features/network/networkActions";
import { getNetworkConversation, getNetworkMessages } from "@/features/network/networkData";
import { NetworkMarkConversationRead } from "@/features/network/NetworkMarkConversationRead";
import { NetworkSubmitButton } from "@/features/network/NetworkSubmitButton";

export default async function NetworkConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { conversationId } = await params;
  const [t, locale, query] = await Promise.all([
    getTranslations("network"),
    getLocale(),
    searchParams,
  ]);
  const { client, user } = await requireNetworkMember(`/network/messages/${conversationId}`);
  const conversation = await getNetworkConversation(client, conversationId);
  if (!conversation) notFound();
  const messages = await getNetworkMessages(client, conversationId);
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-3xl">
      <NetworkMarkConversationRead conversationId={conversationId} unreadCount={conversation.unread_count} />
      <Link href="/network/contacts" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">← {t("messages.back")}</Link>
      <header className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">{t("messages.eyebrow")}</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{conversation.counterpart_display_name}</h1>
        <Link href={`/network/listings/${conversation.listing_id}`} className="mt-2 inline-block text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">{conversation.listing_title}</Link>
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

      <form action={sendNetworkMessageAction} className="sticky bottom-3 mt-5 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:p-5">
        <input type="hidden" name="conversation_id" value={conversationId} />
        <label htmlFor="network-message" className="text-sm font-semibold text-slate-900">{t("messages.composeLabel")}</label>
        <textarea id="network-message" name="body" required maxLength={2000} rows={3} className="mt-2 w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:ring-4 focus:ring-slate-100" aria-describedby="network-message-hint" />
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="network-message-hint" className="text-xs text-slate-500">{query.error ? t("messages.error") : t("messages.hint")}</p>
          <NetworkSubmitButton label={t("messages.send")} pendingLabel={t("messages.sending")} className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-6 py-3 text-sm font-semibold text-slate-950" />
        </div>
      </form>
    </div>
  </main>;
}
