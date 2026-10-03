import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import {
  radarRoot,
  uuid,
  pageNumber,
  safeRadarUrl,
} from "@/features/problem-radar/model";
import type { Hypothesis } from "@/features/problem-radar/hypotheses";
import { HypothesisForm } from "@/features/problem-radar/HypothesisForm";
import {
  Identity,
  SaveButton,
  ResultMessage,
  inputClass,
  buttonClass,
} from "@/features/problem-radar/forms";
import {
  linkHypothesisAction,
  reviewHypothesisAction,
} from "@/features/problem-radar/hypothesisActions";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string; result?: string }>;
}) {
  const c = await requirePlatformAdmin(),
    { id } = await params,
    q = await searchParams,
    t = await getTranslations("radar.hypotheses");
  if (!uuid(id)) notFound();
  const { data, error } = await c.rpc("get_radar_hypothesis", { p_id: id });
  if (error) return <p role="alert">{t("loadError")}</p>;
  if (!data) notFound();
  const h = data as Hypothesis;
  const query = typeof q.q === "string" ? q.q.slice(0, 100) : "",
    page = pageNumber(q.page);
  const candidates = await c.rpc("find_radar_evidence", {
    p_query: query,
    p_offset: page * 25,
  });
  const available = (candidates.data ?? []) as {
    id: string;
    revision: number;
    source_name: string;
    problem_observation: string;
  }[];
  const e = h.evidence;
  return (
    <>
      <ResultMessage result={q.result} />
      <h2 className="my-5 text-2xl font-semibold">{h.title}</h2>
      <p>
        {t(`statuses.${h.status}`)} · {t("revision", { n: h.revision })}
      </p>
      {h.needs_review && (
        <p role="status" className="my-4 rounded-xl bg-slate-100 p-4">
          {t("needsReview")}
        </p>
      )}
      <p className="my-4 whitespace-pre-wrap">{h.problem_statement}</p>
      <p>
        {h.affected_context} · {h.geographic_context || t("unknown")}
      </p>
      <section className="my-6 rounded-xl border p-4">
        <h3 className="text-xl font-semibold">{t("evidence")}</h3>
        <p className="my-3">
          {t("usableCount", { usable: e.signals, total: h.signals.length })}
        </p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              "signals",
              "sources",
              "domains",
              "origins",
              "unknown_origins",
              "unknown_dates",
            ] as const
          ).map((k) => (
            <div key={k}>
              <dt className="font-medium">{t(`metrics.${k}`)}</dt>
              <dd>{e[k]}</dd>
            </div>
          ))}
          <div>
            <dt>{t("metrics.dates")}</dt>
            <dd>
              {e.earliest_date ?? t("unknown")} –{" "}
              {e.latest_date ?? t("unknown")}
            </dd>
          </div>
          {(["languages", "regions", "tags"] as const).map((k) => (
            <div key={k}>
              <dt>{t(`metrics.${k}`)}</dt>
              <dd>
                {e[k]
                  .map((v) => (v === "unknown" ? t("unknown") : v))
                  .join(", ") || t("unknown")}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-6">{t("independence")}</p>
      </section>
      {(
        ["open_questions", "counter_observations", "evidence_limits"] as const
      ).map((k) => (
        <section key={k} className="my-4">
          <h3 className="font-semibold">{t(`fields.${k}`)}</h3>
          <p className="whitespace-pre-wrap">{h[k] || t("notRecorded")}</p>
        </section>
      ))}
      <h3 className="my-4 text-xl font-semibold">{t("linked")}</h3>
      <ul className="space-y-4">
        {h.signals.map((s) => (
          <li key={s.id} className="rounded-xl border p-4">
            {s.usable ? (
              <>
                <p className="font-medium">{s.problem_observation}</p>
                <p className="my-2">{s.summary}</p>
                <p>
                  {s.source_name} · {s.source_date || t("unknown")}
                </p>
                {safeRadarUrl(s.source_url) && (
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex min-h-11 items-center underline"
                  >
                    {t("source")}
                  </a>
                )}
                <p>
                  {t("origin")}: {s.origin_key || t("unknown")}
                </p>
              </>
            ) : (
              <p>{t("unavailable")}</p>
            )}
            {h.status !== "archived" && (
              <form action={linkHypothesisAction} className="mt-3">
                <Identity value={h} />
                <input
                  type="hidden"
                  name="signal"
                  value={`${s.id}:${s.revision}`}
                />
                <input type="hidden" name="remove" value="true" />
                <button className={buttonClass}>{t("remove")}</button>
              </form>
            )}
          </li>
        ))}
      </ul>
      {h.status !== "archived" && (
        <>
          <section className="my-6 rounded-xl border p-4">
            <h3 className="text-xl font-semibold">{t("addSignal")}</h3>
            <form className="my-4">
              <label>
                {t("search")}
                <input
                  name="q"
                  maxLength={100}
                  defaultValue={query}
                  className={inputClass}
                />
              </label>
              <button className={`${buttonClass} mt-3`}>{t("search")}</button>
            </form>
            {candidates.error ? (
              <p role="alert">{t("loadError")}</p>
            ) : (
              <form action={linkHypothesisAction} className="space-y-4">
                <Identity value={h} />
                <label className="block">
                  {t("chooseSignal")}
                  <select
                    name="signal"
                    required
                    className={inputClass}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {t("chooseSignal")}
                    </option>
                    {available.slice(0, 25).map((s) => (
                      <option key={s.id} value={`${s.id}:${s.revision}`}>
                        {s.source_name} · {s.problem_observation.slice(0, 120)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  {t("origin")}
                  <input name="origin" maxLength={80} className={inputClass} />
                </label>
                <p className="text-sm">{t("originHint")}</p>
                <SaveButton />
              </form>
            )}
            <nav className="mt-3 flex gap-5">
              {page > 0 && (
                <Link href={`?q=${encodeURIComponent(query)}&page=${page - 1}`}>
                  {t("previous")}
                </Link>
              )}
              {available.length > 25 && (
                <Link href={`?q=${encodeURIComponent(query)}&page=${page + 1}`}>
                  {t("next")}
                </Link>
              )}
            </nav>
          </section>
          <details className="my-6 rounded-xl border p-4">
            <summary className="min-h-11 cursor-pointer font-semibold">
              {t("edit")}
            </summary>
            <HypothesisForm value={h} />
          </details>
          <form action={reviewHypothesisAction} className="my-6 space-y-4">
            <Identity value={h} />
            <p className="text-sm leading-6">{t("reviewHint")}</p>
            <label className="block">
              {t("reviewAction")}
              <select name="action" className={inputClass}>
                <option value="reviewed">{t("review")}</option>
                <option value="archived">{t("archive")}</option>
              </select>
            </label>
            <SaveButton />
          </form>
        </>
      )}
      {h.ready && h.can_handoff ? (
        <Link
          className={buttonClass}
          href={`${radarRoot}/hypotheses/${h.id}/handoff`}
        >
          {t("handoff")}
        </Link>
      ) : (
        <p className="my-4 text-sm">{t("handoffGate")}</p>
      )}
      <p className="mt-5 text-sm">
        {t("due")}: {h.review_due_at?.slice(0, 10) || "—"} · {t("deleteAfter")}:{" "}
        {h.delete_after.slice(0, 10)}
      </p>
    </>
  );
}
