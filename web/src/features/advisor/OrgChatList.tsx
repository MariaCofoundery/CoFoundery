import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createOrgChatGroupAction, openOrgChatAction } from "@/features/advisor/orgChatActions";
import type { ChatSearchHit } from "@/features/advisor/orgChatData";
import { QuietQuickSwitch } from "@/features/notifications/QuietQuickSwitch";
import type { QuietHours } from "@/features/notifications/QuietHoursSection";
import type { ChatSummary } from "@/features/advisor/orgChatModel";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { teamraumChatHref, teamraumHref, teamraumPath } from "@/features/advisor/teamraumRoutes";

/** Die Chats im Teamraum: Teamchat, eigene Direktchats, neuer Direktchat (20270318120000). */
export async function OrgChatList({
  orgId,
  me,
  members,
  chats,
  quiet,
  canWrite,
  locale,
  query = "",
  hits = [],
}: {
  orgId: string;
  me: string;
  members: { userId: string; name: string }[];
  chats: ChatSummary[];
  quiet: QuietHours;
  canWrite: boolean;
  locale: string;
  query?: string;
  hits?: ChatSearchHit[];
}) {
  const t = await getTranslations("advisor.chat");
  const nameOf = (userId: string | null) => members.find((member) => member.userId === userId)?.name ?? t("formerMember");
  const when = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
  const team = chats.find((chat) => chat.kind === "team") ?? null;
  const directs = chats.filter((chat) => chat.kind === "direct");
  const groups = chats.filter((chat) => chat.kind === "group");
  const chatTitle = (chatId: string) => {
    const chat = chats.find((entry) => entry.chatId === chatId);
    return !chat ? "" : chat.kind === "team" ? t("teamTitle") : chat.kind === "group" ? chat.name ?? "" : nameOf(chat.otherUserId);
  };
  const withChat = new Set(directs.map((chat) => chat.otherUserId));
  const startable = members.filter((member) => member.userId !== me && !withChat.has(member.userId));
  const href = (chatId: string) => teamraumChatHref(orgId, chatId);
  const preview = (chat: ChatSummary) =>
    chat.lastMessageAt === null ? t("noMessages") : `${chat.lastAuthorUserId === me ? t("you") : nameOf(chat.lastAuthorUserId)}: ${chat.lastBody ?? t("retracted")}`;
  const Row = ({ chat, title, avatar }: { chat: ChatSummary; title: string; avatar: string }) => (
    <Link href={href(chat.chatId)} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-violet-50/60">
      <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-100 text-base font-semibold text-violet-800">{avatar}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-[15px] ${chat.unread > 0 ? "font-bold text-slate-950" : "font-semibold text-slate-900"}`}>{title}</span>
          {chat.lastMessageAt ? <span className="shrink-0 text-xs text-slate-500">{when.format(new Date(chat.lastMessageAt))}</span> : null}
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-slate-600">{preview(chat)}</span>
          {chat.unread > 0 ? <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-violet-600 px-1.5 text-xs font-bold text-white">{chat.unread}</span> : chat.muted ? <span className="text-xs text-slate-400">{t("mutedShort")}</span> : null}
        </span>
      </span>
    </Link>
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-[15px] leading-6 text-slate-700">{t("listText")}</p>
        <QuietQuickSwitch paused={quiet.pausedUntil !== null} back={teamraumHref("chat", orgId)} compact />
      </div>
      {quiet.quietNow ? <p role="status" className="rounded-xl bg-sky-50 px-4 py-2.5 text-sm text-sky-900">{t("quietNow")}</p> : null}

      <form role="search" method="get" action={teamraumPath("chat")} className="flex gap-2">
        <input type="hidden" name="org" value={orgId} />
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("searchLabel")}</span>
          <input type="search" name="q" defaultValue={query} minLength={2} maxLength={100} placeholder={t("searchPlaceholder")} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" />
        </label>
        <button type="submit" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">{t("search")}</button>
      </form>
      {query.trim().length >= 2 ? (
        <section aria-labelledby="chat-search-title" className="advisor-card p-4">
          <h3 id="chat-search-title" className="text-[13px] font-semibold text-slate-700">{t("searchResults", { count: hits.length, query })}</h3>
          {hits.length === 0 ? <p className="mt-2 text-sm text-slate-600">{t("searchNone")}</p> : null}
          <ul className="mt-2 divide-y divide-slate-100">
            {hits.map((hit) => (
              <li key={hit.messageId} className="py-2">
                <Link href={href(hit.chatId)} className="block rounded-lg px-1 py-1 hover:bg-violet-50/60">
                  <span className="flex items-baseline justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate font-semibold text-slate-700">{chatTitle(hit.chatId)} · {hit.authorUserId === me ? t("you") : nameOf(hit.authorUserId)}</span>
                    <span className="shrink-0">{when.format(new Date(hit.createdAt))}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-800">{hit.body || (hit.attachmentName ? `📎 ${hit.attachmentName}` : "")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="advisor-card divide-y divide-slate-100 overflow-hidden p-0">
        <li>
          {team ? (
            <Row chat={team} title={t("teamTitle")} avatar="#" />
          ) : canWrite ? (
            <form action={openOrgChatAction}>
              <input type="hidden" name="orgId" value={orgId} />
              <SubmitButton label={t("openTeam")} pendingLabel="…" className="flex min-h-16 w-full items-center px-4 text-left text-[15px] font-semibold text-violet-800 hover:bg-violet-50/60" />
            </form>
          ) : null}
        </li>
        {groups.map((chat) => (
          <li key={chat.chatId}>
            <Row chat={chat} title={chat.name ?? ""} avatar={(chat.name?.trim()[0] ?? "#").toUpperCase()} />
          </li>
        ))}
        {directs.map((chat) => (
          <li key={chat.chatId}>
            <Row chat={chat} title={nameOf(chat.otherUserId)} avatar={(nameOf(chat.otherUserId).trim()[0] ?? "?").toUpperCase()} />
          </li>
        ))}
      </ul>

      {canWrite && members.length > 1 ? (
        <details className="advisor-card p-4">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-violet-800">+ {t("newGroup")}</summary>
          <form action={createOrgChatGroupAction} className="mt-3 grid gap-3">
            <input type="hidden" name="orgId" value={orgId} />
            <label className="block max-w-sm">
              <span className="block text-sm font-semibold text-slate-900">{t("groupName")}</span>
              <input name="name" required maxLength={80} placeholder={t("groupNamePlaceholder")} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" />
            </label>
            <fieldset>
              <legend className="text-[13px] font-semibold text-slate-700">{t("groupMembers")}</legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {members.filter((member) => member.userId !== me).map((member) => (
                  <label key={member.userId} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm has-[:checked]:border-violet-300 has-[:checked]:bg-violet-50">
                    <input type="checkbox" name="member" value={member.userId} className="size-4" />
                    {member.name}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">{t("groupYouAreIn")}</p>
            </fieldset>
            <SubmitButton label={t("groupCreate")} pendingLabel="…" className="brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-5 text-sm font-semibold" />
          </form>
        </details>
      ) : null}

      {canWrite && startable.length > 0 ? (
        <section aria-labelledby="chat-new-title">
          <h3 id="chat-new-title" className="text-[13px] font-semibold text-slate-700">{t("newDirect")}</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {startable.map((member) => (
              <li key={member.userId}>
                <form action={openOrgChatAction}>
                  <input type="hidden" name="orgId" value={orgId} />
                  <input type="hidden" name="withUserId" value={member.userId} />
                  <SubmitButton label={member.name} pendingLabel="…" className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-800 hover:bg-violet-50" />
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="text-xs leading-5 text-slate-500">{t("privacyNote")}</p>
    </div>
  );
}
