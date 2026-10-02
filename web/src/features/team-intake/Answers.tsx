import { getTranslations } from "next-intl/server";
import {
  ORIGINS,
  FORMATIONS,
  OPEN_TOPICS,
  commonKeys,
  pairKeys,
  type IntakeData,
  type IntakeOwn,
  type IntakeRound,
} from "@/features/team-intake/model";
import { saveIntakeAction } from "@/features/team-intake/actions";
export const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50";
const input =
  "mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-base";

async function Fields({
  keys,
  prefix,
  data,
}: {
  keys: string[];
  prefix: string;
  data: IntakeData;
}) {
  const t = await getTranslations("intake");
  return (
    <div className="space-y-5">
      {keys.map((key) => {
        const name = prefix + key;
        const options =
          key === "origin"
            ? ORIGINS
            : key === "formation"
              ? FORMATIONS
              : key === "existed"
                ? ["yes", "no", "partly"]
                : key === "worked"
                  ? ["yes", "no"]
                  : null;
        const label = (v: string) =>
          key === "origin"
            ? t(`origins.${v}`)
            : key === "formation"
              ? t(`formations.${v}`)
              : t(v);
        const required = [
          "origin",
          "since",
          "worked",
          "formation",
          "venture_since",
          "existed",
        ].includes(key);
        if (key === "open_topics")
          return (
            <fieldset key={key} className="rounded-xl border p-4">
              <legend className="font-medium">
                {t(`fields.${key}`)} · {t("optional")}
              </legend>
              <p className="text-sm text-slate-600">{t("topicsHelp")}</p>
              {OPEN_TOPICS.map((v) => (
                <label key={v} className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    name={name}
                    value={v}
                    defaultChecked={
                      Array.isArray(data[key]) && data[key].includes(v)
                    }
                  />
                  {t(`topics.${v}`)}
                </label>
              ))}
            </fieldset>
          );
        const value =
          typeof data[key] === "boolean"
            ? data[key]
              ? "yes"
              : "no"
            : typeof data[key] === "string"
              ? data[key]
              : "";
        return (
          <label key={key} className="block">
            <span className="font-medium">{t(`fields.${key}`)}</span>{" "}
            <span className="ml-2 text-xs text-slate-500">
              {t(
                required
                  ? "required"
                  : key === "work_context"
                    ? "requiredWhenYes"
                    : key === "formation_other"
                      ? "requiredWhenOther"
                      : "optional",
              )}
            </span>
            {options ? (
              <select name={name} defaultValue={value} className={input}>
                <option value="">{t("choose")}</option>
                {options.map((v) => (
                  <option key={v} value={v}>
                    {label(v)}
                  </option>
                ))}
              </select>
            ) : (
              <textarea
                name={name}
                defaultValue={value}
                rows={key === "since" || key === "venture_since" ? 2 : 3}
                maxLength={1500}
                className={input}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}
export async function IntakeEditor({
  round,
  own,
  userId,
}: {
  round: IntakeRound;
  own: IntakeOwn;
  userId: string;
}) {
  const t = await getTranslations("intake");
  return (
    <form action={saveIntakeAction.bind(null, round.id)} className="space-y-6">
      <section className="rounded-2xl border bg-white p-4 sm:p-6">
        <h2 className="text-xl font-semibold">{t("factsTitle")}</h2>
        <p className="mt-3 leading-7">{t("factsHelp")}</p>
        <p className="my-4 text-sm text-slate-600">{t("requiredHelp")}</p>
        <h3 className="mb-4 font-semibold">{t("common")}</h3>
        <Fields
          keys={commonKeys(round.mode)}
          prefix="common."
          data={own.shared}
        />
      </section>
      {round.participants
        .filter((p) => p.user_id && p.user_id !== userId)
        .map((p) => (
          <section
            key={p.id}
            className="rounded-2xl border bg-white p-4 sm:p-6"
          >
            <h2 className="mb-4 text-xl font-semibold">
              {t("pair", { name: p.name })}
            </h2>
            <Fields
              keys={pairKeys(round.mode)}
              prefix={`pair.${p.user_id}.`}
              data={
                own.pairs.find((a) => a.target_user_id === p.user_id)?.data ??
                {}
              }
            />
          </section>
        ))}
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-6">
        <h2 className="text-xl font-semibold">{t("privateTitle")}</h2>
        <p className="my-3 text-sm leading-6">{t("privateHelp")}</p>
        <label className="flex min-h-11 items-start gap-3 py-3">
          <input
            type="checkbox"
            name="private_requested"
            defaultChecked={own.private_requested}
            className="mt-1"
          />
          {t("privateRequest")}
        </label>
        <label className="block">
          {t("privateNote")}
          <textarea
            name="private_note"
            defaultValue={own.private_note}
            rows={3}
            maxLength={1500}
            className={input}
          />
        </label>
      </section>
      <div className="flex flex-wrap gap-3">
        <button name="intent" value="save" className={button}>
          {t("save")}
        </button>
        <button name="intent" value="preview" className={button}>
          {t("preview")}
        </button>
      </div>
    </form>
  );
}
export async function AnswerList({
  data,
  keys,
}: {
  data: IntakeData;
  keys: string[];
}) {
  const t = await getTranslations("intake");
  return (
    <dl className="space-y-4">
      {keys.map((key) => {
        const value = data[key];
        let text: string;
        if (
          value === undefined ||
          value === "" ||
          (Array.isArray(value) && !value.length)
        )
          text = t("missing");
        else if (typeof value === "boolean") text = t(value ? "yes" : "no");
        else if (Array.isArray(value))
          text = value.map((v) => t(`topics.${v}`)).join(", ");
        else if (key === "origin") text = t(`origins.${value}`);
        else if (key === "formation") text = t(`formations.${value}`);
        else if (key === "existed") text = t(value);
        else text = value;
        return (
          <div key={key}>
            <dt className="text-sm font-semibold text-slate-700">
              {t(`fields.${key}`)}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap break-words leading-7">
              {text}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
export async function OwnPreview({
  own,
  round,
  userId,
}: {
  own: IntakeOwn;
  round: IntakeRound;
  userId: string;
}) {
  const t = await getTranslations("intake");
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border p-4">
        <h2 className="mb-4 text-xl font-semibold">{t("common")}</h2>
        <AnswerList data={own.shared} keys={commonKeys(round.mode)} />
      </section>
      {round.participants
        .filter((p) => p.user_id && p.user_id !== userId)
        .map((p) => (
          <section key={p.id} className="rounded-2xl border p-4">
            <h2 className="mb-4 text-xl font-semibold">
              {t("pair", { name: p.name })}
            </h2>
            <AnswerList
              data={
                own.pairs.find((a) => a.target_user_id === p.user_id)?.data ??
                {}
              }
              keys={pairKeys(round.mode)}
            />
          </section>
        ))}
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
        <h2 className="font-semibold">{t("privateTitle")}</h2>
        <p>{own.private_requested ? t("privateRequest") : t("missing")}</p>
        <p className="whitespace-pre-wrap break-words">{own.private_note}</p>
      </section>
    </div>
  );
}
