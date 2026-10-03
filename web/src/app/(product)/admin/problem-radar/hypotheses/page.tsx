import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { radarRoot, pageNumber } from "@/features/problem-radar/model";
import type { Hypothesis } from "@/features/problem-radar/hypotheses";
import { HypothesisForm } from "@/features/problem-radar/HypothesisForm";
import { ResultMessage, buttonClass } from "@/features/problem-radar/forms";
import { purgeHypothesesAction } from "@/features/problem-radar/hypothesisActions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; result?: string }>;
}) {
  const c = await requirePlatformAdmin(),
    q = await searchParams,
    page = pageNumber(q.page),
    t = await getTranslations("radar.hypotheses");
  const { data, error } = await c.rpc("list_radar_hypotheses", {
    p_offset: page * 25,
  });
  const rows = (data ?? []) as Hypothesis[];
  return (
    <>
      <h2 className="my-5 text-xl font-semibold">{t("title")}</h2>
      <p className="text-sm leading-6">{t("meaning")}</p>
      <ResultMessage result={q.result} />
      {error ? (
        <p role="alert">{t("loadError")}</p>
      ) : (
        <ul className="my-5 space-y-3">
          {rows.slice(0, 25).map((h) => (
            <li key={h.id} className="rounded-xl border p-4">
              <Link
                className="font-semibold underline"
                href={`${radarRoot}/hypotheses/${h.id}`}
              >
                {h.title}
              </Link>
              <p>
                {t(`statuses.${h.status}`)} ·{" "}
                {h.hypothesis_language.toUpperCase()} ·{" "}
                {t("revision", { n: h.revision })}
              </p>
            </li>
          ))}
        </ul>
      )}
      <nav className="flex gap-5">
        {page > 0 && <Link href={`?page=${page - 1}`}>{t("previous")}</Link>}
        {rows.length > 25 && (
          <Link href={`?page=${page + 1}`}>{t("next")}</Link>
        )}
      </nav>
      <details className="my-6 rounded-xl border p-4">
        <summary className="min-h-11 cursor-pointer font-semibold">
          {t("create")}
        </summary>
        <HypothesisForm />
      </details>
      <p className="my-4 text-sm leading-6">{t("retention")}</p>
      <form action={purgeHypothesesAction}>
        <button className={buttonClass}>{t("purge")}</button>
      </form>
    </>
  );
}
