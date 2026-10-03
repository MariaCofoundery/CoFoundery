import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import type { ImportCount } from "@/features/problem-radar/hypotheses";
import { ResultMessage, buttonClass } from "@/features/problem-radar/forms";
import { redactImportsAction } from "@/features/problem-radar/hypothesisActions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const c = await requirePlatformAdmin(),
    t = await getTranslations("radar.hypotheses"),
    q = await searchParams;
  const { data, error } = await c.rpc("list_radar_imports");
  const rows = (data ?? []) as ImportCount[];
  return (
    <>
      <h2 className="my-5 text-xl font-semibold">{t("imports")}</h2>
      <p className="text-sm leading-6">{t("redactionHint")}</p>
      <ResultMessage result={q.result} />
      {error ? (
        <p role="alert">{t("loadError")}</p>
      ) : (
        <ul className="my-5 space-y-4">
          {rows.map((r) => (
            <li key={r.signal_key} className="space-y-3 rounded-xl border p-4">
              <p className="text-sm">
                {t("signalId")}: {r.signal_key}
              </p>
              <p>{t("importCount", { n: r.workspaces })}</p>
              <p>{t(r.restricted ? "restricted" : "available")}</p>
              {r.restricted &&
                (r.redactable_texts > 0 || r.redactable_links > 0) && (
                  <details>
                    <summary className="min-h-11 cursor-pointer underline">
                      {t("redactionPreview")}
                    </summary>
                    <p className="my-3">
                      {t("redactionCount", {
                        texts: r.redactable_texts,
                        links: r.redactable_links,
                      })}
                    </p>
                    <form action={redactImportsAction} className="space-y-4">
                      <input type="hidden" name="signal" value={r.signal_key} />
                      <label className="flex items-start gap-3 text-sm leading-6">
                        <input
                          name="confirm"
                          type="checkbox"
                          required
                          className="mt-1"
                        />
                        {t("redactionConfirm")}
                      </label>
                      <button className={buttonClass}>{t("redact")}</button>
                    </form>
                  </details>
                )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
