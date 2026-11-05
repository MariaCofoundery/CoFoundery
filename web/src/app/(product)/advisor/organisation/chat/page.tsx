import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { getMyAdvisorOrgs, getOrgMembers } from "@/features/advisor/orgData";
import { getOrgChat, listChatMessages, listMyOrgChats } from "@/features/advisor/orgChatData";
import { setOrgChatMutedAction } from "@/features/advisor/orgChatActions";
import { OrgChatThread } from "@/features/advisor/OrgChatThread";
import { QuietQuickSwitch } from "@/features/notifications/QuietQuickSwitch";
import { getMyQuietHours } from "@/features/notifications/QuietHoursSection";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createClient, getRequestUser } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/;

/**
 * Ein Gespraech im Teamraum-Chat, als ganze Seite - auf dem Telefon wie ein Messenger. Lesen nur, wer
 * den Chat lesen darf (Zeilensicherheit, 20270318120000); die Seite schreibt nichts beim Oeffnen.
 */
export default async function OrgChatPage({ searchParams }: { searchParams?: Promise<{ org?: string; chat?: string }> }) {
  const query = (await searchParams) ?? {};
  if (!UUID.test(query.org ?? "") || !UUID.test(query.chat ?? "")) notFound();
  const orgId = query.org as string;
  const chatId = query.chat as string;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath(`/advisor/organisation/chat?org=${orgId}&chat=${chatId}`));

  const client = await createClient();
  const [t, orgs, chat] = await Promise.all([getTranslations("advisor.chat"), getMyAdvisorOrgs(client), getOrgChat(client, chatId)]);
  const org = orgs.find((entry) => entry.id === orgId);
  if (!org || !chat || chat.orgId !== org.id) notFound();

  const [members, messages, chats, quiet] = await Promise.all([getOrgMembers(client, org.id), listChatMessages(client, chat.id), listMyOrgChats(client, org.id), getMyQuietHours(client)]);
  const names = Object.fromEntries(members.map((member) => [member.userId, member.displayName ?? t("formerMember")]));
  const other = chat.kind === "direct" ? (chat.directA === user.id ? chat.directB : chat.directA) : null;
  const otherActive = other ? members.some((member) => member.userId === other && member.status === "active") : true;
  const muted = chats.find((entry) => entry.chatId === chat.id)?.muted ?? false;
  const listHref = `/advisor/organisation?${new URLSearchParams({ org: org.id, tab: "chat" }).toString()}`;
  const here = `/advisor/organisation/chat?${new URLSearchParams({ org: org.id, chat: chat.id }).toString()}`;

  return (
    <main className="mx-auto flex h-[calc(100dvh-4.5rem)] w-full max-w-3xl flex-col bg-slate-50/60 sm:border-x sm:border-slate-200">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:px-5">
        <Link href={listHref} aria-label={t("back")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-700 hover:bg-slate-100">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-slate-950">{chat.kind === "team" ? t("teamTitle") : names[other ?? ""] ?? t("formerMember")}</h1>
          <p className="truncate text-xs text-slate-500">{chat.kind === "team" ? t("teamSubtitle", { org: org.name, count: members.filter((member) => member.status === "active").length }) : org.name}</p>
        </div>
        <form action={setOrgChatMutedAction}>
          <input type="hidden" name="orgId" value={org.id} />
          <input type="hidden" name="chatId" value={chat.id} />
          <input type="hidden" name="muted" value={muted ? "no" : "yes"} />
          <SubmitButton label={muted ? t("unmute") : t("mute")} pendingLabel="…" className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50" />
        </form>
        <div className="hidden sm:block">
          <QuietQuickSwitch paused={quiet.pausedUntil !== null} back={here} compact />
        </div>
      </header>
      {quiet.quietNow ? <p className="bg-sky-50 px-4 py-1.5 text-center text-xs text-sky-900">{t("quietNow")}</p> : null}
      <OrgChatThread chatId={chat.id} me={user.id} names={names} initialMessages={messages} canWrite={org.status === "active" && otherActive} isDirect={chat.kind === "direct"} />
    </main>
  );
}
