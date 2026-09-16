import { SubmitButton } from "@/features/ui/SubmitButton";
import { DictatedTextarea } from "@/features/dictation/DictatedTextarea";
import {
  CONNECT_GEOGRAPHIC_SCOPES,
  CONNECT_PROBLEM_INTENTS,
  PROBLEM_DESCRIPTION_MAX,
  PROBLEM_DESCRIPTION_MIN,
  PROBLEM_TITLE_MAX,
  PROBLEM_TITLE_MIN,
  type ConnectProblem,
} from "@/features/connect/connectTypes";

type T = (key: string, values?: Record<string, string | number>) => string;

const field =
  "mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-100";
const hint = "mt-1 block text-xs leading-5 text-slate-500";
import { ConnectVisibilityField } from "./ConnectVisibilityField";

/**
 * Das Formular fuer ein Problem, fuer Einstellen und Bearbeiten.
 *
 * Eine Komponente statt zweier Seiten mit denselben Feldern: Sonst waeren
 * Laengen, Auswahllisten und Hinweise an zwei Orten zu pflegen, und beim
 * dritten Mal haette eine Seite ein Feld mehr als die andere.
 */
export function ConnectProblemForm({
  action,
  problem,
  canPublish,
  t,
}: {
  action: (formData: FormData) => void | Promise<void>;
  problem?: ConnectProblem;
  canPublish: boolean;
  t: T;
}) {
  const isPublished = problem?.status === "active";

  return (
    <form action={action} className="mt-6 space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
      {problem ? <input type="hidden" name="problem_id" value={problem.id} /> : null}

      <label className="block text-sm font-medium">
        {t("problems.form.title")}
        <input
          name="title"
          required
          minLength={PROBLEM_TITLE_MIN}
          maxLength={PROBLEM_TITLE_MAX}
          defaultValue={problem?.title}
          className={field}
          placeholder={t("problems.form.titlePlaceholder")}
        />
        <span className={hint}>{t("problems.form.titleHint")}</span>
      </label>

      {/* Diktierbar wie die Erzaehlung im Profil: Wer ein Problem schildert,
          erzaehlt es meist leichter, als er es tippt. */}
      <label className="block text-sm font-medium" htmlFor="problem-description">
        {t("problems.form.description")}
        <DictatedTextarea
          id="problem-description"
          name="description"
          required
          rows={7}
          minLength={PROBLEM_DESCRIPTION_MIN}
          maxLength={PROBLEM_DESCRIPTION_MAX}
          defaultValue={problem?.description ?? ""}
          placeholder={t("problems.form.descriptionPlaceholder")}
          className={field}
        />
        <span className={hint}>
          {t("problems.form.descriptionHint", { min: PROBLEM_DESCRIPTION_MIN })}
        </span>
      </label>

      <fieldset>
        <legend className="text-sm font-medium">{t("problems.form.intent")}</legend>
        <p className={hint}>{t("problems.form.intentHint")}</p>
        <div className="mt-3 grid gap-2">
          {CONNECT_PROBLEM_INTENTS.map((value) => (
            <label
              key={value}
              className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <input
                type="radio"
                name="author_intent"
                value={value}
                required
                defaultChecked={problem?.author_intent === value}
                className="mt-1"
              />
              <span>
                <span className="font-medium">{t(`problems.intents.${value}`)}</span>
                <span className={hint}>{t(`problems.intentHints.${value}`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium">
          {t("problems.form.locations")}
          <input
            name="locations"
            defaultValue={problem?.locations.join(", ")}
            className={field}
            placeholder={t("problems.form.locationsPlaceholder")}
          />
          <span className={hint}>{t("problems.form.locationsHint", { max: 3 })}</span>
        </label>
        <label className="text-sm font-medium">
          {t("filters.scope")}
          <select
            name="geographic_scope"
            defaultValue={problem?.geographic_scope ?? "regional"}
            className={field}
          >
            {CONNECT_GEOGRAPHIC_SCOPES.map((value) => (
              <option key={value} value={value}>
                {t(`scopes.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          {t("form.topics")}
          <input name="topics" defaultValue={problem?.topics.join(", ")} className={field} />
          <span className={hint}>{t("form.topicsHint", { max: 8 })}</span>
        </label>
        <label className="text-sm font-medium">
          {t("form.industries")}
          <input name="industries" defaultValue={problem?.industries.join(", ")} className={field} />
          <span className={hint}>{t("form.industriesHint", { max: 5 })}</span>
        </label>
      </div>

      {/* Ein Problem beschreibt oft ein Arbeitsumfeld. Die Warnung steht
          deshalb ueber dem Feld, nicht darunter. */}
      <div>
        <ConnectVisibilityField
          initial={problem?.visibility}
          copy={{
            title: t("problems.visibilityTitle"),
            membersOnly: t("problems.visibilityMembersOnly"),
            public: t("problems.visibilityPublic"),
            publicHint: t("problems.visibilityPublicHint"),
            confirm: t("problems.visibilityConfirm"),
            previewTitle: t("problems.visibilityPreviewTitle"),
            previewItems: t("problems.visibilityPreviewItems"),
          }}
        />
        <p className="mt-2 text-xs leading-5 text-slate-500">{t("problems.visibilityCaution")}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Beim Bearbeiten eines veroeffentlichten Problems gibt es nur einen
            Knopf: Speichern aendert nichts am Zustand. Zurueckziehen und als
            geloest markieren stehen auf der Detailseite, wo sie hingehoeren. */}
        {isPublished ? (
          <SubmitButton
            label={t("problems.form.saveChanges")}
            pendingLabel={t("pending.save")}
            className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold"
          />
        ) : (
          <>
            {canPublish ? (
              <SubmitButton
                intent="publish"
                label={t("problems.form.publish")}
                pendingLabel={t("pending.publish")}
                className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold"
              />
            ) : null}
            <SubmitButton
              intent="draft"
              label={t("problems.form.saveDraft")}
              pendingLabel={t("pending.save")}
              className="min-h-11 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold"
            />
          </>
        )}
      </div>
    </form>
  );
}
