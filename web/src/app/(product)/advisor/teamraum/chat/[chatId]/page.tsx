import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { getMyAdvisorOrgs, getOrgMembers } from "@/features/advisor/orgData";
import { getOrgChat, listChatMembers, listChatMessages, listChatReactions, listMyOrgChats } from "@/features/advisor/orgChatData";
import { leaveOrgChatGroupAction, setOrgChatMutedAction, updateOrgChatGroupAction } from "@/features/advisor/orgChatActions";
import { OrgChatThread } from "@/features/advisor/OrgChatThread";
import { QuietQuickSwitch } from "@/features/notifications/QuietQuickSwitch";
import { getMyQuietHours } from "@/features/notifications/QuietHoursSection";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { teamraumChatHref, teamraumHref } from "@/features/advisor/teamraumRoutes";
import { createClient, getRequestUser } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/;

/**
 * Ein Gespraech im Teamraum-Chat, als ganze Seite - auf dem Telefon wie ein Messenger. Lesen nur, wer
 * den Chat lesen darf (Zeilensicherheit, 20270318120000); die Seite schreibt nichts beim Oeffnen.
 */
export default async function OrgChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ chatId: string }>;
  searchParams?: Promise<{ org?: string; groupSaved?: string; groupError?: string }>;
}) {
  const [{ chatId }, query] = await Promise.all([params, Promise.resolve(searchParams).then((value) => value ?? {})]);
  if (!UUID.test(query.org ?? "") || !UUID.test(chatId)) notFound();
  const orgId = query.org as string;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath(teamraumChatHref(orgId, chatId)));

  const client = await createClient();
  const [t, orgs, chat] = await Promise.all([getTranslations("advisor.chat"), getMyAdvisorOrgs(client), getOrgChat(client, chatId)]);
  const org = orgs.find((entry) => entry.id === orgId);
  if (!org || !chat || chat.orgId !== org.id) notFound();

  const [members, messages, chats, quiet, reactions, groupMembers] = await Promise.all([
    getOrgMembers(client, org.id),
    listChatMessages(client, chat.id),
    listMyOrgChats(client, org.id),
    getMyQuietHours(client),
    listChatReactions(client, chat.id),
    chat.kind === "group" ? listChatMembers(client, chat.id) : Promise.resolve([] as string[]),
  ]);
  const canEditGroup = chat.kind === "group" && org.status === "active" && (chat.createdByUserId === user.id || (org.role === "owner" && org.status === "active"));
  const names = Object.fromEntries(members.map((member) => [member.userId, member.displayName ?? t("formerMember")]));
  const other = chat.kind === "direct" ? (chat.directA === user.id ? chat.directB : chat.directA) : null;
  const otherActive = other ? members.some((member) => member.userId === other && member.status === "active") : true;
  const muted = chats.find((entry) => entry.chatId === chat.id)?.muted ?? false;
  const listHref = teamraumHref("chat", org.id);
  const here = teamraumChatHref(org.id, chat.id);

  return (
    <main className="mx-auto flex h-[calc(100dvh-4.5rem)] w-full xl:h-[calc(100dvh-6.5rem)] max-w-3xl flex-col bg-slate-50/60 sm:border-x sm:border-slate-200">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:px-5">
        <Link href={listHref} aria-label={t("back")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-700 hover:bg-slate-100">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-slate-950">{chat.kind === "team" ? t("teamTitle") : chat.kind === "group" ? chat.name : names[other ?? ""] ?? t("formerMember")}</h1>
          <p className="truncate text-xs text-slate-500">
            {chat.kind === "team"
              ? t("teamSubtitle", { org: org.name, count: members.filter((member) => member.status === "active").length })
              : chat.kind === "group"
                ? groupMembers.map((userId) => (userId === user.id ? t("you") : names[userId] ?? t("formerMember"))).join(", ")
                : org.name}
          </p>
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
      {query.groupSaved === "1" ? <p role="status" className="bg-emerald-50 px-4 py-1.5 text-center text-xs text-emerald-900">{t("groupSaved")}</p> : null}
      {query.groupError === "1" ? <p role="alert" className="bg-rose-50 px-4 py-1.5 text-center text-xs text-rose-800">{t("groupError")}</p> : null}
      {chat.kind === "group" ? (
        <details className="border-b border-slate-200 bg-white px-4 py-1">
          <summary className="flex min-h-10 cursor-pointer items-center text-xs font-semibold text-violet-800">{canEditGroup ? t("groupManage") : t("groupInfo")}</summary>
          <div className="grid gap-3 pb-3 pt-1">
            {canEditGroup ? (
              <form action={updateOrgChatGroupAction} className="grid gap-3">
                <input type="hidden" name="orgId" value={org.id} />
                <input type="hidden" name="chatId" value={chat.id} />
                <label className="block max-w-sm">
                  <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("groupName")}</span>
                  <input name="name" required maxLength={80} defaultValue={chat.name ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" />
                </label>
                <fieldset>
                  <legend className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("groupMembers")}</legend>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {members.filter((member) => member.status === "active").map((member) => (
                      <label key={member.userId} className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm has-[:checked]:border-violet-300 has-[:checked]:bg-violet-50">
                        <input type="checkbox" name="member" value={member.userId} defaultChecked={groupMembers.includes(member.userId)} disabled={member.userId === user.id} className="size-4" />
                        {member.userId === user.id ? t("you") : member.displayName ?? t("formerMember")}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <SubmitButton label={t("groupSave")} pendingLabel="…" className="brand-cta inline-flex min-h-10 w-fit items-center rounded-xl px-4 text-sm font-semibold" />
              </form>
            ) : null}
            <form action={leaveOrgChatGroupAction}>
              <input type="hidden" name="orgId" value={org.id} />
              <input type="hidden" name="chatId" value={chat.id} />
              <SubmitButton label={t("groupLeave")} pendingLabel="…" className="text-sm font-medium text-rose-700 underline-offset-4 hover:underline" />
            </form>
          </div>
        </details>
      ) : null}
      <OrgChatThread chatId={chat.id} me={user.id} names={names} initialMessages={messages} initialReactions={reactions} canWrite={org.status === "active" && otherActive} isDirect={chat.kind === "direct"} />
    </main>
  );
}
