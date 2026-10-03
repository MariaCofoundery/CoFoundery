import { getTranslations } from "next-intl/server";
import { Identity, SaveButton, inputClass } from "./forms";
import { saveHypothesisAction } from "./hypothesisActions";
import type { Hypothesis } from "./hypotheses";
export async function HypothesisForm({ value }: { value?: Hypothesis }) {
  const t = await getTranslations("radar.hypotheses");
  const fields = [
    ["title", 160],
    ["problem_statement", 2000],
    ["affected_context", 400],
    ["geographic_context", 200],
    ["open_questions", 2000],
    ["counter_observations", 2000],
    ["evidence_limits", 2000],
  ] as const;
  return (
    <form action={saveHypothesisAction} className="space-y-4">
      <Identity value={value} />
      <p className="text-sm leading-6">{t("editorHint")}</p>
      {fields.map(([key, max]) => (
        <label className="block text-sm font-medium" key={key}>
          {t(`fields.${key}`)}
          <textarea
            name={key}
            maxLength={max}
            rows={key === "title" ? 1 : 3}
            required={[
              "title",
              "problem_statement",
              "affected_context",
            ].includes(key)}
            defaultValue={value?.[key] ?? ""}
            className={inputClass}
          />
        </label>
      ))}
      <label className="block text-sm font-medium">
        {t("fields.hypothesis_language")}
        <select
          name="hypothesis_language"
          defaultValue={value?.hypothesis_language ?? "de"}
          className={inputClass}
        >
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </label>
      <SaveButton />
    </form>
  );
}
