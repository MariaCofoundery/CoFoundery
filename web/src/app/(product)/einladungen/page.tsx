import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { acceptInviteAction, declineInviteAction } from "@/features/invites/invitesActions";
import { listMyInvites } from "@/features/invites/invitesData";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { UserText } from "@/features/ui/UserText";

export const dynamic = "force-dynamic";

/**
 * Einladungen an dich (06.11.2026): was an deine bestaetigte Adresse ging, mit Annehmen und Ablehnen - ohne den Link aus
 * der Mail. Der Hinweis im Nachrichtensystem fuehrt hierher.
 */
export default async function InvitationsPage({ searchParams }: { searchParams?: Promise<{ error?: string; declined?: string }> }) {
  const query = (await searchParams) ?? {};
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/einladungen"));
  const client = await createClient();
  const [t, locale, invites] = await Promise.all([getTranslations("invites"), getLocale().then(getPresentationLocale), listMyInvites(client)]);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Europe/Berlin" });

  return (
    <main className="work-ui mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-brand text-[32px] font-semibold leading-tight text-slate-950">{t("title")}</h1>
      <p className="mt-2 text-[15px] leading-6 text-slate-700">{t("text")}</p>
      {query.error ? <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{t("error")}</p> : null}
      {query.declined ? <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("declined")}</p> : null}

      {invites.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6">
          <p className="text-[15px] font-semibold text-slate-950">{t("empty")}</p>
          <p className="mt-1 text-[14px] text-slate-700">{t("emptyHint")}</p>
          <Link href="/dashboard" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">{t("toDashboard")}</Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4">
          {invites.map((invite) => (
            <li key={`${invite.kind}-${invite.inviteId}`} className="rounded-[20px] border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="font-brand text-[22px] font-semibold leading-tight text-slate-950">
                {invite.kind === "org" ? t("org.title", { org: invite.orgName ?? "" }) : t("person.title")}
              </h2>
              <p className="mt-1 text-[14.5px] text-slate-800">
                {invite.kind === "org"
                  ? `${invite.inviterName ? t("org.by", { name: invite.inviterName }) : t("org.byUnknown")} ${invite.role ? t(`org.role.${invite.role}`) : ""}`.trim()
                  : invite.inviterName
                    ? invite.orgName
                      ? t("person.byOrg", { name: invite.inviterName, org: invite.orgName })
                      : t("person.by", { name: invite.inviterName })
                    : t("person.byUnknown")}
              </p>
              <p className="mt-1 text-[13px] text-slate-600">{t("since", { date: date.format(new Date(invite.createdAt)) })} · {t("expires", { date: date.format(new Date(invite.expiresAt)) })}</p>
              {invite.kind === "person" && invite.scopes.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase tracking-[0.06em] text-slate-600">{t("person.scopes")}</p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {invite.scopes.map((scope) => <li key={scope} className="rounded-full bg-violet-50 px-3 py-1 text-[13px] font-semibold text-violet-900">{t(`scope.${scope}`)}</li>)}
                  </ul>
                </div>
              ) : null}
              {invite.kind === "person" && invite.note ? (
                <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-[14px] leading-6 text-slate-800">
                  <span className="font-semibold">{t("person.note")}: </span><UserText text={invite.note} />
                </div>
              ) : null}
              <p className="mt-3 text-[13.5px] leading-6 text-slate-700">{invite.kind === "org" ? t("org.text") : t("person.text")}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <form action={acceptInviteAction}>
                  <input type="hidden" name="inviteId" value={invite.inviteId} />
                  <input type="hidden" name="kind" value={invite.kind} />
                  <SubmitButton label={t("accept")} pendingLabel="…" className="inline-flex min-h-12 items-center rounded-xl bg-[#6D49E0] px-6 text-[15px] font-semibold text-white hover:bg-[#5B36D6]" />
                </form>
                <form action={declineInviteAction}>
                  <input type="hidden" name="inviteId" value={invite.inviteId} />
                  <input type="hidden" name="kind" value={invite.kind} />
                  <SubmitButton label={t("decline")} pendingLabel="…" className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50" />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
