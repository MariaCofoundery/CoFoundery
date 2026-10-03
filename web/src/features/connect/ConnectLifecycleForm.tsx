"use client";
import { useTranslations } from "next-intl";
import { changeConnectListingStatusAction } from "./connectActions";
import { SubmitButton } from "@/features/ui/SubmitButton";
export function ConnectLifecycleForm({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const t = useTranslations("connect");
  const actions =
    status === "active"
      ? ["pause", "complete", "delete"]
      : [status === "draft" ? "publish" : "renew", "delete"];
  return (
    <div className="w-full space-y-2">
      {actions.map((action) => (
        <details key={action} className="rounded-xl border p-3">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
            {t(`lifecycle.listing.${action}`)}
          </summary>
          <form action={changeConnectListingStatusAction} className="space-y-4">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="intent" value={action} />
            <input
              type="hidden"
              name="expected"
              value={status === "expired" ? "active" : status}
            />
            <p className="text-sm leading-6">
              {t(`lifecycle.listingConsequences.${action}`)}
            </p>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="confirm" required className="mt-1" />
              {t("lifecycle.confirmConsequences")}
            </label>
            <SubmitButton
              label={t(`lifecycle.listing.${action}`)}
              pendingLabel={t("lifecycle.saving")}
              className="min-h-11 rounded-xl border px-4 py-2 text-sm"
            />
          </form>
        </details>
      ))}
    </div>
  );
}
