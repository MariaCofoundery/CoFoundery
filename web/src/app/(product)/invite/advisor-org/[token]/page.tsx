import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Einer Organisation beitreten.
 *
 * HIER WIRD MAN MITGLIED - anders als bei der Einladung an eine begleitete
 * Person, wo nur eine Anfrage entsteht. Der Unterschied ist richtig: Wer eine
 * Organisation betritt, entscheidet über sich selbst. Wer begleitet wird,
 * entscheidet über seine Daten, und das ist eine zweite Frage, die an einer
 * anderen Stelle gestellt wird.
 */
export default async function ClaimAdvisorOrgInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/advisor-org/${token}`)}`);
  }

  const client = await createClient();
  const { error } = await client.rpc("claim_advisor_org_invite", {
    p_token_hash: createHash("sha256").update(token).digest("hex"),
  });

  if (!error) redirect("/advisor/dashboard#advisor-org");

  const t = await getTranslations("advisor.org");
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <h1 className="text-2xl font-semibold text-slate-950">{t("claimFailedTitle")}</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">{t("claimFailedText")}</p>
      <a
        href="/advisor/dashboard"
        className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
      >
        {t("claimFailedCta")}
      </a>
    </main>
  );
}
