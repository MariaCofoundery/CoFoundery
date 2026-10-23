import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { setConnectParticipationAction } from "./lifecycleActions";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { ACCOUNT_CARD, ACCOUNT_PRIMARY, ACCOUNT_SECONDARY, AccountHead } from "@/features/account/accountUi";
export async function ConnectParticipationSection({
  error = false,
}: {
  error?: boolean;
}) {
  const client = await createClient(),
    t = await getTranslations("connect.lifecycle");
  const { data, error: readError } = await client.rpc(
    "get_connect_participation",
  );
  if (!data || readError) return null;
  const inactive = data.status === "inactive",
    suspended = data.status === "suspended";
  return (
    <section id="connect" className={`${ACCOUNT_CARD} mt-5 space-y-4`}>
      <AccountHead icon="link" tone="blue" title={t("participation")} text={t(suspended ? "suspended" : inactive ? "inactive" : "active")} />
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{t("error")}</p>}
      {!suspended && (
        <details>
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-[#a3195b]">
            {t(inactive ? "return" : "leave")}
          </summary>
          <form action={setConnectParticipationAction} className="space-y-4">
            <input type="hidden" name="active" value={String(inactive)} />
            <p className="text-sm leading-6">
              {t(inactive ? "returnConsequences" : "leaveConsequences")}
            </p>
            <label className="flex items-start gap-3 text-sm">
              <input name="confirm" type="checkbox" required className="mt-1" />
              {t("confirmConsequences")}
            </label>
            <SubmitButton
              label={t(inactive ? "return" : "leave")}
              pendingLabel={t("saving")}
              className={ACCOUNT_SECONDARY}
            />
          </form>
        </details>
      )}
      {!inactive && !suspended && (
        <Link
          href="/connect/profile"
          className={`${ACCOUNT_SECONDARY} mr-3`}
        >
          {t("reviewProfile")}
        </Link>
      )}
    </section>
  );
}
