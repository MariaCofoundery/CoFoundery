import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Einer Organisation beitreten - erst ansehen, dann auf Klick beitreten.
 *
 * HIER WIRD MAN MITGLIED - anders als bei der Einladung an eine begleitete
 * Person, wo nur eine Anfrage entsteht. Wer eine Organisation betritt,
 * entscheidet ueber sich selbst. Genau deshalb muss es eine Entscheidung sein
 * (Phase 12C.0b): Bis dahin machte schon der Seitenaufruf (GET) die Person zum
 * Mitglied - auch eine Link-Vorschau oder ein Prefetch. Jetzt liest der Aufruf
 * nur (get_advisor_org_invite_preview); beigetreten wird ausschliesslich ueber
 * das Formular unten.
 */
type Preview =
  | { state: "open"; org_name: string | null; role: "owner" | "advisor"; inviter_name: string | null; already_member: boolean }
  | { state: "claimed" | "expired" | "revoked" | "unverified" | "unavailable" };

const SUCCESS = "/advisor/dashboard#advisor-org";

export default async function ClaimAdvisorOrgInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error: errorParam } = await searchParams;
  const path = `/invite/advisor-org/${token}`;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const client = await createClient();
  const { data } = await client.rpc("get_advisor_org_invite_preview", { p_token_hash: tokenHash });
  const preview = (data ?? { state: "unavailable" }) as Preview;
  if (preview.state === "claimed") redirect(SUCCESS);

  async function joinAction() {
    "use server";
    const actionClient = await createClient();
    const { error } = await actionClient.rpc("claim_advisor_org_invite", { p_token_hash: tokenHash });
    if (!error) redirect(SUCCESS);
    // Doppelt abgeschickt: Die erste Einloesung hat schon gegriffen.
    const { data: after } = await actionClient.rpc("get_advisor_org_invite_preview", { p_token_hash: tokenHash });
    if ((after as Preview | null)?.state === "claimed") redirect(SUCCESS);
    redirect(`${path}?error=1`);
  }

  const t = await getTranslations("advisor.org");
  if (preview.state !== "open") {
    const reason =
      preview.state === "expired" || preview.state === "revoked" || preview.state === "unverified"
        ? t(`invitePage.${preview.state}`)
        : t("claimFailedText");
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-12">
        <h1 className="text-2xl font-semibold text-slate-950">{t("claimFailedTitle")}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{reason}</p>
        <a
          href="/advisor/dashboard"
          className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          {t("claimFailedCta")}
        </a>
      </main>
    );
  }

  const org = preview.org_name ?? "";
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <section aria-labelledby="advisor-org-invite-title" className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 id="advisor-org-invite-title" className="text-2xl font-semibold text-slate-950">{t("invitePage.title")}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          {preview.inviter_name ? t("invitePage.intro", { name: preview.inviter_name, org }) : t("invitePage.introNoInviter", { org })}
        </p>
        <p className="mt-4 text-sm text-slate-700">
          <span className="font-medium text-slate-900">{t("invitePage.roleLabel")}:</span> {t(`roles.${preview.role}`)}
        </p>
        <h2 className="mt-5 text-sm font-semibold text-slate-900">{t("invitePage.meaningTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("membershipMeaning")}</p>
        {preview.already_member ? <p className="mt-3 text-sm leading-6 text-slate-600">{t("invitePage.alreadyMember")}</p> : null}
        {errorParam ? <p role="alert" className="mt-4 text-sm text-red-700">{t("invitePage.error")}</p> : null}
        {/* Ein Knopf, ein Formular: Mitglied wird man nur auf diesen Klick. */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <form action={joinAction}>
            <button className="min-h-11 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800">
              {t("invitePage.accept")}
            </button>
          </form>
          <a href="/advisor/dashboard" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-slate-600 underline-offset-4 hover:underline">
            {t("invitePage.notNow")}
          </a>
        </div>
      </section>
    </main>
  );
}
