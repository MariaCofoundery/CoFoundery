"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { handoffHypothesisAction } from "./hypothesisActions";
import type { Hypothesis } from "./hypotheses";
const input =
  "mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-base";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 font-semibold";
type Selection = {
  title: string;
  description: string;
  signals: string[];
  links: string[];
};
export function HandoffForm({
  hypothesis: h,
  request,
}: {
  hypothesis: Hypothesis;
  request: string;
}) {
  const t = useTranslations("radar.hypotheses");
  const [draft, setDraft] = useState<Selection>({
    title: h.title,
    description: "",
    signals: [],
    links: [],
  });
  const [preview, setPreview] = useState(false);
  if (preview)
    return (
      <section className="my-5 space-y-5 rounded-xl border p-4">
        <h3 className="text-xl font-semibold">{t("preview")}</h3>
        <h4 className="font-semibold">{draft.title}</h4>
        <p className="whitespace-pre-wrap">{draft.description || "—"}</p>
        <h4 className="font-semibold">{t("assumption")}</h4>
        <p className="whitespace-pre-wrap">{h.problem_statement}</p>
        <p className="text-sm leading-6">{t("importHint")}</p>
        {h.signals
          .filter((s) => draft.signals.includes(s.id))
          .map((s) => (
            <article
              key={s.id}
              className="space-y-2 rounded-xl bg-slate-50 p-4"
            >
              <h4>{t("externalPerspective")}</h4>
              <p>{s.summary}</p>
              {draft.links.includes(s.id) && <p>{s.source_url}</p>}
            </article>
          ))}
        <button
          type="button"
          className={button}
          onClick={() => setPreview(false)}
        >
          {t("back")}
        </button>
        <form action={handoffHypothesisAction} className="space-y-4">
          <input
            type="hidden"
            name="handoff"
            value={JSON.stringify({
              ...draft,
              id: h.id,
              revision: h.revision,
              request,
            })}
          />
          <label className="flex items-start gap-3 text-sm leading-6">
            <input type="checkbox" name="confirm" required className="mt-1" />
            {t("confirm")}
          </label>
          <SubmitButton
            label={t("createWorkspace")}
            pendingLabel={t("saving")}
            className={button}
          />
        </form>
      </section>
    );
  return (
    <form action={() => setPreview(true)} className="my-5 space-y-5">
      <p className="text-sm leading-6">{t("handoffHint")}</p>
      <label className="block">
        {t("workspaceTitle")}
        <input
          required
          maxLength={160}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          className={input}
        />
      </label>
      <label className="block">
        {t("description")}
        <textarea
          maxLength={3000}
          rows={4}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          className={input}
        />
      </label>
      <h3 className="font-semibold">{t("chooseCopies")}</h3>
      {h.signals
        .filter((s) => s.usable)
        .map((s) => (
          <fieldset key={s.id} className="space-y-3 rounded-xl border p-4">
            <legend className="px-2">{s.source_name}</legend>
            <p>{s.summary}</p>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={draft.signals.includes(s.id)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    signals: e.target.checked
                      ? [...draft.signals, s.id]
                      : draft.signals.filter((id) => id !== s.id),
                    links: e.target.checked
                      ? draft.links
                      : draft.links.filter((id) => id !== s.id),
                  })
                }
              />
              {t("copySummary")}
            </label>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                disabled={!draft.signals.includes(s.id)}
                checked={draft.links.includes(s.id)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    links: e.target.checked
                      ? [...draft.links, s.id]
                      : draft.links.filter((id) => id !== s.id),
                  })
                }
              />
              {t("copyLink")}
            </label>
          </fieldset>
        ))}
      <button className={button}>{t("preview")}</button>
    </form>
  );
}
