import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { setConnectParticipationAction } from "./lifecycleActions";
import { SubmitButton } from "@/features/ui/SubmitButton";
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
    <section className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="text-xl font-semibold">{t("participation")}</h2>
      {error && <p role="alert">{t("error")}</p>}
      <p>{t(suspended ? "suspended" : inactive ? "inactive" : "active")}</p>
      {!suspended && (
        <details>
          <summary className="cursor-pointer py-3 font-semibold">
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
              className="min-h-11 rounded-xl border px-4 py-2"
            />
          </form>
        </details>
      )}
      {!inactive && !suspended && (
        <Link
          href="/connect/profile"
          className="inline-block min-h-11 py-2 underline"
        >
          {t("reviewProfile")}
        </Link>
      )}
    </section>
  );
}
