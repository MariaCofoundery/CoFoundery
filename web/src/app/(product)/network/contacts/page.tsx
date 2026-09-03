import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireNetworkMember } from "@/features/network/networkAccess";
import { NetworkContactActions } from "@/features/network/NetworkContactActions";
import { getNetworkContactRequests, getNetworkConversations } from "@/features/network/networkData";
import type { NetworkContactRequest, NetworkConversation } from "@/features/network/networkTypes";

type T = (key: string, values?: Record<string, string | number>) => string;

function ContactCard({ request, direction, t, locale }: { request: NetworkContactRequest; direction: "incoming" | "outgoing"; t: T; locale: string }) {
  const counterpart = direction === "incoming" ? request.sender_display_name_snapshot : request.recipient_display_name_snapshot;
  return <article className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">{t(`contact.status.${request.status}`)}</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-950">{counterpart}</h3>
      {direction === "incoming" && request.sender_headline_snapshot ? <p className="mt-1 text-sm text-slate-500">{request.sender_headline_snapshot}</p> : null}
      <p className="mt-3 text-sm font-semibold text-violet-800">{request.listing_title_snapshot}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{request.message}</p>
      <p className="mt-3 text-xs text-slate-500">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(request.created_at))}</p>
    </div>{request.status === "pending" ? <NetworkContactActions id={request.id} direction={direction} t={t} /> : null}</div>
  </article>;
}

function AcceptedContactCard({ conversation, t, locale }: { conversation: NetworkConversation; t: T; locale: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-950">{conversation.counterpart_display_name}</h3>
          {conversation.unread_count > 0 ? <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[.68rem] font-bold leading-none text-white" aria-label={t("messages.unreadCount", { count: conversation.unread_count })}>{Math.min(conversation.unread_count, 99)}</span> : null}
        </div>
        <p className="mt-2 text-sm font-semibold text-violet-800">{conversation.listing_title}</p>
        {conversation.last_message_at ? <p className="mt-2 text-xs text-slate-500">{t("messages.lastMessage", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(conversation.last_message_at)) })}</p> : <p className="mt-2 text-xs text-slate-500">{t("messages.noMessages")}</p>}
      </div>
      <Link href={`/network/messages/${conversation.conversation_id}`} prefetch={false} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white">{t("messages.open")}</Link>
    </div>
  </article>;
}

export default async function NetworkContactsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [t, locale, query] = await Promise.all([getTranslations("network"), getLocale(), searchParams]);
  const { client, user } = await requireNetworkMember("/network/contacts");
  const [requests, conversations] = await Promise.all([
    getNetworkContactRequests(client, user.id),
    getNetworkConversations(client),
  ]);
  const incoming = requests.filter((request) => request.recipient_user_id === user.id && request.status !== "accepted");
  const outgoing = requests.filter((request) => request.sender_user_id === user.id && request.status !== "accepted");

  return <main className="mx-auto max-w-5xl px-5 py-10"><Link href="/network" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">← {t("navigation.overview")}</Link>
    <h1 className="mt-3 text-3xl font-semibold">{t("contact.title")}</h1><p className="mt-2 max-w-2xl text-slate-600">{t("contact.text")}</p>
    {query.changed ? <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t(`contact.success.${query.changed}`)}</p> : null}
    {query.error ? <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t("contact.error")}</p> : null}
    <section className="mt-8"><h2 className="text-xl font-semibold">{t("contact.incoming")}</h2><div className="mt-3 space-y-3">{incoming.length ? incoming.map((request) => <ContactCard key={request.id} request={request} direction="incoming" t={t} locale={locale} />) : <p className="text-sm text-slate-500">{t("contact.emptyIncoming")}</p>}</div></section>
    <section className="mt-10"><h2 className="text-xl font-semibold">{t("contact.outgoing")}</h2><div className="mt-3 space-y-3">{outgoing.length ? outgoing.map((request) => <ContactCard key={request.id} request={request} direction="outgoing" t={t} locale={locale} />) : <p className="text-sm text-slate-500">{t("contact.emptyOutgoing")}</p>}</div></section>
    <section className="mt-10"><h2 className="text-xl font-semibold">{t("messages.acceptedContacts")}</h2><div className="mt-3 space-y-3">{conversations.length ? conversations.map((conversation) => <AcceptedContactCard key={conversation.conversation_id} conversation={conversation} t={t} locale={locale} />) : <p className="text-sm text-slate-500">{t("messages.emptyContacts")}</p>}</div></section>
  </main>;
}
