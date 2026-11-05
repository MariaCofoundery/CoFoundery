import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { openOrgChatAction } from "@/features/advisor/orgChatActions";
import { QuietQuickSwitch } from "@/features/notifications/QuietQuickSwitch";
import type { QuietHours } from "@/features/notifications/QuietHoursSection";
import type { ChatSummary } from "@/features/advisor/orgChatModel";
import { SubmitButton } from "@/features/ui/SubmitButton";

/** Die Chats im Teamraum: Teamchat, eigene Direktchats, neuer Direktchat (20270318120000). */
export async function OrgChatList({
  orgId,
  me,
  members,
  chats,
  quiet,
  canWrite,
  locale,
}: {
  orgId: string;
  me: string;
  members: { userId: string; name: string }[];
  chats: ChatSummary[];
  quiet: QuietHours;
  canWrite: boolean;
  locale: string;
}) {
  const t = await getTranslations("advisor.chat");
  const nameOf = (userId: string | null) => members.find((member) => member.userId === userId)?.name ?? t("formerMember");
  const when = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
  const team = chats.find((chat) => chat.kind === "team") ?? null;
  const directs = chats.filter((chat) => chat.kind === "direct");
  const withChat = new Set(directs.map((chat) => chat.otherUserId));
  const startable = members.filter((member) => member.userId !== me && !withChat.has(member.userId));
  const href = (chatId: string) => `/advisor/organisation/chat?${new URLSearchParams({ org: orgId, chat: chatId }).toString()}`;
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
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{t("listTitle")}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("listText")}</p>
        </div>
        <QuietQuickSwitch paused={quiet.pausedUntil !== null} back={`/advisor/organisation?org=${orgId}&tab=chat`} compact />
      </div>
      {quiet.quietNow ? <p role="status" className="rounded-xl bg-sky-50 px-4 py-2.5 text-sm text-sky-900">{t("quietNow")}</p> : null}

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
        {directs.map((chat) => (
          <li key={chat.chatId}>
            <Row chat={chat} title={nameOf(chat.otherUserId)} avatar={(nameOf(chat.otherUserId).trim()[0] ?? "?").toUpperCase()} />
          </li>
        ))}
      </ul>

      {canWrite && startable.length > 0 ? (
        <section aria-labelledby="chat-new-title">
          <h3 id="chat-new-title" className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("newDirect")}</h3>
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
